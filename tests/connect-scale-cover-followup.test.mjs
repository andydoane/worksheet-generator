import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 CONNECT_SCATTER_FONT_SCALE,scaleConnectScatterFont,scatterHasCollision,
} from '../src/wordScatterLayout.ts';
import {planConnectVerse} from '../src/connectVerseLayout.ts';
import {planConnectBigIdea} from '../src/connectBigIdeaLayout.ts';
import {parseConnectionWords} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const long='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const idea='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const assets=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function measurements(){
 const files=await assets(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const [puzzle,bank,verse,body]=await Promise.all([
  doc.embedFont(files.zillaSlab,{subset:false}),
  doc.embedFont(files.nunitoSans900,{subset:false}),
  doc.embedFont(files.nunitoSans750,{subset:false}),
  doc.embedFont(files.nunitoSans,{subset:false}),
 ]);
 const width=font=>(text,size)=>font.widthOfTextAtSize(text,size);
 return {files,puzzle:width(puzzle),bank:width(bank),verse:width(verse),subtitle:width(body)};
}
test('both Connect modules share the exact 80% cap scale and preserve a readable floor',async()=>{
 assert.equal(CONNECT_SCATTER_FONT_SCALE,0.8);
 for(const [original,expected] of [[17,13.6],[15.5,12.4],[14.5,11.6],
  [13.5,10.8],[12.5,10],[11.5,9.2]]){
  assert.ok(Math.abs(scaleConnectScatterFont(original)-expected)<.00001);
 }
 const m=await measurements();
 const cases=[
  {mode:'large',verse:'God gives us courage to love and help others.',seed:2},
  {mode:'large',verse:long,seed:8},
  {mode:'medium',idea:'God gives us courage to care for one another.',seed:2},
  {mode:'medium',idea,seed:8},
 ];
 for(const item of cases){
  const verse=item.mode==='large';
  const words=parseConnectionWords(verse?item.verse:item.idea);
  const original=verse?(words.length>=30?14.5:words.length>=21?15.5:17):
   (words.length>=17?11.5:words.length>=13?12.5:13.5);
  const baseGap=verse?(words.length>25?2.5:3.2):2.6;
  const plan=verse?planConnectVerse({
   type:'connect-verse',verse:item.verse,seed:item.seed,
  },{puzzle:m.puzzle,verse:m.verse,subtitle:m.subtitle}):
   planConnectBigIdea({type:'connect-big-idea',idea:item.idea,seed:item.seed},{
    puzzle:m.puzzle,bank:m.bank,subtitle:m.subtitle,
   });
  assert.ok(plan, 'Must fit '+item.mode+' with '+words.length+' words');
  assert.ok(plan.fontSize<=scaleConnectScatterFont(original)+.00001);
  assert.ok(plan.fontSize>=8.5);
  assert.equal(plan.scattered.length,words.length);
  assert.deepEqual(plan.scattered.map(w=>w.word),words);
  // Clearance is based on the original font target, not the reduced size.
  const clearance=baseGap*Math.max(.75,original/11);
  assert.equal(scatterHasCollision(plan.scattered,clearance-.0001),false);
  assert.equal(scatterHasCollision(plan.scattered,0),false);
 }
});
test('reference banks do not shrink when scattered words are reduced',async()=>{
 const m=await measurements();
 const large=planConnectVerse({type:'connect-verse',verse:long,seed:9},{
  puzzle:m.puzzle,verse:m.verse,subtitle:m.subtitle,
 });
 const medium=planConnectBigIdea({type:'connect-big-idea',idea,seed:9},{
  puzzle:m.puzzle,bank:m.bank,subtitle:m.subtitle,
 });
 assert.ok(large&&medium);
 assert.equal(large.bankFontSize,11.2);
 assert.equal(medium.bankFontSize,9.4);
});
test('cover no longer contains extra overline and centers title and scripture together',async()=>{
 const [app,css,pdf]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
 ]);
 assert.doesNotMatch(app,/BIBLE STORY REVIEW/u);
 assert.doesNotMatch(pdf,/BIBLE STORY REVIEW/u);
 assert.match(app,/className="cover-text-safe"/u);
 assert.match(app,/className="cover-title"/u);
 assert.match(css,/\.cover-content \{[^}]*justify-content: center/u);
 assert.match(css,/\.booklet-region \.cover-title \{[^}]*margin: 0;/u);
 assert.match(pdf,/const totalHeight = fitted.height \+ gap \+ subtitle.height;/u);
 assert.match(pdf,/\(box.height - totalHeight\) \/ 2/u);
 const files=await assets();
 const draft={title:'God Cares For His People',scripture:'Isaiah 41:10',
  layouts:{2:'medium-large',3:'large-medium',4:'large-medium'},modules:{}};
 const output=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.equal(output.getPages().length,2);
});
