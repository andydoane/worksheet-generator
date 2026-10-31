import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {moduleForSize,readAssignments,validateModule} from '../src/modules.ts';
import {balancedBankLines} from '../src/balancedBankLines.ts';
import {planConnectVerse,LARGE_CONNECT_WIDTH,LARGE_CONNECT_HEIGHT} from '../src/connectVerseLayout.ts';
import {planConnectBigIdea} from '../src/connectBigIdeaLayout.ts';
import {scatterHasCollision} from '../src/wordScatterLayout.ts';
import {parseConnectionWords,validateSpecialty} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const short='For God so loved the world that he gave his one and only Son that whoever believes in him shall not perish but have eternal life.';
const long='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const idea='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function widths(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const refs={puzzle:files.zillaSlab,verse:files.nunitoSans750,
  subtitle:files.nunitoSans,bank:files.nunitoSans900};
 const browser={},pdf={};
 for(const [name,bytes] of Object.entries(refs)){
  const f=fontkit.create(bytes),embedded=await doc.embedFont(bytes,{subset:false});
  browser[name]=(s,n)=>f.layout(s).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*n/f.unitsPerEm;
  pdf[name]=(s,n)=>embedded.widthOfTextAtSize(s,n);
 }
 return {browser,pdf,files};
}
test('Large Connect Verse replaces Medium choice without changing module IDs or saved payloads',()=>{
 assert.equal(moduleForSize('medium').length,9);
 assert.equal(moduleForSize('large').length,9);
 assert.ok(moduleForSize('large').some(x=>x.id==='connect-verse'));
 assert.ok(!moduleForSize('medium').some(x=>x.id==='connect-verse'));
 assert.equal(parseConnectionWords(long).length,35);
 assert.deepEqual(validateSpecialty({type:'connect-verse',verse:long,seed:2}),[]);
 assert.ok(validateSpecialty({type:'connect-verse',verse:long+' extra',seed:2})
  .some(e=>/4–35/u.test(e)));
 assert.ok(validateSpecialty({type:'connect-big-idea',idea:long,seed:2})
  .some(e=>/4–20/u.test(e)));
 const old={'3:top-medium':{type:'connect-verse',verse:short,seed:7}};
 assert.deepEqual(readAssignments(old),old);
});
test('Big Idea bank wraps evenly when it requires multiple lines, without losing any words',async()=>{
 const {pdf}=await widths();
 const plan=planConnectBigIdea({type:'connect-big-idea',idea,seed:4},{
  puzzle:pdf.puzzle,bank:pdf.bank,subtitle:pdf.subtitle});
 assert.ok(plan);
 assert.ok(plan.bankLines.length>=2,'Fixture must wrap');
 const measured=plan.bankLines.map(line=>pdf.bank(line.text,plan.bankFontSize));
 assert.ok(Math.max(...measured)-Math.min(...measured)<115,
  'Bank lines should be relatively balanced in visible width');
 assert.equal(plan.bankLines.map(x=>x.text).join(' ').replace(/\s+/gu,' '),idea.toUpperCase());
 const direct=balancedBankLines(idea.toUpperCase(),331.2-14,pdf.bank,plan.bankFontSize,3);
 assert.deepEqual(plan.bankLines.map(x=>x.text),direct);
});
test('Large verse bank and scattered field match the embedded PDF font measurements',async()=>{
 const {pdf,browser}=await widths();
 for(const [verse,seed] of [[short,2],[long,2],[long,19]]){
  const data={type:'connect-verse',verse,seed};
  const p=planConnectVerse(data,{puzzle:pdf.puzzle,verse:pdf.verse,subtitle:pdf.subtitle});
  const q=planConnectVerse(data,{puzzle:browser.puzzle,verse:browser.verse,subtitle:browser.subtitle});
  assert.ok(p&&q,'Could not fit '+parseConnectionWords(verse).length+' words');
  assert.equal(p.scattered.length,parseConnectionWords(verse).length);
  assert.deepEqual(p,planConnectVerse(data,{puzzle:pdf.puzzle,verse:pdf.verse,subtitle:pdf.subtitle}));
  assert.deepEqual(p.scattered.map(w=>w.word),parseConnectionWords(verse));
  assert.ok(p.bankLines.length>=1&&p.bankLines.length<=5);
  assert.equal(p.bankLines.map(l=>l.text).join(' '),verse);
  assert.ok(p.field.height>125);
  assert.equal(scatterHasCollision(p.scattered),false);
  assert.ok(p.scattered.every(w=>w.bounds.x>=p.field.x&&w.bounds.y>=p.field.y));
  assert.ok(p.scattered.every(w=>
   w.bounds.x+w.bounds.width<=p.field.x+p.field.width+.001&&
   w.bounds.y+w.bounds.height<=p.field.y+p.field.height+.001));
  assert.ok(p.scattered.every(w=>Math.abs(w.angle)<=1.3));
  assert.ok(p.fontSize>=8.5&&p.fontSize<=17);
  assert.equal(p.scattered.length,q.scattered.length);
  assert.equal(p.fontSize,q.fontSize);
  assert.equal(p.bankLines.length,q.bankLines.length);
  for(let i=0;i<p.scattered.length;i++){
   for(const k of ['x','y','fontSize','angle'])
    assert.ok(Math.abs(p.scattered[i][k]-q.scattered[i][k])<.025,k+' differs');
  }
 }
 assert.ok(LARGE_CONNECT_WIDTH>300&&LARGE_CONNECT_HEIGHT>340);
});
test('Saved Medium and new Large Connect Verse both export on the same booklet',async()=>{
 const {files}=await widths();
 const legacy={type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:7};
 const future={type:'connect-verse',verse:long,seed:11};
 const draft={title:'God Cares for His People',scripture:'Isaiah 41:10',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules:{
   '2:top-medium':legacy,
   '3:top-large':future,
   '4:top-medium':{type:'connect-big-idea',idea:'God always cares for his children.',seed:3},
  }};
 assert.deepEqual(validateModule(legacy),[]);
 assert.deepEqual(validateModule(future),[]);
 const document=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(document.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
test('App and PDF explicitly retain pre-11g Medium Connect Verse assignments',async()=>{
 const [app,preview,pdf,modules]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/SpecialtyPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/modules.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/legacyMedium=region\.size==='medium'&&module\?\.type==='connect-verse'/u);
 assert.match(app,/Connect the Verse \(saved Medium\)/u);
 assert.match(preview,/legacyMedium\?<ConnectView module=\{module\}/u);
 assert.match(pdf,/item\.size === 'medium' && assigned\.type === 'connect-verse'/u);
 assert.match(modules,/readAssignments/u);
});
