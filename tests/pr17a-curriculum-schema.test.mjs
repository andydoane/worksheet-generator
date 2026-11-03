import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateLesson,validateLessonSchema,validateCurriculumFiles}
 from '../scripts/validate-curriculum.mjs';
import {normalizeLegacySmallDrawingScenes,useMatchingStoryOrderCaptions} from '../src/review/model.ts';

const fromRepo=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');
const data=JSON.parse(await fromRepo('tests/fixtures/ot-031-original-review.json'));
const schema=JSON.parse(await fromRepo('curriculum/schema/lesson-v1.schema.json'));
const modified=(change)=>{const copy=structuredClone(data);change(copy);return copy;};

test('Curriculum v1 schema accepts the complete unapproved source-preserving Red Sea conversion',()=>{
 assert.deepEqual(validateLesson(data,schema),[]);
 assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
 assert.equal(schema.properties.schemaVersion.const,1);
 assert.equal(schema.properties.preparedActivities.additionalProperties,false);
 assert.equal(Object.keys(schema.properties.preparedActivities.properties).length,27);
 assert.equal(data.schemaVersion,1);
 assert.equal(data.id,'ot-031-god-parts-the-red-sea');
 assert.equal(data.storyNotes.length,7);
 assert.equal(data.questions.length,38);
 assert.equal(data.facts.length,24);
 assert.equal(Object.keys(data.preparedActivities).length,27);
 assert.equal(data.moduleReadiness.length,27);
 assert.equal(data.reviewFlags.length,10);
 assert.equal(data.publication.status,'pending-teacher-approval');
 assert.equal(data.publication.approved,false);
 assert.ok(data.reviewFlags.some(x=>x.type==='teacher-approval'));
 assert.equal(data.validation.actualGeneratorTested,false,
  'do not represent source handoff as tested by actual generator');
 assert.ok(data.moduleReadiness.every(entry=>entry.generatorTested===false));
});
test('All seven original Story Notes and their original emphasized answers are preserved',()=>{
 assert.deepEqual(data.storyNotes.map(note=>note.order),[1,2,3,4,5,6,7]);
 assert.deepEqual(data.storyNotes.map(note=>note.emphasizedWords.join(',')),
  ['CLOUD','CHASE','DIE','FIGHT','SPLIT','PANIC','DOWN']);
 assert.ok(data.storyNotes.every(note=>note.originalText.includes(note.emphasizedWords[0])));
 assert.ok(data.storyNotes.every(note=>note.source.section==='STORY NOTE'));
 assert.equal(data.lessonDetails.memoryVerse.reference,'Exodus 15:11');
 assert.equal(data.lessonDetails.memoryVerse.translation,'ESV');
 assert.ok(data.sourceFiles.some(file=>file.filename===data.storyNotes[0].source.filename));
});
test('Current content has explicit provenance and separates proposed content from source material',()=>{
 assert.equal(data.lessonDetails.bigIdeas[0].text,'The Lord God is a mighty savior.');
 assert.equal(data.lessonDetails.bigIdeas[0].origin,'source');
 assert.ok(data.facts.some(fact=>fact.origin==='suggested'&&fact.isTrue===false));
 assert.ok(data.facts.filter(fact=>fact.origin==='suggested')
  .every(fact=>fact.teacherReviewRequired===true));
 const questions=data.preparedActivities.multipleChoice;
 assert.equal(questions.length,8);
 assert.ok(questions.every(q=>q.choices.filter(choice=>choice.isCorrect).length===1));
 assert.ok(questions.every(q=>q.choices.some(choice=>choice.origin==='suggested')));
 assert.ok(questions.every(q=>q.teacherReviewRequired));
});
test('Schema rejects incorrect version, missing provenance, unknown modules and field-type errors',()=>{
 assert.ok(validateLessonSchema(modified(x=>{x.schemaVersion=2;}),schema).some(e=>e.includes('schemaVersion')));
 assert.ok(validateLessonSchema(modified(x=>{x.storyNotes[0].source.page='two';}),schema)
  .some(e=>e.includes('page')));
 assert.ok(validateLessonSchema(modified(x=>{x.moduleReadiness[0].moduleId='not-a-module';}),schema)
  .some(e=>e.includes('moduleId')));
 assert.ok(validateLessonSchema(modified(x=>{delete x.preparedActivities.finishStory;}),schema).length===0,
  'module content may be missing for a future incomplete lesson');
 assert.ok(validateLessonSchema(modified(x=>{x.preparedActivities.someUnknownModule={};}),schema)
  .some(e=>e.includes('unsupported field')));
});
test('Semantic validator enforces chronological notes and source IDs without silent correction',()=>{
 assert.ok(validateLesson(modified(x=>{x.storyNotes[1].order=4;}),schema)
  .some(e=>e.includes('sequential')));
 assert.ok(validateLesson(modified(x=>{x.storyNotes[1].id=x.storyNotes[0].id;}),schema)
  .some(e=>e.includes('duplicate source ID')));
 assert.ok(validateLesson(modified(x=>{x.facts[0].sourceIds.push('sn-unknown');}),schema)
  .some(e=>e.includes('unknown source ID')));
 assert.ok(validateLesson(modified(x=>{x.storyNotes[0].source.filename='missing.odt';}),schema)
  .some(e=>e.includes('not listed in sourceFiles')));
 assert.ok(validateLesson(modified(x=>{const f=x.facts.find(f=>f.origin==='suggested');f.teacherReviewRequired=false;}),schema)
  .some(e=>e.includes('needs teacherReviewRequired')));
 assert.ok(validateLesson(modified(x=>{x.preparedActivities.trueFalse.isTrue=!x.preparedActivities.trueFalse.isTrue;}),schema)
  .some(e=>e.includes('truth value disagrees')));
});
test('Teacher approval gate prevents publishing by flipping a single flag',()=>{
 const inconsistent=modified(x=>{x.publication.approved=true;});
 assert.ok(validateLesson(inconsistent,schema).some(e=>e.includes('publication status and approved')));
 const withoutSignoff=modified(x=>{x.publication.approved=true;x.publication.status='approved';});
 assert.ok(validateLesson(withoutSignoff,schema).some(e=>e.includes('explicit teacher signoff')));
 const unresolved=modified(x=>{
  x.publication.approved=true;x.publication.status='approved';
  x.publication.teacherSignoff={reviewer:'Curriculum author',date:'2026-11-02'};
 });
 assert.ok(validateLesson(unresolved,schema).some(e=>e.includes('unresolved teacher review flags')));
 const resolved=modified(x=>{
  x.publication.approved=true;x.publication.status='approved';
  x.publication.teacherSignoff={reviewer:'Curriculum author',date:'2026-11-02'};
  x.publication.resolvedReviewFlagIds=x.reviewFlags
   .filter(f=>f.type==='teacher-approval').map(f=>f.id);
 });
 assert.ok(validateLesson(resolved,schema).some(e=>e.includes('Small Draw a Picture')),
  'Outdated drawing instructions block future approval, even with signoff');
 const normalized=useMatchingStoryOrderCaptions(normalizeLegacySmallDrawingScenes(resolved));
 assert.deepEqual(validateLesson(normalized,schema),[]);
});
test('CLI-compatible content validation passes without adding the lesson to the live app',async()=>{
 const path=fileURLToPath(new URL('../tests/fixtures/ot-031-original-review.json',import.meta.url));
 const results=await validateCurriculumFiles([path]);
 assert.equal(results.length,1);
 assert.deepEqual(results[0].errors,[]);
 const app=await fromRepo('src/App.tsx');
 assert.doesNotMatch(app,/curriculum\/review|ot-031-god-parts-the-red-sea/u);
 const vite=await fromRepo('vite.config.ts');
 assert.doesNotMatch(vite,/curriculum\/review/u);
});
test('PR 0 title correction reaches the shared print plan and both rendering paths',async()=>{
 const [layout,svg,pdf]=await Promise.all([
  fromRepo('src/pixelPictureLayout.ts'),
  fromRepo('src/PixelPicturePrintPreview.tsx'),
  fromRepo('src/pixelPicturePdf.ts'),
 ]);
 assert.match(layout,/export const PIXEL_TITLE='PIXEL PICTURE';/u);
 assert.doesNotMatch(layout,/PIXEL PERFECT/u);
 assert.match(svg,/\{plan\.title\}/u);
 assert.match(pdf,/page\.drawText\(plan\.title/u);
});


test('Approved drawing-data format is protected by schema and semantic validation',async()=>{
 const lesson=JSON.parse(await fromRepo('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
 assert.deepEqual(validateLesson(lesson,schema),[]);
 const fragment=structuredClone(lesson);
 fragment.preparedActivities.drawStory[0].prompt='the Israelites walked through the sea';
 assert.ok(validateLesson(fragment,schema).some(x=>x.includes('complete capitalized story sentence')));
 const prefix=structuredClone(lesson);
 prefix.drawingPrompts[0].prompt='Draw the Israelites walking across the Red Sea.';
 assert.ok(validateLesson(prefix,schema).some(x=>x.includes('Small Draw a Picture')));
 const oversized=structuredClone(lesson);
 oversized.preparedActivities.drawStory[0].prompt='A'.repeat(106);
 assert.ok(validateLessonSchema(oversized,schema).some(x=>x.includes('drawStory[0].prompt')));
 const duplicate=structuredClone(lesson);
 duplicate.preparedActivities.drawStory[1].prompt=duplicate.preparedActivities.drawStory[0].prompt;
 assert.ok(validateLesson(duplicate,schema).some(x=>x.includes('duplicate narrative caption')));
});
