import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 addMatchingPair,editMatchingPair,matchingPairIssues,moveMatchingPair,removeMatchingPair,
} from '../src/review/matchingWords.ts';
import {listReviewTasks,checkReviewContent} from '../src/review/model.ts';
import {buildReviewPreflight,reviewIssueTarget} from '../src/review/preflight.ts';
import {validateModule} from '../src/modules.ts';

const original=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',import.meta.url),
 'utf8'));
const pairs=original.preparedActivities.matchWords;

test('Match Words visual edits preserve pair identity and original curriculum source material',()=>{
 const before=JSON.stringify(original);
 assert.equal(pairs.length,6);
 const edited=editMatchingPair(original,0,'right','God-provided bread');
 const after=edited.preparedActivities.matchWords;
 assert.equal(after[0].right,'God-provided bread');
 assert.equal(after[0].left,pairs[0].left);
 assert.equal(after[0].id,pairs[0].id);
 assert.deepEqual(after[0].sourceIds,pairs[0].sourceIds);
 assert.equal(after[0].origin,'suggested');
 assert.equal(after[0].teacherReviewRequired,true);
 assert.deepEqual(after.slice(1),pairs.slice(1),'Other approved pairs remain unchanged');
 assert.equal(JSON.stringify(original),before,'Approved JSON and original source references remain untouched');
 assert.deepEqual(matchingPairIssues(after),[]);
 assert.deepEqual(validateModule({
  type:'match-words',pairs:after.map(x=>x.left+','+x.right).join('\n'),seed:1,
 }),[]);
});

test('Adding, deleting and moving matching pairs never break pair relationships or provenance',()=>{
 const before=JSON.stringify(original);
 const moved=moveMatchingPair(original,0,1);
 assert.deepEqual(moved.preparedActivities.matchWords[0],pairs[1]);
 assert.deepEqual(moved.preparedActivities.matchWords[1],pairs[0]);
 assert.equal(moved.preparedActivities.matchWords.length,6);
 assert.throws(()=>moveMatchingPair(original,0,-1),/cannot move/u);
 assert.throws(()=>addMatchingPair(original),/at most six/u);
 const removed=removeMatchingPair(original,0);
 assert.equal(removed.preparedActivities.matchWords.length,5);
 assert.deepEqual(removed.preparedActivities.matchWords[0],pairs[1]);
 const added=addMatchingPair(removed);
 assert.equal(added.preparedActivities.matchWords.length,6);
 const fresh=added.preparedActivities.matchWords.at(-1);
 assert.equal(fresh.id,'mp-01','New pair gets an unused stable ID');
 assert.deepEqual({left:fresh.left,right:fresh.right}, {left:'',right:''});
 assert.equal(fresh.origin,'suggested');
 assert.deepEqual(fresh.sourceIds,[]);
 assert.equal(fresh.teacherReviewRequired,true);
 assert.equal(new Set(added.preparedActivities.matchWords.map(x=>x.id)).size,6);
 assert.deepEqual(matchingPairIssues(added).map(x=>x.index),[5,5]);
 const three=structuredClone(original);
 three.preparedActivities.matchWords=three.preparedActivities.matchWords.slice(0,3);
 assert.throws(()=>removeMatchingPair(three,1),/at least three/u);
 assert.equal(JSON.stringify(original),before,'Actions never mutate source lesson');
});

test('Live inline errors cover limits, missing entries, commas and duplicate sides',()=>{
 assert.deepEqual(matchingPairIssues(pairs),[]);
 const edited=structuredClone(pairs);
 edited[0].left='';
 edited[1].right='This phrase is definitely longer than twenty-two characters';
 edited[2].left='Word, with comma';
 edited[3].left=edited[4].left.toUpperCase();
 edited[5].right=edited[4].right.toLowerCase();
 const messages=matchingPairIssues(edited).map(x=>x.message);
 for(const snippet of ['entry is missing','exceeds 22 characters','cannot contain commas','duplicate left','duplicate right'])
  assert.ok(messages.some(x=>x.includes(snippet)),snippet+': '+messages.join('; '));
 assert.match(matchingPairIssues(pairs.slice(0,2))[0].message,/3–6/u);
});

test('Match Words stays a permanent review task and preflight errors open it directly',()=>{
 assert.ok(listReviewTasks(original).some(task=>task.id==='match-words'));
 const problem=editMatchingPair(original,0,'left',pairs[1].left);
 assert.ok(checkReviewContent(problem).some(message=>message.startsWith('match-words:')));
 const preflight=buildReviewPreflight(problem);
 assert.ok(preflight.issues.some(x=>x.moduleId==='match-words'&&
  x.taskId==='match-words'&&x.fieldId==='review-field-match-words'));
 const noPairs=structuredClone(original);
 delete noPairs.preparedActivities.matchWords;
 assert.ok(buildReviewPreflight(noPairs).issues.some(x=>x.taskId==='match-words'&&
  x.fieldId==='review-field-match-words'),
 'A missing matching-pairs array opens the visual editor, not JSON-only fallback');
 const target=reviewIssueTarget('match-words: Each pair must have a left and right side.');
 assert.equal(target.taskId,'match-words');
 assert.equal(target.fieldId,'review-field-match-words');
});

test('Review Studio uses actual print-matched preview, row controls, source context and optional advanced JSON',async()=>{
 const [app,css]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/review.css',import.meta.url),'utf8'),
 ]);
 assert.match(app,/id="review-field-match-words"/u);
 assert.match(app,/<MatchingPrintPreview module=\{matchingPrintable\}/u);
 assert.match(app,/editMatchingPair\(lesson,i,'left'/u);
 assert.match(app,/editMatchingPair\(lesson,i,'right'/u);
 assert.match(app,/moveMatchingPair\(lesson,i,-1\)/u);
 assert.match(app,/removeMatchingPair\(lesson,index\)/u);
 assert.match(app,/addMatchingPair\(lesson\)/u);
 assert.match(app,/SourceContext lesson=\{lesson\} ids=\{pair.sourceIds/u);
 assert.match(app,/Advanced: edit this activity's JSON only/u);
 assert.match(css,/\.review-match-preview \.medium-print-svg/u);
});
