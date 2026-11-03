import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 approvedLessonForDraft,buildYourOwnLessonDraft,chooseActivityForDraft,createManualModule,
} from '../src/curriculumEditor.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {migrateDraftValue,EMPTY_DRAFT} from '../src/draftMigration.ts';
import {MODULES,validateModule} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const getJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const approved=await getJson('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const manifest=await getJson('curriculum/approved/rights-manifest.json');
const path='../curriculum/approved/'+approved.id+'.lesson.json';
const publicLesson=assemblePublicLessonCatalog({[path]:approved},manifest)[0];
if(!publicLesson)throw Error('This test requires the real independently approved BSB Red Sea lesson.');
const selected=(type,draft,slot='2:bottom-medium',entries=[publicLesson])=>
 chooseActivityForDraft(type,draft,slot,entries);

test('Approved story context persists in browser drafts without altering old saved work',()=>{
 const own=buildYourOwnLessonDraft(publicLesson);
 assert.equal(own.curriculumLessonId,approved.id);
 assert.equal(own.title,approved.lessonDetails.title);
 assert.equal(own.scripture,'Exodus 13–14');
 assert.equal(own.verseReference,'Exodus 15:11');
 assert.equal(own.verseText,approved.lessonDetails.memoryVerse.text);
 assert.deepEqual(own.modules,{});
 assert.equal(approvedLessonForDraft(own,[publicLesson]).lesson.id,approved.id);
 assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(own))),own);
 assert.deepEqual(migrateDraftValue(EMPTY_DRAFT),EMPTY_DRAFT);
 assert.equal(approvedLessonForDraft(EMPTY_DRAFT,[publicLesson]),undefined);
 assert.deepEqual(migrateDraftValue({...EMPTY_DRAFT,curriculumLessonId:'../../review/private'}),EMPTY_DRAFT);
 assert.deepEqual(migrateDraftValue({...EMPTY_DRAFT,curriculumLessonId:42}),EMPTY_DRAFT);
});

test('Both published recipes carry lesson context across refresh, but editorial fixtures do not',()=>{
 for(const recipe of ['story-review','fun-and-games']){
  const pub=buildWorksheetRecipe(publicLesson.lesson,recipe,{purpose:'published'});
  const review=buildWorksheetRecipe(publicLesson.lesson,recipe,{purpose:'editorial-review'});
  assert.equal(pub.draft.curriculumLessonId,approved.id);
  assert.equal(review.draft.curriculumLessonId,undefined);
  assert.equal(migrateDraftValue(JSON.parse(JSON.stringify(pub.draft))).curriculumLessonId,approved.id);
  assert.equal(pub.openSlots.length,1);
 }
});

test('All 27 compatible activity types receive already prepared, valid, independent approved content',()=>{
 const own=buildYourOwnLessonDraft(publicLesson);
 const before=structuredClone(approved);
 assert.equal(MODULES.length,27);
 for(const {id:type} of MODULES){
  const result=selected(type,own);
  assert.equal(result.source,'lesson',type+' '+result.message);
  assert.equal(result.module.type,type,type);
  assert.deepEqual(validateModule(result.module),[],type);
  assert.equal(result.contentId!==undefined,true,type);
 }
 assert.deepEqual(approved,before,'choosing activities cannot mutate approved curriculum');
 assert.deepEqual(own.modules,{},'selection is independent of the draft until the user assigns it');
});

test('Finish and Unscramble the Verse use the human-approved BSB bracketed answers',()=>{
 const starter=buildYourOwnLessonDraft(publicLesson);
 for(const key of ['finish-verse','unscramble-verse']){
  const selectedModule=selected(key,starter).module;
  assert.equal(selectedModule.type,key);
  assert.equal(selectedModule.reference,'Exodus 15:11');
  assert.equal(selectedModule.verse,approved.preparedActivities[
   key==='finish-verse'?'finishVerse':'unscrambleVerse'
  ].markedVerse);
  assert.match(selectedModule.verse,/\[among\]/u);
  assert.equal(selectedModule.verse.replace(/\[([^\[\]]+)\]/gu,'$1'),
   approved.lessonDetails.memoryVerse.text);
  assert.deepEqual(validateModule(selectedModule),[]);
 }
 // No lesson context: preserve the original manually authored verse behavior.
 const plain={...structuredClone(EMPTY_DRAFT),verseReference:'Psalm 1:1',verseText:'Blessed is the man'};
 for(const type of ['finish-verse','unscramble-verse']){
  const m=createManualModule(type,plain);
  assert.equal(m.verse,plain.verseText);
  assert.equal(m.reference,plain.verseReference);
 }
});

