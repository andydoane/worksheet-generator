import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 planConnectVerse,CONNECT_VERSE_INSTRUCTION,CONNECT_VERSE_BOX_STROKE,
 CONNECT_VERSE_BOX_PADDING_X,CONNECT_VERSE_BOX_PADDING_Y,
} from '../src/connectVerseLayout.ts';
import {planConnectBigIdea} from '../src/connectBigIdeaLayout.ts';
import {scatterHasCollision,scatterWords,CONNECT_SCATTER_FONT_SCALE} from '../src/wordScatterLayout.ts';
import {parseConnectionWords,validateSpecialty} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const four='God loves his children.';
const twenty='The Lord is my shepherd and he guides me through the darkest valley with love and strength each day always';
const thirtyFive='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const examples=[four,twenty,thirtyFive];
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const embedded={};
 const bytes={puzzle:files.zillaSlab,verse:files.nunitoSans750,
  subtitle:files.nunitoSans};
 const pdf={},browser={};
 for(const [key,value] of Object.entries(bytes)){
  const face=fontkit.create(value);
  embedded[key]=await doc.embedFont(value,{subset:false});
  pdf[key]=(text,size)=>embedded[key].widthOfTextAtSize(text,size);
  browser[key]=(text,size)=>face.layout(text).glyphs.reduce(
   (sum,glyph)=>sum+glyph.advanceWidth,0)*size/face.unitsPerEm;
 }
 return {files,pdf,browser};
}
test('4, 20 and 35 words are valid with readable boxed geometry across seeds',async()=>{
 const {pdf,browser}=await metrics();
 assert.deepEqual(examples.map(v=>parseConnectionWords(v).length),[4,20,35]);
 assert.equal(CONNECT_SCATTER_FONT_SCALE,.8);
 assert.equal(CONNECT_VERSE_INSTRUCTION,'Draw lines from box to box in the order of the verse.');
 for(const verse of examples){
  const words=parseConnectionWords(verse);
  const originalMaxFont=words.length>=30?14.5:words.length>=21?15.5:17;
  const gap=(words.length>25?2.5:3.2)*Math.max(.75,originalMaxFont/11);
  for(const seed of [1,2,4,7,12,19]){
   const module={type:'connect-verse',verse,seed};
   assert.deepEqual(validateSpecialty(module),[]);
   const plan=planConnectVerse(module,pdf);
   const browserPlan=planConnectVerse(module,browser);
   assert.ok(plan,'Failed '+words.length+' boxed words, seed '+seed);
   assert.ok(browserPlan,'Preview failed '+words.length+' boxed words, seed '+seed);
   assert.deepEqual(plan,planConnectVerse(module,pdf),'Randomness not deterministic');
   assert.equal(plan.scattered.length,words.length);
   assert.deepEqual(plan.scattered.map(w=>w.word),words,'Original word order must be preserved');
   assert.equal(plan.fontSize,browserPlan.fontSize);
   assert.ok(plan.fontSize>=8.5,'Unprintably small word text');
   assert.ok(plan.fontSize<=originalMaxFont*.8+.001);
   assert.equal(scatterHasCollision(plan.scattered,gap-.001),false,
    'Outer boxes must retain historical clearance');
   assert.equal(scatterHasCollision(plan.scattered),false);
   assert.deepEqual(plan.bankLines.map(l=>l.text).join(' ').replace(/\s+/gu,' '),
    verse.replace(/\s+/gu,' ').trim());
   assert.equal(plan.scattered.length,browserPlan.scattered.length);
   for(let i=0;i<plan.scattered.length;i++){
    const item=plan.scattered[i],matching=browserPlan.scattered[i];
    assert.ok(item.box&&matching.box);
    assert.ok(item.angle===0&&matching.angle===0,'Boxed words must be level');
    assert.ok(item.glyphs.every(g=>Math.abs(g.y-item.fontSize*.29)<1e-6),
     'Individual letters must have zero jitter');
    assert.ok(item.box.width>=pdf.puzzle(item.word,item.fontSize)+2*CONNECT_VERSE_BOX_PADDING_X-.01);
    assert.ok(item.box.height>=item.fontSize*1.24+2*CONNECT_VERSE_BOX_PADDING_Y-.01);
    assert.ok(item.bounds.width>=item.box.width+CONNECT_VERSE_BOX_STROKE);
    assert.ok(item.bounds.height>=item.box.height+CONNECT_VERSE_BOX_STROKE);
    assert.ok(item.bounds.x>=plan.field.x-1e-6);
    assert.ok(item.bounds.y>=plan.field.y-1e-6);
    assert.ok(item.bounds.x+item.bounds.width<=plan.field.x+plan.field.width+1e-6);
    assert.ok(item.bounds.y+item.bounds.height<=plan.field.y+plan.field.height+1e-6);
    assert.ok(Math.abs(item.x-matching.x)<.02&&Math.abs(item.y-matching.y)<.02);
    assert.ok(Math.abs(item.box.width-matching.box.width)<.02);
    assert.ok(Math.abs(item.box.height-matching.box.height)<.02);
   }
  }
 }
});
test('Medium Phrase uses boxed words while raw unboxed scatter still works',async()=>{
 const {pdf}=await metrics();
 const idea='God is with us and gives us strength to love our neighbors and help one another every day together.';
 const module={type:'connect-big-idea',idea,seed:5};
 const plan=planConnectBigIdea(module,{puzzle:pdf.puzzle,bank:pdf.verse,subtitle:pdf.subtitle});
 assert.ok(plan);
 assert.ok(plan.scattered.every(word=>word.box&&word.angle===0));
 assert.ok(plan.scattered.every(word=>word.glyphs.every(glyph=>
  Math.abs(glyph.y-word.fontSize*.29)<.00001)));
 const raw=scatterWords({
  words:['GOD','CARES','FOR','US'],seed:1,key:'God cares for us',field:{
   x:0,y:0,width:320,height:100,
  },measure:pdf.puzzle,maxFont:10.8,minFont:10.8,
 });
 assert.ok(raw&&raw.words.every(word=>!word.box));
});
test('Large boxed Verse and legacy saved Medium Verse still export to the same PDF',async()=>{
 const {files}=await metrics();
 const draft={title:'God Gives Us Courage',scripture:'Isaiah 41:10',
  layouts:{2:'medium-large',3:'large-medium',4:'large-medium'},
  modules:{
   '1:cover-activity':{type:'connect-verse',verse:four,seed:1},
   '2:top-medium':{type:'connect-verse',verse:four,seed:9},
   '2:bottom-large':{type:'connect-verse',verse:twenty,seed:7},
   '3:top-large':{type:'connect-verse',verse:thirtyFive,seed:12},
   '4:top-large':{type:'connect-verse',verse:thirtyFive,seed:19},
  },
 };
 const pdf=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(pdf.getPages().map(page=>[page.getWidth(),page.getHeight()]),
  [[792,612],[792,612]]);
 const preview=await readFile(new URL('../src/ConnectVersePrintPreview.tsx',import.meta.url),'utf8');
 const drawPdf=await readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8');
 assert.match(preview,/CONNECT_VERSE_BOX_STROKE/u);
 assert.match(preview,/item\.word/u);
 assert.doesNotMatch(preview,/glyphs\.map/u,'Print preview must not draw individual letters');
 assert.match(drawPdf,/CONNECT_VERSE_BOX_STROKE/u);
 assert.match(drawPdf,/page\.drawRectangle/u);
});
