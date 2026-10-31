import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planMultipleChoice,planOddWords,SMALL_PRINT_WIDTH} from '../src/smallParityLayout.ts';
import {shuffledChoices,validateSmallModule} from '../src/smallModules.ts';
import {glyphInkCenter} from '../src/fontInkCenter.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';
import {balancedBankLines} from '../src/balancedBankLines.ts';
import {createBookletPdf} from '../src/pdf.ts';

const assets=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await assets(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const face=fontkit.create(files.mouseMemoirs);
 const [title,puzzle]=await Promise.all([
  doc.embedFont(files.mouseMemoirs,{subset:false}),
  doc.embedFont(files.zillaSlab,{subset:false}),
 ]);
 return {files,cap:(text,size)=>glyphInkCenter(face,text,size),
  title:(text,size)=>title.widthOfTextAtSize(text,size),
  puzzle:(text,size)=>puzzle.widthOfTextAtSize(text,size)};
}
test('Checkbox center is independent of descenders in ANDY versus Andy',async()=>{
 const m=await metrics();
 const data={type:'multiple-choice',question:'Who came to church?',
  correct:'ANDY',wrong1:'Andy',wrong2:'John',seed:4};
 const p=planMultipleChoice(data,m.title,m.cap);
 assert.ok(p);
 const rows=p.rows.filter(row=>['ANDY','Andy'].includes(row.lines[0].text));
 assert.equal(rows.length,2);
 for(const row of rows){
  const baseline=row.lines[0].y;
  assert.ok(Math.abs(row.squareY+row.squareSize/2-
    (baseline-m.cap('ANDY',row.fontSize)))<.001);
 }
 const offsets=rows.map(row=>row.squareY+row.squareSize/2-row.lines[0].y);
 assert.ok(Math.abs(offsets[0]-offsets[1])<.001);
});
test('Short answer group is centered as one unit; long answers still fit',async()=>{
 const m=await metrics();
 for(const module of [
  {type:'multiple-choice',question:'What should we say?',
   correct:'Yes',wrong1:'No',wrong2:'Maybe',seed:2},
  {type:'multiple-choice',question:'Which person trusted the Lord and built a very large boat to keep his family and the animals safe?',
   correct:'Noah, who trusted God and saved his family',
   wrong1:'David, the boy who played a beautiful harp',
   wrong2:'Moses, who led his people into the desert',seed:8},
 ]){
  const p=planMultipleChoice(module,m.title,m.cap);
  assert.ok(p);
  const textWidths=p.rows.flatMap(row=>row.lines.map(line=>m.title(line.text,row.fontSize)));
  const groupWidth=p.rows[0].squareSize+6+Math.max(...textWidths);
  const left=(SMALL_PRINT_WIDTH-groupWidth)/2;
  assert.ok(Math.abs(p.rows[0].squareX-left)<.01);
  assert.ok(p.rows.every(r=>Math.abs(r.squareX-left)<.01));
  assert.ok(p.rows.every(r=>r.lines.every(l=>Math.abs(l.x-(left+17))<.01)));
  assert.ok(p.rows.every(r=>r.lines.every(l=>
   l.x+m.title(l.text,r.fontSize)<=SMALL_PRINT_WIDTH-2)));
 }
});
const odd={type:'odd-words',seed:3,
 correct:'red sea\ndry land\nburning bush\nnoah\nrainbow',
 incorrect:'pharaoh\ngoliath\nsoldier\nsling\nsand'};
test('Odd Words accepts multiword phrases up to 12 characters (spaces counted)',()=>{
 assert.deepEqual(validateSmallModule(odd),[]);
 assert.deepEqual(validateSmallModule({...odd,correct:'burning bush'}),[]);
 assert.ok(validateSmallModule({...odd,correct:'burning bushes'}).some(x=>/12 characters/u.test(x)));
 assert.ok(validateSmallModule({...odd,correct:'red sea crossing'}).some(x=>/12 characters/u.test(x)));
 assert.ok(validateSmallModule({...odd,correct:'dry  land'}).length);
 const checkboxes={type:'checkboxes',correct:'red sea',incorrect:'camel',seed:1};
 assert.ok(validateSmallModule(checkboxes).some(x=>/individual words/u.test(x)),
  'Checkboxes entry validation stays unchanged');
});
test('Odd Words instruction is balanced and columns remain centered with phrases',async()=>{
 const m=await metrics(),p=planOddWords(odd,m.title,m.puzzle);
 assert.ok(p);
 assert.ok(p.instructions.length>=2);
 const expected=balancedBankLines(
  "Scribble out the words that don't match the story.",
  SMALL_PRINT_WIDTH-3,m.title,p.instructionSize,3);
 assert.deepEqual(p.instructions.map(x=>x.text),expected);
 assert.ok(Math.abs((p.groupLeft+p.groupRight)/2-SMALL_PRINT_WIDTH/2)<.001);
 const all=[...p.left,...p.right].map(x=>x.text);
 assert.ok(all.includes('RED SEA')&&all.includes('DRY LAND')&&all.includes('BURNING BUSH'));
});
test('Immediate exceeded-length feedback tracks module-specific bounds without truncating input',()=>{
 const mc={type:'multiple-choice',question:'Q',correct:'Yes',wrong1:'No',wrong2:'Maybe',seed:1};
 assert.equal(fieldExceedsLength(mc,'mc-question','X'.repeat(105)),false);
 assert.equal(fieldExceedsLength(mc,'mc-question','X'.repeat(106)),true);
 assert.equal(fieldExceedsLength(mc,'mc-correct','X'.repeat(43)),true);
 assert.equal(fieldExceedsLength(odd,'odd-correct','burning bush'),false);
 assert.equal(fieldExceedsLength(odd,'odd-correct','burning bushes'),true);
 assert.equal(fieldExceedsLength(odd,'odd-incorrect','dry land\nlonger phrase'),true);
 assert.equal(fieldExceedsLength({type:'finish-verse'},'sv-verse','X'.repeat(301)),true);
 assert.equal(fieldExceedsLength({type:'unscramble-verse'},'sv-verse','X'.repeat(241)),true);
 assert.equal(fieldExceedsLength(mc,'mc-wrong1',''),false);
 const [app,styles]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
 ]);
 assert.match(app,/fieldExceedsLength\(activeModule,field.id,field.value\)/u);
 assert.match(app,/aria-invalid/u);
 assert.match(styles,/\.activity-editor input\.over-character-limit/u);
 assert.match(styles,/background: #fff1f0/u);
});
test('Phrase and mixed-case Multiple Choice booklet still exports',async()=>{
 const files=await assets();
 const draft={title:'God Helps Us',scripture:'Exodus 14',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{
   '2:top-left-small':{type:'multiple-choice',question:'What is his name?',correct:'Andy',wrong1:'David',wrong2:'Moses',seed:8},
   '2:top-right-small':odd,
  },
 };
 const doc=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
