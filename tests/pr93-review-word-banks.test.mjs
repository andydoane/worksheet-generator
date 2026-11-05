import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateModule} from '../src/modules.ts';
import {
 wordBankText,wordBankDrafts,changeWordBankList,wordBankCounts,wordBankIssues,
} from '../src/review/wordBanks.ts';

const make=()=>({
 id:'ot-021-joseph-works-for-potiphar',
 vocabulary:{related:['JOSEPH','POTIPHAR','EGYPT','COAT','PRISON','HOUSE']},
 storyNotes:[{id:'sn-01',cleanText:'Joseph was taken to Egypt.'}],
 preparedActivities:{
  oddWords:{
   related:['JOSEPH','POTIPHAR','EGYPT','COAT','PRISON','HOUSE'],
   unrelated:['ARK','HARP','FISH','GIANT'],
   origin:'adapted',sourceIds:['sn-01'],teacherReviewRequired:true,
  },
  checkboxes:{
   correct:['GUARD','SERVANT','JAILER','WIFE','GOD','PHARAOH'],
   incorrect:['BOAT','ALTAR','TENT','RIVER'],
   origin:'adapted',sourceIds:['sn-01'],teacherReviewRequired:true,
  },
  trueFalse:{statement:'Joseph was in Egypt',isTrue:true},
 },
});

test('OT21-like 6+4 prepared lists reproduce the exact two Review Studio failures',()=>{
 const source=make();
 for(const kind of ['oddWords','checkboxes']){
  const counts=wordBankCounts(source,kind);
  assert.deepEqual(counts,{story:6,unrelated:4,total:10});
  assert.ok(wordBankIssues(source,kind).some(issue=>issue.includes('1–5 story words')),
   kind+' should fail the actual small-module limit');
 }
 assert.deepEqual(wordBankDrafts(source).oddWords.related.split('\n'),
  source.preparedActivities.oddWords.related);
 assert.deepEqual(wordBankDrafts(source).checkboxes.correct.split('\n'),
  source.preparedActivities.checkboxes.correct);
});

test('Both editable related/correct lists repair preflight issues without changing any other lesson content',()=>{
 const initial=make(),before=JSON.stringify(initial);
 const odd=changeWordBankList(initial,'oddWords','related',
  ' JOSEPH\nPOTIPHAR\nEGYPT\nCOAT\nPRISON\n');
 const final=changeWordBankList(odd,'checkboxes','correct',
  'GUARD\nSERVANT\nJAILER\nWIFE\nGOD');
 assert.deepEqual(wordBankIssues(final,'oddWords'),[]);
 assert.deepEqual(wordBankIssues(final,'checkboxes'),[]);
 assert.deepEqual(wordBankCounts(final,'oddWords'),{story:5,unrelated:4,total:9});
 assert.deepEqual(wordBankCounts(final,'checkboxes'),{story:5,unrelated:4,total:9});
 assert.deepEqual(final.preparedActivities.oddWords.unrelated,initial.preparedActivities.oddWords.unrelated);
 assert.deepEqual(final.preparedActivities.checkboxes.incorrect,initial.preparedActivities.checkboxes.incorrect);
 assert.deepEqual(final.preparedActivities.trueFalse,initial.preparedActivities.trueFalse);
 assert.deepEqual(final.vocabulary,initial.vocabulary,'Original source vocabulary must not be edited');
 assert.deepEqual(final.storyNotes,initial.storyNotes,'Original source notes must not be edited');
 assert.deepEqual(final.preparedActivities.oddWords.sourceIds,initial.preparedActivities.oddWords.sourceIds);
 assert.equal(JSON.stringify(initial),before,'The original lesson object must be left untouched');
});

