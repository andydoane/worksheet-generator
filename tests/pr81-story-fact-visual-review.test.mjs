import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 storyEvents,storyOrderIssues,editStoryEvent,moveStoryEvent,
 removeStoryEvent,addStoryEventFromNote,replaceStoryEventFromNote,
 sortSelections,selectedFact,factUsage,eligibleFacts,suggestUnusedFact,
 selectFact,removeSortFact,moveSortFact,factSelectionIssues,
} from '../src/review/storyFactEditor.ts';
import {repairDestinationForModule,MODULE_REPAIR_REGISTRY} from '../src/review/repairRegistry.ts';
import {buildReviewPreflight,reviewIssueTarget} from '../src/review/preflight.ts';
import {listReviewTasks} from '../src/review/model.ts';
import {validateModule} from '../src/modules.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';

const load=async name=>JSON.parse(await readFile(
 new URL('../curriculum/approved/'+name+'.lesson.json',import.meta.url),'utf8'));
const ot31=await load('ot-031-god-parts-the-red-sea');
const ot32=await load('ot-032-god-provides-in-the-wilderness');

test('Both approved Story Order timelines remain sequential, linked, and printable',()=>{
 for(const lesson of [ot31,ot32]){
  const events=storyEvents(lesson);
  assert.deepEqual(storyOrderIssues(lesson),[],lesson.id);
  assert.equal(events.length,7);
  assert.deepEqual(events.map(x=>x.order),[1,2,3,4,5,6,7]);
  assert.deepEqual(validateModule({
   type:'story-order',events:events.map(x=>x.text).join('\n'),seed:1,
  }),[]);
 }
});

test('Editing a Story Order sentence keeps linked Draw the Story captions synchronized and reviewed',()=>{
 const before=JSON.stringify(ot32);
 const original=storyEvents(ot32)[0];
 const changed=editStoryEvent(ot32,0,'The Israelites had no food, and they complained.');
 const event=storyEvents(changed)[0];
 assert.equal(event.text,'The Israelites had no food, and they complained.');
 assert.deepEqual(event.sourceIds,original.sourceIds);
 assert.equal(event.origin,'suggested');
 assert.equal(event.teacherReviewRequired,true);
 assert.equal(changed.preparedActivities.drawStory[0].prompt,event.text);
 assert.equal(changed.preparedActivities.drawStory[0].origin,'suggested');
 assert.equal(changed.preparedActivities.drawStory[0].teacherReviewRequired,true);
 assert.deepEqual(changed.storyNotes,ot32.storyNotes);
 assert.equal(JSON.stringify(ot32),before);
});

test('Replacing an event source never rewrites captions tied to its previous Story Note',()=>{
 const updated=replaceStoryEventFromNote(ot32,0,'sn-02');
 assert.equal(storyEvents(updated)[0].text,ot32.storyNotes[1].originalText);
 assert.deepEqual(storyEvents(updated)[0].sourceIds,['sn-02']);
 assert.equal(storyEvents(updated)[0].origin,'suggested');
 assert.equal(storyEvents(updated)[0].teacherReviewRequired,true);
 assert.deepEqual(updated.preparedActivities.drawStory,ot32.preparedActivities.drawStory,
  'Changing source links must not overwrite captions citing the old note');
 assert.deepEqual(updated.storyNotes,ot32.storyNotes);
 assert.throws(()=>replaceStoryEventFromNote(ot32,0,'invented-note'),/original Story Note/u);
});

