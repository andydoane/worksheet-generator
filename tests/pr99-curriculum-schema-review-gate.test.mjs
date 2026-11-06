import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLessonSchema as nodeSchema,validateLesson} from '../scripts/validate-curriculum.mjs';
import {validateLessonSchema as sharedSchema} from '../src/lessonSchemaValidation.ts';
import {reviewSchemaErrors,reviewSchemaIssues,schemaRepairLabel,applyReviewSchemaRepair} from '../src/review/schemaPreflight.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {createApprovedLesson} from '../src/review/model.ts';
import {MODULES} from '../src/modules.ts';

const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const json=async path=>JSON.parse(await read(path));
const schema=await json('curriculum/schema/lesson-v1.schema.json');
const approved=await json('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const failures=()=>{
 const lesson=structuredClone(approved);
 lesson.reviewFlags[0].affectedModules[0]='circle-the-mistakes';
 const first=lesson.validation.checks[0];
 first.name=first.check;
 delete first.check;
 return lesson;
};

test('Browser Review Studio and Node CI use exactly the same structural validator',async()=>{
 const script=await read('scripts/validate-curriculum.mjs');
 assert.match(script,/import \{validateLessonSchema\} from '\.\.\/src\/lessonSchemaValidation\.ts'/u);
 assert.match(script,/export \{validateLessonSchema\}/u);
 assert.equal(nodeSchema,sharedSchema);
 assert.deepEqual(reviewSchemaErrors(approved),nodeSchema(approved,schema));
 assert.deepEqual(validateLesson(approved,schema),[]);
 const source=await read('src/review/schemaPreflight.ts');
 assert.match(source,/curriculum\/schema\/lesson-v1\.schema\.json/u);
});

test('Both OT18 and OT20/OT21 failures are actionable in Review Studio preflight',()=>{
 const broken=failures();
 const errors=reviewSchemaErrors(broken);
 assert.ok(errors.some(x=>x.includes('reviewFlags[0].affectedModules[0]: invalid enum value')));
 assert.ok(errors.some(x=>x.includes('validation.checks[0].check: required field missing')));
 const issues=reviewSchemaIssues(broken);
 assert.equal(issues.length,2);
 const m=issues.find(x=>x.repair?.kind==='known-module-alias');
 const c=issues.find(x=>x.repair?.kind==='validation-check-name');
 assert.equal(m.taskId,'lesson-publication');
 assert.equal(c.taskId,'review-general');
 assert.match(schemaRepairLabel(m.repair),/circle-mistakes/u);
 assert.match(schemaRepairLabel(c.repair),/“check”/u);
 const report=buildReviewPreflight(broken);
 assert.equal(report.convertedCount,0);
 assert.equal(report.totalCount,27);
 assert.equal(report.issues.length,2);
 assert.ok(report.issues.every(x=>x.schemaRepair));
});

test('Metadata-only repairs never overwrite the original curriculum',()=>{
 const original=failures(),before=JSON.stringify(original);
 let next=original;
 for(const issue of reviewSchemaIssues(next))
  if(issue.repair)next=applyReviewSchemaRepair(next,issue.repair);
 assert.deepEqual(reviewSchemaErrors(next),[]);
 assert.deepEqual(validateLesson(next,schema),[]);
 assert.equal(next.reviewFlags[0].affectedModules[0],'circle-mistakes');
 assert.equal(next.validation.checks[0].check,approved.validation.checks[0].check);
 assert.ok(!Object.hasOwn(next.validation.checks[0],'name'));
 for(const key of ['storyNotes','questions','lessonDetails','sourceFiles','preparedActivities'])
  assert.deepEqual(next[key],approved[key],key);
 assert.equal(JSON.stringify(original),before);
 assert.throws(()=>applyReviewSchemaRepair(next,
  {kind:'validation-check-name',index:0}),/changed/u);
});

test('Unsupported aliases and unverifiable sources never receive automatic repairs',()=>{
 const wrong=structuredClone(approved);
 wrong.reviewFlags[0].affectedModules[0]='unregistered-module';
 const problem=reviewSchemaIssues(wrong).find(x=>x.path.includes('affectedModules'));
 assert.ok(problem);
 assert.equal(problem.repair,undefined);
 const missing=structuredClone(approved);
 delete missing.storyNotes[0].source.page;
 const sourceProblem=reviewSchemaIssues(missing).find(x=>x.path==='$.storyNotes[0].source.page');
 assert.ok(sourceProblem);
 assert.equal(sourceProblem.repair,undefined);
});

