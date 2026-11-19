import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {REVIEW_DECOY_POOL} from '../src/review/decoyPool.ts';
import {suggestDecoyWords,replaceWithSuggestedDecoys} from '../src/review/decoySuggestions.ts';
import {wordBankDrafts,wordBankIssues} from '../src/review/wordBanks.ts';
import {orderedStoryEvents,linesFromInput} from '../src/storyVerseModules.ts';

const file=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const fixture=JSON.parse(await file('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
const lower=s=>s.toLocaleLowerCase('en');
const unique=items=>new Set(items.map(lower)).size===items.length;
function generator(){let n=37;return()=>((n=(n*48271)%2147483647)/2147483647);}

test('Elementary decoy pool is large, easy to read, one word each, and printable',()=>{
 assert.ok(REVIEW_DECOY_POOL.length>=1000,
  'Keep a substantially larger selection than the previous 459-word pool');
 assert.ok(unique(REVIEW_DECOY_POOL),'Case-insensitive duplicates should be removed');
 for(const word of REVIEW_DECOY_POOL){
  assert.match(word,/^[A-Za-z]+$/u,word+' must be one alphabetic word');
  assert.ok(word.length<=12,word+' must fit Odd Words and Checkboxes');
 }
 for(const term of ['Adam','Eve','Noah','Abraham','Mary','David','Samson',
                     'Jerusalem','Bethlehem','Egypt','Nazareth','Jericho',
                     'donkey','basket','sword','trumpet','sheep','boat','manger'])
  assert.ok(REVIEW_DECOY_POOL.some(w=>lower(w)===lower(term)),term);
 for(const obscure of ['Nebuchadnezzar','interpretation','oxgoad',
                       'frankincense','taxcollector','swaddling','goatskin'])
  assert.ok(!REVIEW_DECOY_POOL.some(w=>lower(w)===lower(obscure)),obscure);
});

test('Five random suggestions are unique, valid and avoid related and other decoy choices',()=>{
 for(const kind of ['oddWords','checkboxes']){
  const words=suggestDecoyWords(fixture,kind,generator());
  assert.equal(words.length,5);
  assert.ok(unique(words),kind);
  const reserved=[
   ...fixture.preparedActivities.oddWords.related,
   ...fixture.preparedActivities.checkboxes.correct,
   ...(kind==='oddWords'?fixture.preparedActivities.checkboxes.incorrect:
      fixture.preparedActivities.oddWords.unrelated),
   ...fixture.vocabulary.entries.map(entry=>entry.term),
  ].map(lower);
  for(const word of words){
   assert.ok(!reserved.includes(lower(word)),kind+': '+word+' is already in use');
   assert.match(word,/^\p{L}+$/u);
   assert.ok(word.length<=(kind==='oddWords'?12:14),kind+': '+word);
  }
 }
});

test('Generating Checkboxes after approved Odd Words avoids overlap without changing Odd Words',()=>{
 const before=JSON.stringify(fixture),random=generator();
 const odd=replaceWithSuggestedDecoys(fixture,'oddWords',random);
 assert.equal(odd.lesson.preparedActivities.oddWords.unrelatedOrigin,'suggested');
 assert.equal(odd.words.length,5);
 assert.deepEqual(wordBankIssues(odd.lesson,'oddWords'),[]);
 const checkedOddWords=structuredClone(odd.lesson.preparedActivities.oddWords);
 const checks=replaceWithSuggestedDecoys(odd.lesson,'checkboxes',random);
 assert.equal(checks.lesson.preparedActivities.checkboxes.incorrectOrigin,'suggested');
 assert.equal(checks.words.length,5);
 assert.ok(checks.words.every(w=>!odd.words.map(lower).includes(lower(w))));
 assert.deepEqual(wordBankIssues(checks.lesson,'checkboxes'),[]);
 assert.deepEqual(checks.lesson.preparedActivities.oddWords,checkedOddWords);
 assert.deepEqual(checks.lesson.preparedActivities.checkboxes.incorrect,checks.words);
 assert.equal(wordBankDrafts(checks.lesson).checkboxes.incorrect,checks.words.join('\n'));
 assert.equal(JSON.stringify(fixture),before,'Original lesson cannot be mutated');
 assert.deepEqual(checks.lesson.vocabulary,fixture.vocabulary);
 assert.deepEqual(checks.lesson.storyNotes,fixture.storyNotes);
 assert.deepEqual(checks.lesson.preparedActivities.oddWords.related,
                  fixture.preparedActivities.oddWords.related);
 // Symmetry: generating Odd Words second also must exclude Checkboxes.
 const reversed=replaceWithSuggestedDecoys(fixture,'checkboxes',generator());
 const newOdd=replaceWithSuggestedDecoys(reversed.lesson,'oddWords',generator());
 assert.ok(newOdd.words.every(w=>!reversed.words.map(lower).includes(lower(w))));
});

test('Insufficient eligible suggestions fail atomically, before any teacher data changes',()=>{
 const before=JSON.stringify(fixture);
 const insufficient=['Noah','NOAH','ark','stone','Moses','bird'];
 assert.throws(()=>replaceWithSuggestedDecoys(fixture,'checkboxes',()=>0,insufficient),
  /Not enough unique suggested decoys/u);
 assert.equal(JSON.stringify(fixture),before);
 const sample=suggestDecoyWords(fixture,'oddWords',()=>0,
  ['light','darkness','mountain','stars','earth','trees','chariot','temple','SILVER','ELIJAH']);
 assert.equal(sample.length,5);
 assert.ok(unique(sample));
});

test('Story Order preview preserves chronology for review and shuffling for student worksheets',async()=>{
 const [editor,preview,story,app,css]=await Promise.all([
  file('src/review/StoryOrderReviewEditor.tsx'),file('src/StoryVersePreview.tsx'),
  file('src/storyVerseModules.ts'),file('src/review/ReviewApp.tsx'),
  file('src/review/review.css'),
 ]);
 const events=fixture.preparedActivities.storyOrder.map(event=>event.text);
 const module={type:'story-order',events:events.join('\n'),seed:1};
 assert.deepEqual(linesFromInput(module.events),events);
 assert.deepEqual(orderedStoryEvents(module).slice().sort(),events.slice().sort());
 assert.match(editor,/Story Order — Chronological Review Preview/u);
 assert.match(editor,/<StoryVersePreview storyOrderChronological module=/u);
 assert.match(preview,/storyOrderChronological\?linesFromInput\(module\.events\):orderedStoryEvents\(module\)/u);
 assert.match(preview,/storyOrderChronological\?i\+1:null/u);
 assert.match(preview,/storyOrderChronological=false/u);
 assert.match(story,/shuffledIndices\(events\.length, module\.events, module\.seed\)/u);
 assert.doesNotMatch(story,/storyOrderChronological/u);
 for(const kind of ['oddWords','checkboxes'])
  assert.match(app,new RegExp("onClick=\\{\\(\\)=>suggestWordDecoys\\('"+kind+"'\\)\\}","u"));
 assert.match(app,/window\.confirm\(/u);
 assert.match(app,/setPreflight\(null\)/u);
 assert.match(app,/setReviewed\(previous=>previous\.filter\(/u);
 assert.match(app,/id!===?\(key==='oddWords'\?'odd-words':'checkboxes'\)/u);
 assert.match(css,/\.review-word-bank \.review-decoy-button/u);
});
