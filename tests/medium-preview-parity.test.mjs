import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
  MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,planMatching,planMistakes,
} from '../src/mediumParityLayout.ts';
import {matchRows} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const files=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
const measureBrowser=(bytes)=>{const face=fontkit.create(bytes);
  return (text,size)=>face.layout(text).positions.reduce((sum,pos)=>sum+pos.xAdvance,0)*size/face.unitsPerEm;
};
async function measures(){
 const inputs=await files(),document=await PDFDocument.create();
 document.registerFontkit(fontkit);
 const browser={
  body:measureBrowser(inputs.nunitoSans),
  bold:measureBrowser(inputs.nunitoSans750),
  puzzle:measureBrowser(inputs.zillaSlab),
 };
 const b=await document.embedFont(inputs.nunitoSans,{subset:false});
 const bb=await document.embedFont(inputs.nunitoSans750,{subset:false});
 const z=await document.embedFont(inputs.zillaSlab,{subset:false});
 return {
  browser,pdf:{body:(s,n)=>b.widthOfTextAtSize(s,n),
    bold:(s,n)=>bb.widthOfTextAtSize(s,n),
    puzzle:(s,n)=>z.widthOfTextAtSize(s,n)},
 };
}
const pairs3='Moses, Leader\nPharaoh, King\nIsraelites, People';
const pairs6=[
 'Israelites, People of Israel',
 'Pharaoh, King of Egypt',
 'Moses, Faithful leader',
 'Miriam, Sister of Moses',
 'Red Sea, Sea of deliverance',
 'Wilderness, Desert journey',
].join('\n');
const textShort='Daniel lived in Egypt. Daniel prayed to idols. The lions were not hungry.';
const textLong=[
 'God led the Israelites out of Egypt and through the wilderness.',
 'Moses told the people that Pharaoh would not follow them, but the Egyptians pursued.',
 'The people were afraid and wanted to return to Egypt.',
 'The sea opened only after everyone built boats to cross.',
 'They walked through the sea on dry ground, and God protected them from the army.',
].join(' ');

test('medium measurements preserve the original exact physical print area',()=>{
 assert.ok(Math.abs(MEDIUM_PRINT_WIDTH-331.2)<.001);
 assert.ok(Math.abs(MEDIUM_PRINT_HEIGHT-172.8)<.001);
});
test('Match preview/PDF share line wraps, column alignment and row baselines for 3 and 6 pairs',async()=>{
 const {browser,pdf}=await measures();
 for(const [pairs,seed] of [[pairs3,1],[pairs6,3]]){
  const rows=matchRows({type:'match-words',pairs,seed});
  const a=planMatching(rows,browser.bold,browser.puzzle);
  const b=planMatching(rows,pdf.bold,pdf.puzzle);
  assert.ok(a&&b);
  assert.deepEqual(a.instructions.map(x=>x.text),b.instructions.map(x=>x.text));
  assert.equal(a.fontSize,b.fontSize);
  assert.equal(a.leftRows.length,rows.length);
  assert.equal(a.rightRows.length,rows.length);
  assert.ok(Math.abs(a.leftEdge-7)<.001);
  assert.ok(Math.abs(a.rightEdge-(MEDIUM_PRINT_WIDTH-7))<.001);
  for(let i=0;i<rows.length;i++){
   assert.equal(a.leftRows[i].x,a.leftEdge);
   assert.equal(a.rightRows[i].x,a.rightEdge);
   assert.ok(Math.abs(a.leftRows[i].y-b.leftRows[i].y)<.001);
   assert.ok(Math.abs(a.rightRows[i].y-b.rightRows[i].y)<.001);
   assert.equal(a.leftRows[i].y,a.rightRows[i].y);
   assert.ok(browser.puzzle(a.rightRows[i].text,a.fontSize)<MEDIUM_PRINT_WIDTH/2-18);
  }
 }
});
test('Circle preview/PDF have the same wrapped rows, smaller text and expanded line pitch',async()=>{
 const {browser,pdf}=await measures();
 for(const text of [textShort,textLong]){
  const a=planMistakes(text,browser.body);
  const b=planMistakes(text,pdf.body);
  assert.ok(a&&b,'Example paragraphs should print without clipping');
  assert.deepEqual(a.lines.map(x=>x.text),b.lines.map(x=>x.text));
  assert.equal(a.fontSize,b.fontSize);
  assert.ok(a.fontSize<=11.5&&a.fontSize>=8);
  assert.ok(a.lineStep>=a.fontSize*1.7);
  assert.ok(a.lines.every(line=>line.y<MEDIUM_PRINT_HEIGHT-9));
  assert.ok(a.lines.every((line,i)=>Math.abs(line.y-b.lines[i].y)<.001));
 }
});
test('Match and Circle use their measured planners in both preview and PDF',async()=>{
 const [preview,storyPreview,matchPdf,storyPdf]=await Promise.all([
  readFile(new URL('../src/MediumPrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/StoryVersePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/modulePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/storyVersePdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/planMatching\(matchRows\(module\),bold,puzzle\)/);
 assert.match(preview,/planMistakes\(module\.text,body\)/);
 assert.match(storyPreview,/<MistakesPrintPreview module=\{module\}/);
 assert.match(matchPdf,/planMatching\(matchRows\(module\)/);
 assert.match(storyPdf,/planMistakes\(m\.text/);
});
test('Match and Circle examples preserve folded two-sheet US Letter export',async()=>{
 const draft={title:'God Leads His People',scripture:'Exodus 14',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
    '2:top-medium':{type:'match-words',pairs:pairs3,seed:2},
    '2:middle-medium':{type:'circle-mistakes',text:textShort,count:3},
    '3:top-medium':{type:'match-words',pairs:pairs6,seed:5},
    '3:middle-medium':{type:'circle-mistakes',text:textLong,count:5},
  }};
 const output=await createBookletPdf(draft,await files());
 const doc=await PDFDocument.load(output);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
