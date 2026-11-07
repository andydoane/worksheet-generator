import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {editAt,listReviewTasks} from '../src/review/model.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Review tasks distinguish TRUE and intentionally FALSE canonical facts',()=>{
 const lesson={
  facts:[
   {id:'tf-true',statement:'God helped His people.',isTrue:true,origin:'suggested'},
   {id:'tf-false',statement:'The people crossed on boats.',isTrue:false,origin:'suggested'},
   {id:'tf-unknown',statement:'Check the answer.',origin:'suggested'},
  ],
  preparedActivities:{},
 };
 const tasks=listReviewTasks(lesson);
 const truth=tasks.find(task=>task.id==='fact:tf-true');
 const falsehood=tasks.find(task=>task.id==='fact:tf-false');
 const unknown=tasks.find(task=>task.id==='fact:tf-unknown');
 assert.ok(truth&&falsehood&&unknown);
 for(const task of [truth,falsehood,unknown])
  assert.equal(task.group,'True/False statements');
 assert.match(truth.detail,/true statement is accurate/u);
 assert.doesNotMatch(truth.detail,/false/u);
 assert.match(falsehood.detail,/intentionally false statement/u);
 assert.match(unknown.detail,/truth value/u);
 assert.doesNotMatch(unknown.detail,/intentionally false/u);
});

test('Canonical fact editor renders the peach FALSE warning only for isTrue=false',async()=>{
 const app=await read('src/review/ReviewApp.tsx');
 const start=app.indexOf('{factIndex>=0&&(()=>{');
 const end=app.indexOf("{active.id==='finish-story'",start);
 assert.ok(start>=0&&end>start,'Fact editor section must remain in ReviewApp');
 const factEditor=app.slice(start,end);
 assert.match(factEditor,
  /\{f\.isTrue===false&&<p className="review-warning">Intentionally FALSE\.<\/p>\}/u,
  'FALSE warning must be conditionally rendered only when isTrue is exactly false');
 assert.match(factEditor,
  /<p className="review-source">Edits are synchronized to Sort the Story and linked True\/False activities\.<\/p>/u,
  'Neutral synchronization message must remain visible for both truth values');
 assert.match(factEditor,
  /f\.isTrue===true\?'True statement':f\.isTrue===false\?'False statement':'Statement \(truth value missing\)'/u,
  'Label must distinguish true, false and missing truth values');
 assert.equal((factEditor.match(/className="review-warning"/gu)??[]).length,1,
  'No other unconditional FALSE-style warnings should appear above TRUE statements');
});

test('Editing TRUE or FALSE canonical wording retains the answer and linked activity truth keys',async()=>{
 const lesson=JSON.parse(await read('curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json'));
 const before=JSON.stringify(lesson);
 for(const isTrue of [true,false]){
  const index=lesson.facts.findIndex(f=>f.isTrue===isTrue);
  assert.ok(index>=0,'Expected both canonical truth values in approved fixture');
  const fact=lesson.facts[index],statement=fact.statement+' ';
  const edited=editAt(lesson,['facts',index,'statement'],statement);
  assert.equal(edited.facts[index].statement,statement);
  assert.equal(edited.facts[index].isTrue,isTrue);
  for(const item of [
   ...(edited.preparedActivities.sortStory??[]),
   edited.preparedActivities.trueFalse,edited.preparedActivities.trueFalseMaze,
  ].filter(Boolean).filter(x=>x.factId===fact.id)){
   assert.equal(item.statement,statement);
   assert.equal(item.isTrue,isTrue);
  }
  assert.equal(JSON.stringify(lesson),before,'Source fixture must not be mutated');
 }
});
