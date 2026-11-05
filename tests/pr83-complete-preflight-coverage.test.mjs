import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MODULES,validateModule} from '../src/modules.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from '../src/worksheetRecipes.ts';
import {buildReviewPreflight,reviewIssueTarget,PREPARED_ACTIVITY_KEYS} from '../src/review/preflight.ts';
import {MODULE_REPAIR_REGISTRY,repairDestinationForModule} from '../src/review/repairRegistry.ts';
import {listReviewTasks,applyBsbVerse,createApprovedLesson} from '../src/review/model.ts';
import {wordSpans} from '../src/review/bsb.ts';
import {
 lessonIntegrityIssues,repairSourceReference,restoreStoryNoteNumbers,
 rebuildReadinessInventory,editLessonDetails,
} from '../src/review/lessonIntegrity.ts';
import {
 multipleChoiceRows,multipleChoiceIssues,chooseOriginalQuestion,
 editMultipleChoice,removeMultipleChoice,
} from '../src/review/multipleChoiceEditor.ts';

const load=async n=>JSON.parse(await readFile(new URL(
 '../curriculum/approved/'+n+'.lesson.json',import.meta.url),'utf8'));
const ot31=await load('ot-031-god-parts-the-red-sea');
const ot32=await load('ot-032-god-provides-in-the-wilderness');

test('OT31 and OT32 pass the full lesson-wide source, readiness and publication audit unchanged',()=>{
 for(const lesson of [ot31,ot32]){
  assert.deepEqual(lessonIntegrityIssues(lesson),[],lesson.id);
  const report=buildReviewPreflight(lesson);
  assert.equal(report.convertedCount,27,lesson.id);
  assert.deepEqual(report.issues,[],lesson.id+' '+report.issues.map(x=>x.message).join('; '));
 }
});

test('Every one of the 27 modules has a visual or verified BSB editor and complete destination',()=>{
 const ids=MODULES.map(x=>x.id).sort();
 assert.equal(ids.length,27);
 assert.deepEqual(Object.keys(MODULE_REPAIR_REGISTRY).sort(),ids);
 assert.deepEqual(Object.keys(PREPARED_ACTIVITY_KEYS).sort(),ids);
 const tasks=new Set(listReviewTasks(ot32).map(x=>x.id));
 const source=JSON.stringify(ot32);
 for(const id of ids){
  const destination=repairDestinationForModule(id,false);
  assert.ok(['visual','scripture','advanced'].includes(destination.editor),
   id+' lacks a repair editor for missing content');
  assert.ok(destination.taskId&&destination.fieldId,id+' lacks a focusable repair destination');
  assert.ok(tasks.has(destination.taskId)||destination.editor==='advanced',
   id+' repair task is not mounted permanently or safely scoped to JSON');
  const mapped=reviewIssueTarget(id+': deliberately invalid test activity');
  const ordinary=repairDestinationForModule(id,true);
  assert.equal(mapped.taskId,ordinary.taskId,id+' repair routing for existing data');
  assert.equal(mapped.fieldId,ordinary.fieldId,id+' focus target for existing data');
  const broken=structuredClone(ot32);
  delete broken.preparedActivities[PREPARED_ACTIVITY_KEYS[id]];
  const report=buildReviewPreflight(broken);
  assert.ok(report.issues.some(issue=>issue.moduleId===id&&
   issue.taskId===destination.taskId&&issue.fieldId===destination.fieldId),
   id+' missing prepared data has no actionable repair');
 }
 assert.equal(JSON.stringify(ot32),source,'audit never mutates approved content');
});

