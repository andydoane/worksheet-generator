import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {glyphInkCenter} from '../src/fontInkCenter.ts';
import {planFinishVerse} from '../src/finishVerseLayout.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
const raw=async(name)=>readFile(new URL('../fonts/'+name,import.meta.url));
async function metrics(){
 const [bodyBytes,bankBytes,titleBytes,puzzleBytes]=await Promise.all([
  raw('Nunito-Medium.ttf'),raw('Nunito-ExtraBold.ttf'),
  raw('MouseMemoirs-Regular.ttf'),raw('ZillaSlab-Bold-pdf.ttf')]);
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [body,bank,title,puzzle]=await Promise.all([
  doc.embedFont(bodyBytes),doc.embedFont(bankBytes),
  doc.embedFont(titleBytes),doc.embedFont(puzzleBytes)]);
 const face=fontkit.create(bankBytes);
 return {title:(s,n)=>title.widthOfTextAtSize(s,n),
  body:(s,n)=>body.widthOfTextAtSize(s,n),
  bank:(s,n)=>bank.widthOfTextAtSize(s,n),
  puzzle:(s,n)=>puzzle.widthOfTextAtSize(s,n),
  bankInkCenter:(s,n)=>glyphInkCenter(face,s,n)};
}
const long={type:'finish-verse',reference:'Isaiah 41:10',seed:5,
 verse:'fear not, for I am with [you]; be not dismayed, for I am your [God]; I will strengthen you, I will [help] you, I will uphold you with my righteous right [hand].'};
const exodus={type:'finish-verse',reference:'Exodus 15:11',seed:4,
 verse:'[Who] is like you, O [Lord], among the [gods]? Who is like you, [majestic] in holiness, [awesome] in glorious [deeds], doing [wonders]?'};
const short={type:'finish-verse',reference:'John 3:16',seed:1,
 verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'};
test('bank words are centered by visible glyph ink within each available bank row',async()=>{
 const m=await metrics();
 const p=planFinishVerse(long,m);
 assert.ok(p);
 const centers=p.bankWords.map(w=>w.y-m.bankInkCenter(w.text,p.bankFontSize));
 const unique=Array.from(new Set(centers.map(x=>x.toFixed(3))));
 assert.ok(unique.length<=2);
 const rowHeight=(p.bankHeight-7)/unique.length;
 const expected=p.bankTop+3.5+rowHeight/2;
 assert.ok(Math.abs(Number(unique[0])-expected)<.05);
 assert.ok(p.bankWords.every(w=>w.y>p.bankTop));
});
test('Finish optimizes across sizes and lines, with safe square blanks and centered composition',async()=>{
 const m=await metrics();
 const plans=[short,exodus,long].map(x=>planFinishVerse(x,m));
 assert.ok(plans.every(Boolean));
 const [pShort,pExodus,pLong]=plans;
 assert.ok(pShort.fontSize>11,'A short passage should be allowed to grow beyond the old 11pt cap');
 assert.ok(pLong.fontSize>=8.5&&pLong.fontSize<=16);
 assert.ok(pExodus.fontSize>=8.5);
 for(const p of plans){
  assert.equal(p.cell,p.boxHeight);
  assert.ok(p.cell>=12.3);
  assert.ok(p.lineStep<=Math.max(p.cell+3.5,p.fontSize*1.5)+.01);
  const all=p.words.map(w=>w.y);
  assert.ok(Math.min(...all)>p.bankTop+p.bankHeight);
  assert.ok(Math.max(...all)+2.3<173);
  const bodyRows=new Map();
  for(const w of p.words){const row=bodyRows.get(w.y)??[];row.push(w);bodyRows.set(w.y,row);}
  for(const row of bodyRows.values()){
   const start=row[0].x,end=row.at(-1).x+row.at(-1).width;
   assert.ok(Math.abs((start+end)/2-331.2/2)<.03);
  }
  const compositionTop=p.titleY-p.titleSize*.8;
  const compositionBottom=Math.max(...all)+2.3;
  assert.ok(Math.abs((compositionTop+compositionBottom)/2-172.8/2)<.03);
 }
});
test('Unscramble combines its reference into the title and brings scrambled letters up',async()=>{
 const m=await metrics();
 const data={type:'unscramble-verse',reference:'1 Thessalonians 5:16',seed:1,
  verse:'[Pray] without [ceasing!] and [rejoice] with [others].'};
 const p=planUnscrambleVerse(data,m);
 assert.ok(p);
 assert.equal(p.title,'UNSCRAMBLE 1 THESS. 5:16');
 assert.equal(p.reference,undefined);
 assert.equal(p.referenceY,undefined);
 assert.equal(p.glyphOffset,11.5);
 assert.equal(p.lineStep,29);
});
test('Upside has smaller inverted lettering, closer letters and bounded adaptive pitch',async()=>{
 const m=await metrics();
 const data={type:'upside-down-verse',reference:'Isaiah 41:10',
 verse:'fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'};
 const p=planUpsideDownVerse(data,m);
 assert.ok(p);
 assert.ok(p.invertedFontSize<p.fontSize);
 assert.ok(p.glyphOffset<9);
 assert.ok(p.lineStep>=p.glyphOffset+p.invertedFontSize+2);
 assert.ok(p.marks.every(mark=>mark.y+p.glyphOffset+p.invertedFontSize<173));
});
