import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 crosswordPairs,crosswordTextIssues,crosswordIssues,editCrosswordPair,
} from '../src/review/crosswordEditor.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';

const source=await readFile(new URL(
 '../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',
 import.meta.url),'utf8');
const approved=JSON.parse(source);
const originalPairs=crosswordPairs(approved);
const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Fast crossword checks agree with the full validator on valid and malformed entry fields',()=>{
 assert.deepEqual(crosswordTextIssues(originalPairs),[]);
 assert.deepEqual(crosswordIssues(originalPairs),[]);
 const broken=structuredClone(originalPairs);
 broken[0].answer='';
 broken[1].answer=broken[2].answer.toLowerCase();
 broken[3].clue='A bad clue, containing a comma';
 broken[4].clue='X'.repeat(86);
 const instant=crosswordTextIssues(broken);
 assert.ok(instant.some(issue=>issue.index===0&&issue.field==='answer'));
 assert.ok(instant.some(issue=>issue.index===2&&issue.field==='answer'));
 assert.ok(instant.some(issue=>issue.index===3&&issue.field==='clue'));
 assert.ok(instant.some(issue=>issue.index===4&&issue.field==='clue'));
 assert.deepEqual(instant,crosswordIssues(broken),
  'When text is invalid the full validator must use the same immediate errors');
 assert.deepEqual(crosswordTextIssues(broken.slice(0,5)),
  crosswordIssues(broken.slice(0,5)));
});

test('Only the full, non-debounced validator decides whether valid words actually interlock',()=>{
 const disconnected=['ABC','DEF','GHI','JKL','MNO','PQR'].map((answer,index)=>({
  answer,clue:'Clue '+(index+1),
 }));
 assert.deepEqual(crosswordTextIssues(disconnected),[],
  'Cheap checks cannot certify a connected crossword');
 const full=crosswordIssues(disconnected);
 assert.equal(full.length,1);
 assert.equal(full[0].kind,'layout');
 assert.match(full[0].message,/cannot form one connected crossword/u);
 const invalid=[...disconnected];
 invalid[0]={answer:'ZZ!',clue:'Clue 1'};
 assert.ok(crosswordTextIssues(invalid).length>0);
 assert.deepEqual(crosswordIssues(invalid),crosswordTextIssues(invalid));
});

test('Every typed character updates review lesson data synchronously and survives save/reload',()=>{
 const before=JSON.stringify(approved);
 let working=approved;
 const final='A'.repeat(86);
 for(let i=1;i<=final.length;i++){
  const previousClue=working.preparedActivities.crossword[0].clue;
  const next=editCrosswordPair(working,0,'clue',final.slice(0,i));
  assert.equal(next.preparedActivities.crossword[0].clue,final.slice(0,i));
  assert.equal(working.preparedActivities.crossword[0].clue,previousClue,
   'Editing must never mutate the previous lesson snapshot');
  working=next;
 }
 assert.equal(JSON.stringify(approved),before,'Source lesson was not mutated');
 assert.equal(working.preparedActivities.crossword[0].origin,'suggested');
 assert.equal(working.preparedActivities.crossword[0].teacherReviewRequired,true);
 assert.deepEqual(working.preparedActivities.crossword[0].sourceIds,
  approved.preparedActivities.crossword[0].sourceIds);
 const roundTrip=JSON.parse(JSON.stringify({
  lesson:working,reviewed:['lesson-details'],selectedId:'crossword',
 }));
 assert.equal(roundTrip.lesson.preparedActivities.crossword[0].clue,final);
 assert.deepEqual(roundTrip.reviewed,['lesson-details']);
 const instant=crosswordTextIssues(crosswordPairs(roundTrip.lesson));
 assert.ok(instant.some(issue=>issue.index===0&&issue.field==='clue'&&
  /1–85 characters/u.test(issue.message)));
 const preflight=buildReviewPreflight(roundTrip.lesson);
 assert.ok(preflight.issues.some(issue=>issue.moduleId==='crossword'&&
  /1–85 characters/u.test(issue.message)),
  'Explicit preflight must validate the saved latest text, even before preview settles');
});

test('Review Studio defers only full grid generation, hides stale previews, and cancels timers',async()=>{
 const editor=await read('src/review/CrosswordReviewEditor.tsx');
 const helper=await read('src/review/crosswordEditor.ts');
 const app=await read('src/review/ReviewApp.tsx');
 assert.match(editor,/import \{useEffect,useMemo,useState\} from 'react'/u);
 assert.match(editor,/useMemo\(\(\)=>crosswordTextIssues\(entries\),\[entries\]\)/u);
 assert.doesNotMatch(editor,/useMemo\(\(\)=>crosswordIssues\(entries\)/u,
  'The expensive connected-grid validation must not run while typing');
 assert.match(editor,/const timer=window\.setTimeout\(\(\)=>\{/u);
 assert.match(editor,/setSettled\(\{key:previewKey,issues:crosswordIssues\(entries\)\}\)/u);
 assert.match(editor,/\},500\)/u);
 assert.match(editor,/return \(\)=>window\.clearTimeout\(timer\)/u);
 assert.match(editor,/const pending=canGenerate&&settled\?\.key!==previewKey/u);
 assert.match(editor,/const valid=canGenerate&&!pending&&issues\.length===0/u);
 assert.match(editor,/\{pending\?<p className="review-crossword-updating" role="status">/u);
 assert.match(editor,/<SpecialtyPreview module=\{crosswordModule\(entries\)\}\/>/u);
 assert.match(editor,/onChange=\{event=>apply\(\(\)=>editCrosswordPair\(lesson,i,'answer',event\.target\.value\)\)\}/u);
 assert.match(editor,/onChange=\{event=>apply\(\(\)=>editCrosswordPair\(lesson,i,'clue',event\.target\.value\)\)\}/u);
 assert.match(app,/function applyCrosswordReview\(next:Lesson\)/u);
 assert.match(app,/setModuleEditorText\(JSON\.stringify\(next\.preparedActivities\?\.crossword\?\?\[\],null,2\)\)/u);
 assert.match(helper,/export function crosswordTextIssues/u);
 assert.match(helper,/export function crosswordIssues/u);
 assert.match(helper,/const issues=crosswordTextIssues\(pairs\)/u);
 const cheap=helper.slice(helper.indexOf('export function crosswordTextIssues'),
  helper.indexOf('export function crosswordIssues'));
 assert.doesNotMatch(cheap,/validateModule\(|generateCrossword\(/u,
  'Per-keystroke checks must never invoke the expensive crossword engine');
 const css=await read('src/review/review.css');
 assert.match(css,/\.review-crossword-updating/u);
});
