import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {balanceUnscrambleRows,planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {planBigIdeaCryptogram,BIG_IDEA_CELL_WIDTH,BIG_IDEA_MAX_CELL_WIDTH,
 BIG_IDEA_SYMBOL_SIZE} from '../src/bigIdeaCryptogramLayout.ts';
import {validateStoryVerse,parseVerse,verseScrambles} from '../src/storyVerseModules.ts';
import {generateCryptogram,validateCryptogram} from '../src/cryptograms.ts';
import {readAssignments,validateModule} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const shortVerse={type:'unscramble-verse',reference:'John 3:16',seed:3,
 verse:'For [God] so [loved] the [world] that he [gave] his Son.'};
const eightVerse={type:'unscramble-verse',reference:'Isaiah 41:10',seed:5,
 verse:'Do not [fear], for I am [with] you; do not be [dismayed], for I am your [God]. I will [empower] you and [help] you; I will [uphold] you with my right [hand].'};
const longVerse={type:'unscramble-verse',reference:'Psalm 46:1–3',seed:11,
 verse:'God is our [refuge] and [strength], an ever-present [help] in [trouble]. Therefore we will not [fear], though the [earth] give way and the mountains [fall] into the heart of the [sea]. God remains close to his people through every season.'};
const legacy={type:'unscramble-verse',reference:'Psalm 46:1',seed:8,
 verse:'God is our [refuge] and [strength] in times of [trouble] and [fear].'};
const codeExamples=[
 'God is good.',
 'God calls us to love others.',
 'Jesus gives us hope and teaches us to serve one another.',
 'God gives courage to our hearts and teaches us to help others.',
];
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function measurements(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const metricFiles={title:files.mouseMemoirs,body:files.nunitoSans,puzzle:files.zillaSlab};
 const pdf={},browser={};
 for(const [key,value] of Object.entries(metricFiles)){
  const embedded=await doc.embedFont(value,{subset:false}),face=fontkit.create(value);
  pdf[key]=(text,size)=>embedded.widthOfTextAtSize(text,size);
  browser[key]=(text,size)=>face.layout(text).glyphs.reduce(
   (sum,glyph)=>sum+glyph.advanceWidth,0)*size/face.unitsPerEm;
 }
 return {files,pdf,browser};
}
test('Balanced word-boundary partition avoids a tiny greedy final line',()=>{
 const chunks=[35,35,30,30,30].map((width,index)=>({index,width}));
 const rows=balanceUnscrambleRows(chunks,0,100,2);
 assert.deepEqual(rows?.map(row=>row.map(x=>x.index)),[[0,1],[2,3,4]]);
 assert.deepEqual(rows?.map(row=>row.reduce((s,x)=>s+x.width,0)),[70,90]);
 assert.equal(balanceUnscrambleRows(chunks,0,60,2),null);
});
test('Eight bracketed blanks validate and old 4-to-6 blank drafts remain intact',()=>{
 for(const m of [shortVerse,eightVerse,longVerse,legacy]){
  assert.deepEqual(validateStoryVerse(m),[]);
  assert.equal(verseScrambles(m).length,parseVerse(m.verse).answers.length);
 }
 assert.equal(parseVerse(eightVerse.verse).answers.length,8);
 assert.equal(parseVerse(longVerse.verse).answers.length,8);
 const extra={...eightVerse,verse:eightVerse.verse+' [never]'};
 assert.ok(validateStoryVerse(extra).some(x=>/4–8/u.test(x)));
 const saved=readAssignments({'2:top-medium':legacy});
 assert.deepEqual(saved['2:top-medium'],legacy);
 assert.deepEqual(validateModule(saved['2:top-medium']),[]);
});
test('Unscramble uses centered balanced rows and preserves handwriting pitch',async()=>{
 const {pdf,browser}=await measurements();
 for(const module of [shortVerse,eightVerse,longVerse,legacy]){
  const a=planUnscrambleVerse(module,pdf),b=planUnscrambleVerse(module,browser);
  assert.ok(a&&b,'Unable to fit '+module.verse);
  assert.equal(a.rowCount,b.rowCount);
  assert.equal(a.rowWidths.length,b.rowWidths.length);
  for(let i=0;i<a.rowWidths.length;i++)
   assert.ok(Math.abs(a.rowWidths[i]-b.rowWidths[i])<.02);
  assert.ok(Math.abs(a.lineStep-b.lineStep)<.02);
  assert.ok(a.lineStep>=29&&a.fontSize>=8.5);
  assert.equal(a.rowWidths.length,a.rowCount);
  assert.ok(a.rowWidths.every(w=>w<=331.2-8+.001&&w>0));
  if(a.rowCount>=2){
   const smallest=Math.min(...a.rowWidths),largest=Math.max(...a.rowWidths);
   assert.ok(smallest>=largest*.47,'Unbalanced rows '+a.rowWidths.join(','));
  }
  assert.ok(a.marks.every(mark=>mark.x>=3&&mark.x<331.2-3));
  assert.ok(a.marks.every(mark=>mark.y+a.glyphOffset+a.invertedFontSize<172.8));
  const allLines=a.marks.filter(m=>m.kind==='letter');
  const expectedLetters=parseVerse(module.verse).answers.reduce(
   (sum,v)=>sum+(v.match(/\p{L}/gu)??[]).length,0);
  assert.equal(allLines.length,expectedLetters);
  assert.ok(allLines.every(m=>m.scramble?.length===1));
  assert.ok(new Set(a.marks.map(mark=>mark.y)).size===a.rowCount);
 }
});
test('Upside Down Verse keeps its independent greedy wrapping and saved text',async()=>{
 const {pdf}=await measurements();
 const module={type:'upside-down-verse',reference:'Isaiah 41:10',
  verse:'The Lord guides us in love through all the challenges of life.'};
 const a=planUpsideDownVerse(module,pdf);
 assert.ok(a&&a.rowWidths.length===a.rowCount);
 assert.ok(a.marks.some(mark=>mark.upside));
});
test('Solve the Code enlarges sparse cells, symbols, and handwriting lines',async()=>{
 const {pdf,browser}=await measurements();
 const widths=[];
 for(let i=0;i<codeExamples.length;i++){
  const idea=codeExamples[i],module={type:'big-idea-cryptogram',idea,seed:7+i};
  assert.deepEqual(validateCryptogram(module),[]);
  const encoded=generateCryptogram(module);
  const a=planBigIdeaCryptogram(encoded,pdf.body);
  const b=planBigIdeaCryptogram(encoded,browser.body);
  assert.ok(a&&b,'Could not fit '+idea);
  assert.ok(Math.abs(a.cellWidth-b.cellWidth)<.00001);
  assert.ok(Math.abs(a.symbolSize-b.symbolSize)<.00001);
  assert.ok(Math.abs(a.answerLineWidth-b.answerLineWidth)<.00001);
  assert.deepEqual(a.lineYs,b.lineYs);
  assert.equal(a.lineCount,b.lineCount);
  assert.ok(a.lineCount<=3&&a.lineCount>=1);
  assert.ok(a.cellWidth>=BIG_IDEA_CELL_WIDTH&&a.cellWidth<=BIG_IDEA_MAX_CELL_WIDTH);
  assert.ok(a.answerLineWidth>=11.2&&a.answerLineWidth<a.cellWidth);
  assert.ok(a.symbolSize>=BIG_IDEA_SYMBOL_SIZE);
  assert.ok(a.firstLineGap>=18&&a.lineCount===1||a.lineStep>=28);
  assert.ok(a.lineYs.at(-1)+4+a.symbolSize<172.8-3);
  const letterCells=a.bodyCells.filter(x=>x.symbol!==undefined);
  assert.equal(letterCells.length,(idea.match(/[A-Za-z]/gu)??[]).length);
  assert.ok(letterCells.every(x=>x.width===a.cellWidth));
  assert.ok(a.bodyCells.every(x=>x.x>=3&&x.x+x.width<=331.2-3));
  for(let j=0;j<a.bodyCells.length;j++){
   assert.equal(a.bodyCells[j].char,b.bodyCells[j].char);
   assert.ok(Math.abs(a.bodyCells[j].x-b.bodyCells[j].x)<.02);
  }
  widths.push(a.cellWidth);
 }
 assert.equal(widths[0],BIG_IDEA_MAX_CELL_WIDTH,'Short text should receive maximum room');
 assert.ok(widths[0]>widths.at(-1),'Dense 62-character text must use narrower cells');
});
test('Preview and PDF consume adaptive measurements; Large cipher is untouched',async()=>{
 const [preview,pdf,versePreview,editor]=await Promise.all([
  readFile(new URL('../src/BigIdeaCryptogramPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/cryptogramPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/VerseReconstructionPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/StoryVerseEditor.tsx',import.meta.url),'utf8'),
 ]);
 for(const term of ['state.cellWidth','state.symbolSize','state.answerLineWidth'])
  assert.ok(preview.includes(term),'SVG missing '+term);
 for(const term of ['plan.cellWidth','plan.symbolSize','plan.answerLineWidth'])
  assert.ok(pdf.includes(term),'PDF missing '+term);
 assert.match(pdf,/if\(module.type==='big-idea-cryptogram'\)/u);
 assert.match(versePreview,/planUnscrambleVerse/u);
 assert.match(editor,/const maxBlanks=8;/u);
});
test('Short and max-content Medium modules export on folded sheets',async()=>{
 const {files}=await measurements();
 const modules={
  '2:top-medium':shortVerse,
  '2:middle-medium':{type:'big-idea-cryptogram',idea:codeExamples[0],seed:3},
  '3:top-medium':eightVerse,
  '3:middle-medium':{type:'big-idea-cryptogram',idea:codeExamples[2],seed:8},
  '4:top-medium':longVerse,
  '4:middle-medium':{type:'big-idea-cryptogram',idea:codeExamples[3],seed:12},
 };
 const data=await createBookletPdf({
  title:'God Is With Us',scripture:'Isaiah 41:10',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',
   4:'medium-medium-small-small'},modules,
 },files);
 const pdf=await PDFDocument.load(data);
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
