import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLesson,validateLessonSchema} from '../scripts/validate-curriculum.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const schema=await readJson('curriculum/schema/lesson-v1.schema.json');
const ot24=await readJson('curriculum/approved/ot-024-joseph-tests-his-brothers.lesson.json');

test('OT24 keeps its approved source evidence and its page-free BibleHub verse verification',()=>{
 const verse=ot24.lessonDetails.memoryVerse;
 assert.equal(ot24.id,'ot-024-joseph-tests-his-brothers');
 assert.equal(verse.source.page,8,'the actual ODT source retains its original page');
 assert.equal(verse.alsoVerifiedAt.filename,'https://biblehub.com/luke/6-27.htm');
 assert.equal('page' in verse.alsoVerifiedAt,false,'webpages must not be assigned invented pages');
 assert.deepEqual(validateLesson(ot24,schema),[],
  'the actual approved lesson must validate without deleting attribution');
 assert.equal(ot24.publication.approved,true);
 assert.equal(ot24.publication.scriptureRights.status,'cleared');
});

test('Page numbers stay mandatory on primary source documents',()=>{
 const noPrimaryPage=structuredClone(ot24);
 delete noPrimaryPage.lessonDetails.memoryVerse.source.page;
 assert.ok(validateLessonSchema(noPrimaryPage,schema).some(x=>
  x.includes('$.lessonDetails.memoryVerse.source.page: required field missing')));
 const missingPageOnStoryNote=structuredClone(ot24);
 delete missingPageOnStoryNote.storyNotes[0].source.page;
 assert.ok(validateLessonSchema(missingPageOnStoryNote,schema).some(x=>
  x.includes('storyNotes[0].source.page: required field missing')));
});

test('Secondary verification still requires meaningful attribution and valid page values when supplied',()=>{
 const invalid=[
  {change:entry=>{delete entry.filename;},message:'.alsoVerifiedAt.filename: required field missing'},
  {change:entry=>{entry.filename='';},message:'.alsoVerifiedAt.filename: too short'},
  {change:entry=>{delete entry.section;},message:'.alsoVerifiedAt.section: required field missing'},
  {change:entry=>{entry.section='';},message:'.alsoVerifiedAt.section: too short'},
  {change:entry=>{entry.page=0;},message:'.alsoVerifiedAt.page: below minimum'},
  {change:entry=>{entry.page='1';},message:'.alsoVerifiedAt.page: expected an integer'},
 ];
 for(const {change,message} of invalid){
  const fixture=structuredClone(ot24);
  change(fixture.lessonDetails.memoryVerse.alsoVerifiedAt);
  assert.ok(validateLessonSchema(fixture,schema).some(error=>error.includes(message)),
   'The secondary citation must reject '+message);
 }
 const paged=structuredClone(ot24);
 paged.lessonDetails.memoryVerse.alsoVerifiedAt.page=12;
 assert.deepEqual(validateLessonSchema(paged,schema),[],
  'Secondary verification should still accept properly paginated references');
});
