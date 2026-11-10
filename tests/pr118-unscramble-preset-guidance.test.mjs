import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 buildWorksheetRecipe,RecipeContentConflictError,
} from '../src/worksheetRecipes.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {
 chooseUnscramblePair,unscrambleRepairSuggestions,unscrambleChoices,
} from '../src/review/wordPuzzleEditors.ts';
import {validateModule} from '../src/modules.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const approved=JSON.parse(await read('curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json'));
const jordanTerms=['JOSHUA','JORDAN','ARK','PRIESTS','STONES',
 'GILGAL','CANAAN','RIVER','TWELVE','MEMORIAL'];
function jordanLesson(){
 const lesson=structuredClone(approved);
 lesson.id='ot-040-conflict-regression-only';
 // Recreate the relevant content-only fields from OT40 without adding
 // unapproved lesson data to the repository. A six-word Medium Word Search
 // consumes six of ten valid scrambleable lesson vocabulary words.
 lesson.vocabulary??={};
 lesson.vocabulary.entries=jordanTerms.map((term,i)=>({
  id:'voc-'+String(i+1).padStart(2,'0'),term,
  scope:'story',origin:'adapted',teacherReviewRequired:true,
 }));
 lesson.preparedActivities.mediumWordSearch.words=[
  'JOSHUA','JORDAN','ARK','STONES','GILGAL','PRIESTS',
 ];
 lesson.preparedActivities.unscrambleWords.answers=['PRIESTS','JOSHUA'];
 return lesson;
}
function conflict(lesson){
 try{buildWorksheetRecipe(lesson,'preset-1',{purpose:'editorial-review',seed:1});}
 catch(error){return error;}
 return null;
}

test('OT40 pattern: source of repeated JORDAN is identified even though not in saved answers',()=>{
 const lesson=jordanLesson(),error=conflict(lesson);
 assert.ok(error instanceof RecipeContentConflictError,String(error));
 assert.equal(error.recipeId,'preset-1');
 assert.equal(error.moduleId,'unscramble-words');
 assert.equal(error.slot,'4:bottom-left-small');
 assert.ok(error.conflicts.includes('vocab:jordan'));
 assert.match(error.message,/JORDAN/u);
 assert.match(error.message,/Medium Word Search on page 2/u);
 assert.match(error.message,/alternative word pairs/u);
 assert.match(error.message,/may not be one of your two saved answers/u);
 assert.ok(error.sources.some(source=>source.claim==='vocab:jordan'&&
  source.moduleId==='medium-word-search'&&source.slot==='2:bottom-medium'));
 assert.deepEqual(new Set(error.usedVocabulary),new Set([
  'vocab:joshua','vocab:jordan','vocab:ark','vocab:stones','vocab:gilgal','vocab:priests',
 ]));
 assert.deepEqual(lesson.preparedActivities.unscrambleWords.answers,['PRIESTS','JOSHUA']);
});

test('Preset preflight carries an actionable activity link and complete blocked-word context',()=>{
 const lesson=jordanLesson();
 const preflight=buildReviewPreflight(lesson);
 const issue=preflight.issues.find(issue=>issue.recipeId==='preset-1'&&
  issue.moduleId==='unscramble-words');
 assert.ok(issue,'Preset 1 should link this recipe conflict directly to Unscramble editor');
 assert.equal(issue.taskId,'unscramble-words');
 assert.equal(issue.fieldId,'review-field-unscramble-words');
 assert.ok(issue.usedVocabulary.includes('vocab:jordan'));
 assert.ok(issue.conflictSources.some(source=>source.moduleId==='medium-word-search'));
 assert.match(issue.message,/JORDAN/u);
});

