import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 CONNECT_BIG_TITLE,CONNECT_BIG_INSTRUCTION,CONNECT_PHRASE_BOX_STROKE,
 CONNECT_PHRASE_BOX_PADDING_X,CONNECT_PHRASE_BOX_PADDING_Y,planConnectBigIdea,
} from '../src/connectBigIdeaLayout.ts';
import {CONNECT_VERSE_INSTRUCTION,planConnectVerse} from '../src/connectVerseLayout.ts';
import {scatterHasCollision,scaleConnectScatterFont} from '../src/wordScatterLayout.ts';
import {parseConnectionWords,validateSpecialty} from '../src/specialtyModules.ts';
import {readAssignments,moduleForSize,blankModule} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const phrases=[
 'God guides his people.',
 'God is with us and gives us courage to love one another.',
 'The Lord is with us and gives us strength to love our neighbors and help one another every day together.',
];
const largeVerse='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
async function metrics(){
 const files={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const pdf={},preview={};
 const src={puzzle:files.zillaSlab,bank:files.nunitoSans900,
  subtitle:files.nunitoSans,verse:files.nunitoSans750};
 for(const [key,bytes] of Object.entries(src)){
  const embedded=await doc.embedFont(bytes,{subset:false});
  const face=fontkit.create(bytes);
  pdf[key]=(text,size)=>embedded.widthOfTextAtSize(text,size);
  preview[key]=(text,size)=>face.layout(text).glyphs.reduce(
   (sum,g)=>sum+g.advanceWidth,0)*size/face.unitsPerEm;
 }
 return {pdf,preview,files};
}
test('visible Connect instructions, Phrase name and editor copy are exact',async()=>{
 assert.equal(CONNECT_VERSE_INSTRUCTION,
  'Draw lines from box to box in the order of the verse.');
 assert.equal(CONNECT_BIG_TITLE,'CONNECT THE PHRASE');
 assert.equal(CONNECT_BIG_INSTRUCTION,
  'Draw lines from box to box in the order of the phrase.');
 assert.equal(moduleForSize('medium').find(x=>x.id==='connect-big-idea')?.name,
  'Connect the Phrase');
 const [editor,mediumPreview,pdf]=await Promise.all([
  readFile(new URL('../src/SpecialtyEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/ConnectBigIdeaPrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(editor,/Key Idea or Story Event/u);
 assert.match(editor,/Add a big idea or a sentence describing the story\./u);
 assert.doesNotMatch(editor,/Big Idea text|slight letter jitter/u);
 assert.doesNotMatch(mediumPreview,/Connect the Big Idea/u);
 assert.match(mediumPreview,/CONNECT_PHRASE_BOX_STROKE/u);
 assert.doesNotMatch(mediumPreview,/glyphs\.map/u);
 assert.match(pdf,/CONNECT_PHRASE_BOX_STROKE/u);
});
test('4, 12 and 20-word Phrase boxes fit with conservative border clearance and parity',async()=>{
 const {pdf,preview}=await metrics();
 assert.deepEqual(phrases.map(p=>parseConnectionWords(p).length),[4,12,20]);
 for(const idea of phrases){
  const count=parseConnectionWords(idea).length;
  const originalMax=count>=17?11.5:count>=13?12.5:13.5;
  const clearance=2.6*Math.max(.75,originalMax/11);
  for(const seed of [1,2,3,5,8,12,21,29]){
   const module={type:'connect-big-idea',idea,seed};
   assert.deepEqual(validateSpecialty(module),[]);
   const a=planConnectBigIdea(module,pdf);
   const b=planConnectBigIdea(module,preview);
   assert.ok(a, 'Cannot fit '+count+' Phrase words, seed '+seed);
   assert.ok(b, 'Cannot preview '+count+' Phrase words, seed '+seed);
   assert.deepEqual(a,planConnectBigIdea(module,pdf),'Seeded layout must be deterministic');
   assert.equal(a.scattered.length,count);
   assert.deepEqual(a.scattered.map(item=>item.word),parseConnectionWords(idea));
   assert.equal(a.scattered.length,b.scattered.length);
   assert.ok(a.fontSize>=8.5&&a.fontSize<=scaleConnectScatterFont(originalMax)+.001);
   assert.equal(a.fontSize,b.fontSize);
   assert.equal(scatterHasCollision(a.scattered,clearance-.0001),false,
    'Box borders collide or break original handwriting clearance');
   assert.equal(a.bankLines.map(line=>line.text).join(' '),idea.toUpperCase());
   assert.ok(a.bankFontSize>=8.2);
   for(let i=0;i<a.scattered.length;i++){
    const word=a.scattered[i],other=b.scattered[i];
    assert.ok(word.box&&other.box,'All words must have a rectangle');
    assert.equal(word.angle,0);
    assert.ok(word.glyphs.every(g=>Math.abs(g.y-word.fontSize*.29)<.000001));
    assert.ok(word.bounds.width>=word.box.width+CONNECT_PHRASE_BOX_STROKE);
    assert.ok(word.bounds.height>=word.box.height+CONNECT_PHRASE_BOX_STROKE);
    assert.ok(word.box.width>=pdf.puzzle(word.word,word.fontSize)+2*CONNECT_PHRASE_BOX_PADDING_X-.01);
    assert.ok(word.box.height>=word.fontSize*1.24+2*CONNECT_PHRASE_BOX_PADDING_Y-.01);
    assert.ok(word.bounds.x>=a.field.x-.00001);
    assert.ok(word.bounds.y>=a.field.y-.00001);
    assert.ok(word.bounds.x+word.bounds.width<=a.field.x+a.field.width+.00001);
    assert.ok(word.bounds.y+word.bounds.height<=a.field.y+a.field.height+.00001);
    for(const k of ['x','y','fontSize'])
     assert.ok(Math.abs(word[k]-other[k])<.025,k+' mismatches PDF and SVG');
    assert.ok(Math.abs(word.box.width-other.box.width)<.025);
    assert.ok(Math.abs(word.box.height-other.box.height)<.025);
   }
  }
 }
});
test('Legacy saved Phrase data and saved Medium Verse still export with unchanged IDs',async()=>{
 const {files,pdf}=await metrics();
 const oldPhrase={type:'connect-big-idea',idea:phrases[2],seed:9};
 const oldVerse={type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:4};
 const saved=readAssignments({'2:top-medium':oldPhrase,'3:top-medium':oldVerse});
 assert.deepEqual(saved['2:top-medium'],oldPhrase);
 assert.deepEqual(saved['3:top-medium'],oldVerse);
 assert.deepEqual(validateSpecialty(oldPhrase),[]);
 assert.equal(blankModule('connect-big-idea').type,'connect-big-idea');
 assert.deepEqual(Object.keys(blankModule('connect-big-idea')).sort(),
  ['idea','seed','type']);
 const plan=planConnectVerse({type:'connect-verse',verse:largeVerse,seed:3},pdf);
 assert.ok(plan&&plan.scattered.every(w=>w.box));
 const draft={title:'God Guides Us',scripture:'Isaiah 41:10',
  layouts:{2:'medium-large',3:'medium-medium-small-small',4:'medium-large'},
  modules:{
   '2:top-medium':oldPhrase,
   '2:bottom-large':{type:'connect-verse',verse:largeVerse,seed:7},
   '3:top-medium':oldVerse,
   '3:middle-medium':{type:'connect-big-idea',idea:phrases[1],seed:12},
   '4:top-medium':{type:'connect-big-idea',idea:phrases[0],seed:3},
  }};
 const document=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(document.getPages().map(page=>[page.getWidth(),page.getHeight()]),
  [[792,612],[792,612]]);
});
