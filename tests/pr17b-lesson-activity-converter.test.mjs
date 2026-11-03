import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {
 CORE_LESSON_MODULE_IDS,WORD_VISUAL_LESSON_MODULE_IDS,
 VERSE_SPECIALTY_LESSON_MODULE_IDS,
 convertLessonActivities,findLessonCandidate,
} from '../src/lessonActivityConverter.ts';
import {
 validateModule,parseStory,matchRows,moduleForSize,
} from '../src/modules.ts';
import {parseStatements,orderedStoryEvents} from '../src/storyVerseModules.ts';
import {shuffledChoices} from '../src/smallModules.ts';
import {getPrintableSheetRegions,createBookletPdf} from '../src/pdf.ts';
import {makeParityDraft,AUDIT_SLOTS} from '../scripts/pr16f-fixtures.mjs';
import {validateLesson} from '../scripts/validate-curriculum.mjs';

const getJson=async name=>JSON.parse(await readFile(
 new URL('../'+name,import.meta.url),'utf8'));
const lesson=await getJson('curriculum/review/ot-031-god-parts-the-red-sea.json');
const schema=await getJson('curriculum/schema/lesson-v1.schema.json');
const converted=convertLessonActivities(lesson);
const example=(type,id=type)=>findLessonCandidate(converted,type,id);
const duplicate=()=>structuredClone(lesson);

