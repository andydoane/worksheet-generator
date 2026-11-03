import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
 ALL_MODULE_IDS,assessCurriculumLesson,checkPrintableCandidate,
 inspectCurriculumLibrary,renderCurriculumReadinessMarkdown,
} from '../scripts/curriculum-library.mjs';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {
 approvedForPublic,assemblePublicLessonCatalog,isRightsEvidence,PUBLIC_LESSONS,
} from '../src/publishedLessonCatalog.ts';
import {generateCrossword,checkCrossword} from '../src/specialtyModules.ts';
import {convertLessonActivities,findLessonCandidate} from '../src/lessonActivityConverter.ts';

const load=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const lesson=await load('curriculum/review/ot-031-god-parts-the-red-sea.json');
const schema=await load('curriculum/schema/lesson-v1.schema.json');
const exampleRights={
 status:'cleared',basis:'Written permissions verification for the exact excerpt and intended distribution',
 reviewedBy:'Curriculum author',reviewedOn:'2026-11-03',
};
const signed=()=>{
 const value=structuredClone(lesson);
 value.publication.status='approved';
 value.publication.approved=true;
 value.publication.teacherSignoff={reviewer:'Curriculum author',date:'2026-11-03'};
 value.publication.resolvedReviewFlagIds=value.reviewFlags
  .filter(x=>x.type==='teacher-approval').map(x=>x.id);
 return value;
};

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
 assert.equal(audit.recipeReadiness.length,2);
 assert.ok(audit.recipeReadiness.every(x=>x.ready));
 assert.ok(audit.recipeReadiness.every(x=>x.selectedModules===10&&x.openSlots===1));
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
test('Scripture rights evidence requires status, independently stated basis, reviewer and real ISO calendar date',()=>{
 assert.equal(isRightsEvidence(exampleRights),true);
 for(const change of [
  {status:'pending'}, {basis:' '},{reviewedBy:''},{reviewedOn:'2026-02-30'},
  {reviewedOn:'tomorrow'},
 ]){
  assert.equal(isRightsEvidence({...exampleRights,...change}),false,
   JSON.stringify(change));
 }
 const approved=signed();
 assert.deepEqual(validateLesson(approved,schema),[]);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true}),false,
  'single boolean alone cannot clear the licensing gate');
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true,
  rightsEvidence:{...exampleRights,status:'pending'}}),false);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:false,
  rightsEvidence:exampleRights}),false);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),true);
 const unfinished=structuredClone(approved);
 unfinished.publication.resolvedReviewFlagIds=[];
 assert.equal(approvedForPublic({lesson:unfinished,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false);
 const flipped=structuredClone(lesson);
 flipped.publication.approved=true;
 assert.equal(approvedForPublic({lesson:flipped,scriptureDistributionCleared:true,
  rightsEvidence:exampleRights}),false);
});
test('Public auto-discovery loads only explicit approved filenames with separately recorded rights, in stable order',async()=>{
 const approved=signed();
 const id=approved.id;
 const manifest={schemaVersion:1,lessons:{[id]:exampleRights}};
 const path='../curriculum/approved/'+id+'.lesson.json';
 const files={
  [path]:approved,
  ['../curriculum/review/'+id+'.lesson.json']:structuredClone(lesson),
 };
 const registered=assemblePublicLessonCatalog(files,manifest);
 assert.equal(registered.length,1);
 assert.equal(registered[0].lesson.id,id);
 assert.equal(registered[0].rightsEvidence.basis,exampleRights.basis);
 assert.equal(assemblePublicLessonCatalog({[path]:lesson},manifest).length,0,
  'unapproved lesson filename must not bypass approval');
 assert.equal(assemblePublicLessonCatalog(files,{schemaVersion:1,lessons:{}}).length,0);
 assert.equal(assemblePublicLessonCatalog(files,{schemaVersion:2,lessons:manifest.lessons}).length,0);
 assert.equal(assemblePublicLessonCatalog({'../curriculum/approved/different.lesson.json':approved},
  manifest).length,0,'filename/lesson ID mismatch');
 assert.equal(assemblePublicLessonCatalog({
  ['../curriculum/review/'+id+'.lesson.json']:approved,
 },manifest).length,0,'review path is not a public source');
 assert.equal(PUBLIC_LESSONS.length,0,'this PR registers no actual public lessons');
 const appCatalog=await readFile(new URL('../src/publishedLessonCatalog.ts',import.meta.url),'utf8');
 assert.match(appCatalog,/import\.meta\.env\s*\?import\.meta\.glob/u,
  'Vite must actually run the transformed imports at runtime');
 assert.doesNotMatch(appCatalog,/^\s*typeof import\.meta\.glob/gmu,
  'compile-time import.meta.glob is not a runtime browser feature');
 assert.doesNotMatch(appCatalog,/import\.meta\.glob\(['"]\.\.\/curriculum\/review/u);
});
test('Live repository scan writes truthful ready-vs-approved reports without accidentally publishing a lesson',async()=>{
 const report=await inspectCurriculumLibrary();
 assert.equal(report.passed,true);
 assert.equal(report.errors.length,0);
 assert.equal(report.lessons.length,1);
 assert.equal(report.lessons[0].source,'review');
 assert.equal(report.lessons[0].eligibleForPublication,false);
 const rendered=renderCurriculumReadinessMarkdown(report);
 assert.match(rendered,/Curriculum library readiness/u);
 assert.match(rendered,/27\/27/u);
 assert.match(rendered,/ADAPTATION NEEDED/u);
 assert.match(rendered,/not cleared/u);
 assert.match(rendered,/story-review/u);
 assert.match(rendered,/fun-and-games/u);
});
test('A future approved data-only lesson is accepted only when schema, actual puzzles, both recipes, signoff and independent rights all pass',async()=>{
 const root=await mkdtemp(join(tmpdir(),'worksheet-library-pr17g-'));
 try{
  await mkdir(join(root,'curriculum','schema'),{recursive:true});
  await mkdir(join(root,'curriculum','review'),{recursive:true});
  await mkdir(join(root,'curriculum','approved'),{recursive:true});
  const schemaFile=join(root,'curriculum','schema','lesson-v1.schema.json');
  const approvedFile=join(root,'curriculum','approved',lesson.id+'.lesson.json');
  const manifestFile=join(root,'curriculum','approved','rights-manifest.json');
  await writeFile(schemaFile,JSON.stringify(schema));
  await writeFile(approvedFile,JSON.stringify(signed()));
  await writeFile(manifestFile,JSON.stringify({schemaVersion:1,lessons:{[lesson.id]:exampleRights}}));
  const ready=await inspectCurriculumLibrary({root,writeReports:true});
  assert.equal(ready.passed,true,JSON.stringify(ready.errors));
  assert.equal(ready.lessons.length,1);
  assert.equal(ready.lessons[0].eligibleForPublication,true);
  assert.equal(ready.lessons[0].moduleReadiness.length,27);
  assert.ok(ready.lessons[0].recipeReadiness.every(x=>x.ready));
  const written=JSON.parse(await readFile(join(root,'artifacts','curriculum-readiness-report.json'),'utf8'));
  assert.equal(written.lessons[0].eligibleForPublication,true);
  const markdown=await readFile(join(root,'artifacts','curriculum-readiness-report.md'),'utf8');
  assert.match(markdown,/Scripture rights evidence:\*\* cleared/u);
  await writeFile(manifestFile,JSON.stringify({schemaVersion:1,lessons:{}}));
  const withoutRights=await inspectCurriculumLibrary({root});
  assert.equal(withoutRights.passed,false);
  assert.ok(withoutRights.errors.some(x=>x.code==='rights-clearance'));
  await writeFile(manifestFile,JSON.stringify({schemaVersion:1,lessons:{[lesson.id]:exampleRights}}));
  const malformed=signed();
  malformed.preparedActivities.multipleChoice=[];
  await writeFile(approvedFile,JSON.stringify(malformed));
  const noRecipe=await inspectCurriculumLibrary({root});
  assert.equal(noRecipe.passed,false);
  assert.ok(noRecipe.errors.some(x=>x.code==='recipe-not-ready'));
  await writeFile(approvedFile,JSON.stringify(signed()));
  await writeFile(join(root,'curriculum','review',lesson.id+'.json'),JSON.stringify(lesson));
  const duplicate=await inspectCurriculumLibrary({root});
  assert.equal(duplicate.passed,false);
  assert.ok(duplicate.errors.some(x=>x.code==='duplicate-id'));
 }finally{await rm(root,{recursive:true,force:true});}
});
