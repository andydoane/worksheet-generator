import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 scatterWords,scatterHasCollision,scatterCoverage,expandScatterCoverage,
 CONNECT_SCATTER_FONT_SCALE,
} from '../src/wordScatterLayout.ts';
import {planConnectBigIdea} from '../src/connectBigIdeaLayout.ts';
import {planConnectVerse} from '../src/connectVerseLayout.ts';
import {parseConnectionWords,validateSpecialty} from '../src/specialtyModules.ts';
import {CRYPTOGRAM_MODULES,generateCryptogram,validateCryptogram} from '../src/cryptograms.ts';
import {blankModule,readAssignments,moduleForSize} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const seven='The Lord God is a mighty Savior';
const cases=[
 'God saves his people',
 seven,
 'God is with us and gives strength and hope to his children',
 'The Lord is with us and gives us strength to love our neighbors and help one another every day together.',
];
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [puzzle,bank,subtitle,verse]=await Promise.all([
  doc.embedFont(files.zillaSlab,{subset:false}),
  doc.embedFont(files.nunitoSans900,{subset:false}),
  doc.embedFont(files.nunitoSans,{subset:false}),
  doc.embedFont(files.nunitoSans750,{subset:false}),
 ]);
 const face=fontkit.create(files.zillaSlab);
 return {files,
  pdf:{
   puzzle:(str,size)=>puzzle.widthOfTextAtSize(str,size),
   bank:(str,size)=>bank.widthOfTextAtSize(str,size),
   subtitle:(str,size)=>subtitle.widthOfTextAtSize(str,size),
   verse:(str,size)=>verse.widthOfTextAtSize(str,size),
  },
  browser:{
   puzzle:(str,size)=>face.layout(str).glyphs.reduce((n,g)=>n+g.advanceWidth,0)*size/face.unitsPerEm,
   bank:(str,size)=>bank.widthOfTextAtSize(str,size),
   subtitle:(str,size)=>subtitle.widthOfTextAtSize(str,size),
  }};
}
test('Seven-word sample, short and 20-word messages are valid Connect Big Ideas',()=>{
 assert.equal(parseConnectionWords(seven).length,7);
 for(const idea of cases){
  assert.deepEqual(validateSpecialty({type:'connect-big-idea',idea,seed:2}),[]);
 }
 assert.equal(CONNECT_SCATTER_FONT_SCALE,.8);
});
test('Affine coverage expansion preserves conservative collision clearance and word typography',async()=>{
 const {pdf}=await metrics();
 for(const idea of cases){
  const words=parseConnectionWords(idea);
  for(const seed of [1,2,3,5,12,29]){
   const full=planConnectBigIdea({type:'connect-big-idea',idea,seed},pdf);
   assert.ok(full,'Failed layout for '+words.length+' words, seed '+seed);
   const originals=scatterWords({
    words,seed,key:idea,field:full.field,measure:pdf.puzzle,
    maxFont:full.fontSize,minFont:full.fontSize,
    gap:2.6,gapReferenceFont:words.length>=17?11.5:words.length>=13?12.5:13.5,
   });
   assert.ok(originals);
   const base=scatterCoverage(originals.words,full.field);
   const after=scatterCoverage(full.scattered,full.field);
   assert.ok(after.width+1e-7>=base.width,'width shrank: '+seed+' '+idea);
   assert.ok(after.height+1e-7>=base.height,'height shrank: '+seed+' '+idea);
   assert.ok(after.width>.80,'Need more horizontal use: '+JSON.stringify({idea,seed,base,after}));
   assert.ok(after.height>.80,'Need more vertical use: '+JSON.stringify({idea,seed,base,after}));
   assert.ok(after.width<=1.00001&&after.height<=1.00001);
   assert.equal(full.scattered.length,words.length);
   const originalByOrder=new Map(originals.words.map(w=>[w.order,w]));
   const originalMaxFont=words.length>=17?11.5:words.length>=13?12.5:13.5;
   const clearance=2.6*Math.max(.75,originalMaxFont/11);
   assert.equal(scatterHasCollision(full.scattered,clearance-0.0001),false);
   for(const word of full.scattered){
    const old=originalByOrder.get(word.order);
    assert.ok(old);
    assert.equal(word.word,old.word);
    assert.equal(word.fontSize,old.fontSize);
    assert.equal(word.angle,old.angle);
    assert.deepEqual(word.glyphs,old.glyphs);
    assert.ok(word.bounds.x>=full.field.x-0.0001&&word.bounds.y>=full.field.y-0.0001);
    assert.ok(word.bounds.x+word.bounds.width<=full.field.x+full.field.width+.0001);
    assert.ok(word.bounds.y+word.bounds.height<=full.field.y+full.field.height+.0001);
   }
   assert.deepEqual(full,planConnectBigIdea({type:'connect-big-idea',idea,seed},pdf));
  }
 }
});
test('Coverage helper cannot change words or create an overlap on hand-picked boxes',()=>{
 const field={x:0,y:0,width:100,height:100};
 const words=[
  {word:'ONE',order:0,x:30,y:40,angle:0,fontSize:9,glyphs:[],bounds:{x:22,y:34,width:16,height:12}},
  {word:'TWO',order:1,x:60,y:60,angle:0,fontSize:9,glyphs:[],bounds:{x:52,y:54,width:16,height:12}},
 ];
 const expanded=expandScatterCoverage(words,field);
 const before=scatterCoverage(words,field),after=scatterCoverage(expanded,field);
 assert.ok(after.width>=.84&&after.height>=.84);
 assert.ok(after.width>before.width&&after.height>before.height);
 assert.equal(scatterHasCollision(expanded,3),false);
 assert.deepEqual(words[0].bounds,{x:22,y:34,width:16,height:12},'input immutable');
});
test('Big Idea preview/PDF remain metric-identical and Large Connect Verse has opt-in boxes',async()=>{
 const {pdf,browser}=await metrics();
 for(const idea of cases){
  for(const seed of [2,9]){
   const p=planConnectBigIdea({type:'connect-big-idea',idea,seed},pdf);
   const q=planConnectBigIdea({type:'connect-big-idea',idea,seed},browser);
   assert.ok(p&&q);
   assert.equal(p.fontSize,q.fontSize);
   for(let i=0;i<p.scattered.length;i++){
    for(const k of ['x','y','fontSize','angle']){
     assert.ok(Math.abs(p.scattered[i][k]-q.scattered[i][k])<.02);
    }
   }
  }
 }
 const verse={type:'connect-verse',verse:seven,seed:14};
 const large=planConnectVerse(verse,{puzzle:pdf.puzzle,verse:pdf.verse,subtitle:pdf.subtitle});
 assert.ok(large);
 const raw=scatterWords({
  words:parseConnectionWords(seven),seed:verse.seed,key:seven,
  field:large.field,measure:pdf.puzzle,
  maxFont:13.6,minFont:8.5,gap:3.2,gapReferenceFont:17,
 });
 assert.ok(raw);
 assert.ok(large.scattered.every(w=>w.box&&w.angle===0));
 assert.ok(raw.words.every(w=>!w.box));
 assert.notDeepEqual(large.scattered,raw.words,
  'Large Verse intentionally adds measured boxes; Big Idea stays unboxed');
});
test('Solve the Code renames only user-facing copy and preserves saved cryptogram ID',async()=>{
 const medium=CRYPTOGRAM_MODULES.find(m=>m.id==='big-idea-cryptogram');
 assert.equal(medium.name,'Solve the Code');
 assert.equal(moduleForSize('medium').find(m=>m.id==='big-idea-cryptogram').name,'Solve the Code');
 const legacy={type:'big-idea-cryptogram',idea:'Moses crossed the Red Sea.',seed:4};
 assert.deepEqual(validateCryptogram(legacy),[]);
 const saved=readAssignments({'2:top-medium':legacy});
 assert.deepEqual(saved['2:top-medium'],legacy);
 assert.equal(blankModule('big-idea-cryptogram').type,'big-idea-cryptogram');
 assert.deepEqual(generateCryptogram(saved['2:top-medium']),generateCryptogram(legacy));
 const [editor,preview,print,def]=await Promise.all([
  readFile(new URL('../src/CryptogramEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/BigIdeaCryptogramPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/cryptogramPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/cryptograms.ts',import.meta.url),'utf8'),
 ]);
 assert.match(editor,/Big Idea or Story Event/u);
 assert.match(editor,/Type a key idea or a short sentence describing a story event\./u);
 assert.match(preview,/SOLVE THE CODE!/u);
 assert.match(print,/SOLVE THE CODE!/u);
 assert.doesNotMatch(def,/name:'Big Idea Cryptogram'/u);
 assert.equal(generateCryptogram(legacy).key.length,generateCryptogram({...legacy,seed:4}).key.length);
});
test('Scattered coverage + legacy cryptograms export in a normal folded booklet',async()=>{
 const {files}=await metrics();
 const draft={title:'God Saves His People',scripture:'Exodus 14',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
   '2:top-medium':{type:'connect-big-idea',idea:seven,seed:2},
   '2:middle-medium':{type:'big-idea-cryptogram',idea:'God saves his people.',seed:2},
   '3:top-medium':{type:'connect-big-idea',idea:cases[0],seed:9},
   '3:middle-medium':{type:'big-idea-cryptogram',idea:'Moses crossed the Red Sea.',seed:9},
   '4:top-medium':{type:'connect-big-idea',idea:cases[2],seed:15},
   '4:middle-medium':{type:'connect-big-idea',idea:cases[3],seed:21},
  }};
 const pdf=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
