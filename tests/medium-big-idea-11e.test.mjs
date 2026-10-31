import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planBigIdeaCryptogram,BIG_IDEA_ANSWER_LINE_WIDTH,
 BIG_IDEA_CELL_WIDTH,BIG_IDEA_SYMBOL_SIZE} from '../src/bigIdeaCryptogramLayout.ts';
import {generateCryptogram,validateCryptogram} from '../src/cryptograms.ts';
import {createBookletPdf} from '../src/pdf.ts';

const examples=[
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
const compareNumbers=(left,right)=>{
 assert.equal(left.length,right.length);
 for(let i=0;i<left.length;i++){
  for(const key of Object.keys(left[i])){
   const a=left[i][key],b=right[i][key];
   if(typeof a==='number')assert.ok(Math.abs(a-b)<.015,key+' '+a+' vs '+b);
   else assert.equal(a,b);
  }
 }
};
test('Big Idea remains limited to 62 characters with up to 18 unique letters',()=>{
 assert.equal(examples[2].length,62);
 for(const idea of examples){
  assert.deepEqual(validateCryptogram({type:'big-idea-cryptogram',idea,seed:1}),[]);
 }
 assert.ok(validateCryptogram({type:'big-idea-cryptogram',idea:'X'.repeat(63)+'abc',seed:1}).length);
});
test('Preview and PDF have identical measured, centered print coordinates',async()=>{
 const medium=await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url));
 const face=fontkit.create(medium),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const embedded=await doc.embedFont(medium,{subset:false});
 const browser=(text,size)=>face.layout(text).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*size/face.unitsPerEm;
 const pdf=(text,size)=>embedded.widthOfTextAtSize(text,size);
 const plans=[];
 for(const [i,idea] of examples.entries()){
  const result=generateCryptogram({type:'big-idea-cryptogram',idea,seed:i+1});
  const p=planBigIdeaCryptogram(result,browser),q=planBigIdeaCryptogram(result,pdf);
  assert.ok(p&&q,'Layout failed for '+idea);
  assert.equal(p.lineCount,q.lineCount);
  assert.deepEqual(p.lineYs,q.lineYs);
  compareNumbers(p.bodyCells,q.bodyCells);
  compareNumbers(p.keyCells,q.keyCells);
  plans.push(p);
  assert.ok(p.lineCount<=3);
  assert.ok(p.firstLineGap>=18);
  assert.ok(p.lineYs.every(y=>y>=p.keyTop+p.keyHeight+18));
  assert.ok(p.lineYs.at(-1)+4+BIG_IDEA_SYMBOL_SIZE<172.8-4);
  assert.ok(p.bodyCells.every(c=>c.x>=3&&c.x+c.width<=331.2-3));
  for(const y of p.lineYs){
   const row=p.bodyCells.filter(c=>c.lineY===y);
   const start=row[0].x,end=row.at(-1).x+row.at(-1).width;
   assert.ok(Math.abs((start+end)/2-331.2/2)<.025);
  }
 }
 assert.equal(plans[2].lineCount,3,'Dense 62-character example needs three readable rows');
 assert.ok(plans[2].lineStep>=28);
 assert.equal(BIG_IDEA_CELL_WIDTH,13,'Never shrink horizontal handwriting pitch');
 assert.equal(BIG_IDEA_ANSWER_LINE_WIDTH,11.2,'Never shrink individual handwriting lines');
 assert.ok(BIG_IDEA_SYMBOL_SIZE<10,'Symbols should be shorter than their previous 10pt size');
});
test('The Medium preview and PDF both delegate to shared layout, Large remains separate',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/BigIdeaCryptogramPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/cryptogramPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/planBigIdeaCryptogram\(generateCryptogram\(module\),finishBody\)/);
 assert.match(pdf,/planBigIdeaCryptogram\(data,\(text,size\)=>width\(fonts\.body,text,size\)/);
 assert.match(pdf,/if\(module.type==='big-idea-cryptogram'\)/);
 assert.match(pdf,/function drawBigIdeaCryptogramPdf/u);
});
test('Short, typical and dense Big Ideas export in existing two-sheet booklet geometry',async()=>{
 const modules=Object.fromEntries(examples.map((idea,i)=>[
  (i+2)+':top-medium',{type:'big-idea-cryptogram',idea,seed:i+1},
 ]));
 const draft={title:'God Guides Us',scripture:'Psalm 23',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules};
 const output=await createBookletPdf(draft,await fonts());
 const doc=await PDFDocument.load(output);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
