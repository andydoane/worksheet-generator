import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {MAZE_COLS,MAZE_ROWS,generateMaze,checkMaze,validatePuzzle} from '../src/puzzleEngines.ts';
import {MAZE_ARROW_PATH,MAZE_ARROW_VIEW_SIZE,planMazePrint} from '../src/mazePrintLayout.ts';
import {planUnscrambleVerse} from '../src/verseReconstructionLayout.ts';
import {markWordSelection} from '../src/storySelection.ts';
import {createBookletPdf} from '../src/pdf.ts';
const files=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const inputs=await files();const document=await PDFDocument.create();
 document.registerFontkit(fontkit);
 const [body,title,puzzle]=await Promise.all([
  document.embedFont(inputs.nunitoSans,{subset:false}),
  document.embedFont(inputs.mouseMemoirs,{subset:false}),
  document.embedFont(inputs.zillaSlab,{subset:false}),
 ]);
 return {title:(s,n)=>title.widthOfTextAtSize(s,n),
  body:(s,n)=>body.widthOfTextAtSize(s,n),
  puzzle:(s,n)=>puzzle.widthOfTextAtSize(s,n)};
}
const maze={type:'true-false-maze',statement:'God helped Daniel when the lions were near.',answer:true,seed:5};
test('41×14 maze is connected, deterministic, and validates at 65 characters',()=>{
 assert.equal(MAZE_COLS,41);assert.equal(MAZE_ROWS,14);
 for(let seed=1;seed<=8;seed++){
  const generated=generateMaze({...maze,seed});
  assert.ok(checkMaze(generated));
  assert.equal(generated.walls[0].length,41);
  assert.equal(generated.entrance.x,20);
 }
 assert.deepEqual(validatePuzzle({...maze,statement:'A'.repeat(65)}),[]);
 assert.ok(validatePuzzle({...maze,statement:'A'.repeat(66)}).length>0);
});
test('maze preview and export use one print-space plan, one line, and same uploaded arrow',async()=>{
 const {body}=await metrics();
 const statements=[maze.statement,'A statement that is long but still fits the 65-character bound!'];
 for(const statement of statements){
  assert.ok(statement.length<=65);
  const p=planMazePrint(statement,body);
  assert.ok(p);
  assert.ok(body(statement,p.statementSize)<=331.2-10);
  assert.ok(p.mazeWidth>270);
  assert.ok(p.mazeLeft>16&&p.mazeLeft+p.mazeWidth<331.2-16);
  assert.ok(Math.abs(p.cell*MAZE_COLS-p.mazeWidth)<.001);
  assert.ok(p.arrowY>p.mazeTop+p.mazeHeight);
  assert.ok(p.arrowY+p.arrowSize<172.8);
  assert.ok(p.exitLeftX<p.mazeLeft&&p.exitRightX>p.mazeLeft+p.mazeWidth);
 }
 const svg=await readFile(new URL('../images/maze_arrow.svg',import.meta.url),'utf8');
 const m=svg.match(/\bd="([^"]+)"\s*\/>/u);
 assert.ok(m);
 assert.equal(m[1].trim(),MAZE_ARROW_PATH);
 assert.ok(MAZE_ARROW_VIEW_SIZE>26&&MAZE_ARROW_VIEW_SIZE<27);
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/PuzzlePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/puzzlePdf.ts',import.meta.url),'utf8')]);
 assert.match(preview,/planMazePrint\(module.statement/u);
 assert.match(pdf,/planMazePrint\(module.statement/u);
 assert.match(preview,/MAZE_ARROW_PATH/u);
 assert.match(pdf,/drawSvgPath\(MAZE_ARROW_PATH/u);
});
test('Unscramble expands line pitch for short passages but preserves minimum and letter offset',async()=>{
 const m=await metrics();
 const short={type:'unscramble-verse',reference:'John 3:16',seed:1,
  verse:'For [God] so [loved] the [world] that he [gave] his [Son].'};
 const long={type:'unscramble-verse',reference:'Isaiah 41:10',seed:3,
  verse:'[Fear] not, for I am [with] you; be not dismayed, for I am your [God]; I will [help] and [uphold] you.'};
 const p=planUnscrambleVerse(short,m),q=planUnscrambleVerse(long,m);
 assert.ok(p&&q);
 assert.ok(p.lineStep>=29&&p.lineStep<=43.5);
 assert.ok(q.lineStep>=29&&q.lineStep<=43.5);
 assert.equal(p.glyphOffset,11.5);
 assert.ok(p.rowCount<=q.rowCount||p.lineStep>=q.lineStep);
 assert.ok(p.marks.every(g=>g.y+p.glyphOffset+p.invertedFontSize<172.8));
});
test('All three bracket-selected word editors provide a button; repeated words select individually',async()=>{
 const story=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 const verses=await readFile(new URL('../src/StoryVerseEditor.tsx',import.meta.url),'utf8');
 assert.match(story,/activeModule\?\.type === 'finish-story'/u);
 assert.match(story,/onClick=\{markSelectedStoryWord\}/u);
 assert.match(verses,/case 'unscramble-verse':return <BracketVerseEditor/u);
 assert.match(verses,/case 'finish-verse':/u);
 assert.match(verses,/Make selected word a blank/u);
 assert.match(verses,/length>9/u);
 const text='God is good and God is near.';
 const second=markWordSelection(text,text.lastIndexOf('God'),text.lastIndexOf('God')+3);
 assert.equal(second.text,'God is good and [God] is near.');
});
test('PDF preserves two landscape letter sheets with wide maze and expanded Unscramble',async()=>{
 const inputs=await files();
 const draft={title:'God Guides Us',scripture:'Isaiah 41',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
   '2:top-medium':maze,
   '2:middle-medium':{type:'unscramble-verse',reference:'John 3:16',seed:1,
    verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'},
   '3:top-medium':{...maze,answer:false,seed:3},
  }};
 const file=await createBookletPdf(draft,inputs);
 const doc=await PDFDocument.load(file);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
