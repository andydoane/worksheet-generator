import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {
 convertLessonActivities,findLessonCandidate,
 CORE_LESSON_MODULE_IDS,WORD_VISUAL_LESSON_MODULE_IDS,
 VERSE_SPECIALTY_LESSON_MODULE_IDS,
} from '../src/lessonActivityConverter.ts';
import {validateModule,moduleForSize} from '../src/modules.ts';
import {verseInitials} from '../src/smallModules.ts';
import {parseVerse,verseBank,verseScrambles} from '../src/storyVerseModules.ts';
import {generateCryptogram,checkCryptogram} from '../src/cryptograms.ts';
import {
 generateCrossword,checkCrossword,parseCrossword,
 connectPositions,spiralWritingPoints,
} from '../src/specialtyModules.ts';
import {getRegions,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {
 VERSE_SPECIALTY_REVIEW_PLANS,makeVerseSpecialtyReviewDraft,
} from '../scripts/pr17f-review-fixtures.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await readJson('tests/fixtures/ot-031-original-review.json');
const schema=await readJson('curriculum/schema/lesson-v1.schema.json');
const conversion=convertLessonActivities(lesson,{seed:1});
const chosen=(id,converted=conversion)=>findLessonCandidate(converted,id,id);
const copy=()=>structuredClone(lesson);
const memory=lesson.lessonDetails.memoryVerse;
const idea=lesson.lessonDetails.bigIdeas[0];

const sizes={
 'first-letters':'small',
 'finish-verse':'medium',
 'unscramble-verse':'medium',
 'circle-mistakes':'medium',
 'big-idea-cryptogram':'medium',
 'upside-down-verse':'medium',
 'connect-big-idea':'medium',
 'verse-cryptogram':'large',
 'crossword':'large',
 'spiral-verse':'large',
 'connect-verse':'large',
};
test('All 27 unique module kinds now adapt source-exact Red Sea prepared data with no diagnostics',()=>{
 const source=copy();
 assert.deepEqual(validateLesson(lesson,schema),[]);
 assert.equal(lesson.publication.approved,false);
 assert.equal(conversion.publicApproved,false);
 assert.equal(VERSE_SPECIALTY_LESSON_MODULE_IDS.length,11);
 const ids=[...CORE_LESSON_MODULE_IDS,...WORD_VISUAL_LESSON_MODULE_IDS,
  ...VERSE_SPECIALTY_LESSON_MODULE_IDS];
 assert.equal(ids.length,27);
 assert.equal(new Set(ids).size,27);
 assert.equal(conversion.candidates.length,34,'27 kinds plus seven extra multiple-choice alternatives');
 assert.deepEqual(new Set(conversion.candidates.map(item=>item.moduleId)),new Set(ids));
 assert.deepEqual(conversion.diagnostics,[]);
 assert.deepEqual(copy(),source,'conversion must leave source JSON completely untouched');
 for(const id of VERSE_SPECIALTY_LESSON_MODULE_IDS){
  const item=chosen(id);
  assert.ok(item,id);
  assert.equal(item.module.type,id);
  assert.deepEqual(validateModule(item.module),[],id);
  assert.ok(moduleForSize(sizes[id]).some(m=>m.id===id),id+' size mismatch');
  assert.ok(item.sourceIds.length||(item.sourceLocations?.length??0)>0,
   id+' must have source Story Note references or an original ODT location');
 }
 assert.deepEqual(convertLessonActivities(lesson,{seed:1}),conversion,'deterministic conversion');
});
test('First Letters and all unmarked verse activities preserve the exact source verse/reference and original page-7 location',()=>{
 const ids=['first-letters','upside-down-verse','verse-cryptogram','spiral-verse','connect-verse'];
 for(const id of ids){
  const activity=chosen(id);
  assert.equal(activity.module.verse,memory.text,id);
  if('reference' in activity.module)assert.equal(activity.module.reference,memory.reference);
  assert.equal(activity.origin,'source',id);
  assert.equal(activity.teacherReviewRequired,false,id);
  assert.deepEqual(activity.sourceLocations,[memory.source],id);
 }
 assert.equal(verseInitials(chosen('first-letters').module.verse).length,22);
 const spiral=chosen('spiral-verse').module;
 assert.equal(spiralWritingPoints(spiral.verse,80).length,80);
 const connection=chosen('connect-verse').module;
 assert.equal(connectPositions(connection).length,22);
});
test('Both bracketed verse adapters retain exact Scripture and have real engine-derived solution lists',()=>{
 for(const [id,key] of [
  ['finish-verse','finishVerse'],['unscramble-verse','unscrambleVerse'],
 ]){
  const original=lesson.preparedActivities[key];
  const result=chosen(id);
  assert.equal(result.module.reference,memory.reference);
  assert.equal(result.module.verse,original.markedVerse);
  assert.equal(original.sourceVerse,memory.text);
  assert.equal(result.origin,'adapted');
  assert.deepEqual(result.sourceLocations,[memory.source]);
  const parsed=parseVerse(result.module.verse);
  assert.equal(parsed.malformed,false);
  assert.equal(parsed.answers.length,5);
  assert.equal(result.module.verse.replace(/\[([^\[\]]*)\]/gu,'$1'),memory.text);
  const rendered=id==='finish-verse'?verseBank(result.module):verseScrambles(result.module);
  assert.equal(rendered.length,parsed.answers.length);
  assert.ok(rendered.every(x=>x.length>0));
 }
});
test('Circle the Mistakes retains six false phrases plus a teacher correction key sourced to specific Story Notes',()=>{
 const entry=lesson.preparedActivities.circleMistakes;
 const converted=chosen('circle-mistakes');
 assert.equal(converted.module.text,entry.paragraph);
 assert.equal(converted.module.count,entry.mistakeCount);
 assert.equal(converted.teacherReviewRequired,true);
 assert.equal(converted.origin,'suggested');
 assert.equal(converted.mistakeCorrections.length,6);
 for(const [index,correction] of converted.mistakeCorrections.entries()){
  assert.equal(correction.incorrect,entry.mistakes[index].incorrect);
  assert.equal(correction.correction,entry.mistakes[index].correction);
  assert.ok(converted.module.text.includes(correction.incorrect));
  assert.deepEqual(correction.sourceIds,entry.mistakes[index].sourceIds);
  assert.ok(correction.sourceIds.every(id=>lesson.storyNotes.some(note=>note.id===id)));
 }
 const original=copy();
 converted.mistakeCorrections[0].correction='Edited after conversion';
 assert.deepEqual(lesson,original,'correction metadata is an independent copy');
});
test('Both cryptograms and both connect puzzles use unchanged actual generators and preserve source Important Idea',()=>{
 for(const id of ['big-idea-cryptogram','verse-cryptogram']){
  const activity=chosen(id);
  const puzzle=generateCryptogram(activity.module);
  assert.equal(checkCryptogram(puzzle),true);
  assert.equal(new Set(Object.values(puzzle.mapping)).size,26);
  assert.deepEqual(generateCryptogram(activity.module),puzzle);
 }
 for(const id of ['big-idea-cryptogram','connect-big-idea']){
  const activity=chosen(id);
  assert.equal(activity.module.idea,idea.text);
  assert.equal(activity.origin,'source');
  assert.deepEqual(activity.sourceLocations,[idea.source]);
 }
 const connected=chosen('connect-big-idea').module;
 const positions=connectPositions(connected);
 assert.equal(positions.length,7);
 assert.deepEqual(connectPositions(connected),positions);
});
test('Crossword actually constructs a connected, checked grid using all ten original source clues and answers',()=>{
 const activity=chosen('crossword');
 const entries=lesson.preparedActivities.crossword;
 assert.equal(activity.module.type,'crossword');
 assert.equal(activity.module.entries,entries.map(x=>x.answer+', '+x.clue).join('\n'));
 assert.deepEqual(parseCrossword(activity.module.entries),entries.map(x=>({
  answer:x.answer,clue:x.clue,
 })));
 const crossword=generateCrossword(activity.module);
 assert.equal(checkCrossword(crossword),true);
 assert.equal(crossword.placements.length,10);
 assert.deepEqual(new Set(crossword.placements.map(x=>x.answer)),
  new Set(entries.map(x=>x.answer)));
 assert.ok(crossword.across.length>0&&crossword.down.length>0);
 assert.ok(crossword.width<=21&&crossword.height<=21);
 assert.equal(activity.sourceIds.length>0,true);
 assert.deepEqual(generateCrossword(activity.module),crossword);
});
test('Input mismatches reject candidates with explicit diagnostics rather than silently rewriting teacher material',()=>{
 const changed=copy();
 changed.preparedActivities.firstLetters.verse='The verse is different';
 changed.preparedActivities.finishVerse.markedVerse+=' [OTHER]';
 changed.preparedActivities.unscrambleVerse.markedVerse='[Lord] mismatched';
 changed.preparedActivities.circleMistakes.mistakeCount=5;
 changed.preparedActivities.bigIdeaCryptogram.phrase='A different important idea';
 changed.preparedActivities.upsideDownVerse.reference='Exodus 15:12';
 changed.preparedActivities.connectBigIdea.phrase='A different phrase';
 changed.preparedActivities.verseCryptogram.verse='Different verse';
 changed.preparedActivities.crossword[0].answer='MOSES,EXTRA';
 changed.preparedActivities.spiralVerse.reference='Exodus 15:12';
 changed.preparedActivities.connectVerse.verse='Different verse';
 const result=convertLessonActivities(changed);
 for(const id of VERSE_SPECIALTY_LESSON_MODULE_IDS){
  assert.ok(result.diagnostics.some(d=>d.moduleId===id),id+' should explain its error');
  assert.ok(!result.candidates.some(c=>c.moduleId===id),id+' must not be printed');
 }
 assert.ok(result.candidates.some(c=>c.moduleId==='story-order'),'unaffected content still converts');
 assert.deepEqual(lesson.publication.approved,false);
 const missing=copy();
 delete missing.preparedActivities.crossword;
 assert.ok(convertLessonActivities(missing).diagnostics.some(x=>
  x.moduleId==='crossword'&&x.message.includes('No prepared')));
 const altered=copy();
 altered.preparedActivities.circleMistakes.mistakes[0].incorrect='not present anywhere';
 assert.ok(convertLessonActivities(altered).diagnostics.some(x=>
  x.moduleId==='circle-mistakes'));
});
test('The existing editorial recipes still contain ten slots and one intentional empty Medium region',async()=>{
 const {buildWorksheetRecipe}=await import('../src/worksheetRecipes.ts');
 for(const recipe of ['story-review','fun-and-games']){
  const result=buildWorksheetRecipe(lesson,recipe,{purpose:'editorial-review',seed:1});
  assert.equal(result.selections.length,10);
  assert.equal(result.openSlots.length,1);
  assert.equal(result.openSlots[0].size,'medium');
  assert.equal(result.requiresTeacherReview,true);
 }
 const code=await readFile(new URL('../src/publishedLessonCatalog.ts',import.meta.url),'utf8');
 assert.match(code,/curriculum\/approved\/\*\.lesson\.json/u);
 assert.doesNotMatch(code,/curriculum\/review\/ot-031/u);
});
test('Two fully filled vector PDF review booklets exercise all eleven new modules, with existing editor schema and no source mutations',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const all=new Set();
 const original=copy();
 for(const plan of VERSE_SPECIALTY_REVIEW_PLANS){
  const draft=makeVerseSpecialtyReviewDraft(lesson,plan);
  for(const module of Object.values(draft.modules))all.add(module.type);
  assert.deepEqual(migrateDraftValue(draft),draft);
  for(const page of [1,2,3,4]){
   for(const region of getRegions(page,page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page])){
    if(region.kind==='activity'){
     const activity=draft.modules[page+':'+region.id];
     assert.ok(activity,plan.id+' '+page+':'+region.id);
     assert.ok(moduleForSize(region.size).some(m=>m.id===activity.type));
     assert.deepEqual(validateModule(activity),[]);
    }
   }
  }
  const saved=structuredClone(draft);
  const bytes=await createBookletPdf(draft,fonts);
  assert.deepEqual(saved,draft);
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.ok(bytes.length>20000);
  for(const page of pdf.getPages())assert.deepEqual(page.getSize(),{width:792,height:612});
 }
 for(const id of VERSE_SPECIALTY_LESSON_MODULE_IDS)
  assert.ok(all.has(id),id+' was not printed in the sample booklets');
 assert.deepEqual(copy(),original,'printing does not mutate the curriculum source');
});
