import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 prepareUnscrambleReview,unscrambleWords,unscrambleProblems,
 unscrambleAlternatives,chooseUnscrambleAlternative,chooseUnscramble,
} from '../src/review/wordPuzzleEditors.ts';
import {reviewChoiceOrder,editMultipleChoice} from '../src/review/multipleChoiceEditor.ts';
import {sharedVerseBlankIssues} from '../src/review/verseBlankSharing.ts';
import {applyBsbVerse} from '../src/review/model.ts';
import {wordSpans,markSelectedWords} from '../src/review/bsb.ts';
import {shuffledChoices} from '../src/smallModules.ts';

const fixture=JSON.parse(await readFile(
 new URL('fixtures/ot-031-original-review.json',import.meta.url),'utf8'));
const words=['WATER','ROCK','MANNA','QUAIL'];
const enlarged=()=>{
 const lesson=structuredClone(fixture);
 lesson.preparedActivities.unscrambleWords.answers=[...words];
 lesson.preparedActivities.unscrambleWords.sourceIds=['sn-01','sn-02','sn-03'];
 return lesson;
};

test('Overfilled Unscramble auto-selects two valid saved choices without losing the rest',()=>{
 const source=enlarged(),original=JSON.stringify(source);
 const result=prepareUnscrambleReview(source);
 assert.equal(result.changed,true);
 assert.deepEqual(unscrambleWords(result.lesson),['WATER','ROCK']);
 assert.deepEqual(unscrambleAlternatives(result.lesson),['MANNA','QUAIL']);
 assert.deepEqual(unscrambleProblems(result.lesson),[]);
 assert.equal(result.lesson.preparedActivities.unscrambleWords.origin,'suggested');
 assert.equal(result.lesson.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.equal(JSON.stringify(source),original,'The imported file must not be mutated');
 const restored=JSON.parse(JSON.stringify({lesson:result.lesson,reviewed:[],selectedId:'unscramble-words'}));
 assert.deepEqual(unscrambleAlternatives(restored.lesson),['MANNA','QUAIL'],
  'Alternatives must survive saved review sessions and reloads');
 assert.equal(prepareUnscrambleReview(restored.lesson).changed,false);
});

test('Saved alternative selection is reversible and preserves the displaced original',()=>{
 const reviewed=prepareUnscrambleReview(enlarged()).lesson;
 const chosen=chooseUnscrambleAlternative(reviewed,1,'MANNA');
 assert.deepEqual(unscrambleWords(chosen),['WATER','MANNA']);
 assert.ok(unscrambleAlternatives(chosen).includes('ROCK'),
  'The previously selected answer remains recoverable');
 assert.deepEqual(unscrambleProblems(chosen),[]);
 const back=chooseUnscrambleAlternative(chosen,1,'ROCK');
 assert.deepEqual(unscrambleWords(back),['WATER','ROCK']);
 assert.deepEqual(unscrambleWords(reviewed),['WATER','ROCK'],'No in-place mutation');
 assert.throws(()=>chooseUnscrambleAlternative(reviewed,0,'not in saved data'),
  /previously saved answer/);
});

test('Missing or short lists use eligible lesson vocabulary when there are two choices',()=>{
 const source=structuredClone(fixture);
 source.vocabulary.entries=[
  {term:'WATER',scope:'story',sourceIds:['sn-01']},
  {term:'ROCK',scope:'story',sourceIds:['sn-02']},
  {term:'AAAA',scope:'story'}, // cannot scramble
 ];
 source.preparedActivities.unscrambleWords.answers=[];
 const made=prepareUnscrambleReview(source);
 assert.equal(made.changed,true);
 assert.deepEqual(unscrambleWords(made.lesson),['WATER','ROCK']);
 assert.deepEqual(unscrambleProblems(made.lesson),[]);
 assert.deepEqual(made.lesson.preparedActivities.unscrambleWords.sourceIds,['sn-01','sn-02']);
 const one=structuredClone(source);
 one.preparedActivities.unscrambleWords.answers=['ROCK'];
 assert.deepEqual(unscrambleWords(prepareUnscrambleReview(one).lesson),['ROCK','WATER']);
 const insufficient=structuredClone(source);
 insufficient.vocabulary.entries=[{term:'AAA',scope:'story'}];
 assert.equal(prepareUnscrambleReview(insufficient).changed,false,
  'Do not invent a valid pair if the source lacks two candidates');
 const already=structuredClone(source);
 already.preparedActivities.unscrambleWords.answers=['JOSEPH','POTIPHAR'];
 assert.equal(prepareUnscrambleReview(already).changed,false,
  'The teacher’s existing two-answer choice must be respected');
});

test('Malformed and non-text answers keep the existing explicit repair path',()=>{
 const bad=structuredClone(fixture);
 bad.preparedActivities.unscrambleWords.answers='not an array';
 assert.equal(prepareUnscrambleReview(bad).changed,false);
 bad.preparedActivities.unscrambleWords.answers=[12,'WATER','ROCK'];
 assert.equal(prepareUnscrambleReview(bad).changed,false);
});

test('Review orders the correct Multiple Choice answer first while editing by original index',async()=>{
 const source=structuredClone(fixture);
 const row={
  id:'mc-review-1',question:'Where did Joseph go?',correctAnswer:'Egypt',
  choices:[
   {text:'Babylon',isCorrect:false},
   {text:'Egypt',isCorrect:true},
   {text:'Canaan',isCorrect:false},
  ],
 };
 source.preparedActivities.multipleChoice=[row];
 const ordered=reviewChoiceOrder(row);
 assert.deepEqual(ordered.map(x=>x.choice.text),['Egypt','Babylon','Canaan']);
 assert.deepEqual(ordered.map(x=>x.originalIndex),[1,0,2]);
 assert.deepEqual(row.choices.map(x=>x.text),['Babylon','Egypt','Canaan'],
  'No mutation or hidden shuffle in review state');
 const changed=editMultipleChoice(source,0,'wrong1','Nineveh');
 assert.deepEqual(changed.preparedActivities.multipleChoice[0].choices.map(x=>x.text),
  ['Nineveh','Egypt','Canaan']);
 const printable={type:'multiple-choice',question:row.question,correct:row.correctAnswer,
  wrong1:'Babylon',wrong2:'Canaan',seed:1};
 assert.equal(shuffledChoices(printable).length,3,
  'The worksheet generator retains its original print shuffle');
 const app=await readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8');
 assert.match(app,/reviewChoiceOrder\(mc\)\.map\(\(\{choice:c,originalIndex:i\},position\)=>/u);
 assert.match(app,/choices',i,'text'/u);
 assert.match(app,/Answer choices are shuffled only on the printed worksheet/u);
});

test('Shared BSB blanks require 4–8 compatible selections and preserve exact verse wording',async()=>{
 const verse='God is faithful and good to all who trust and follow Him.';
 const reference='Psalm 23:1';
 const wordsInVerse=wordSpans(verse);
 const selected=[0,2,4,7];
 assert.ok(wordsInVerse.length>=9);
 assert.deepEqual(sharedVerseBlankIssues(verse,reference,selected),[]);
 assert.match(markSelectedWords(verse,selected),/\[God\]/u);
 assert.ok(sharedVerseBlankIssues(verse,reference,[0,2,4]).some(x=>/4–8/u.test(x)));
 assert.ok(sharedVerseBlankIssues(verse,reference,[0,1,2,3,4,5,6,7,8]).length>0);
 assert.ok(sharedVerseBlankIssues(verse,reference,[999,2,4,7]).length>0);
 assert.ok(sharedVerseBlankIssues(verse,'A'.repeat(39),selected).length>0);
 const full={reference,text:verse,citations:[reference]};
 const updated=applyBsbVerse(fixture,full,0,wordsInVerse.length-1,selected,selected,reference);
 const finish=updated.preparedActivities.finishVerse.markedVerse;
 const scramble=updated.preparedActivities.unscrambleVerse.markedVerse;
 assert.equal(finish,scramble);
 assert.equal(finish.replace(/\[([^\[\]]+)\]/gu,'$1'),verse);
 assert.equal(JSON.stringify(fixture.preparedActivities.finishVerse.sourceVerse??''),JSON.stringify(
  JSON.parse(await readFile(new URL('fixtures/ot-031-original-review.json',import.meta.url),'utf8')).preparedActivities.finishVerse.sourceVerse??''));
});

test('Review Studio exposes sharing controls for either verse activity without changing the selected excerpt',async()=>{
 const app=await readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8');
 assert.match(app,/sharedVerseBlankIssues\(verseText,displayReference,chosen\)/u);
 assert.match(app,/setFinish\(shared\);setUnscramble\(shared\)/u);
 assert.match(app,/Use these blanks for both activities/u);
 assert.match(app,/changeBounds\(s:number,e:number\)/u);
 assert.match(app,/setFinish\(\[\]\);setUnscramble\(\[\]\)/u);
 assert.match(app,/const prepared=prepareUnscrambleReview\(data\)/u);
 assert.match(app,/prepared\.changed\?/u);
 const editor=await readFile(new URL('../src/review/UnscrambleReviewEditor.tsx',import.meta.url),'utf8');
 assert.match(editor,/unscrambleAlternatives\(lesson\)/u);
 assert.match(editor,/chooseUnscrambleAlternative\(lesson,index,e\.target\.value\)/u);
 assert.match(editor,/Two answers are selected for this worksheet/u);
});
