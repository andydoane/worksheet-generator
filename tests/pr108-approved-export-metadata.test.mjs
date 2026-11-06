import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createApprovedLesson,listReviewTasks} from '../src/review/model.ts';
import {reviewSchemaErrors} from '../src/review/schemaPreflight.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const schema=JSON.parse(await read('curriculum/schema/lesson-v1.schema.json'));
const reference=JSON.parse(await read('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
const stamp='2026-11-05T21:15:00.000Z';
const evidence={
 preflight:{convertedCount:27,totalCount:27,issues:[],checkedAt:stamp},
 reviewedTaskIds:['sensitivity','bsb-verse','match-words'],
};
const draft=()=>{
 const lesson=structuredClone(reference);
 lesson.publication={
  status:'pending-teacher-approval',approved:false,
  notes:'Unapproved conversion; select and verify BSB and rerun preflight.',
 };
 lesson.schemaStatus='draft-source-preserving; pending teacher and generator review';
 lesson.sourceFiles[0].note='Original lesson quotes ESV; BSB selection remains pending.';
 lesson.validation={
  basis:'Local draft checks were performed before teacher BSB approval.',
  jsonParseTested:true,actualGeneratorTested:false,allTextChecksPassed:false,
  checks:[
   {check:'Original ESV verse reconstruction',passed:true,
    detail:'Teacher BSB excerpt selection is still pending'},
   {check:'Actual Review Studio 27-activity preflight',passed:false,detail:'NOT RUN'},
   {check:'Independent PDF rendering',passed:false,detail:'NOT RUN'},
  ],
 };
 lesson.moduleReadiness=lesson.moduleReadiness.map((row,i)=>({
  ...row,
  status:i%4===0?'ADAPTATION NEEDED':'READY',
  contentValidation:'local content checks; generator/preflight NOT RUN',
  generatorTested:false,
  notes:'Original ESV excerpt retained; needs teacher BSB selection and preflight.',
 }));
 lesson.reviewFlags=[
  {id:'rf-scripture',type:'scripture-text',priority:'high',
   text:'BSB selection still pending',affectedModules:['finish-verse']},
  {id:'rf-teacher',type:'teacher-approval',priority:'medium',
   text:'Review prepared matching answers',affectedModules:['match-words']},
  {id:'rf-sensitive',type:'content-sensitivity',priority:'high',
   text:'Review age-appropriateness of the death of the firstborn',affectedModules:['sort-story']},
  {id:'rf-tests',type:'validation',priority:'high',
   text:'Run external validator and preflight; neither ran in original conversion',
   affectedModules:['crossword']},
  {id:'rf-inventory',type:'source-inventory',priority:'low',
   text:'Only one original source document supplied',affectedModules:['story-order']},
 ];
 // These are SOURCE pool candidates, deliberately not the current worksheet.
 lesson.matchingPairs=[{
  id:'mp-source-01',left:'Moses',right:'Warned Pharaoh',
  origin:'adapted',sourceIds:[lesson.storyNotes[0].id],
 }];
 lesson.preparedActivities.matchWords=[{
  left:'Moses',right:'Leader',origin:'suggested',
  teacherReviewRequired:true,sourceIds:[lesson.storyNotes[0].id],
 }];
 return lesson;
};

test('OT30-style approved export records current verified review while archiving draft metadata',()=>{
 const source=draft(),immutable=JSON.stringify(source);
 assert.ok(listReviewTasks(source).some(task=>task.id==='sensitivity'),
  'The content-sensitivity variant must add an explicit teacher-review task');
 const approved=createApprovedLesson(source,'Teacher','2026-11-05',true,evidence);
 assert.deepEqual(reviewSchemaErrors(approved),[]);
 assert.deepEqual(validateLesson(approved,schema),[]);
 assert.equal(approved.schemaStatus,'approved; Review Studio 27/27 preflight passed');
 assert.equal(approved.publication.originalSchemaStatus,source.schemaStatus);
 assert.equal(approved.publication.originalConversionNotes,source.publication.notes);
 assert.match(approved.publication.notes,/successful 27\/27 content\/preflight/u);
 const verification=approved.publication.reviewStudioVerification;
 assert.equal(verification.source,'Review Studio measured preflight');
 assert.equal(verification.checkedAt,stamp);
 assert.equal(verification.convertedCount,27);
 assert.equal(verification.issueCount,0);
 assert.equal(verification.numberedPresetsChecked,3);
 assert.match(verification.scope,/not claimed/u);
 assert.equal(verification.matchingWorksheetSource,'preparedActivities.matchWords');
 assert.deepEqual(approved.preparedActivities,source.preparedActivities);
 assert.deepEqual(approved.matchingPairs,source.matchingPairs);
 assert.deepEqual(approved.storyNotes,source.storyNotes);
 assert.deepEqual(approved.questions,source.questions);
 assert.deepEqual(approved.facts,source.facts);
 assert.deepEqual(approved.lessonDetails,source.lessonDetails);
 assert.equal(approved.sourceFiles[0].originalConversionNote,source.sourceFiles[0].note);
 assert.match(approved.sourceFiles[0].note,/Original lesson quotes ESV/u);
 assert.doesNotMatch(approved.sourceFiles[0].note,/BSB selection remains pending/u);
 assert.match(approved.sourceFiles[0].note,/publication\.scriptureRights/u);
 assert.deepEqual(approved.validation.checks,source.validation.checks);
 assert.equal(approved.validation.allTextChecksPassed,false);
 assert.equal(approved.validation.actualGeneratorTested,false);
 assert.equal(approved.validation.checksScope,'original-conversion-before-teacher-review');
 assert.equal(approved.validation.originalBasis,source.validation.basis);
 assert.deepEqual(approved.validation.originalModuleReadiness,source.moduleReadiness);
 assert.ok(approved.moduleReadiness.every(row=>row.status==='READY'));
 assert.ok(approved.moduleReadiness.every(row=>row.generatorTested===false));
 assert.ok(approved.moduleReadiness.every(row=>
  /Review Studio preflight: 27\/27/u.test(row.contentValidation)));
 assert.deepEqual(approved.reviewFlags,source.reviewFlags);
 const status=Object.fromEntries(approved.publication.reviewFlagDisposition.map(x=>[x.id,x.status]));
 assert.deepEqual(status,{
  'rf-scripture':'resolved','rf-teacher':'resolved','rf-sensitive':'resolved',
  'rf-tests':'partially-verified','rf-inventory':'historical',
 });
 assert.deepEqual(approved.publication.resolvedReviewFlagIds,
  ['rf-teacher','rf-scripture','rf-sensitive']);
 assert.equal(JSON.stringify(source),immutable,'Review Studio export must not mutate its working draft');
});

test('Sensitivity flags remain open when not explicitly reviewed, despite approval signoff',()=>{
 const source=draft();
 const result=createApprovedLesson(source,'Teacher','2026-11-05',true,{
  preflight:evidence.preflight,reviewedTaskIds:['bsb-verse'],
 });
 assert.ok(!result.publication.resolvedReviewFlagIds.includes('rf-sensitive'));
 assert.equal(result.publication.reviewFlagDisposition.find(x=>
  x.id==='rf-sensitive').status,'requires-review');
 assert.ok(result.publication.resolvedReviewFlagIds.includes('rf-scripture'));
});

test('Never certify a stale, incomplete, malformed or absent preflight',()=>{
 const source=draft();
 for(const bad of [
  {...evidence.preflight,convertedCount:26},
  {...evidence.preflight,totalCount:26},
  {...evidence.preflight,issues:['a PDF still cannot fit']},
  {...evidence.preflight,checkedAt:'2026-11-05'},
 ]){
  assert.throws(()=>createApprovedLesson(source,'Teacher','2026-11-05',true,{
   preflight:bad,reviewedTaskIds:['sensitivity'],
  }),/requires/u);
 }
 const signed=createApprovedLesson(source,'Teacher','2026-11-05',true);
 assert.equal(signed.publication.reviewStudioVerification,undefined);
 assert.match(signed.schemaStatus,/evidence not recorded/u);
 assert.equal(signed.validation.actualGeneratorTested,false);
 assert.ok(signed.moduleReadiness.some(x=>x.status==='ADAPTATION NEEDED'));
 assert.ok(!signed.publication.resolvedReviewFlagIds.includes('rf-sensitive'));
 assert.deepEqual(reviewSchemaErrors(signed),[]);
});

test('Re-exporting an approved lesson preserves its original archived notes',()=>{
 const original=draft();
 const first=createApprovedLesson(original,'Teacher','2026-11-05',true,evidence);
 const second=createApprovedLesson(first,'Teacher','2026-11-05',true,evidence);
 assert.equal(second.publication.originalSchemaStatus,original.schemaStatus);
 assert.equal(second.publication.originalConversionNotes,original.publication.notes);
 assert.deepEqual(second.validation.originalModuleReadiness,original.moduleReadiness);
 assert.deepEqual(second.validation.checks,original.validation.checks);
 assert.equal(second.sourceFiles[0].originalConversionNote,original.sourceFiles[0].note);
 assert.equal(second.sourceFiles[0].note,first.sourceFiles[0].note);
 assert.deepEqual(second.publication.reviewStudioVerification,first.publication.reviewStudioVerification);
 assert.deepEqual(second.publication.reviewFlagDisposition,first.publication.reviewFlagDisposition);
 assert.deepEqual(reviewSchemaErrors(second),[]);
});

test('Review UI records only live measured results and keeps source matching pool independent',async()=>{
 const [ui,model,helper,matching]=await Promise.all([
  read('src/review/ReviewApp.tsx'),read('src/review/model.ts'),
  read('src/review/approvedExportMetadata.ts'),read('src/review/matchingWords.ts'),
 ]);
 assert.match(ui,/checkedAt:new Date\(\)\.toISOString\(\)/u);
 assert.match(ui,/!!preflight\.checkedAt/u);
 assert.match(ui,/reviewedTaskIds:reviewed/u);
 assert.match(ui,/source.*Review Studio preflight/iu);
 assert.match(model,/finalizeApprovedMetadata\(next,evidence\)/u);
 assert.match(model,/content-sensitivity/u);
 assert.match(ui,/active\.id==='sensitivity'/u);
 assert.match(matching,/next\.preparedActivities\.matchWords/u);
 assert.doesNotMatch(matching,/next\.matchingPairs\s*=/u);
 assert.match(helper,/matchingWorksheetSource:'preparedActivities\.matchWords'/u);
});
