import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createApprovedLesson} from '../src/review/model.ts';
import {assemblePublicLessonCatalog,approvedForPublic} from '../src/publishedLessonCatalog.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';

const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const approved=JSON.parse(await read('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
const schema=JSON.parse(await read('curriculum/schema/lesson-v1.schema.json'));

test('OT31 preserves the original BSB rights clearance in its own approved file',()=>{
 assert.equal(approved.publication.scriptureRights.status,'cleared');
 assert.equal(approved.publication.scriptureRights.reviewedBy,'Andy Doane');
 assert.equal(approved.publication.scriptureRights.reviewedOn,'2026-11-03');
 assert.match(approved.publication.scriptureRights.basis,/public domain/u);
 assert.deepEqual(validateLesson(approved,schema),[]);
 const source={
  ['../curriculum/approved/'+approved.id+'.lesson.json']:approved,
 };
 const catalog=assemblePublicLessonCatalog(source);
 assert.equal(catalog.length,1);
 assert.deepEqual(catalog[0].rightsEvidence,approved.publication.scriptureRights);
 assert.ok(approvedForPublic(catalog[0]));
 const disallowed=structuredClone(approved);
 delete disallowed.publication.scriptureRights;
 assert.equal(assemblePublicLessonCatalog({
  ['../curriculum/approved/'+approved.id+'.lesson.json']:disallowed,
 }).length,0);
 assert.ok(validateLesson(disallowed,schema).some(x=>x.includes('Scripture rights clearance')));
});

test('Review Studio final signoff saves a distinct Scripture-rights decision inside exactly one lesson file',()=>{
 const draft=structuredClone(approved);
 draft.publication={status:'pending-teacher-approval',approved:false};
 const before=JSON.stringify(draft);
 assert.throws(()=>createApprovedLesson(draft,'Curriculum author','2026-11-03',false),
  /Confirm the official BSB source/u);
 assert.throws(()=>createApprovedLesson(draft,'','2026-11-03',true),
  /reviewer/u);
 const future=createApprovedLesson(draft,'Curriculum author','2026-11-03',true);
 assert.equal(future.publication.approved,true);
 assert.equal(future.publication.status,'approved');
 assert.equal(future.publication.teacherSignoff.reviewer,'Curriculum author');
 assert.equal(future.publication.scriptureRights.status,'cleared');
 assert.equal(future.publication.scriptureRights.reviewedBy,'Curriculum author');
 assert.equal(future.publication.scriptureRights.reviewedOn,'2026-11-03');
 assert.ok(future.publication.resolvedReviewFlagIds.length>0);
 assert.deepEqual(validateLesson(future,schema),[]);
 assert.equal(JSON.stringify(draft),before,'Final signoff must not mutate the working lesson');
 const corrupted=structuredClone(draft);
 corrupted.lessonDetails.memoryVerse.bsbSource.sourceUrl='https://not-official.example/bsb';
 assert.throws(()=>createApprovedLesson(corrupted,'Curriculum author','2026-11-03',true),
  /Select and verify the original BSB Scripture/u);
});

test('Public catalog is folder-based; Review Studio no longer requires separate manifest uploads/downloads',async()=>{
 const [catalog,studio,lib,samples,guide]=await Promise.all([
  read('src/publishedLessonCatalog.ts'),
  read('src/review/ReviewApp.tsx'),
  read('scripts/curriculum-library.mjs'),
  read('scripts/create-pr17k-preset-samples.mjs'),
  read('curriculum/PUBLISHING.md'),
 ]);
 assert.match(catalog,/curriculum\/approved\/\*\.lesson\.json/u);
 assert.doesNotMatch(catalog,/rights-manifest\.json/u);
 assert.doesNotMatch(studio,/loadManifest|downloadRights|confirmEmptyManifest|rights-manifest\.json/u);
 assert.match(studio,/createApprovedLesson\(lesson,reviewer,signDate,rightsConfirmed\)/u);
 assert.match(studio,/Download approved lesson JSON/u);
 assert.match(studio,/official BSB public-domain terms/u);
 assert.doesNotMatch(lib,/rights-manifest\.json|orphan-rights/u);
 assert.doesNotMatch(samples,/rights-manifest\.json/u);
 assert.match(guide,/Add file.*Upload files/u);
 assert.match(guide,/publication\.scriptureRights/u);
});
