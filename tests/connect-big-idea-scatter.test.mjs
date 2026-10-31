import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 scatterWords,scatterHasCollision,
} from '../src/wordScatterLayout.ts';
import {planConnectBigIdea,CONNECT_BIG_TITLE,CONNECT_BIG_INSTRUCTION} from '../src/connectBigIdeaLayout.ts';
import {parseConnectionWords,validateSpecialty} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';
const examples=[
 'God loves us.',
 'God loves us and calls us to help others.',
 'God gives us courage to care for our neighbors every day.',
 'God is with us and gives us strength to love and help people.',
 'The Lord is with us and gives us strength to love our neighbors and help one another every day together.',
];
const modules=examples.slice(1).map((idea,i)=>({type:'connect-big-idea',idea,seed:i+2}));
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const [puzzle,bank,body]=await Promise.all([
  doc.embedFont(files.zillaSlab,{subset:false}),
  doc.embedFont(files.nunitoSans900,{subset:false}),
  doc.embedFont(files.nunitoSans,{subset:false}),
 ]);
 const source=fontkit.create(files.zillaSlab);
 return {
  pdf:{
   puzzle:(t,s)=>puzzle.widthOfTextAtSize(t,s),
   bank:(t,s)=>bank.widthOfTextAtSize(t,s),
   subtitle:(t,s)=>body.widthOfTextAtSize(t,s),
  },
  browser:{
   puzzle:(t,s)=>source.layout(t).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*s/source.unitsPerEm,
   bank:(t,s)=>bank.widthOfTextAtSize(t,s),
   subtitle:(t,s)=>body.widthOfTextAtSize(t,s),
  },
 };
}
test('Big Idea accepts twenty words but Verse retains the previous twelve-word limit',()=>{
 const twenty=modules.at(-1);
 assert.equal(parseConnectionWords(twenty.idea).length,20);
 assert.deepEqual(validateSpecialty(twenty),[]);
 assert.ok(validateSpecialty({...twenty,idea:twenty.idea+' extra'}).length);
 const verse={type:'connect-verse',verse:twenty.idea,seed:3};
 assert.ok(validateSpecialty(verse).some(x=>/4–12 words/u.test(x)));
});
test('seeded scattering preserves every word, avoids any overlaps and uses full 2D space',async()=>{
 const {pdf}=await metrics();
 for(const module of modules){
  const p=planConnectBigIdea(module,pdf);
  assert.ok(p,'No scattering for '+module.idea);
  assert.deepEqual(p,planConnectBigIdea(module,pdf));
  assert.equal(p.scattered.length,parseConnectionWords(module.idea).length);
  assert.deepEqual(p.scattered.map(w=>w.word),parseConnectionWords(module.idea));
  assert.deepEqual(p.scattered.map(w=>w.order),Array.from({length:p.scattered.length},(_,i)=>i));
  assert.equal(scatterHasCollision(p.scattered,0),false);
  assert.ok(p.scattered.every(w=>w.glyphs.length===Array.from(w.word).length));
  assert.ok(p.scattered.every(w=>w.bounds.x>=p.field.x&&w.bounds.y>=p.field.y));
  assert.ok(p.scattered.every(w=>
    w.bounds.x+w.bounds.width<=p.field.x+p.field.width+.001&&
    w.bounds.y+w.bounds.height<=p.field.y+p.field.height+.001));
  assert.ok(p.scattered.every(w=>Math.abs(w.angle)<=1.3));
  assert.ok(p.scattered.every(w=>w.glyphs.every(g=>Math.abs(g.y-w.fontSize*.29)<.25)));
  const distinctX=new Set(p.scattered.map(w=>Math.round(w.x/3)));
  assert.ok(distinctX.size>Math.min(3,p.scattered.length-1),
    'Random scatter must not have three rigid columns');
  const other=planConnectBigIdea({...module,seed:module.seed+1},pdf);
  assert.ok(other);
  assert.notDeepEqual(p.scattered.map(w=>[w.x,w.y]),other.scattered.map(w=>[w.x,w.y]));
 }
});
test('shared planner uses identical font metrics and geometry in browser and PDF',async()=>{
 const {pdf,browser}=await metrics();
 for(const module of modules){
  const p=planConnectBigIdea(module,pdf);
  const q=planConnectBigIdea(module,browser);
  assert.ok(p&&q);
  assert.equal(p.fontSize,q.fontSize);
  assert.equal(p.bankLines.length,q.bankLines.length);
  assert.equal(p.bankHeight,q.bankHeight);
  assert.deepEqual(p.scattered.map(w=>w.word),q.scattered.map(w=>w.word));
  for(let i=0;i<p.scattered.length;i++){
   for(const k of ['x','y','angle','fontSize']){
    assert.ok(Math.abs(p.scattered[i][k]-q.scattered[i][k])<.02,k+' mismatched');
   }
  }
  assert.equal(CONNECT_BIG_TITLE,'CONNECT THE BIG IDEA');
  assert.equal(CONNECT_BIG_INSTRUCTION,'Connect each word to the next in order.');
 }
});
test('Only Big Idea switches to new print renderer, while Verse uses old code until PR 11g',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/SpecialtyPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/case 'connect-big-idea':return <ConnectBigIdeaPrintPreview/u);
 assert.match(preview,/case 'connect-verse':return <ConnectView/u);
 assert.match(pdf,/case 'connect-big-idea':return connectBigIdea/u);
 assert.match(pdf,/case 'connect-verse':return connect\(page,b,module,fonts\)/u);
});
test('20-word Big Idea exports inside the standard two-sheet US Letter booklet',async()=>{
 const draft={title:'Love One Another',scripture:'John 13',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':modules[0],
  '2:middle-medium':modules[1],
  '3:top-medium':modules[2],
  '3:middle-medium':modules[3],
 }};
 const pdf=await PDFDocument.load(await createBookletPdf(draft,await fonts()));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
