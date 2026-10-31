import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT,planMultipleChoice,planOddWords} from '../src/smallParityLayout.ts';
import {shuffledChoices,shuffledWordList,validateSmallModule} from '../src/smallModules.ts';
import {glyphInkCenter} from '../src/fontInkCenter.ts';
import {createBookletPdf} from '../src/pdf.ts';

const assets=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function widths(){
 const data=await assets(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const title=fontkit.create(data.mouseMemoirs);
 const puzzle=fontkit.create(data.zillaSlab);
 const [titlePdf,puzzlePdf]=await Promise.all([
  doc.embedFont(data.mouseMemoirs,{subset:false}),
  doc.embedFont(data.zillaSlab,{subset:false}),
 ]);
 const native=(f,t,n)=>f.layout(t).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*n/f.unitsPerEm;
 return {data,title:(t,n)=>titlePdf.widthOfTextAtSize(t,n),
  puzzle:(t,n)=>puzzlePdf.widthOfTextAtSize(t,n),
  browserTitle:(t,n)=>native(title,t,n),
  browserPuzzle:(t,n)=>native(puzzle,t,n),
  ink:(t,n)=>glyphInkCenter(title,t,n)};
}
const shortChoice={type:'multiple-choice',question:'Who built the ark?',
 correct:'Noah',wrong1:'Moses',wrong2:'David',seed:3};
const longChoice={type:'multiple-choice',
 question:'Which person trusted the Lord and built a very large boat to keep his family and the animals safe?',
 correct:'Noah, who trusted God and saved his family',
 wrong1:'David, the boy who played a beautiful harp',
 wrong2:'Moses, who led his people into the desert',seed:8};
const shortOdd={type:'odd-words',correct:'BOAT\nRAIN\nDOVE',
 incorrect:'GOLIATH\nSWORD\nSLING',seed:5};
const longOdd={type:'odd-words',correct:'RAINBOW\nANIMALS\nWATERS\nNOAH\nDOVE',
 incorrect:'GOLIATH\nPHARAOH\nSOLDIER\nPILGRIM\nSLING',seed:13};
test('Small print coordinate system retains the canonical module inset',()=>{
 assert.ok(Math.abs(SMALL_PRINT_WIDTH-158.4)<.0001);
 assert.ok(Math.abs(SMALL_PRINT_HEIGHT-172.8)<.0001);
});
test('Multiple Choice preview and PDF measurements share exact line breaks and ink-centered boxes',async()=>{
 const w=await widths();
 for(const module of [shortChoice,longChoice]){
  assert.deepEqual(validateSmallModule(module),[]);
  const p=planMultipleChoice(module,w.title,w.ink);
  const q=planMultipleChoice(module,w.browserTitle,w.ink);
  assert.ok(p&&q,'Unable to fit: '+module.question);
  assert.equal(p.rows.length,3);
  assert.deepEqual(p.questionLines,q.questionLines);
  assert.deepEqual(p.rows.map(r=>r.lines.map(x=>x.text)),q.rows.map(r=>r.lines.map(x=>x.text)));
  assert.deepEqual(p.rows.map(r=>r.squareY),q.rows.map(r=>r.squareY));
  assert.equal(p.rows.map(r=>r.lines.map(x=>x.text).join(' ')).join('|'),
   shuffledChoices(module).join('|'));
  for(const row of p.rows){
   const top=row.lines[0],bottom=row.lines.at(-1);
   const inkCenter=((top.y-w.ink(top.text,row.fontSize))+
    (bottom.y-w.ink(bottom.text,row.fontSize)))/2;
   assert.ok(Math.abs(inkCenter-(row.squareY+row.squareSize/2))<.001);
   assert.ok(row.squareY>=0&&row.squareY+row.squareSize<=SMALL_PRINT_HEIGHT);
   assert.ok(row.lines.every(x=>x.y>=0&&x.y<=SMALL_PRINT_HEIGHT));
   assert.ok(row.lines.every(x=>w.title(x.text,row.fontSize)<=SMALL_PRINT_WIDTH-x.x));
  }
  for(let i=0;i<p.rows.length-1;i++)
   assert.ok(p.rows[i].lines.at(-1).y+3<p.rows[i+1].lines[0].y);
 }
});
test('Odd Words columns are centered as a group and vertically centered, independent of seed',async()=>{
 const w=await widths();
 for(const module of [shortOdd,longOdd,{...longOdd,seed:22}]){
  assert.deepEqual(validateSmallModule(module),[]);
  const plan=planOddWords(module,w.title,w.puzzle);
  const preview=planOddWords(module,w.browserTitle,w.browserPuzzle);
  assert.ok(plan&&preview);
  assert.deepEqual(plan.left,preview.left);
  assert.deepEqual(plan.right,preview.right);
  assert.equal(plan.left.length,Math.ceil(shuffledWordList(module).length/2));
  assert.equal(plan.right.length,Math.floor(shuffledWordList(module).length/2));
  assert.ok(Math.abs((plan.groupLeft+plan.groupRight)/2-SMALL_PRINT_WIDTH/2)<.001);
  assert.ok(plan.left.every(x=>x.x>=2&&x.x+w.puzzle(x.text,plan.fontSize)<=SMALL_PRINT_WIDTH));
  assert.ok(plan.right.every(x=>x.x>=2&&x.x+w.puzzle(x.text,plan.fontSize)<=SMALL_PRINT_WIDTH));
  const rows=Math.max(plan.left.length,plan.right.length);
  const positions=plan.left.map(x=>x.y);
  assert.ok(positions.every(x=>x>35&&x<SMALL_PRINT_HEIGHT-2));
  if(rows>1)assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]+10));
  assert.deepEqual([...plan.left,...plan.right].map(x=>x.text).sort(),
   shuffledWordList(module).map(x=>x.text.toUpperCase()).sort());
 }
});
test('Unscramble title is identical without exclamation in preview and PDF',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/SmallModulePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/smallPdf.ts',import.meta.url),'utf8')]);
 assert.match(preview,/>UNSCRAMBLE THE WORDS<\/div>/u);
 assert.match(pdf,/'UNSCRAMBLE THE WORDS'/u);
 assert.doesNotMatch(preview,/UNSCRAMBLE THE WORDS!/u);
 assert.doesNotMatch(pdf,/UNSCRAMBLE THE WORDS!/u);
});
test('Other Small activities and Draw a Picture retain existing renderer/source wiring',async()=>{
 const [preview,pdf,module]=await Promise.all([
  readFile(new URL('../src/SmallModulePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/smallPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/modulePdf.ts',import.meta.url),'utf8'),
 ]);
 for(const type of ['true-false','first-letters','checkboxes','who-am-i']){
  assert.match(preview,new RegExp("case '"+type+"'")); 
  assert.match(pdf,new RegExp("case '"+type+"'")); 
 }
 assert.match(module,/function drawPicture\(/u);
 assert.doesNotMatch(preview,/case 'draw-picture'/u);
});
test('Small Choice and Odd Words both export on physical two-sheet booklet',async()=>{
 const data=await assets();
 const draft={title:'God Keeps His Promises',scripture:'Genesis 6–9',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{
   '2:top-left-small':longChoice,'2:top-right-small':longOdd,
   '3:bottom-left-small':shortChoice,'3:bottom-right-small':shortOdd,
   '4:bottom-left-small':{type:'unscramble-words',first:'NOAH',second:'RAINBOW',seed:5},
  },
 };
 const bytes=await createBookletPdf(draft,data);
 const pdf=await PDFDocument.load(bytes);
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
