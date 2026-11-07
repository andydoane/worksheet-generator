import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateModule} from '../src/modules.ts';
import {editStoryEvent,storyEvents,storyOrderIssues} from '../src/review/storyFactEditor.ts';
import {listReviewTasks} from '../src/review/model.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const events=[
 'God called Moses to lead the people.',
 'Moses told the people what God had said.',
 'The families prepared to leave Egypt.',
 'The people gathered for their journey.',
 'They left Egypt together.',
 'The people traveled toward the sea.',
 'God made a path through the sea.',
 'The people walked through on dry ground.',
];
const lesson=()=>({
 id:'ot-story-order-review',storyNotes:undefined,
 preparedActivities:{
  storyOrder:events.map((text,index)=>({order:index+1,text,origin:'suggested'})),
 },
});

test('Eight printable Story Order events need no original Story Notes or source IDs',()=>{
 const candidate=lesson(),before=JSON.stringify(candidate);
 const rows=storyEvents(candidate);
 assert.equal(rows.length,8);
 assert.deepEqual(rows.map(item=>item.text),events);
 assert.deepEqual(rows.map(item=>item.order),[1,2,3,4,5,6,7,8]);
 assert.deepEqual(storyOrderIssues(candidate),[]);
 assert.deepEqual(validateModule({
  type:'story-order',events:rows.map(item=>item.text).join('\n'),seed:1,
 }),[]);
 const stray=structuredClone(candidate);
 stray.preparedActivities.storyOrder[0].sourceIds=['nonexistent-source-note'];
 assert.deepEqual(storyOrderIssues(stray),[],
  'Even stale optional source references must not block printable story text');
 assert.equal(JSON.stringify(candidate),before);
});

test('Editing one chronological event does not replace other sentences, order, or optional source notes',()=>{
 const candidate=lesson();
 candidate.preparedActivities.storyOrder[0].sourceIds=['archived-note'];
 const before=JSON.stringify(candidate);
 const updated=editStoryEvent(candidate,2,'The families packed their belongings.');
 assert.equal(updated.preparedActivities.storyOrder.length,8);
 assert.deepEqual(storyEvents(updated).map(item=>item.order),[1,2,3,4,5,6,7,8]);
 assert.equal(storyEvents(updated)[2].text,'The families packed their belongings.');
 assert.equal(storyEvents(updated)[2].teacherReviewRequired,true);
 assert.equal(storyEvents(updated)[2].origin,'suggested');
 assert.deepEqual(storyEvents(updated).filter((_,i)=>i!==2).map(item=>item.text),
  events.filter((_,i)=>i!==2));
 assert.deepEqual(storyEvents(updated)[0].sourceIds,['archived-note']);
 assert.deepEqual(storyOrderIssues(updated),[]);
 assert.equal(JSON.stringify(candidate),before,
  'Editing must never mutate the original draft');
});

test('Story Order review validates sentences and count, but never provenance',()=>{
 const invalid=lesson();
 invalid.preparedActivities.storyOrder[2].text='  ';
 invalid.preparedActivities.storyOrder[5].text='X'.repeat(116);
 const problems=storyOrderIssues(invalid);
 assert.ok(problems.some(issue=>issue.index===2&&/sentence of 1–115/u.test(issue.message)));
 assert.ok(problems.some(issue=>issue.index===5&&/sentence of 1–115/u.test(issue.message)));
 assert.ok(problems.every(issue=>!/Story Note|sourceIds|citation/iu.test(issue.message)));
 const tooFew=lesson();tooFew.preparedActivities.storyOrder.pop();
 tooFew.preparedActivities.storyOrder.pop();
 tooFew.preparedActivities.storyOrder.pop();
 tooFew.preparedActivities.storyOrder.pop();
 assert.ok(storyOrderIssues(tooFew).some(issue=>/needs 5–8/u.test(issue.message)));
});

test('Review page shows only existing editable sentences, live chronological preview and normal approval controls',async()=>{
 const [editor,app]=await Promise.all([
  read('src/review/StoryOrderReviewEditor.tsx'),
  read('src/review/ReviewApp.tsx'),
 ]);
 assert.match(editor,/events\.map\(\(event,i\)=>/u);
 assert.match(editor,/id=\{'review-story-event-'\+i\}/u);
 assert.match(editor,/onChange=\{e=>apply\(i,e\.target\.value\)\}/u);
 assert.match(editor,/Story Order — Chronological Review Preview/u);
 assert.match(editor,/<StoryVersePreview storyOrderChronological module=/u);
 assert.match(editor,/events\.map\(e=>e\.text\)\.join\('\\n'\)/u);
 assert.match(editor,/<ol className="review-story-order-overview">/u,
  'Even invalid sentences stay visible in chronological scan mode');
 for(const oldControl of [
  /<select/u,/addStoryEventFromNote/u,/replaceStoryEventFromNote/u,
  /moveStoryEvent/u,/removeStoryEvent/u,/normalizeStoryEventNumbers/u,
  /review-story-add/u,/<details className="review-sources">/u,
 ])assert.doesNotMatch(editor,oldControl,'Old Story Note management must not be on this page');
 assert.match(app,/active\.id==='story-order'&&<StoryOrderReviewEditor/u);
 assert.match(app,/Mark reviewed & continue/u);
 assert.match(app,/Needs more work/u);
 const task=listReviewTasks(lesson()).find(item=>item.id==='story-order');
 assert.match(task.detail,/Review and edit the existing 5–8 printable events/u);
});