test('Chronological move/add/remove edits preserve events and renumber positions',()=>{
 const before=JSON.stringify(ot32);
 const moved=moveStoryEvent(ot32,0,1);
 assert.deepEqual(storyEvents(moved).map(x=>x.order),[1,2,3,4,5,6,7]);
 assert.equal(storyEvents(moved)[0].text,storyEvents(ot32)[1].text);
 assert.equal(storyEvents(moved)[1].text,storyEvents(ot32)[0].text);
 assert.deepEqual(storyEvents(moved)[1].sourceIds,storyEvents(ot32)[0].sourceIds);
 assert.equal(storyEvents(moved)[0].teacherReviewRequired,true);
 assert.equal(storyEvents(moved)[1].teacherReviewRequired,true);
 assert.throws(()=>moveStoryEvent(ot32,0,-1),/beyond/u);
 const added=addStoryEventFromNote(ot32,'sn-01');
 assert.equal(storyEvents(added).length,8);
 assert.deepEqual(storyEvents(added).at(-1).sourceIds,['sn-01']);
 assert.equal(storyEvents(added).at(-1).teacherReviewRequired,true);
 assert.throws(()=>addStoryEventFromNote(added,'sn-01'),/maximum/u);
 const removed=removeStoryEvent(added,0);
 assert.equal(storyEvents(removed).length,7);
 assert.deepEqual(storyEvents(removed).map(x=>x.order),[1,2,3,4,5,6,7]);
 assert.equal(storyEvents(removed)[0].text,storyEvents(ot32)[1].text);
 const five=structuredClone(ot32);
 five.preparedActivities.storyOrder=five.preparedActivities.storyOrder.slice(0,5);
 assert.throws(()=>removeStoryEvent(five,0),/at least five/u);
 const malformed=structuredClone(ot32);
 malformed.preparedActivities.storyOrder={text:'bad'};
 assert.ok(storyOrderIssues(malformed).some(issue=>issue.message.includes('not an array')));
 assert.equal(JSON.stringify(ot32),before);
});

test('True/False selections always copy canonical fact statement, answer, and provenance',()=>{
 const before=JSON.stringify(ot32);
 const current=selectedFact(ot32,'trueFalse');
 assert.ok(current);
 const available=eligibleFacts(ot32,'trueFalse').filter(x=>
  !factUsage(ot32).has(x.id));
 assert.ok(available.length);
 const canonical=available[0];
 const changed=selectFact(ot32,'trueFalse',canonical.id);
 assert.deepEqual(selectedFact(changed,'trueFalse'),{
  factId:canonical.id,statement:canonical.statement,isTrue:canonical.isTrue,
  origin:canonical.origin,sourceIds:[...canonical.sourceIds],
  teacherReviewRequired:canonical.teacherReviewRequired===true||canonical.origin==='suggested',
 });
 assert.deepEqual(changed.facts,ot32.facts);
 assert.deepEqual(changed.preparedActivities.sortStory,ot32.preparedActivities.sortStory);
 assert.deepEqual(changed.preparedActivities.trueFalseMaze,ot32.preparedActivities.trueFalseMaze);
 assert.deepEqual(factSelectionIssues(changed,'trueFalse'),[]);
 assert.deepEqual(validateModule({type:'true-false',statement:canonical.statement}),[]);
 assert.equal(JSON.stringify(ot32),before);
});

test('True/False Maze enforces 65-character limit and preserves canonical truth in the puzzle',()=>{
 const options=eligibleFacts(ot32,'trueFalseMaze');
 assert.ok(options.every(f=>f.statement.trim().length<=65));
 const available=options.find(f=>!factUsage(ot32).has(f.id));
 assert.ok(available);
 const changed=selectFact(ot32,'trueFalseMaze',available.id);
 const selected=selectedFact(changed,'trueFalseMaze');
 assert.equal(selected.factId,available.id);
 assert.equal(selected.isTrue,available.isTrue);
 assert.deepEqual(validateModule({
  type:'true-false-maze',statement:selected.statement,answer:selected.isTrue,seed:1,
 }),[]);
 const long=structuredClone(ot32);
 long.facts.push({id:'tf-too-long',statement:'A'.repeat(70),isTrue:false,
  origin:'suggested',sourceIds:['sn-01'],teacherReviewRequired:true});
 assert.ok(eligibleFacts(long,'trueFalse').some(f=>f.id==='tf-too-long'));
 assert.ok(!eligibleFacts(long,'trueFalseMaze').some(f=>f.id==='tf-too-long'));
 assert.throws(()=>selectFact(long,'trueFalseMaze','tf-too-long'),/too long/u);
});

