import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 createAdaptedFact,eligibleFacts,factSelectionIssues,factUsage,
 movableSortFacts,moveSortFactToChoice,selectedFact,sortSelections,
} from '../src/review/storyFactEditor.ts';
import {
 reviewSchemaIssues,reviewSchemaErrors,applyReviewSchemaRepair,schemaRepairLabel,
} from '../src/review/schemaPreflight.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {validateLessonSchema} from '../src/lessonSchemaValidation.ts';
import {validateModule} from '../src/modules.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const json=async path=>JSON.parse(await read(path));
const approved=await json('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const schema=await json('curriculum/schema/lesson-v1.schema.json');

// Synthetic OT30 regression. No unapproved teacher lesson is committed.
const longStatement='Moses told the Israelites to spread blood on their doorframes and the angel would pass over their house';
const trueShort='The angel passed over Israelite homes marked with lamb’s blood.';
const mazeShort='The Israelites put lamb’s blood on their doorframes.';
const ot30Like=()=>{
 const lesson=structuredClone(approved);
 const source=structuredClone(approved.storyNotes[0].source);
 lesson.facts.push({
  id:'tf-ot30-long',statement:longStatement,isTrue:true,
  origin:'source',source,
 });
 lesson.preparedActivities.trueFalse={
  factId:'tf-ot30-long',statement:trueShort,isTrue:true,origin:'adapted',
 };
 lesson.preparedActivities.trueFalseMaze={
  statement:mazeShort,isTrue:true,origin:'adapted',
 };
 return lesson;
};

test('OT30-like long and orphan selections can be repaired without modifying source facts',()=>{
 const lesson=ot30Like(),before=JSON.stringify(lesson);
 assert.equal(longStatement.length>80,true);
 assert.ok(factSelectionIssues(lesson,'trueFalse').some(x=>x.message.includes('exceeds')));
 assert.ok(factSelectionIssues(lesson,'trueFalse').some(x=>x.message.includes('differs')));
 assert.ok(factSelectionIssues(lesson,'trueFalseMaze').some(x=>x.message.includes('Select a canonical fact')));
 const adapted=createAdaptedFact(lesson,'trueFalse','tf-ot30-long',trueShort);
 const record=adapted.facts.at(-1);
 assert.equal(record.adaptedFromFactId,'tf-ot30-long');
 assert.equal(record.isTrue,true);
 assert.equal(record.origin,'adapted');
 assert.equal(record.teacherReviewRequired,true);
 assert.deepEqual(record.source,lesson.facts.at(-1).source);
 assert.deepEqual(adapted.facts.slice(0,-1),lesson.facts);
 assert.equal(selectedFact(adapted,'trueFalse').factId,record.id);
 assert.equal(selectedFact(adapted,'trueFalse').statement,record.statement);
 assert.deepEqual(factSelectionIssues(adapted,'trueFalse'),[]);
 assert.deepEqual(validateModule({type:'true-false',statement:record.statement}),[]);
 const maze=createAdaptedFact(adapted,'trueFalseMaze','tf-ot30-long',mazeShort);
 assert.notEqual(selectedFact(maze,'trueFalseMaze').factId,record.id);
 assert.equal(selectedFact(maze,'trueFalseMaze').isTrue,true);
 assert.deepEqual(factSelectionIssues(maze,'trueFalseMaze'),[]);
 assert.deepEqual(factSelectionIssues(maze,'trueFalse'),[]);
 assert.deepEqual(reviewSchemaErrors(maze),[]);
 assert.equal(JSON.stringify(lesson),before);
});

test('Adaptation rejects missing sources, wrong lengths, and silently duplicated statements',()=>{
 const lesson=ot30Like();
 assert.throws(()=>createAdaptedFact(lesson,'trueFalse','missing','Hello'),/real canonical/u);
 assert.throws(()=>createAdaptedFact(lesson,'trueFalse','tf-ot30-long',''),/1–80/u);
 assert.throws(()=>createAdaptedFact(lesson,'trueFalseMaze','tf-ot30-long','x'.repeat(66)),/1–65/u);
 assert.throws(()=>createAdaptedFact(lesson,'trueFalse','tf-ot30-long',longStatement),/1–80/u);
 const text=approved.facts[0].statement;
 assert.throws(()=>createAdaptedFact(lesson,'trueFalse','tf-ot30-long',text),
  /already in the canonical fact pool/u);
 assert.equal(lesson.facts.filter(f=>f.id.startsWith('tf-review-')).length,0);
});

test('Move keeps Sort the Story valid, preserves truth and source, and cannot steal last four facts',()=>{
 const lesson=structuredClone(approved);
 delete lesson.preparedActivities.trueFalse;
 delete lesson.preparedActivities.trueFalseMaze;
 const candidates=movableSortFacts(lesson,'trueFalse');
 assert.ok(candidates.length>0,'At least one short fact may move from 8-row Sort');
 const chosen=candidates[0];
 const snapshot=JSON.stringify(lesson);
 const moved=moveSortFactToChoice(lesson,'trueFalse',chosen.id);
 assert.equal(sortSelections(moved).length,7);
 assert.equal(sortSelections(moved).some(row=>row.factId===chosen.id),false);
 assert.ok(sortSelections(moved).some(row=>row.isTrue===true));
 assert.ok(sortSelections(moved).some(row=>row.isTrue===false));
 assert.deepEqual(factSelectionIssues(moved,'trueFalse'),[]);
 assert.equal(selectedFact(moved,'trueFalse').isTrue,chosen.isTrue);
 assert.deepEqual(moved.facts,lesson.facts);
 assert.equal(JSON.stringify(lesson),snapshot);
 const four=structuredClone(lesson);
 four.preparedActivities.sortStory=four.preparedActivities.sortStory.slice(0,4);
 assert.deepEqual(movableSortFacts(four,'trueFalse'),[]);
 assert.throws(()=>moveSortFactToChoice(four,'trueFalse',chosen.id),/invalid/u);
 const reserved=structuredClone(lesson);
 reserved.preparedActivities.trueFalseMaze={
  factId:chosen.id,statement:chosen.statement,isTrue:chosen.isTrue,
 };
 assert.ok(!movableSortFacts(reserved,'trueFalse').some(f=>f.id===chosen.id));
});

test('Seven malformed OT30-style character clues yield one safe batch repair',()=>{
 const lesson=structuredClone(approved);
 const sample=[
  ['Moses','Warned Pharaoh about the tenth plague.','Told Israel how to prepare for Passover.'],
  ['Pharaoh','Ruled Egypt.','Called for Moses after the plague.'],
  ['Israelites','Marked their doors with blood.','Left Egypt in a hurry.'],
  ['Egyptians','Gave the departing Israelites gold and silver.'],
 ];
 lesson.characters=sample.map(([name,...clues],i)=>({
  id:'ch-review-'+i,name,origin:'adapted',sourceIds:['sn-01'],
  clues:[...clues],
 }));
 const snapshot=JSON.stringify(lesson);
 const errors=reviewSchemaErrors(lesson);
 assert.equal(errors.length,7);
 assert.ok(errors.every(e=>/characters\[\d+\]\.clues\[\d+\]: expected an object/u.test(e)));
 const issues=reviewSchemaIssues(lesson);
 const repairs=issues.filter(i=>i.repair?.kind==='character-clue-strings');
 assert.equal(repairs.length,1);
 assert.equal(repairs[0].repair.count,7);
 assert.equal(repairs[0].taskId,'lesson-sources');
 assert.match(schemaRepairLabel(repairs[0].repair),/7 character clues/u);
 const before=buildReviewPreflight(lesson);
 assert.equal(before.convertedCount,0);
 assert.equal(before.totalCount,27);
 const next=applyReviewSchemaRepair(lesson,repairs[0].repair);
 assert.deepEqual(reviewSchemaErrors(next),[]);
 assert.deepEqual(validateLessonSchema(next,schema),[]);
 assert.deepEqual(next.characters.map(c=>c.clues.map(clue=>clue.text)),
                  sample.map(row=>row.slice(1)));
 assert.ok(next.characters.every(c=>c.clues.every(clue=>
  clue.origin==='suggested'&&clue.teacherReviewRequired===true)));
 assert.deepEqual(next.storyNotes,lesson.storyNotes);
 assert.deepEqual(next.preparedActivities,lesson.preparedActivities);
 assert.equal(JSON.stringify(lesson),snapshot);
 assert.throws(()=>applyReviewSchemaRepair(next,repairs[0].repair),/changed/u);
});

test('Conversion starter and guide teach correct clue and canonical fact shapes',async()=>{
 const example=await json('curriculum/examples/lesson-v1-unapproved.example.json');
 assert.deepEqual(validateLessonSchema(example,schema),[]);
 assert.equal(typeof example.characters[0].clues[0],'object');
 assert.ok(example.characters[0].clues[0].text);
 assert.ok(example.characters[0].clues[0].origin);
 for(const kind of ['trueFalse','trueFalseMaze']){
  const item=example.preparedActivities[kind];
  const source=example.facts.find(f=>f.id===item.factId);
  assert.ok(source);
  assert.equal(item.statement,source.statement);
  assert.equal(item.isTrue,source.isTrue);
 }
 assert.notEqual(example.preparedActivities.trueFalse.factId,
  example.preparedActivities.trueFalseMaze.factId);
 const guide=await read('docs/CURRICULUM-CONVERSION-GUIDE.md');
 assert.match(guide,/Character clues: objects, never bare strings/u);
 assert.match(guide,/Canonical facts, IDs and length budgets/u);
 assert.match(guide,/adaptedFromFactId/u);
 assert.match(guide,/tf-review-01/u);
 assert.match(guide,/PR #102/u);
 assert.doesNotMatch(guide,/Open issue #95/u);
});

test('Review UI asks before adapting/moving, resets both reviews for moves, and flags invalid reviewed activity',async()=>{
 const [ui,app,schemaCode]=await Promise.all([
  read('src/review/FactChoiceReviewEditor.tsx'),
  read('src/review/ReviewApp.tsx'),
  read('src/review/schemaPreflight.ts'),
 ]);
 assert.match(ui,/Create a shorter, source-linked fact/u);
 assert.match(ui,/Save as new adapted fact and select/u);
 assert.match(ui,/Move this fact here/u);
 assert.match(ui,/window\.confirm\(/u);
 assert.match(ui,/moveSortFactToChoice\(lesson,kind,moveId\),true/u);
 assert.match(ui,/createAdaptedFact\(lesson,kind,source\.id,draft\)/u);
 assert.match(app,/if\(changedSort\)setReviewed\(previous=>previous\.filter\(id=>id!=='sort-story'\)\)/u);
 assert.match(app,/factSelectionIssues\(lesson,'trueFalse'\)/u);
 assert.match(app,/factSelectionIssues\(lesson,'trueFalseMaze'\)/u);
 assert.match(app,/Reviewed earlier · now needs repair/u);
 assert.match(app,/disabled=\{!factValid\(active\.id\)\}/u);
 assert.match(schemaCode,/character-clue-strings/u);
 assert.match(app,/Convert legacy character clues to the required object format/u);
});