test('Approved download revalidates final signoff/rights object, and fails closed',()=>{
 const date='2026-11-05';
 const good=createApprovedLesson(approved,'Teacher Test',date,true);
 assert.deepEqual(reviewSchemaErrors(good),[]);
 assert.equal(good.publication.scriptureRights.status,'cleared');
 const bad=failures(),before=JSON.stringify(bad);
 assert.throws(()=>createApprovedLesson(bad,'Teacher Test',date,true),
  /Approved download blocked by curriculum schema/u);
 assert.equal(JSON.stringify(bad),before);
 const missing=structuredClone(approved);
 missing.validation.checks[0]={name:'Bad property',passed:true};
 assert.throws(()=>createApprovedLesson(missing,'Teacher Test',date,true),
  /validation\.checks/u);
 assert.throws(()=>createApprovedLesson(approved,'Teacher Test',date,false),
  /Confirm the official BSB/u);
});

test('Unapproved starter is structurally valid, not publishable or 27/27-ready',async()=>{
 const sample=await json('curriculum/examples/lesson-v1-unapproved.example.json');
 assert.deepEqual(sharedSchema(sample,schema),[]);
 assert.deepEqual(validateLesson(sample,schema),[]);
 assert.equal(sample.publication.status,'pending-teacher-approval');
 assert.equal(sample.publication.approved,false);
 assert.equal(sample.publication.teacherSignoff,undefined);
 assert.equal(sample.publication.scriptureRights,undefined);
 assert.equal(sample.validation.actualGeneratorTested,false);
 assert.equal(sample.moduleReadiness.length,0);
 assert.equal(sample.preparedActivities.oddWords.related.length,5);
 assert.equal(sample.preparedActivities.checkboxes.correct.length,5);
 assert.equal(sample.preparedActivities.unscrambleWords.answers.length,2);
 assert.ok(sample.reviewFlags[0].affectedModules.every(id=>MODULES.some(m=>m.id===id)));
 const result=buildReviewPreflight(sample);
 assert.ok(result.issues.length>0);
 assert.ok(result.convertedCount<27);
});

test('UI requires teacher confirmation, clears affected review and invalidates prior preflight',async()=>{
 const preflight=await read('src/review/preflight.ts');
 assert.match(preflight,/const schemaIssues=reviewSchemaIssues\(lesson\)/u);
 assert.match(preflight,/if\(schemaIssues.length\)return \{convertedCount:0,totalCount:27/u);
 const app=await read('src/review/ReviewApp.tsx');
 assert.match(app,/function repairSchemaIssue\(issue:ReviewIssue\)/u);
 assert.match(app,/window\.confirm\('Apply this metadata-only correction/u);
 assert.match(app,/applyReviewSchemaRepair\(lesson,issue\.schemaRepair\)/u);
 assert.ok(app.includes("setReviewed(previous=>issue.schemaRepair?.kind==='character-clue-strings'?"));
 assert.ok(app.includes('previous.filter(id=>id!==issue.taskId)'));
 assert.match(app,/setRightsConfirmed\(false\)/u);
 assert.match(app,/schemaRepairLabel\(issue\.schemaRepair\)/u);
 const model=await read('src/review/model.ts');
 assert.match(model,/const schemaProblems=reviewSchemaErrors\(next\)/u);
});

test('Guide documents all registered modules, an example and direct-to-main publishing',async()=>{
 const guide=await read('docs/CURRICULUM-CONVERSION-GUIDE.md');
 const pub=await read('curriculum/PUBLISHING.md');
 for(const id of MODULES.map(x=>x.id))assert.ok(guide.includes(id),id);
 for(const word of ['validation.checks','affectedModules','teacherSignoff','scriptureRights',
  'Review Studio','sourceIds','BSB','27','main']){
  assert.ok(guide.toLowerCase().includes(word.toLowerCase()),word);
 }
 assert.match(guide,/curriculum\/examples\/lesson-v1-unapproved\.example\.json/u);
 assert.match(guide,/ot-031-god-parts-the-red-sea\.lesson\.json/u);
 assert.match(pub,/Commit directly to the main branch/u);
 assert.match(pub,/### Optional: pull-request workflow/u);
});
