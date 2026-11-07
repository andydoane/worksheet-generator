import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {contentFirstLesson} from '../src/review/contentFirstLesson.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {listReviewTasks,createApprovedLesson} from '../src/review/model.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {reviewSchemaErrors} from '../src/review/schemaPreflight.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from '../src/worksheetRecipes.ts';
import {approvedForPublic} from '../src/publishedLessonCatalog.ts';

const load=async path=>JSON.parse(await readFile(
 new URL('../'+path,import.meta.url),'utf8'));
const schema=await load('curriculum/schema/lesson-v1.schema.json');
const approved=await load('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const starter=await load('curriculum/examples/lesson-v1-content-first-unapproved.example.json');

function withBadSourceMetadata(){
 const lesson=structuredClone(approved);
 lesson.keyPhrases??=[];
 lesson.keyPhrases.push({
  id:'kp-01',text:'God hates sin.',origin:'suggested',teacherReviewRequired:true,
 });
 lesson.keyPhrases.push({
  id:'kp-02',text:'God saves sinners.',origin:'suggested',teacherReviewRequired:true,
 });
 lesson.keyPhrases.push({
  id:'kp-03',text:'God hates sin, but God saves sinners.',
  origin:'adapted',sourceIds:['kp-01','kp-02'],teacherReviewRequired:true,
 });
 lesson.preparedActivities.storyOrder[0].sourceIds=['missing-story-note'];
 lesson.preparedActivities.multipleChoice[0].sourceQuestionIds=['missing-q-9'];
 lesson.sourceFiles[0].note='BSB selection remains pending.';
 lesson.storyNotes[0].order=999;
 lesson.storyNotes[0].source.page=0;
 lesson.moduleReadiness=[];
 lesson.reviewFlags.push({
  id:'rf-legacy-metadata',type:'source-inventory',priority:'low',
  text:'A source document is missing.',affectedModules:['story-order'],
 });
 lesson.validation.checks[0].name='Old malformed source-only check';
 delete lesson.validation.checks[0].check;
 return lesson;
}

test('Content-first projection removes only provenance, not printable or answer-key content',()=>{
 const legacy=withBadSourceMetadata(),before=JSON.stringify(legacy);
 const concise=contentFirstLesson(legacy);
 assert.equal(JSON.stringify(legacy),before,'Working review session must not be modified');
 for(const key of ['sourceFiles','storyNotes','questions','validation',
   'moduleReadiness','reviewFlags','schemaStatus']){
  assert.equal(Object.hasOwn(concise,key),false,key+' must not be in published content library');
 }
 for(const key of ['id','curriculum','lessonDetails','facts','preparedActivities',
  'vocabulary','characters','drawingPrompts','matchingPairs','keyPhrases']){
  if(legacy[key]!==undefined)assert.ok(concise[key]!==undefined,
   'Potentially printable content missing: '+key);
 }
 assert.equal(concise.preparedActivities.multipleChoice.length,
  legacy.preparedActivities.multipleChoice.length);
 assert.equal(concise.preparedActivities.trueFalse.factId,legacy.preparedActivities.trueFalse.factId);
 assert.equal(concise.preparedActivities.trueFalse.isTrue,legacy.preparedActivities.trueFalse.isTrue);
 assert.equal(concise.keyPhrases.at(-1).text,'God hates sin, but God saves sinners.');
 assert.equal(concise.keyPhrases.at(-1).sourceIds,undefined);
 assert.equal(concise.preparedActivities.storyOrder[0].sourceIds,undefined);
 assert.equal(concise.preparedActivities.multipleChoice[0].sourceQuestionIds,undefined);
 assert.equal(concise.lessonDetails.memoryVerse.bsbSource.sourceUrl,'https://bereanbible.com/bsb.txt');
 assert.deepEqual(reviewSchemaErrors(concise),[]);
 assert.deepEqual(validateLesson(concise,schema),[]);
});

test('Legacy kp-03 links and missing source records cannot block the printable preflight',()=>{
 const base=buildReviewPreflight(approved);
 const broken=withBadSourceMetadata();
 const current=buildReviewPreflight(broken);
 assert.equal(current.convertedCount,base.convertedCount);
 assert.deepEqual(current.issues.map(x=>x.message),base.issues.map(x=>x.message));
 assert.equal(current.issues.some(x=>/sourceIds|Story Note ID|source file|kp-01|kp-02|source inventory/iu.test(x.message)),false);
 assert.deepEqual(validateLesson(broken,schema),[]);
 assert.ok(listReviewTasks(broken).every(x=>x.id!=='lesson-sources'&&x.id!=='lesson-readiness'));
 const printable=contentFirstLesson(broken);
 const converted=convertLessonActivities(printable,{seed:1});
 assert.equal(converted.candidates.some(x=>x.moduleId==='story-order'),true,
  'Chronological Story Order must not need original Story Note IDs');
 assert.equal(converted.candidates.some(x=>x.moduleId==='big-idea-cryptogram'),true);
});

test('Four numbered presets use the same printable alternatives after historical sources are omitted',()=>{
 const concise=contentFirstLesson(approved);
 for(const recipe of WORKSHEET_RECIPES){
  const result=buildWorksheetRecipe(concise,recipe.id,{purpose:'editorial-review',seed:1});
  assert.equal(result.openSlots.length,0,recipe.id);
  assert.equal(result.selections.length,recipe.steps.length,recipe.id);
 }
});

test('Approved export contains actual content and rights without a historical source audit',()=>{
 const evidence={preflight:{
  convertedCount:27,totalCount:27,issues:[],checkedAt:'2026-11-07T15:00:00.000Z',
 },reviewedTaskIds:['sensitivity']};
 const concise=contentFirstLesson(withBadSourceMetadata());
 const result=createApprovedLesson(concise,'Teacher','2026-11-07',true,evidence);
 assert.deepEqual(reviewSchemaErrors(result),[]);
 assert.deepEqual(validateLesson(result,schema),[]);
 assert.equal(result.publication.status,'approved');
 assert.equal(result.publication.approved,true);
 assert.equal(result.publication.teacherSignoff.reviewer,'Teacher');
 assert.equal(result.publication.scriptureRights.status,'cleared');
 assert.equal(result.publication.reviewStudioVerification.convertedCount,27);
 assert.equal(result.publication.reviewStudioVerification.numberedPresetsChecked,4);
 assert.equal(result.sourceFiles,undefined);
 assert.equal(result.storyNotes,undefined);
 assert.equal(result.validation,undefined);
 assert.equal(result.moduleReadiness,undefined);
 assert.equal(result.reviewFlags,undefined);
 assert.equal(result.questions,undefined);
 assert.ok(approvedForPublic({lesson:result,
  scriptureDistributionCleared:true,rightsEvidence:result.publication.scriptureRights}));
});

test('Answer errors, printable layout failures and BSB checks still block publication',()=>{
 const wrong=contentFirstLesson(approved);
 wrong.preparedActivities.multipleChoice[0].correctAnswer='An answer not in the choices';
 const badMc=buildReviewPreflight(wrong);
 assert.ok(badMc.issues.some(x=>/multiple choice|correctAnswer/iu.test(x.message)));
 const fact=contentFirstLesson(approved);
 fact.preparedActivities.trueFalse.isTrue=!fact.preparedActivities.trueFalse.isTrue;
 const badFact=buildReviewPreflight(fact);
 assert.ok(badFact.issues.some(x=>/truth|canonical fact|selection/i.test(x.message)));
 const invalidBsb=contentFirstLesson(approved);
 invalidBsb.lessonDetails.memoryVerse.translation='ESV';
 const badVerse=buildReviewPreflight(invalidBsb);
 assert.ok(badVerse.issues.some(x=>/BSB|Berean/u.test(x.message)));
 assert.throws(()=>createApprovedLesson(invalidBsb,'Teacher','2026-11-07',true),
  /Select and verify the original BSB Scripture/u);
 assert.throws(()=>createApprovedLesson(contentFirstLesson(approved),'Teacher','2026-11-07',false),
  /Confirm the official BSB source/u);
});

test('Compact unapproved example parses, validates, and does not pretend preflight passed',()=>{
 assert.deepEqual(reviewSchemaErrors(starter),[]);
 assert.deepEqual(validateLesson(starter,schema),[]);
 assert.equal(starter.publication.approved,false);
 assert.equal(starter.publication.status,'pending-teacher-approval');
 assert.equal(starter.storyNotes,undefined);
 assert.equal(starter.sourceFiles,undefined);
 assert.equal(starter.questions,undefined);
 assert.equal(starter.reviewFlags,undefined);
 assert.ok(Object.keys(starter.preparedActivities).length<27);
 const preflight=buildReviewPreflight(starter);
 assert.ok(preflight.issues.length>0,'A partial starter is not a printable approved lesson');
});

test('Review Studio UI, schema, CLI and public catalog all use the content-first gate',async()=>{
 const [ui,preflight,script,guide,pkg,readme]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/preflight.ts',import.meta.url),'utf8'),
  readFile(new URL('../scripts/validate-curriculum.mjs',import.meta.url),'utf8'),
  readFile(new URL('../docs/CURRICULUM-CONVERSION-GUIDE.md',import.meta.url),'utf8'),
  load('package.json'),
  readFile(new URL('../curriculum/README.md',import.meta.url),'utf8'),
 ]);
 assert.match(ui,/createApprovedLesson\(contentFirstLesson\(lesson\),reviewer/u);
 assert.doesNotMatch(ui,/\{\(\['lesson-details','lesson-sources'/u);
 assert.match(preflight,/reviewSchemaIssues\(printable\)/u);
 assert.match(preflight,/buildWorksheetRecipe\(printable as LessonWorksheetSource/u);
 assert.match(script,/const printable=contentFirstLesson\(lesson\)/u);
 assert.match(guide,/Current authoring contract — content first/u);
 assert.match(readme,/Current content-first contract for new lessons/u);
 assert.ok(pkg.version.localeCompare('0.16.63',undefined,{numeric:true})>=0,
  'Keep PR #111 or newer application version');
 assert.deepEqual(schema.required.sort(),['schemaVersion','id','curriculum',
  'lessonDetails','facts','preparedActivities','publication'].sort());
});