test('Known global errors have dedicated repair destinations, not generic lesson help',()=>{
 const cases=[
  ['A worksheet recipe needs a lesson title and Scripture reference.','lesson-details'],
  ['Not enough valid multiple-choice questions for Preset 2 (need 1, have 0).','multiple-choice-bank'],
  ['Preset 2: needs word-search at 3:bottom-large','word-search'],
  ['Recipe preset-1 has an empty region','recipe-review'],
  ['Missing source reference in sourceIds','lesson-sources'],
  ['moduleReadiness has a missing activity','lesson-readiness'],
  ['Scripture rights clearance is missing','lesson-publication'],
  ['Select and approve a Berean Standard Bible memory verse.','bsb-verse'],
 ];
 for(const [message,taskId] of cases){
  assert.equal(reviewIssueTarget(message).taskId,taskId,message);
  assert.ok(listReviewTasks(ot32).some(x=>x.id===taskId),
   taskId+' must remain visible after an edit');
 }
});

test('An invalid source ID opens the source screen and can be corrected by a verified selector',()=>{
 const broken=structuredClone(ot32);
 broken.preparedActivities.whoAmI.sourceIds=['sn-does-not-exist'];
 const issues=lessonIntegrityIssues(broken),offending=issues.find(x=>
  x.path==='preparedActivities.whoAmI.sourceIds[0]');
 assert.ok(offending);
 assert.equal(offending.area,'lesson-sources');
 assert.equal(offending.choiceType,'sourceId');
 const preflight=buildReviewPreflight(broken);
 assert.ok(preflight.issues.some(x=>x.taskId==='lesson-sources'&&
  x.fieldId==='review-field-lesson-sources'&&x.path===offending.path));
 const repaired=repairSourceReference(broken,offending,'sn-06');
 assert.deepEqual(repaired.preparedActivities.whoAmI.sourceIds,['sn-06']);
 assert.equal(repaired.preparedActivities.whoAmI.teacherReviewRequired,true);
 assert.ok(!lessonIntegrityIssues(repaired).some(x=>x.path===offending.path));
 assert.deepEqual(repaired.storyNotes,ot32.storyNotes);
 assert.throws(()=>repairSourceReference(broken,offending,'fake-id'),/existing curriculum record/u);
});

test('Question citations and document filenames are corrected against actual source collections',()=>{
 const broken=structuredClone(ot31);
 broken.preparedActivities.multipleChoice[0].sourceQuestionIds=['bad-question'];
 broken.preparedActivities.pixelPicture.source={filename:'not-real.odt',section:'story'};
 const issues=lessonIntegrityIssues(broken);
 const question=issues.find(x=>x.choiceType==='questionId');
 const filename=issues.find(x=>x.choiceType==='filename'&&x.path.includes('pixelPicture'));
 assert.ok(question);assert.ok(filename);
 const fixedQuestion=repairSourceReference(broken,question,ot31.questions[0].id);
 const fixed=repairSourceReference(fixedQuestion,filename,ot31.sourceFiles[0].filename);
 assert.ok(!lessonIntegrityIssues(fixed).some(x=>
  x.choiceType==='questionId'||x.choiceType==='filename'&&x.path.includes('pixelPicture')));
 assert.deepEqual(fixed.questions,ot31.questions);
});

test('Source notes order repairs never rewrite original quotations or silently renumber duplicates',()=>{
 const broken=structuredClone(ot32);
 const saved=structuredClone(ot32.storyNotes);
 broken.storyNotes[2].order=9;
 assert.ok(lessonIntegrityIssues(broken).some(x=>
  x.path==='storyNotes[2].order'));
 const fixed=restoreStoryNoteNumbers(broken);
 assert.deepEqual(fixed.storyNotes.map(x=>x.order),[1,2,3,4,5,6,7]);
 assert.deepEqual(fixed.storyNotes.map(x=>x.originalText),saved.map(x=>x.originalText));
 const duplicated=structuredClone(ot32);
 duplicated.questions[0].id=ot32.storyNotes[0].id;
 assert.ok(lessonIntegrityIssues(duplicated).some(x=>
  x.message.includes('Duplicate curriculum source ID')));
});

