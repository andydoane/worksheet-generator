import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLessonSchema} from '../src/lessonSchemaValidation.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {MODULES,validateModule} from '../src/modules.ts';
import {choosePixelShapeId} from '../src/pixelPicture.ts';
import {MODULE_GUIDANCE} from '../src/moduleGuidance.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const guide=await read('docs/CURRICULUM-CONVERSION-GUIDE.md');
const schema=JSON.parse(await read('curriculum/schema/lesson-v1.schema.json'));
const starter=JSON.parse(await read('curriculum/examples/lesson-v1-unapproved.example.json'));
const miniSchema={
 type:'object',required:['preparedActivities'],
 properties:{preparedActivities:schema.properties.preparedActivities},
 $defs:schema.$defs,
};

test('Every detailed activity recipe has a unique registered ID and exact schema prepared key',()=>{
 const cards=[...guide.matchAll(
  /^#### (\d{2})\. `([^`]+)`[^\n]*\(`preparedActivities\.([^`]+)`\)/gmu,
 )];
 assert.equal(cards.length,27,'Manual must document every one of 27 activity types');
 const ids=MODULES.map(item=>item.id);
 const prepared=Object.keys(schema.properties.preparedActivities.properties);
 assert.equal(new Set(ids).size,27);
 assert.equal(new Set(cards.map(m=>m[2])).size,27);
 assert.equal(new Set(cards.map(m=>m[3])).size,27);
 for(let i=0;i<cards.length;i++){
  const [,number,id,key]=cards[i];
  assert.equal(Number(number),i+1,'Numbering should be sequential');
  assert.equal(ids.includes(id),true,id+' is not a real module ID');
  assert.equal(prepared.includes(key),true,key+' is not in the schema');
  const headingAt=cards[i].index;
  const end=i+1<cards.length?cards[i+1].index:guide.indexOf('## 5. BSB and Scripture rules');
  const section=guide.slice(headingAt,end);
  const json=section.match(/```json\n([\s\S]*?)\n```/u);
  assert.ok(json,'Missing parseable JSON example for '+id);
  const example=JSON.parse(json[1]);
  assert.deepEqual(Object.keys(example),['preparedActivities']);
  assert.deepEqual(Object.keys(example.preparedActivities),[key]);
  assert.deepEqual(validateLessonSchema(example,miniSchema),[],
   id+' example does not match its live schema');
  assert.match(section,/```json/u);
  assert.match(section,/\*\*Wrong:\*\*/u,'Each activity needs a concrete bad example');
 }
});

test('Every JSON code fence in the manual is syntactically valid JSON',()=>{
 const blocks=[...guide.matchAll(/```json\n([\s\S]*?)\n```/gu)];
 assert.ok(blocks.length>=29,'Expected source, character and 27 activity snippets');
 for(const [full,content] of blocks){
  assert.doesNotThrow(()=>JSON.parse(content),full.slice(0,95));
 }
});

test('Unapproved starter is valid structurally and demonstrates the difficult editor contracts',()=>{
 assert.deepEqual(validateLessonSchema(starter,schema),[]);
 assert.deepEqual(validateLesson(starter,schema),[]);
 assert.equal(starter.publication.approved,false);
 assert.equal(starter.publication.status,'pending-teacher-approval');
 assert.equal(starter.publication.scriptureRights,undefined);
 assert.equal(starter.moduleReadiness.length,0,'Not a pretend 27/27 finished lesson');
 assert.ok(starter.characters.every(character=>
  character.clues.every(clue=>typeof clue==='object'&&!!clue.text&&!!clue.origin)));
 const p=starter.preparedActivities;
 for(const kind of ['trueFalse','trueFalseMaze']){
  const f=starter.facts.find(record=>record.id===p[kind].factId);
  assert.ok(f,'Missing canonical '+kind+' fact');
  assert.equal(p[kind].statement,f.statement);
  assert.equal(p[kind].isTrue,f.isTrue);
 }
 assert.notEqual(p.trueFalse.factId,p.trueFalseMaze.factId);
 assert.deepEqual(p.storyOrder.map(x=>x.order),[1,2,3,4,5]);
 assert.deepEqual(validateModule({type:'story-order',
  events:p.storyOrder.map(x=>x.text).join('\n'),seed:1}),[]);
 assert.deepEqual(validateModule({type:'draw-story',
  prompts:p.drawStory.map(x=>x.prompt).join('\n')}),[]);
 assert.deepEqual(validateModule({type:'circle-mistakes',
  text:p.circleMistakes.paragraph,count:p.circleMistakes.mistakeCount}),[]);
 assert.equal(p.circleMistakes.mistakes.length,p.circleMistakes.mistakeCount);
 for(const m of p.circleMistakes.mistakes)
  assert.ok(p.circleMistakes.paragraph.includes(m.incorrect));
 assert.ok(starter.drawingPrompts.length>=2);
 for(const item of [...starter.drawingPrompts,p.drawPicture]){
  assert.equal(/[.!?]$/u.test(item.prompt),false,item.prompt);
  assert.equal(/^(draw|sketch|illustrate)\b/iu.test(item.prompt),false);
  assert.equal(item.prompt.length<=105,true);
 }
 for(const item of p.drawStory){
  assert.match(item.prompt,/^\p{Lu}/u);
  assert.match(item.prompt,/[.!?]$/u);
 }
 assert.deepEqual(validateModule({type:'pixel-picture',phrase:p.pixelPicture.phrase,
  shapeId:choosePixelShapeId(1,p.pixelPicture.phrase),seed:1}),[]);
 assert.deepEqual(new Set(p.oddWords.unrelated.map(x=>x.toUpperCase()))
  .intersection(new Set(p.checkboxes.incorrect.map(x=>x.toUpperCase()))).size,0);
});

test('Cross-document writing and publishing instructions agree with the live Review Studio',async()=>{
 const [readme,publishing,guidance]=await Promise.all([
  read('curriculum/README.md'),read('curriculum/PUBLISHING.md'),
  read('src/moduleGuidance.ts'),
 ]);
 assert.match(guide,/naturally completes \*\*“Draw a picture of/u);
 assert.match(guide,/Moses speaking with Pharaoh about the tenth plague/u);
 assert.match(guide,/no blanket 12-letter word cap/iu);
 assert.doesNotMatch(guide,/currently each word ≤12 chars/u);
 assert.match(guide,/The teacher \*\*may choose any meaningful blank words\*\*/u);
 assert.match(readme,/not a required ordered subsequence/u);
 assert.doesNotMatch(readme,/always retains the emphasized Story Note words/u);
 assert.match(publishing,/upload directly to main/u);
 assert.match(publishing,/optionally \*\*open a PR/u);
 const small=MODULE_GUIDANCE['draw-picture'].sample?.prompt;
 assert.equal(typeof small,'string');
 assert.equal(small?.endsWith('.'),false);
 assert.match(String(small),/Moses leading the Israelites/u);
 assert.match(guidance,/completes “Draw a picture of/u);
});

test('Manual distinguishes the levels of validation and requires actionable teacher handoff',()=>{
 for(const required of [
  'Ten-step workflow for a new conversion chat',
  'Exact JSON formatting and provenance rules',
  'Detailed conversion recipes for all 27 activities',
  'Mandatory pre-delivery verification for the conversion chat',
  'Required final handoff report',
  'NOT RUN',
  'node --experimental-strip-types scripts/validate-curriculum.mjs',
  '27/27',
  'three numbered worksheet presets',
  'pending-teacher-approval',
  'teacherReviewRequired',
  'sourceIds',
  'Crossword',
 ]){
  assert.ok(guide.includes(required),'Missing critical converter instruction: '+required);
 }
 assert.match(guide,/0\/27 because of schema errors/u);
 assert.match(guide,/external candidate file/u);
});
