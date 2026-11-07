import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {addCircleMistake,removeCircleMistake,MAX_CIRCLE_MISTAKES} from '../src/review/circleMistakesEditor.ts';
import {editAt,checkReviewContent} from '../src/review/model.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {validateModule} from '../src/modules.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const lesson=await read('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json').then(JSON.parse);

test('Adding a mistake keeps paragraph, original corrections and source metadata intact and synchronizes count',()=>{
 const before=JSON.stringify(lesson);
 const old=lesson.preparedActivities.circleMistakes;
 assert.ok(old.mistakes.length<MAX_CIRCLE_MISTAKES);
 const next=addCircleMistake(lesson);
 const current=next.preparedActivities.circleMistakes;
 assert.equal(current.mistakes.length,old.mistakes.length+1);
 assert.equal(current.mistakeCount,current.mistakes.length);
 assert.equal(current.paragraph,old.paragraph);
 assert.deepEqual(current.mistakes.slice(0,-1),old.mistakes);
 assert.deepEqual(current.mistakes.at(-1),{
  incorrect:'',correction:'',origin:'suggested',teacherReviewRequired:true,
 });
 assert.deepEqual(next.storyNotes,lesson.storyNotes);
 assert.deepEqual(next.preparedActivities.storyOrder,lesson.preparedActivities.storyOrder);
 assert.equal(JSON.stringify(lesson),before,'Adding must not mutate an imported lesson');
});

test('A new mistake is incomplete until its exact incorrect text and correction are supplied',()=>{
 const added=addCircleMistake(lesson);
 const original=lesson.preparedActivities.circleMistakes;
 const wrong=convertLessonActivities(added,{seed:1});
 assert.ok(wrong.diagnostics.some(item=>item.moduleId==='circle-mistakes'),
  'Missing correction fields must block the printable activity');
 assert.ok(checkReviewContent(added).some(message=>/Circle the Mistakes paragraph and corrections/u.test(message)));
 const index=original.mistakes.length;
 const withParagraph=editAt(added,['preparedActivities','circleMistakes','paragraph'],
  original.paragraph+' The people crossed the sea on bicycles.');
 const withWrongPhrase=editAt(withParagraph,
  ['preparedActivities','circleMistakes','mistakes',index,'incorrect'],'bicycles');
 const completed=editAt(withWrongPhrase,
  ['preparedActivities','circleMistakes','mistakes',index,'correction'],'dry ground');
 const activity=completed.preparedActivities.circleMistakes;
 assert.equal(activity.mistakes.length,activity.mistakeCount);
 assert.deepEqual(validateModule({type:'circle-mistakes',text:activity.paragraph,count:activity.mistakeCount}),[]);
 assert.ok(!convertLessonActivities(completed,{seed:1}).diagnostics.some(item=>item.moduleId==='circle-mistakes'));
 assert.ok(!checkReviewContent(completed).some(message=>/Circle the Mistakes paragraph and corrections/u.test(message)));
 assert.equal(JSON.stringify(lesson.preparedActivities.circleMistakes),JSON.stringify(original));
});

test('Add is capped at eight; Remove correctly returns to the prior count and cannot remove last row',()=>{
 let candidate=structuredClone(lesson);
 const start=candidate.preparedActivities.circleMistakes.mistakes.length;
 for(let i=start;i<MAX_CIRCLE_MISTAKES;i++)candidate=addCircleMistake(candidate);
 assert.equal(candidate.preparedActivities.circleMistakes.mistakes.length,8);
 assert.equal(candidate.preparedActivities.circleMistakes.mistakeCount,8);
 assert.throws(()=>addCircleMistake(candidate),/at most eight/u);
 const afterRemove=removeCircleMistake(candidate,7);
 assert.equal(afterRemove.preparedActivities.circleMistakes.mistakeCount,7);
 assert.equal(afterRemove.preparedActivities.circleMistakes.mistakes.length,7);
 assert.deepEqual(afterRemove.preparedActivities.circleMistakes.mistakes.slice(0,start),
  lesson.preparedActivities.circleMistakes.mistakes);
 assert.equal(candidate.preparedActivities.circleMistakes.mistakes.length,8,'Remove must not mutate original');
 const one={preparedActivities:{circleMistakes:{paragraph:'A mistake.',mistakeCount:1,
  mistakes:[{incorrect:'mistake',correction:'fact'}]}}};
 assert.throws(()=>removeCircleMistake(one,0),/at least one/u);
 assert.throws(()=>removeCircleMistake(candidate,-1),/no longer exists/u);
 assert.throws(()=>removeCircleMistake(candidate,8),/no longer exists/u);
 assert.throws(()=>addCircleMistake({preparedActivities:{}}),/editable mistake list/u);
});

test('Circle the Mistakes page exposes Add and Remove while invalidating its review and preflight',async()=>{
 const app=await read('src/review/ReviewApp.tsx');
 const start=app.indexOf("{active.id==='circle-mistakes'");
 const end=app.indexOf("{active.id==='odd-words'",start);
 assert.ok(start>0&&end>start);
 const section=app.slice(start,end);
 assert.match(section,/\+ Add mistake/u);
 assert.match(section,/addCircleMistake\(lesson\)/u);
 assert.match(section,/removeCircleMistake\(lesson,i\)/u);
 assert.match(section,/mistakes\.length>=MAX_CIRCLE_MISTAKES/u);
 assert.match(section,/mistakes\.length<=1/u);
 assert.match(section,/window\.confirm\('Remove mistake '/u);
 assert.match(section,/Incorrect phrase/u);
 assert.match(section,/Correction/u);
 assert.match(app,/function editCircleMistakes\(action:\(\)=>Lesson\)\{\s*try\{applyVisualReview\(action\(\)\);\}/u);
 assert.match(app,/function applyVisualReview\(next:Lesson\)\{\s*setLesson\(next\);setPreflight\(null\);\s*setReviewed\(previous=>previous\.filter\(id=>id!==active\?\.id\)\)/u);
});