test('Adding an activity to the open Medium slot preserves recipe activities and manual edits',()=>{
 const recipe=buildWorksheetRecipe(publicLesson.lesson,'story-review',{purpose:'published'});
 const worksheet=structuredClone(recipe.draft);
 assert.equal(recipe.openSlots.length,1);
 const slot=recipe.openSlots[0].slot;
 assert.equal(worksheet.modules[slot],undefined);
 const existingSlot=Object.keys(worksheet.modules)[0];
 worksheet.modules[existingSlot].events='Teacher customized these words';
 const existing=structuredClone(worksheet.modules);
 const verse=selected('finish-verse',worksheet,slot).module;
 worksheet.modules[slot]=verse;
 assert.equal(worksheet.modules[slot].verse,approved.preparedActivities.finishVerse.markedVerse);
 for(const [key,module] of Object.entries(existing))
  assert.deepEqual(worksheet.modules[key],module,'untouched activity '+key);
 assert.deepEqual(migrateDraftValue(worksheet),worksheet);
});

test('Multiple Choice uses distinct approved questions while unused candidates remain',()=>{
 const own=buildYourOwnLessonDraft(publicLesson);
 const count=approved.preparedActivities.multipleChoice.length;
 assert.equal(count,8);
 const questions=new Set();
 for(let i=0;i<count;i++){
  const slot='2:question-'+i;
  const result=selected('multiple-choice',own,slot);
  assert.equal(result.source,'lesson');
  questions.add(result.module.question);
  own.modules[slot]=result.module;
 }
 assert.equal(questions.size,count,'do not duplicate approved questions when alternatives remain');
 const next=selected('multiple-choice',own,'2:ninth-question');
 assert.equal(next.source,'lesson','if all questions are used, reusing approved content is safer than inventing it');
});

test('Unapproved, withdrawn or incomplete lesson content is never fabricated',async()=>{
 const draft=buildYourOwnLessonDraft(publicLesson);
 const review=await getJson('tests/fixtures/ot-031-original-review.json');
 const fake={lesson:review,scriptureDistributionCleared:true,rightsEvidence:manifest.lessons[approved.id]};
 assert.throws(()=>buildYourOwnLessonDraft(fake),/not approved/u);
 const withdrawn=selected('finish-verse',draft,'2:bottom-medium',[]);
 assert.equal(withdrawn.source,'unavailable');
 assert.equal(withdrawn.module.type,'finish-verse');
 assert.deepEqual(withdrawn.module,createManualModule('finish-verse',EMPTY_DRAFT));
 assert.match(withdrawn.message,/no longer in the approved library/u);
 const damaged=structuredClone(approved);
 delete damaged.preparedActivities.finishVerse;
 const mockApproved={...publicLesson,lesson:damaged};
 const unavailable=selected('finish-verse',draft,'2:bottom-medium',[mockApproved]);
 assert.equal(unavailable.source,'unavailable');
 assert.match(unavailable.message,/No ready finish verse content/u);
 assert.deepEqual(unavailable.module,createManualModule('finish-verse',EMPTY_DRAFT));
 const scratch=selected('word-search',EMPTY_DRAFT);
 assert.equal(scratch.source,'scratch');
 assert.deepEqual(scratch.module,createManualModule('word-search',EMPTY_DRAFT));
});

test('Printed booklet PDF accepts the BSB Finish the Verse in previously empty Medium slot',async()=>{
 const recipe=buildWorksheetRecipe(publicLesson.lesson,'story-review',{purpose:'published'});
 const draft=structuredClone(recipe.draft);
 const slot=recipe.openSlots[0].slot;
 draft.modules[slot]=selected('finish-verse',draft,slot).module;
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const before=structuredClone(draft);
 const pdfBytes=await createBookletPdf(draft,fonts);
 assert.deepEqual(draft,before);
 assert.ok(pdfBytes.length>20000);
 const pdf=await PDFDocument.load(pdfBytes);
 assert.equal(pdf.getPageCount(),2,'four half-letter pages are imposed on two physical sheets');
});

test('Normal editor wires the approved selector without importing unreviewed curriculum',async()=>{
 const [app,welcome,catalog,editor]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/WelcomeScreen.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/publishedLessonCatalog.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/curriculumEditor.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/chooseActivityForDraft\(type,draft,activeKey,PUBLIC_LESSONS\)/u);
 assert.match(app,/buildYourOwnLessonDraft\(entry\)/u);
 assert.match(app,/if\(activeModule&&!window\.confirm\(/u);
 assert.match(app,/const modules=\{\.\.\.previous\.modules\}/u);
 assert.match(app,/onBuildOwn=\{choosePublishedBuildOwn\}/u);
 assert.match(welcome,/Build My Own Worksheet/u);
 assert.match(welcome,/onBuildOwn\(selected\)/u);
 assert.match(editor,/approvedForPublic\(item\)/u);
 assert.doesNotMatch(editor,/curriculum\/review|fixtures\/ot-031/u);
 assert.match(catalog,/curriculum\/approved\/\*\.lesson\.json/u);
});