test('Metadata rebuild restores 27 module readiness entries without faking approval',()=>{
 const broken=structuredClone(ot32);
 broken.moduleReadiness=broken.moduleReadiness.slice(0,26);
 broken.moduleReadiness[0].preparedActivityKey='wrong';
 broken.moduleReadiness[1].status='READY';
 delete broken.preparedActivities.multipleChoice;
 const audit=lessonIntegrityIssues(broken);
 assert.ok(audit.some(x=>x.area==='lesson-readiness'));
 const fixed=rebuildReadinessInventory(broken);
 assert.equal(fixed.moduleReadiness.length,27);
 assert.equal(fixed.moduleReadiness[0].preparedActivityKey,'drawPicture');
 assert.equal(fixed.moduleReadiness[0].teacherReviewRequired,true);
 assert.equal(fixed.moduleReadiness.find(x=>x.moduleId==='multiple-choice').status,
  'AUTHORING NEEDED');
 assert.ok(!lessonIntegrityIssues(fixed).some(x=>x.area==='lesson-readiness'));
 assert.deepEqual(fixed.storyNotes,ot32.storyNotes);
 assert.deepEqual(fixed.facts,ot32.facts);
});

test('Lesson title, Scripture and publication defects get the correct repair and signoff paths',()=>{
 const broken=structuredClone(ot31);
 broken.lessonDetails.title='';
 broken.lessonDetails.scriptureDisplay='';
 broken.lessonDetails.scripturePassages=[];
 broken.publication.teacherSignoff.reviewer='';
 delete broken.publication.scriptureRights;
 const report=buildReviewPreflight(broken);
 for(const id of ['lesson-details','lesson-publication'])
  assert.ok(report.issues.some(x=>x.taskId===id&&x.fieldId==='review-field-'+id),id);
 const titled=editLessonDetails(broken,'title','A reviewed worksheet lesson');
 const scripture=editLessonDetails(titled,'scripturePassages','Exodus 15:11\nExodus 14');
 assert.equal(scripture.lessonDetails.title,'A reviewed worksheet lesson');
 assert.deepEqual(scripture.lessonDetails.scripturePassages,['Exodus 15:11','Exodus 14']);
 assert.ok(lessonIntegrityIssues(scripture).some(x=>x.area==='lesson-publication'),
  'Changing a title never grants publication rights');
 assert.throws(()=>createApprovedLesson(broken,'Teacher','2026-11-04',false),/Confirm the official BSB/u);
 const signed=createApprovedLesson(ot32,'Teacher','2026-11-04',true);
 assert.equal(signed.publication.scriptureRights.status,'cleared');
});

test('Missing seven verse records are restored from a verified passage via the BSB editor',()=>{
 const missing=structuredClone(ot32);
 const keys=['firstLetters','finishVerse','unscrambleVerse','upsideDownVerse',
  'verseCryptogram','spiralVerse','connectVerse'];
 for(const key of keys)delete missing.preparedActivities[key];
 const passage={reference:ot32.lessonDetails.memoryVerse.reference,
  text:ot32.lessonDetails.memoryVerse.text,citations:[]};
 const spans=wordSpans(passage.text);
 const options=spans.flatMap((span,i)=>
  /^[\p{L}]{1,9}$/u.test(span.word)?[i]:[]);
 assert.ok(options.length>=4);
 const repaired=applyBsbVerse(missing,passage,0,spans.length-1,
  options.slice(0,2),options.slice(0,4));
 for(const key of keys){
  assert.ok(repaired.preparedActivities[key],key+' still missing');
  assert.equal(repaired.preparedActivities[key].teacherReviewRequired,true);
 }
 assert.equal(repaired.lessonDetails.memoryVerse.translation,'BSB');
 assert.deepEqual(missing.preparedActivities,structuredClone(missing).preparedActivities);
 for(const id of ['first-letters','finish-verse','unscramble-verse','upside-down-verse',
  'verse-cryptogram','spiral-verse','connect-verse']){
  const dest=repairDestinationForModule(id,false);
  assert.equal(dest.taskId,'bsb-verse');
 }
});