test('Red Sea review-stage source passes schema, then converts 6 core types without changed editorial data',()=>{
 assert.deepEqual(validateLesson(lesson,schema),[]);
 const frozen=duplicate();
 assert.equal(lesson.publication.approved,false);
 assert.equal(converted.lessonId,lesson.id);
 assert.equal(converted.publicApproved,false);
 assert.deepEqual(converted.diagnostics,[]);
 assert.deepEqual(new Set(converted.candidates.map(c=>c.moduleId)),
  new Set([...CORE_LESSON_MODULE_IDS,...WORD_VISUAL_LESSON_MODULE_IDS,
    ...VERSE_SPECIALTY_LESSON_MODULE_IDS]));
 assert.equal(converted.candidates.length,34,'8 questions + 26 other module candidates');
 assert.deepEqual(lesson,frozen,'pure converter must not mutate source JSON');
 assert.deepEqual(convertLessonActivities(lesson),converted,'same input must yield same output');
 assert.notDeepEqual(convertLessonActivities(lesson,{seed:5}).candidates,
  converted.candidates,'changing conversion seed should change seeded module payloads');
});
test('Every converted module passes existing validators and retains its region size',()=>{
 for(const candidate of converted.candidates){
  assert.deepEqual(validateModule(candidate.module),[],candidate.contentId);
  const size=
   ['draw-picture','multiple-choice','true-false','odd-words','unscramble-words','checkboxes','who-am-i','first-letters'].includes(candidate.moduleId)?'small':
   ['true-false-maze','match-words','medium-word-search','pixel-picture',
     'finish-verse','unscramble-verse','circle-mistakes','big-idea-cryptogram',
     'upside-down-verse','connect-big-idea'].includes(candidate.moduleId)?'medium':'large';
  const matches=moduleForSize(size);
  assert.ok(matches.some(module=>module.id===candidate.moduleId),candidate.moduleId);
  assert.ok(candidate.contentId);
  assert.equal(candidate.module.type,candidate.moduleId);
  assert.ok(candidate.sourceIds.length||(candidate.sourceLocations?.length??0)>0,
    'all candidates must retain Story Note IDs or original ODT source locations');
  assert.ok(candidate.sourceIds.every(id=>[
   ...lesson.storyNotes.map(note=>note.id),...lesson.questions.map(q=>q.id),
   ...lesson.facts.map(f=>f.id),
  ].includes(id)),'source IDs must identify known editorial entries');
 }
});
test('Story Order stays chronologically correct before the app shuffles; Finish the Story keeps 7 Story Note answers',()=>{
 const storyOrder=example('story-order').module;
 assert.equal(storyOrder.type,'story-order');
 assert.deepEqual(storyOrder.events.split('\n'),
  [...lesson.preparedActivities.storyOrder].sort((a,b)=>a.order-b.order).map(x=>x.text));
 assert.equal(storyOrder.events.split('\n').length,7);
 assert.deepEqual(example('story-order').sourceIds,lesson.storyNotes.map(note=>note.id));
 assert.equal(orderedStoryEvents(storyOrder).length,7);
 const finish=example('finish-story').module;
 assert.equal(finish.type,'finish-story');
 assert.equal(finish.story,lesson.preparedActivities.finishStory.markedParagraph);
 assert.deepEqual(parseStory(finish.story).answers,
  ['CLOUD','CHASE','DIE','FIGHT','SPLIT','PANIC','DOWN']);
 assert.equal(example('finish-story').teacherReviewRequired,false);
});
test('All eight approved-as-source questions preserve authored correct answers and flag proposed distractors',()=>{
 const questions=converted.candidates.filter(x=>x.moduleId==='multiple-choice');
 assert.equal(questions.length,8);
 assert.deepEqual(questions.map(q=>q.contentId),
  lesson.preparedActivities.multipleChoice.map(q=>q.id));
 for(const question of questions){
  const source=lesson.preparedActivities.multipleChoice.find(q=>q.id===question.contentId);
  assert.equal(question.module.type,'multiple-choice');
  assert.equal(question.module.question,source.question);
  assert.equal(question.module.correct,source.correctAnswer);
  assert.equal(question.module.wrong1,
   source.choices.filter(c=>!c.isCorrect)[0].text);
  assert.equal(question.module.wrong2,
   source.choices.filter(c=>!c.isCorrect)[1].text);
  assert.deepEqual(new Set(shuffledChoices(question.module)),
   new Set(source.choices.map(c=>c.text)));
  assert.equal(question.teacherReviewRequired,true);
  assert.ok(question.sourceIds.includes(source.sourceQuestionIds[0]));
 }
});
test('Small True/False and Medium Maze reuse the same canonical fact, preserving answer key',()=>{
 const small=example('true-false'),maze=example('true-false-maze');
 const fact=lesson.facts.find(f=>f.id===lesson.preparedActivities.trueFalse.factId);
 assert.ok(fact);
 assert.equal(small.module.statement,fact.statement);
 assert.equal(maze.module.statement,fact.statement);
 assert.equal(maze.module.answer,fact.isTrue);
 assert.equal(small.answerKey,fact.isTrue,'small module needs a separate teacher key');
 assert.equal(maze.answerKey,fact.isTrue);
 assert.equal(small.teacherReviewRequired,false);
 assert.equal(maze.teacherReviewRequired,false);
});
test('Sort the Story uses canonical truth values and flags the newly suggested false facts',()=>{
 const sorted=example('sort-story');
 assert.equal(sorted.module.type,'sort-story');
 const rows=parseStatements(sorted.module.statements);
 assert.equal(rows.length,8);
 for(const row of rows){
  const fact=lesson.facts.find(f=>f.statement===row.text);
  assert.ok(fact);
  assert.equal(row.truth,fact.isTrue);
 }
 assert.equal(rows.filter(r=>r.truth).length,4);
 assert.equal(rows.filter(r=>!r.truth).length,4);
 assert.equal(sorted.teacherReviewRequired,true);
 assert.equal(sorted.origin,'suggested');
});
test('Missing, contradictory, duplicate and too-long data are reported, never auto-rewritten or silently dropped',()=>{
 const wrongFact=duplicate();
 wrongFact.preparedActivities.trueFalseMaze.isTrue=!wrongFact.preparedActivities.trueFalseMaze.isTrue;
 const r1=convertLessonActivities(wrongFact);
 assert.ok(r1.diagnostics.some(x=>x.moduleId==='true-false-maze'&&x.message.includes('canonical fact')));
 assert.equal(r1.candidates.some(x=>x.moduleId==='true-false-maze'),false);
 const wrongChoice=duplicate();
 wrongChoice.preparedActivities.multipleChoice[0].correctAnswer='A different answer';
 const r2=convertLessonActivities(wrongChoice);
 assert.ok(r2.diagnostics.some(x=>x.moduleId==='multiple-choice'&&x.message.includes('correctAnswer')));
 assert.ok(!r2.candidates.some(x=>x.contentId==='mc-01'));
 const duplicateId=duplicate();
 duplicateId.preparedActivities.multipleChoice[1].id='mc-01';
 const r3=convertLessonActivities(duplicateId);
 assert.ok(r3.diagnostics.some(x=>x.message.includes('Duplicate multiple-choice')));
 const long=duplicate();
 long.preparedActivities.storyOrder[0].text='Unfittable '.repeat(30);
 const r4=convertLessonActivities(long);
 assert.ok(r4.diagnostics.some(x=>x.moduleId==='story-order'&&x.message.includes('115')));
 assert.equal(r4.candidates.some(x=>x.moduleId==='story-order'),false);
 const badSeed=convertLessonActivities(lesson,{seed:-1});
 assert.equal(badSeed.candidates.length,0);
 assert.ok(badSeed.diagnostics.some(x=>x.message.includes('seed')));
 const changedVersion=duplicate();changedVersion.schemaVersion=2;
 assert.equal(convertLessonActivities(changedVersion).candidates.length,0);
});
test('Unapproved curriculum cannot enter the live app or be published by a converter call',async()=>{
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(app,/ot-031-god-parts-the-red-sea|curriculum\/review/u);
 assert.equal(converted.publicApproved,false);
 const copy=duplicate();
 copy.publication.approved=true;
 assert.equal(convertLessonActivities(copy).publicApproved,false,
  'approval flag alone must never change public status');
 // Real publication still additionally requires schema signoff and clearing review flags.
 assert.ok(validateLesson(copy,schema).length);
});
test('Actual vector PDF exports accept converted story, multiple-choice, and maze modules',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const entries=[
  {type:'story-order',slot:AUDIT_SLOTS.large[1]},
  {type:'finish-story',slot:AUDIT_SLOTS.large[2]},
  {type:'multiple-choice',id:'mc-01',slot:AUDIT_SLOTS.small[0]},
  {type:'true-false',slot:AUDIT_SLOTS.small[1]},
  {type:'true-false-maze',slot:AUDIT_SLOTS.medium[0]},
  {type:'sort-story',slot:AUDIT_SLOTS.large[0]},
 ];
 const draft=makeParityDraft(6,{allBorderless:true});
 for(const {type,id,slot} of entries){
  const candidate=example(type,id??type);
  assert.ok(candidate,type);
  draft.modules[slot]=structuredClone(candidate.module);
 }
 const prior=structuredClone(draft);
 const regions=getPrintableSheetRegions(draft).flat();
 for(const entry of entries){
  const expected=entry.type==='multiple-choice'||entry.type==='true-false'?'small':
   entry.type==='true-false-maze'?'medium':'large';
  const region=regions.find(r=>r.bookletPage+':'+r.id===entry.slot);
  assert.equal(region?.size,expected,entry.type);
 }
 const pdfBytes=await createBookletPdf(draft,fonts);
 assert.deepEqual(draft,prior);
 const pdf=await PDFDocument.load(pdfBytes);
 assert.equal(pdf.getPageCount(),2);
 assert.ok(pdfBytes.length>20000);
});