test('Unrelated/incorrect sides are editable too, normalize lines, and validate distinctness across BOTH sides',()=>{
 let lesson=changeWordBankList(make(),'oddWords','related','JOSEPH\nPOTIPHAR\nEGYPT\nCOAT\nPRISON');
 lesson=changeWordBankList(lesson,'checkboxes','correct','GUARD\nSERVANT\nJAILER\nWIFE\nGOD');
 assert.deepEqual(wordBankIssues(lesson,'oddWords'),[]);
 assert.deepEqual(wordBankIssues(lesson,'checkboxes'),[]);
 const revised=changeWordBankList(lesson,'oddWords','unrelated',' ARK \r\n FISH \r\n HARP \r\nGIANT\r\n');
 assert.equal(wordBankText(revised,'oddWords','unrelated'),'ARK\nFISH\nHARP\nGIANT');
 assert.deepEqual(wordBankIssues(revised,'oddWords'),[]);
 const dup=changeWordBankList(revised,'oddWords','unrelated','ARK\njoseph\nFISH\nHARP');
 assert.ok(wordBankIssues(dup,'oddWords').some(s=>s.includes('distinct')));
 const other=changeWordBankList(lesson,'checkboxes','incorrect','BOAT\nALTAR\nTENT\nRIVER');
 assert.deepEqual(wordBankIssues(other,'checkboxes'),[]);
 assert.throws(()=>changeWordBankList(other,'oddWords','correct','INVALID'),/Invalid word-bank field/);
 assert.throws(()=>changeWordBankList(other,'checkboxes','related','INVALID'),/Invalid word-bank field/);
});

test('Inline issues exactly reuse generator constraints: total, length, phrase structure and uniqueness',()=>{
 let lesson=make();
 lesson=changeWordBankList(lesson,'oddWords','related','JOSEPH');
 lesson=changeWordBankList(lesson,'oddWords','unrelated','ARK');
 assert.ok(wordBankIssues(lesson,'oddWords').some(s=>s.includes('6–10 words total')));
 lesson=changeWordBankList(lesson,'oddWords','related',
  'JOSEPH\nPOTIPHAR\nA VERY LONG WORD\nPRISON\nEGYPT');
 assert.ok(wordBankIssues(lesson,'oddWords').some(s=>s.includes('at most 12 characters')));
 lesson=changeWordBankList(lesson,'checkboxes','correct','GUARD\nSERVANT\nJAILER\nWIFE\nGOD');
 lesson=changeWordBankList(lesson,'checkboxes','incorrect','A THREE WORD PHRASE');
 assert.ok(wordBankIssues(lesson,'checkboxes').some(s=>s.includes('one- or two-word')));
 const prepared=lesson.preparedActivities;
 const oddActual=validateModule({type:'odd-words',correct:prepared.oddWords.related.join('\n'),
  incorrect:prepared.oddWords.unrelated.join('\n'),seed:1});
 const checkActual=validateModule({type:'checkboxes',correct:prepared.checkboxes.correct.join('\n'),
  incorrect:prepared.checkboxes.incorrect.join('\n'),seed:1});
 assert.deepEqual(wordBankIssues(lesson,'oddWords'),oddActual);
 assert.deepEqual(wordBankIssues(lesson,'checkboxes'),checkActual);
});

test('Review UI edits all four fields, preserves trailing Enter, reroutes errors and clears only affected review checkmark',async()=>{
 const app=await readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8');
 for(const marker of ['id="review-field-odd-words"','id="review-field-odd-words-unrelated"',
  'id="review-field-checkboxes"','id="review-field-checkboxes-incorrect"']){
  assert.match(app,new RegExp(marker));
 }
 for(const [kind,field] of [['oddWords','related'],['oddWords','unrelated'],
  ['checkboxes','correct'],['checkboxes','incorrect']]){
  assert.ok(app.includes("changeWordList('"+kind+"','"+field+"',e.target.value)"),
   'Both sides of '+kind+' must be editable');
 }
 assert.match(app,/setWordBankDrafts\(previous=>\(\{\.\.\.previous,/u);
 assert.match(app,/setPreflight\(null\)/u);
 assert.match(app,/setReviewed\(previous=>previous\.filter\(id=>id!==\(key==='oddWords'\?'odd-words':'checkboxes'\)\)\)/u);
 assert.match(app,/wordBankIssues\(lesson,'oddWords'\)/u);
 assert.match(app,/wordBankIssues\(lesson,'checkboxes'\)/u);
 assert.match(app,/wordBankCounts\(lesson,'oddWords'\)/u);
 assert.match(app,/wordBankCounts\(lesson,'checkboxes'\)/u);
 assert.match(app,/setWordBankDrafts\(draftWordBanks\(data\)\)/u);
 const css=await readFile(new URL('../src/review/review.css',import.meta.url),'utf8');
 assert.match(css,/\.review-word-bank/u);
});