test('A missing Multiple Choice bank is repairable from an original question without inventing wrong answers',()=>{
 const missing=structuredClone(ot32);
 missing.preparedActivities.multipleChoice=[];
 assert.ok(multipleChoiceIssues(missing).some(x=>x.message.includes('Add at least one')));
 const source=ot32.questions.find(x=>x.question&&x.answer);
 const filled=chooseOriginalQuestion(missing,source.id);
 const row=multipleChoiceRows(filled)[0];
 assert.equal(row.correctAnswer,source.answer);
 assert.equal(row.choices[0].text,source.answer);
 assert.equal(row.choices[0].isCorrect,true);
 assert.equal(row.choices[1].text,'');
 assert.equal(row.choices[2].text,'');
 assert.equal(row.teacherReviewRequired,true);
 assert.ok(multipleChoiceIssues(filled).length>0,'teacher must compose plausible wrong answers');
 const first=editMultipleChoice(filled,0,'wrong1','An incorrect option');
 const second=editMultipleChoice(first,0,'wrong2','Another incorrect option');
 assert.deepEqual(multipleChoiceIssues(second),[]);
 assert.equal(second.preparedActivities.multipleChoice[0].sourceQuestionIds[0],source.id);
 assert.deepEqual(second.questions,ot32.questions);
 const edited=editMultipleChoice(second,0,'correctAnswer','Changed correct answer');
 assert.deepEqual(edited.preparedActivities.multipleChoice[0].sourceQuestionIds,[]);
 assert.equal(edited.preparedActivities.multipleChoice[0].choices[0].text,'Changed correct answer');
 const removed=removeMultipleChoice(second,0);
 assert.equal(multipleChoiceRows(removed).length,0);
 assert.deepEqual(removed.questions,ot32.questions);
});

test('Source and activity editors are mounted, and expensive historical PDF generation is absent',async()=>{
 const paths=[
  'src/review/ReviewApp.tsx','src/review/LessonIntegrityReviewEditor.tsx',
  'src/review/MultipleChoiceBankReviewEditor.tsx','.github/workflows/pages.yml',
 ];
 const [app,sources,mc,workflow]=await Promise.all(paths.map(path=>
  readFile(new URL('../'+path,import.meta.url),'utf8')));
 assert.match(app,/<LessonIntegrityReviewEditor/u);
 assert.match(app,/<MultipleChoiceBankReviewEditor/u);
 assert.match(app,/review-field-publication-signoff/u);
 assert.match(sources,/repairSourceReference/u);
 assert.match(sources,/rebuildReadinessInventory/u);
 assert.match(mc,/chooseOriginalQuestion/u);
 assert.match(mc,/<SmallModulePreview module=/u);
 assert.doesNotMatch(workflow,/Generate sample PDFs|Upload sample PDF for review|sample-bifold-booklet/u);
 assert.match(workflow,/npm run test/u);
 assert.match(workflow,/npm run verify:bsb/u);
 assert.doesNotMatch(workflow,/npm run prepare:bsb/u,
  'CI should validate the committed BSB corpus without re-downloading it');
 assert.match(workflow,/npm run build/u);
 assert.match(workflow,/Upload site artifact/u);
 assert.match(workflow,/Deploy to GitHub Pages/u);
});

test('The real generator still builds all three numbered presets for the approved curriculum',()=>{
 for(const lesson of [ot31,ot32]){
  const converted=convertLessonActivities(lesson);
  assert.equal(new Set(converted.candidates.map(x=>x.moduleId)).size,27);
  for(const recipe of WORKSHEET_RECIPES){
   const draft=buildWorksheetRecipe(lesson,recipe.id,{purpose:'published',seed:1});
   assert.equal(draft.openSlots.length,0,lesson.id+' '+recipe.id);
  }
 }
});
