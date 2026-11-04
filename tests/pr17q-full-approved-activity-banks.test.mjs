import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {contentClaimsForModule,chooseUnusedLessonContent} from '../src/lessonContentPool.ts';
import {validateModule,parsePairs} from '../src/modules.ts';
import {wordLines} from '../src/smallModules.ts';
import {parseSearchWords,generateWordSearch} from '../src/puzzleEngines.ts';

const ot32=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',import.meta.url),
 'utf8'));
const build=id=>buildWorksheetRecipe(ot32,id,{purpose:'published',seed:1});
const forType=(built,type)=>{
 const selection=built.selections.find(s=>s.moduleId===type);
 assert.ok(selection,'Preset '+built.recipeId+' is missing '+type);
 return built.draft.modules[selection.slot];
};

test('OT32 presets use the largest approved word and matching banks without duplication',()=>{
 const snapshot=JSON.stringify(ot32);
 const first=build('preset-1'),second=build('preset-2'),third=build('preset-3');
 for(const built of [first,second,third]){
  assert.equal(built.openSlots.length,0,built.recipeId);
  const seen=new Set();
  for(const selection of built.selections){
   const module=built.draft.modules[selection.slot];
   assert.deepEqual(validateModule(module),[],built.recipeId+' '+selection.slot);
   for(const claim of contentClaimsForModule(module,ot32)){
    assert.equal(seen.has(claim),false,built.recipeId+' repeats '+claim);
    seen.add(claim);
   }
  }
 }
 const pairs=forType(first,'match-words');
 assert.equal(parsePairs(pairs.pairs).length,6,'Use all six approved matching pairs');
 assert.deepEqual(parsePairs(pairs.pairs).map(p=>[p.left,p.right]),
  ot32.preparedActivities.matchWords.map(p=>[p.left,p.right]));

 const odd=forType(second,'odd-words');
 assert.equal(wordLines(odd.correct).length,5,'Use all five approved story words');
 assert.equal(wordLines(odd.incorrect).length,5,'Use all five approved distractors');
 assert.deepEqual(wordLines(odd.correct),ot32.preparedActivities.oddWords.related);
 assert.deepEqual(wordLines(odd.incorrect),ot32.preparedActivities.oddWords.unrelated);

 const wordSearch=forType(second,'word-search');
 assert.equal(parseSearchWords(wordSearch.words).length,12,
  'Use the full large search capacity when a nonrepeating reviewed bank fits');
 const grid=generateWordSearch(wordSearch);
 assert.equal(grid.placements.length,12);
 const allowed=new Set([
  ...ot32.preparedActivities.wordSearch.words,
  ...ot32.vocabulary.entries.filter(v=>v.scope!=='application').map(v=>v.term),
 ].map(v=>v.toUpperCase().replace(/\s+/gu,'')));
 for(const word of parseSearchWords(wordSearch.words)){
  assert.ok(allowed.has(word),'Word search invented an unreviewed word: '+word);
 }
 const oddWords=new Set([...wordLines(odd.correct),...wordLines(odd.incorrect)]
  .map(s=>s.toUpperCase().replace(/\s+/gu,'')));
 assert.ok(parseSearchWords(wordSearch.words).every(word=>!oddWords.has(word)),
  'The full Word Search must not repeat What Doesn’t Belong vocabulary');

 const checklist=forType(third,'checkboxes');
 assert.equal(wordLines(checklist.correct).length,5);
 assert.equal(wordLines(checklist.incorrect).length,5);
 assert.deepEqual(wordLines(checklist.correct),ot32.preparedActivities.checkboxes.correct);
 assert.deepEqual(wordLines(checklist.incorrect),ot32.preparedActivities.checkboxes.incorrect);

 const mediumSearch=forType(first,'medium-word-search');
 assert.equal(parseSearchWords(mediumSearch.words).length,6);
 assert.equal(JSON.stringify(ot32),snapshot,'Preset generation must not edit teacher-approved files');
});

test('Prefer the fullest valid bank, but never reuse items to inflate a worksheet',()=>{
 const candidate=(id,claims)=>({moduleId:'match-words',contentId:id,claims});
 const full=candidate('all-six',['pair:a','pair:b','pair:c','pair:d','pair:e','pair:f']);
 const compact=candidate('only-three',['pair:a','pair:b','pair:c']);
 assert.equal(chooseUnusedLessonContent([compact,full],new Set(),{preferFullBank:true}).candidate.contentId,'all-six');
 const selected=chooseUnusedLessonContent([full,compact],new Set(['pair:f']),{preferFullBank:true});
 assert.equal(selected.candidate.contentId,'only-three',
  'A smaller nonrepeating activity beats a larger one that repeats an answer');
 assert.deepEqual(selected.reused,[]);
 const ties=chooseUnusedLessonContent([compact,candidate('also-three',['pair:x','pair:y','pair:z'])],
  new Set());
 assert.equal(ties.candidate.contentId,'only-three','Equal-size banks keep teacher order');
});

test('Both approved OT31 and OT32 remain buildable across the three named presets',async()=>{
 const ot31=JSON.parse(await readFile(
  new URL('../curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json',import.meta.url),
  'utf8'));
 for(const source of [ot31,ot32]){
  for(const preset of ['preset-1','preset-2','preset-3']){
   const built=buildWorksheetRecipe(source,preset,{purpose:'published',seed:1});
   assert.equal(built.openSlots.length,0,source.id+' '+preset);
   assert.ok(built.selections.length>0);
  }
 }
});
