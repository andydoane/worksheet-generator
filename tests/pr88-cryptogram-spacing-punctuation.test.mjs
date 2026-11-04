import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {generateCryptogram} from '../src/cryptograms.ts';
import {
 planVerseCryptogram,LARGE_CIPHER_WIDTH,LARGE_CIPHER_HEIGHT,
 VERSE_CIPHER_MAX_LINE_STEP,
} from '../src/verseCryptogramLayout.ts';
import {createBookletPdf} from '../src/pdf.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url));
const files=async()=>({
 mouseMemoirs:await read('fonts/MouseMemoirs-Regular.ttf'),
 nunitoSans:await read('fonts/Nunito-Medium.ttf'),
 nunitoSans750:await read('fonts/Nunito-Bold.ttf'),
 nunitoSans900:await read('fonts/Nunito-ExtraBold.ttf'),
 zillaSlab:await read('fonts/ZillaSlab-Bold-pdf.ttf'),
});
async function measureNunito(){
 const document=await PDFDocument.create();
 document.registerFontkit(fontkit);
 const face=await document.embedFont(await read('fonts/Nunito-Medium.ttf'),{subset:false});
 return (text,size)=>face.widthOfTextAtSize(text,size);
}
const psalm={type:'verse-cryptogram',reference:'Psalm 128:1',
 verse:'Blessed are all who fear the LORD—who walk in His ways!',seed:2};

test('roomy cryptogram rows expand to 48pt without changing word or handwriting fitting',async()=>{
 const measure=await measureNunito(),data=generateCryptogram(psalm);
 const roomy=planVerseCryptogram(data,measure);
 assert.ok(roomy);
 assert.ok(roomy.lineCount>=4);
 assert.equal(VERSE_CIPHER_MAX_LINE_STEP,48);
 assert.ok(roomy.lineStep>42,'Psalm should benefit from the extra breathing room');
 assert.ok(roomy.lineStep<=VERSE_CIPHER_MAX_LINE_STEP);
 const bodyTop=102,bodyBottom=LARGE_CIPHER_HEIGHT-8;
 const inkHeight=roomy.symbolTopOffset+roomy.symbolSize;
 const available=bodyBottom-bodyTop;
 assert.ok(Math.abs(roomy.lineStep-Math.min(VERSE_CIPHER_MAX_LINE_STEP,
   (available-inkHeight)/(roomy.lineCount-1)))<.0001);
 const firstTop=roomy.lineYs[0];
 const lastBottom=roomy.lineYs.at(-1)+inkHeight;
 assert.ok(Math.abs((firstTop-bodyTop)-(bodyBottom-lastBottom))<.001,
  'Extra space must remain symmetrically distributed above and below the rows');
 assert.ok(roomy.bodyCells.every(c=>c.lineY+inkHeight<=bodyBottom+.001));
 assert.ok(roomy.lineWidths.every(w=>w<=LARGE_CIPHER_WIDTH-8+.001));
});

test('pitch falls back to available space and never squeezes existing legible cells',async()=>{
 const measure=await measureNunito(),data=generateCryptogram(psalm);
 const roomy=planVerseCryptogram(data,measure);
 assert.ok(roomy);
 const inkHeight=roomy.symbolTopOffset+roomy.symbolSize;
 const tightHeight=102+8+inkHeight+(roomy.lineCount-1)*41;
 const tight=planVerseCryptogram(data,measure,LARGE_CIPHER_WIDTH,tightHeight);
 assert.ok(tight);
 assert.equal(tight.cipherCell,roomy.cipherCell);
 assert.equal(tight.lineCount,roomy.lineCount);
 assert.ok(Math.abs(tight.lineStep-41)<.001);
 assert.ok(tight.lineStep<roomy.lineStep);
 assert.deepEqual(tight.lineWidths,roomy.lineWidths);
 assert.deepEqual(tight.bodyCells.map(c=>c.char),roomy.bodyCells.map(c=>c.char));
 const one=planVerseCryptogram(generateCryptogram({type:'verse-cryptogram',
  reference:'John 11:35',verse:'Jesus wept!',seed:3}),measure);
 assert.ok(one);
 assert.equal(one.lineCount,1);
 assert.equal(one.lineStep,0);
});

test('punctuation shares the answer-line baseline in the Large preview and PDF',async()=>{
 const measure=await measureNunito();
 const module={type:'verse-cryptogram',reference:'Exodus 14:14',
  verse:'Be still, and know! Who can stand? The LORD—He is good.',seed:7};
 const result=generateCryptogram(module),plan=planVerseCryptogram(result,measure);
 assert.ok(plan);
 assert.match(result.text,/LORD — He/u,'The existing print-only em dash spacing remains');
 const punctuation=plan.bodyCells.filter(c=>c.symbol===undefined);
 for(const char of ['!', '?', ',', '.', '—'])
  assert.ok(punctuation.some(c=>c.char===char),'Missing punctuation: '+char);
 for(const c of punctuation){
  assert.ok(plan.lineYs.includes(c.lineY));
  assert.ok(c.x>=0&&c.x+c.width<=LARGE_CIPHER_WIDTH+.001);
 }
 const [preview,pdf]=await Promise.all([
  read('src/CryptogramPreview.tsx').then(b=>b.toString()),
  read('src/cryptogramPdf.ts').then(b=>b.toString()),
 ]);
 assert.match(preview,/<text key=\{'punct-'\+i\} x=\{cell\.x\} y=\{cell\.lineY\}/u);
 assert.match(pdf,/page\.drawText\(cell\.char,\{x,y:answerY,font:fonts\.body,size:10,color:INK\}\)/u);
 assert.match(preview,/y1=\{cell\.lineY\} y2=\{cell\.lineY\}/u);
 assert.match(pdf,/const x=box\.x\+cell\.x,answerY=top-cell\.lineY;/u);
 assert.doesNotMatch(preview,/y=\{cell\.lineY\+[12]\}/u);
 assert.doesNotMatch(pdf,/y:answerY-[12],font:fonts\.body/u);
});

test('approved Exodus 15:11 cryptogram still fits and exports with punctuation',async()=>{
 const approved=JSON.parse(await read(
  'curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
 const verse=approved.preparedActivities.verseCryptogram;
 const module={type:'verse-cryptogram',reference:verse.reference,
  verse:verse.verse,seed:8};
 const measure=await measureNunito(),plan=planVerseCryptogram(generateCryptogram(module),measure);
 assert.ok(plan);
 assert.ok(plan.lineYs.every((y,i)=>i===0||y>plan.lineYs[i-1]));
 assert.ok(plan.lineStep<=VERSE_CIPHER_MAX_LINE_STEP);
 assert.ok(plan.bodyCells.some(c=>c.char==='—'));
 const bytes=await createBookletPdf({title:'Verse Print Check',scripture:'Exodus 15:11',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules:{'2:bottom-large':psalm,'3:top-large':module},
 },await files());
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),
  [[792,612],[792,612]]);
});