test('Suggested replacements are valid, unused story vocabulary and actually clear the recipe error',()=>{
 const lesson=jordanLesson(),original=JSON.stringify(lesson);
 const error=conflict(lesson);
 assert.ok(error instanceof RecipeContentConflictError);
 const repair=unscrambleRepairSuggestions(lesson,error.usedVocabulary);
 assert.deepEqual(repair.usedWords.sort(),
  ['JOSHUA','JORDAN','ARK','STONES','GILGAL','PRIESTS'].sort());
 assert.deepEqual(repair.candidates.map(option=>option.term),
  ['CANAAN','RIVER','TWELVE','MEMORIAL']);
 assert.deepEqual(repair.pairs[0],['CANAAN','RIVER']);
 assert.ok(repair.pairs.every(([a,b])=>a!==b&&
  !repair.usedWords.includes(a)&&!repair.usedWords.includes(b)));
 assert.equal(repair.candidates[0].vocabularyId,'voc-07');
 assert.deepEqual(repair.candidates[0].sourceIds,[],
  'Do not invent Story Note citations for content-first vocabulary');
 assert.deepEqual(repair.candidates[0].notes,[]);
 const updated=chooseUnscramblePair(lesson,...repair.pairs[0]);
 assert.deepEqual(updated.preparedActivities.unscrambleWords.answers,['CANAAN','RIVER']);
 assert.deepEqual(validateModule({type:'unscramble-words',first:'CANAAN',second:'RIVER',seed:1}),[]);
 assert.equal(updated.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.equal(updated.preparedActivities.unscrambleWords.origin,'suggested');
 assert.equal(updated.preparedActivities.unscrambleWords.sourceIds.length,0);
 assert.equal(conflict(updated),null,'The actual Preset 1 builder must now succeed');
 assert.equal(buildWorksheetRecipe(updated,'preset-1',
  {purpose:'editorial-review',seed:1}).openSlots.length,0);
 assert.equal(JSON.stringify(lesson),original,'Suggested edits must never mutate the lesson');
 assert.deepEqual(updated.vocabulary,lesson.vocabulary);
 assert.deepEqual(updated.preparedActivities.mediumWordSearch,
  lesson.preparedActivities.mediumWordSearch);
});

test('Genuine source IDs and original Story Notes are surfaced and preserved when available',()=>{
 const lesson=jordanLesson();
 lesson.vocabulary.entries[6].sourceIds=['story-note-7'];
 lesson.storyNotes=[{id:'story-note-7',order:7,originalText:'The people entered Canaan.',
  source:{page:3}}];
 const suggestions=unscrambleRepairSuggestions(lesson,conflict(lesson).usedVocabulary);
 const canaan=suggestions.candidates.find(choice=>choice.term==='CANAAN');
 assert.deepEqual(canaan.sourceIds,['story-note-7']);
 assert.deepEqual(canaan.notes,[{
  id:'story-note-7',page:'3',text:'The people entered Canaan.',
 }]);
 const before=JSON.stringify(lesson.storyNotes);
 const updated=chooseUnscramblePair(lesson,'CANAAN','RIVER');
 assert.deepEqual(updated.preparedActivities.unscrambleWords.sourceIds,['story-note-7']);
 assert.equal(JSON.stringify(updated.storyNotes),before);
 assert.deepEqual(updated.vocabulary,lesson.vocabulary);
 assert.throws(()=>chooseUnscramblePair(lesson,'CANAAN','CANAAN'),/two different/u);
 assert.throws(()=>chooseUnscramblePair(lesson,'NOT IN LESSON','RIVER'),/lesson vocabulary/u);
});

test('No false promise of an available pair when all valid vocabulary is blocked',()=>{
 const lesson=jordanLesson(),all=unscrambleChoices(lesson).map(x=>'vocab:'+x.term.toLowerCase());
 const suggestions=unscrambleRepairSuggestions(lesson,all);
 assert.deepEqual(suggestions.candidates,[]);
 assert.deepEqual(suggestions.pairs,[]);
});

test('UI displays conflicts, honest source context and one-click pairs; review must be repeated',async()=>{
 const [editor,app,css]=await Promise.all([
  read('src/review/UnscrambleReviewEditor.tsx'),
  read('src/review/ReviewApp.tsx'),
  read('src/review/review.css'),
 ]);
 assert.match(editor,/Why the preset cannot use these words/u);
 assert.match(editor,/Vocabulary already used earlier in this preset/u);
 assert.match(editor,/Try unused words from this lesson/u);
 assert.match(editor,/no Story Note link supplied in this file/u);
 assert.match(editor,/option.sourceIds/u);
 assert.match(editor,/chooseUnscramblePair\(lesson,first,second\)/u);
 assert.match(editor,/rerun preflight/u);
 assert.match(app,/setLastUnscrambleConflict/u);
 assert.match(app,/issue.moduleId==='unscramble-words'/u);
 assert.match(app,/onChange=\{applyStoryFactReview\}/u);
 assert.match(app,/function applyVisualReview\(next:Lesson\)\{\s*setLesson\(next\);setPreflight\(null\);\s*setReviewed/u);
 assert.match(css,/\.review-unscramble-repair/u);
});
