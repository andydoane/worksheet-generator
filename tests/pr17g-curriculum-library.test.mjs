import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
 ALL_MODULE_IDS,assessCurriculumLesson,checkPrintableCandidate,
 inspectCurriculumLibrary,renderCurriculumReadinessMarkdown,
} from '../scripts/curriculum-library.mjs';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {normalizeLegacySmallDrawingScenes,useMatchingStoryOrderCaptions} from '../src/review/model.ts';
import {
 approvedForPublic,assemblePublicLessonCatalog,isRightsEvidence,PUBLIC_LESSONS,
} from '../src/publishedLessonCatalog.ts';
import {generateCrossword,checkCrossword} from '../src/specialtyModules.ts';
import {convertLessonActivities,findLessonCandidate} from '../src/lessonActivityConverter.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';

const load=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const lesson=await load('tests/fixtures/ot-031-original-review.json');
const schema=await load('curriculum/schema/lesson-v1.schema.json');
const approvedRedSea=await load('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const exampleRights=structuredClone(approvedRedSea.publication.scriptureRights);
const signed=()=>structuredClone(approvedRedSea);

test('Real current Red Sea review lesson is schema-valid and all 27 types pass actual engine QA',()=>{
 assert.equal(ALL_MODULE_IDS.length,27);
 assert.equal(new Set(ALL_MODULE_IDS).size,27);
 assert.deepEqual(validateLesson(lesson,schema),[]);
 const old=structuredClone(lesson);
 const audit=assessCurriculumLesson(lesson,schema,{source:'review'});
 assert.deepEqual(audit.schemaErrors,[]);
 assert.equal(audit.id,lesson.id);
 assert.equal(audit.moduleReadiness.length,27);
 assert.ok(audit.moduleReadiness.every(x=>x.technicalStatus==='ready'),
  JSON.stringify(audit.moduleReadiness.filter(x=>x.technicalStatus!=='ready')));
 assert.equal(audit.moduleReadiness.find(x=>x.moduleId==='multiple-choice').candidateCount,8);
 assert.ok(audit.moduleReadiness.some(x=>x.teacherReviewCount>0));
 const crossword=audit.moduleReadiness.find(x=>x.moduleId==='crossword');
 assert.equal(crossword.technicalStatus,'ready');
 assert.equal(crossword.contentStatus,'ADAPTATION NEEDED',
  'author content assessment remains separate from tested generator success');
 assert.equal(audit.recipeReadiness.length,3);
 assert.ok(audit.recipeReadiness.every(x=>x.ready));
 assert.deepEqual(audit.recipeReadiness.map(x=>x.selectedModules),[11,10,9]);
 assert.ok(audit.recipeReadiness.every(x=>x.openSlots===0));
 assert.ok(audit.teacherReviewFlagsOutstanding.length>=4);
 assert.equal(audit.eligibleForPublication,false);
 assert.equal(audit.rightsCleared,false);
 assert.deepEqual(lesson,old,'report cannot mutate teacher-authored curriculum');
});
test('Missing or invalid prepared modules are clearly reported instead of implicitly considered ready',()=>{
 const changed=structuredClone(lesson);
 delete changed.preparedActivities.finishVerse;
 changed.moduleReadiness.find(x=>x.moduleId==='finish-verse').status='ADAPTATION NEEDED';
 changed.preparedActivities.circleMistakes.mistakeCount=3;
 const audit=assessCurriculumLesson(changed,schema,{source:'review'});
 assert.ok(audit.schemaErrors.length===0,'optional prepared modules may be absent');
 const finish=audit.moduleReadiness.find(x=>x.moduleId==='finish-verse');
 const mistakes=audit.moduleReadiness.find(x=>x.moduleId==='circle-mistakes');
 assert.equal(finish.technicalStatus,'missing');
 assert.equal(finish.candidateCount,0);
 assert.equal(mistakes.technicalStatus,'invalid');
 assert.ok(mistakes.diagnostics.length>0);
 assert.equal(audit.eligibleForPublication,false);
 const corrupt=structuredClone(lesson);
 corrupt.storyNotes[0].id=corrupt.storyNotes[1].id;
 const failed=assessCurriculumLesson(corrupt,schema);
 assert.ok(failed.schemaErrors.length>0);
 assert.ok(failed.moduleReadiness.every(x=>x.technicalStatus==='not-checked'));
 const testModule=findLessonCandidate(convertLessonActivities(lesson),'crossword','crossword').module;
 assert.deepEqual(checkPrintableCandidate(testModule),[]);
 assert.equal(checkCrossword(generateCrossword(testModule)),true);
 assert.ok(checkPrintableCandidate({type:'word-search',words:'INVALID@$%^',seed:1}).length>0);
});
test('Rights evidence requires explicit clearance with a valid basis, reviewer and real calendar date',()=>{
 assert.equal(isRightsEvidence(exampleRights),true);
 for(const change of [
  {status:'pending'},{basis:' '},{reviewedBy:''},{reviewedOn:'2026-02-30'},
  {reviewedOn:'tomorrow'},
 ]){
  assert.equal(isRightsEvidence({...exampleRights,...change}),false,
   JSON.stringify(change));
 }
 const approved=signed();
 assert.deepEqual(validateLesson(approved,schema),[]);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true}),false,
  'Caller must not bypass rights evidence');
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true,
  rightsEvidence:{...exampleRights,status:'pending'}}),false);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:false,
  rightsEvidence:exampleRights}),false);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),true);
 const absent=structuredClone(approved);
 delete absent.publication.scriptureRights;
 assert.equal(approvedForPublic({lesson:absent,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false,
  'An external detached clearance cannot substitute for the signed lesson record');
 const changed=structuredClone(approved);
 changed.publication.scriptureRights.basis='unrelated external permission';
 assert.equal(approvedForPublic({lesson:changed,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false,
  'Evidence must exactly match the approved file, not a detached registry');
 const unfinished=structuredClone(approved);
 unfinished.publication.resolvedReviewFlagIds=[];
 assert.equal(approvedForPublic({lesson:unfinished,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false);
 const flipped=structuredClone(lesson);
 flipped.publication.approved=true;
 assert.equal(approvedForPublic({lesson:flipped,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false);
});

test('Public auto-discovery requires a self-contained approved file; no shared rights manifest',async()=>{
 const approved=signed(),id=approved.id;
 const path='../curriculum/approved/'+id+'.lesson.json';
 const files={
  [path]:approved,
  ['../curriculum/review/'+id+'.lesson.json']:structuredClone(lesson),
 };
 const registered=assemblePublicLessonCatalog(files);
 assert.equal(registered.length,1);
 assert.equal(registered[0].lesson.id,id);
 assert.equal(registered[0].rightsEvidence.basis,exampleRights.basis);
 assert.equal(assemblePublicLessonCatalog({[path]:lesson}).length,0,
  'unapproved file does not become public by being in the folder');
 const noRights=structuredClone(approved);
 delete noRights.publication.scriptureRights;
 assert.equal(assemblePublicLessonCatalog({[path]:noRights}).length,0,
  'missing embedded clearance blocks publishing');
 assert.equal(assemblePublicLessonCatalog({'../curriculum/approved/different.lesson.json':approved}).length,0,
  'filename/lesson ID mismatch');
 assert.equal(assemblePublicLessonCatalog({
  ['../curriculum/review/'+id+'.lesson.json']:approved,
 }).length,0,'review-stage files stay private from the public catalog');
 const second=structuredClone(approved);
 second.id='ot-032-future-example';
 second.lessonDetails.title='Second reviewed sample';
 const withTwo=assemblePublicLessonCatalog({
  ['../curriculum/approved/'+second.id+'.lesson.json']:second,
  [path]:approved,
 });
 assert.deepEqual(withTwo.map(x=>x.lesson.id),[id,second.id],
  'adding a second approved file automatically adds it in stable order');
 assert.equal(PUBLIC_LESSONS.length,0,'Native Node lacks Vite glob transform');
 const appCatalog=await readFile(new URL('../src/publishedLessonCatalog.ts',import.meta.url),'utf8');
 assert.match(appCatalog,/import\.meta\.env\s*\?import\.meta\.glob/u);
 assert.doesNotMatch(appCatalog,/import\.meta\.glob\(['"]\.\.\/curriculum\/review/u);
 assert.doesNotMatch(appCatalog,/rights-manifest\.json/u);
});

test('Live repository scan validates every approved lesson and all three numbered presets',async()=>{
 const report=await inspectCurriculumLibrary();
 assert.equal(report.passed,true,JSON.stringify(report.errors));
 assert.equal(report.errors.length,0);
 const published=report.lessons.filter(x=>x.source==='approved');
 const files=(await readdir(new URL('../curriculum/approved/',import.meta.url)))
  .filter(name=>name.endsWith('.lesson.json')).sort();
 const expectedIds=files.map(name=>name.slice(0,-'.lesson.json'.length));
 assert.ok(expectedIds.includes(approvedRedSea.id),'Retain the teacher-approved OT31 lesson');
 assert.deepEqual(published.map(x=>x.id).sort(),expectedIds,
  'Every newly uploaded approved file must be discovered, without a fixed lesson count');
 for(const entry of published){
  assert.equal(entry.eligibleForPublication,true,entry.id);
  assert.equal(entry.rightsCleared,true,entry.id);
  assert.equal(entry.teacherReviewFlagsOutstanding.length,0,entry.id);
  assert.equal(entry.recipeReadiness.length,3,entry.id);
  assert.ok(entry.recipeReadiness.every(x=>x.ready&&x.openSlots===0),
   entry.id+': '+JSON.stringify(entry.recipeReadiness));
 }
 const catalogFiles={};
 for(const name of files){
  const path='../curriculum/approved/'+name;
  catalogFiles[path]=await load('curriculum/approved/'+name);
 }
 assert.deepEqual(assemblePublicLessonCatalog(catalogFiles).map(x=>x.lesson.id).sort(),
  expectedIds,'The public catalog must discover every independently approved lesson');
 assert.ok(report.lessons.filter(x=>x.source==='review')
  .every(x=>x.eligibleForPublication===false),'All review data must remain unlisted');
 const rendered=renderCurriculumReadinessMarkdown(report);
 assert.match(rendered,/Curriculum library readiness/u);
 assert.match(rendered,/27\/27/u);
 assert.match(rendered,/cleared/u);
 assert.match(rendered,/preset-1/u);
 assert.match(rendered,/preset-3/u);
});
test('A pending review copy can coexist with one approved file, but same-stage duplicates still fail',async()=>{
 const root=await mkdtemp(join(tmpdir(),'worksheet-publish-review-copy-'));
 try{
  const curriculum=join(root,'curriculum'),review=join(curriculum,'review');
  const approvedDir=join(curriculum,'approved');
  await mkdir(join(curriculum,'schema'),{recursive:true});
  await mkdir(review,{recursive:true});
  await mkdir(approvedDir,{recursive:true});
  await writeFile(join(curriculum,'schema','lesson-v1.schema.json'),JSON.stringify(schema));
  await writeFile(join(review,'ot-031-pending.review.json'),JSON.stringify(lesson));
  await writeFile(join(approvedDir,signed().id+'.lesson.json'),JSON.stringify(signed()));
  const coexist=await inspectCurriculumLibrary({root});
  assert.equal(coexist.passed,true,JSON.stringify(coexist.errors));
  assert.equal(coexist.lessons.length,2);
  assert.deepEqual(coexist.lessons.map(x=>x.source),['review','approved']);
  assert.equal(coexist.lessons[0].eligibleForPublication,false);
  assert.equal(coexist.lessons[1].eligibleForPublication,true);
  // Two different review files with the same source ID are still a mistake.
  await writeFile(join(review,'ot-031-other.review.json'),JSON.stringify(lesson));
  const duplicates=await inspectCurriculumLibrary({root});
  assert.ok(duplicates.errors.some(x=>x.code==='duplicate-id'));
  // Keep the fail-closed rule for falsely approved review-stage files.
  await rm(join(review,'ot-031-other.review.json'));
  await writeFile(join(review,'ot-031-pending.review.json'),JSON.stringify(signed()));
  const wrongStage=await inspectCurriculumLibrary({root});
  assert.ok(wrongStage.errors.some(x=>x.code==='review-stage'));
 }finally{
  await rm(root,{recursive:true,force:true});
 }
});
test('CI approves another one-file lesson only when full schema, puzzles, presets, signoff and embedded Scripture rights pass',async()=>{
 const root=await mkdtemp(join(tmpdir(),'worksheet-library-pr17o-'));
 try{
  await mkdir(join(root,'curriculum','schema'),{recursive:true});
  await mkdir(join(root,'curriculum','review'),{recursive:true});
  await mkdir(join(root,'curriculum','approved'),{recursive:true});
  const schemaFile=join(root,'curriculum','schema','lesson-v1.schema.json');
  const first=signed(),second=signed();
  second.id='ot-032-future-reviewed-lesson';
  second.lessonDetails.title='A second approved lesson';
  const approvedFile=join(root,'curriculum','approved',first.id+'.lesson.json');
  const secondFile=join(root,'curriculum','approved',second.id+'.lesson.json');
  await writeFile(schemaFile,JSON.stringify(schema));
  await writeFile(approvedFile,JSON.stringify(first));
  const ready=await inspectCurriculumLibrary({root,writeReports:true});
  assert.equal(ready.passed,true,JSON.stringify(ready.errors));
  assert.equal(ready.lessons.length,1);
  assert.equal(ready.lessons[0].eligibleForPublication,true);
  assert.equal(ready.lessons[0].moduleReadiness.length,27);
  assert.ok(ready.lessons[0].recipeReadiness.every(x=>x.ready));
  const report=JSON.parse(await readFile(join(root,'artifacts','curriculum-readiness-report.json'),'utf8'));
  assert.equal(report.lessons[0].eligibleForPublication,true);
  const md=await readFile(join(root,'artifacts','curriculum-readiness-report.md'),'utf8');
  assert.match(md,/Scripture rights evidence:\*\* cleared/u);

  await writeFile(secondFile,JSON.stringify(second));
  const withTwo=await inspectCurriculumLibrary({root});
  assert.equal(withTwo.passed,true,JSON.stringify(withTwo.errors));
  assert.equal(withTwo.lessons.length,2,
   'New self-contained approved file must be automatically discovered without any registry update');
  const withoutRights=structuredClone(second);
  delete withoutRights.publication.scriptureRights;
  await writeFile(secondFile,JSON.stringify(withoutRights));
  const denied=await inspectCurriculumLibrary({root});
  assert.equal(denied.passed,false);
  assert.ok(denied.errors.some(x=>x.code==='rights-clearance'));
  assert.ok(denied.errors.some(x=>x.code==='not-publishable'));
  const altered=structuredClone(second);
  altered.lessonDetails.memoryVerse.bsbSource.sourceUrl='https://unknown.example/verse.txt';
  await writeFile(secondFile,JSON.stringify(altered));
  const unverified=await inspectCurriculumLibrary({root});
  assert.equal(unverified.passed,false);
  assert.ok(unverified.errors.some(x=>x.code==='schema'&&x.message.includes('official BSB source')));
  const noApproval=structuredClone(second);
  delete noApproval.publication.teacherSignoff;
  await writeFile(secondFile,JSON.stringify(noApproval));
  const unsigned=await inspectCurriculumLibrary({root});
  assert.equal(unsigned.passed,false);
  assert.ok(unsigned.errors.some(x=>x.code==='teacher-signoff'));
  const malformed=structuredClone(second);
  malformed.preparedActivities.multipleChoice=[];
  await writeFile(secondFile,JSON.stringify(malformed));
  const noRecipe=await inspectCurriculumLibrary({root});
  assert.equal(noRecipe.passed,false);
  assert.ok(noRecipe.errors.some(x=>x.code==='recipe-not-ready'));
  await writeFile(secondFile,JSON.stringify(second));
  // The one-file upload flow permits an older pending draft in review/.
  // Only approved/<id>.lesson.json enters the live public catalog.
  await writeFile(join(root,'curriculum','review',first.id+'.json'),JSON.stringify(lesson));
  const withPendingReview=await inspectCurriculumLibrary({root});
  assert.equal(withPendingReview.passed,true,JSON.stringify(withPendingReview.errors));
  assert.equal(withPendingReview.lessons.filter(x=>x.source==='approved').length,2);
  assert.equal(withPendingReview.lessons.filter(x=>x.source==='review').length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Public catalog discovers the actual signed-off BSB Red Sea lesson without a code registry entry',async()=>{
 const approved=await load('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
 assert.equal(approved.publication.status,'approved');
 assert.equal(approved.publication.approved,true);
 assert.equal(approved.publication.teacherSignoff.reviewer,'Andy Doane');
 assert.equal(approved.lessonDetails.memoryVerse.translation,'BSB');
 assert.equal(approved.lessonDetails.memoryVerse.reference,'Exodus 15:11');
 assert.equal(approved.publication.scriptureRights.status,'cleared');
 assert.match(approved.publication.scriptureRights.basis,/public domain/u);
 const files={['../curriculum/approved/'+approved.id+'.lesson.json']:approved};
 const catalog=assemblePublicLessonCatalog(files);
 assert.equal(catalog.length,1);
 assert.equal(catalog[0].lesson.id,approved.id);
 for(const recipe of ['story-review','fun-and-games']){
  const result=buildWorksheetRecipe(catalog[0].lesson,recipe,{purpose:'published'});
  assert.equal(result.selections.length,10);
  assert.equal(result.openSlots.length,1);
  assert.equal(result.draft.verseText,approved.lessonDetails.memoryVerse.text);
 }
});
