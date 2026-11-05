import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {validateModule} from '../src/modules.ts';
import {parseConnectionWords} from '../src/specialtyModules.ts';
import {planConnectVerse} from '../src/connectVerseLayout.ts';
import {scatterHasCollision} from '../src/wordScatterLayout.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {createBookletPdf} from '../src/pdf.ts';

const ot19='Trust in the LORD with all your heart, and lean not on your own understanding;';
const impossible='W'.repeat(190)+' trust in the LORD';
const file=path=>readFile(new URL('../'+path,import.meta.url));
const fonts=async()=>({
 mouseMemoirs:await file('fonts/MouseMemoirs-Regular.ttf'),
 nunitoSans:await file('fonts/Nunito-Medium.ttf'),
 nunitoSans750:await file('fonts/Nunito-Bold.ttf'),
 nunitoSans900:await file('fonts/Nunito-ExtraBold.ttf'),
 zillaSlab:await file('fonts/ZillaSlab-Bold-pdf.ttf'),
});
let widthsPromise;
async function metrics(){
 if(!widthsPromise)widthsPromise=(async()=>{
  const files=await fonts();
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const refs={puzzle:files.zillaSlab,verse:files.nunitoSans750,
   subtitle:files.nunitoSans};
  const pdf={},browser={};
  for(const [name,bytes] of Object.entries(refs)){
   const embedded=await doc.embedFont(bytes,{subset:false});
   const face=fontkit.create(bytes);
   pdf[name]=(s,n)=>embedded.widthOfTextAtSize(s,n);
   browser[name]=(s,n)=>face.layout(s).glyphs.reduce(
    (sum,g)=>sum+g.advanceWidth,0)*n/face.unitsPerEm;
  }
  return {pdf,browser,files};
 })();
 return widthsPromise;
}

test('OT19 Proverbs 3:5 permits 13-letter understanding without changing Scripture',()=>{
 assert.equal(parseConnectionWords(ot19).length,15);
 assert.equal(ot19.split(/\s+/u).some(w=>w.includes('understanding')),true);
 const module={type:'connect-verse',verse:ot19,seed:1};
 assert.deepEqual(validateModule(module),[]);
 assert.ok(validateModule({type:'connect-big-idea',
  idea:'Hold on to Jesus with understanding.',seed:1})
  .some(issue=>issue.includes('12 characters')),
  'The separate Connect Big Idea restriction must remain unchanged');
});

test('OT19 long word is in a readable noncolliding print-matched box',async()=>{
 const {pdf,browser}=await metrics();
 for(const seed of [1,2,7,19]){
  const module={type:'connect-verse',verse:ot19,seed};
  const plan=planConnectVerse(module,pdf),preview=planConnectVerse(module,browser);
  assert.ok(plan&&preview,'OT19 should physically fit for seed '+seed);
  assert.deepEqual(plan,planConnectVerse(module,pdf),'Seeded plan must be stable');
  assert.equal(plan.fontSize,preview.fontSize);
  assert.ok(plan.fontSize>=8.5);
  assert.equal(plan.scattered.length,15);
  assert.deepEqual(plan.scattered.map(item=>item.word),parseConnectionWords(ot19));
  assert.equal(scatterHasCollision(plan.scattered),false);
  const long=plan.scattered.find(item=>item.word==='UNDERSTANDING');
  assert.ok(long&&long.box);
  assert.ok(long.box.width>=pdf.puzzle(long.word,long.fontSize)+5.99);
  assert.ok(plan.scattered.every(item=>item.box&&item.angle===0));
  assert.ok(plan.scattered.every(item=>
   item.bounds.x>=plan.field.x&&item.bounds.y>=plan.field.y&&
   item.bounds.x+item.bounds.width<=plan.field.x+plan.field.width+.001&&
   item.bounds.y+item.bounds.height<=plan.field.y+plan.field.height+.001));
  assert.equal(plan.bankLines.map(line=>line.text).join(' '),ot19);
  for(let i=0;i<plan.scattered.length;i++){
   assert.ok(Math.abs(plan.scattered[i].x-preview.scattered[i].x)<.025);
   assert.ok(Math.abs(plan.scattered[i].y-preview.scattered[i].y)<.025);
  }
 }
});

test('Measured preflight detects truly impossible verses and routes repair to Connect Verse',async()=>{
 const {pdf}=await metrics();
 const published=JSON.parse(await file('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
 const restored=structuredClone(published);
 restored.lessonDetails.memoryVerse.text=ot19;
 restored.preparedActivities.connectVerse.verse=ot19;
 const candidate=convertLessonActivities(restored,{seed:1}).candidates
  .find(item=>item.moduleId==='connect-verse');
 assert.ok(candidate,'Converter must keep the full 13-letter word');
 assert.equal(candidate.module.verse,ot19);
 const valid=buildReviewPreflight(restored,pdf);
 assert.ok(!valid.issues.some(item=>item.message.includes('cannot fit the Large printable')),
  'Measured print fit should not reject OT19');

 const blocked=structuredClone(published);
 blocked.preparedActivities.connectVerse.verse=impossible;
 assert.deepEqual(validateModule({type:'connect-verse',verse:impossible,seed:1}),[]);
 assert.equal(planConnectVerse({type:'connect-verse',verse:impossible,seed:1},pdf),null);
 const report=buildReviewPreflight(blocked,pdf);
 const issue=report.issues.find(item=>item.moduleId==='connect-verse'&&
  item.message.includes('cannot fit the Large printable'));
 assert.ok(issue,'Review Studio must fail on measured print fit, not a word-count guess');
 assert.ok(issue.fieldId&&issue.taskId);
 assert.ok(report.convertedCount<=26);
 assert.equal(report.totalCount,27);
 assert.deepEqual(blocked.preparedActivities.connectVerse.verse,impossible);
});

test('PDF exports OT19 verbatim and refuses physically impossible long words',async()=>{
 const {files}=await metrics();
 const module={type:'connect-verse',verse:ot19,seed:1};
 const draft={title:'Jacob Wrestles with God',scripture:'Proverbs 3:5',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{'2:top-large':module},
 };
 const pdf=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),
  [[792,612],[792,612]]);
 await assert.rejects(createBookletPdf({
  ...draft,modules:{'2:top-large':{...module,verse:impossible}},
 },files),/Connect the Verse words cannot fit/u);
});

test('Review Studio always supplies PDF-identical font widths and guards stale preflight',async()=>{
 const app=await file('src/review/ReviewApp.tsx').then(String);
 assert.match(app,/mediumWidths\(\)/u);
 assert.match(app,/puzzle:puzzlePdf,verse:boldPdf,subtitle:finishBody/u);
 assert.match(app,/latestLesson\.current!==checkedLesson/u);
 assert.match(app,/setPreflight\(null\);setPreflightPending\(true\)/u);
 assert.match(app,/disabled=\{preflightPending\}/u);
});