test('Sort the Story copies canonical answers and offers distinct, balanced alternatives',()=>{
 const before=JSON.stringify(ot32);
 assert.deepEqual(factSelectionIssues(ot32,'sortStory'),[]);
 const moved=moveSortFact(ot32,0,1);
 assert.equal(sortSelections(moved)[0].factId,sortSelections(ot32)[1].factId);
 assert.equal(sortSelections(moved)[1].factId,sortSelections(ot32)[0].factId);
 const shortened=removeSortFact(ot32,0);
 assert.equal(sortSelections(shortened).length,7);
 assert.throws(()=>removeSortFact({...ot32,preparedActivities:{...ot32.preparedActivities,
  sortStory:sortSelections(ot32).slice(0,4)}},0),/at least four/u);
 const alternative=suggestUnusedFact(shortened,'sortStory');
 assert.ok(alternative);
 const changed=selectFact(shortened,'sortStory',alternative);
 assert.equal(sortSelections(changed).length,8);
 const selected=sortSelections(changed).at(-1);
 const canonical=ot32.facts.find(f=>f.id===alternative);
 assert.equal(selected.statement,canonical.statement);
 assert.equal(selected.isTrue,canonical.isTrue);
 assert.deepEqual(selected.sourceIds,canonical.sourceIds);
 assert.equal(selected.factId,canonical.id);
 assert.deepEqual(changed.facts,ot32.facts);
 assert.deepEqual(factSelectionIssues(changed,'sortStory'),[]);
 assert.deepEqual(validateModule({
  type:'sort-story',statements:sortSelections(changed).map(f=>f.statement+' '+f.isTrue).join('\n'),seed:1,
 }),[]);
 assert.equal(JSON.stringify(ot32),before);
});

test('Selecting a fact already used elsewhere is rejected; one-click alternatives avoid collisions',()=>{
 const original=JSON.stringify(ot31);
 const repeated=ot31.preparedActivities.sortStory[2].factId;
 assert.equal(ot31.preparedActivities.trueFalse.factId,repeated);
 assert.equal(ot31.preparedActivities.trueFalseMaze.factId,repeated);
 const alternative=suggestUnusedFact(ot31,'trueFalse');
 assert.ok(alternative);
 const withTF=selectFact(ot31,'trueFalse',alternative);
 assert.equal(selectedFact(withTF,'trueFalse').factId,alternative);
 const second=suggestUnusedFact(withTF,'trueFalseMaze');
 assert.ok(second);
 const resolved=selectFact(withTF,'trueFalseMaze',second);
 for(const id of [alternative,second])assert.equal(factUsage(resolved).get(id).length,1);
 assert.throws(()=>selectFact(ot31,'trueFalse',sortSelections(ot31)[0].factId),/selected elsewhere/u);
 assert.throws(()=>selectFact(ot32,'sortStory',ot32.preparedActivities.trueFalse.factId,0),/already selected/u);
 assert.throws(()=>selectFact(ot32,'trueFalse','fake-fact-id'),/existing canonical/u);
 assert.deepEqual(resolved.facts,ot31.facts);
 assert.equal(JSON.stringify(ot31),original);
});

test('Broken fact snapshots are repairable by reselecting their exact canonical ID',()=>{
 const broken=structuredClone(ot32);
 broken.preparedActivities.sortStory[0].statement='Made-up statement';
 broken.preparedActivities.sortStory[0].isTrue=false;
 broken.preparedActivities.trueFalse.statement='Wrong words';
 assert.ok(factSelectionIssues(broken,'sortStory').some(i=>i.message.includes('differs from canonical')));
 assert.ok(factSelectionIssues(broken,'trueFalse').some(i=>i.message.includes('differs from canonical')));
 const restoredSort=selectFact(broken,'sortStory',broken.preparedActivities.sortStory[0].factId,0);
 const restored=selectFact(restoredSort,'trueFalse',broken.preparedActivities.trueFalse.factId);
 assert.deepEqual(factSelectionIssues(restored,'sortStory'),[]);
 assert.deepEqual(factSelectionIssues(restored,'trueFalse'),[]);
 assert.equal(restored.preparedActivities.sortStory[0].isTrue,
  ot32.preparedActivities.sortStory[0].isTrue);
 assert.equal(restored.preparedActivities.trueFalse.statement,ot32.preparedActivities.trueFalse.statement);
});

test('Preflight sends missing and invalid source-linked records to each visual editor',()=>{
 const routes=[
  ['story-order','storyOrder','story-order','review-field-story-order'],
  ['sort-story','sortStory','sort-story','review-field-sort-story'],
  ['true-false','trueFalse','true-false','review-field-true-false'],
  ['true-false-maze','trueFalseMaze','true-false-maze','review-field-true-false-maze'],
 ];
 for(const [moduleId,key,taskId,fieldId] of routes){
  const route=repairDestinationForModule(moduleId,false);
  assert.equal(route.taskId,taskId);
  assert.equal(route.fieldId,fieldId);
  assert.equal(route.editor,'visual');
  assert.equal(route.handlesMissing,true);
  assert.equal(MODULE_REPAIR_REGISTRY[moduleId].taskId,taskId);
  const direct=reviewIssueTarget(moduleId+': failed source validation');
  assert.equal(direct.taskId,taskId);
  assert.equal(direct.fieldId,fieldId);
  assert.ok(listReviewTasks(ot32).some(task=>task.id===taskId));
  const missing=structuredClone(ot32);
  delete missing.preparedActivities[key];
  const report=buildReviewPreflight(missing);
  assert.ok(report.issues.some(issue=>issue.moduleId===moduleId&&
   issue.taskId===taskId&&issue.fieldId===fieldId),
   moduleId+' must navigate to a persistent visual repair panel');
 }
});

test('Print-matched story and fact previews, row controls, and advanced fallback are mounted',async()=>{
 const [app,story,sort,fact]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/StoryOrderReviewEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/SortStoryReviewEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/FactChoiceReviewEditor.tsx',import.meta.url),'utf8'),
 ]);
 for(const id of ['story-order','sort-story','true-false','true-false-maze'])
  assert.match(app,new RegExp("active\\.id==='"+id+"'"));
 assert.match(app,/Advanced: edit this activity's JSON only/u);
 assert.match(story,/<StoryVersePreview module=/u);
 assert.match(story,/moveStoryEvent\(lesson,i,-1\)/u);
 assert.match(story,/replaceStoryEventFromNote/u);
 assert.match(sort,/<SortStoryPrintPreview module=/u);
 assert.match(sort,/selectFact\(lesson,'sortStory'/u);
 assert.match(sort,/Choose unused fact/u);
 assert.match(fact,/<PuzzlePreview module=/u);
 assert.match(fact,/<TrueFalsePrintPreview module=/u);
 assert.match(fact,/Restore exact canonical wording/u);
 assert.match(app,/setSelectedId\(issue\.taskId\)/u);
 assert.match(app,/setFocusIssueField\(issue\.fieldId\)/u);
});

test('Both approved lessons still populate and validate all three numbered presets',()=>{
 for(const lesson of [ot31,ot32]){
  for(const id of ['preset-1','preset-2','preset-3']){
   const result=buildWorksheetRecipe(lesson,id,{purpose:'published',seed:1});
   assert.equal(result.openSlots.length,0,lesson.id+':'+id);
  }
 }
});
