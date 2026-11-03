import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {
 convertLessonActivities,findLessonCandidate,
 WORD_VISUAL_LESSON_MODULE_IDS,CORE_LESSON_MODULE_IDS,
 VERSE_SPECIALTY_LESSON_MODULE_IDS,
} from '../src/lessonActivityConverter.ts';
import {validateModule,matchRows,parsePairs,moduleForSize} from '../src/modules.ts';
import {shuffledWordList,scramblePhrase} from '../src/smallModules.ts';
import {generateWordSearch,checkWordSearch} from '../src/puzzleEngines.ts';
import {generatePixelPicture} from '../src/pixelPicture.ts';
import {boxGrid} from '../src/storyVerseModules.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {getRegions,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';

const getJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await getJson('tests/fixtures/ot-031-original-review.json');
const schema=await getJson('curriculum/schema/lesson-v1.schema.json');
const convert=(source=lesson,seed=1)=>convertLessonActivities(source,{seed});
const converted=convert();
const visual=(id,source=converted)=>findLessonCandidate(source,id,id);

const expectedSizes={
 'draw-picture':'small','odd-words':'small','unscramble-words':'small',
 'checkboxes':'small','who-am-i':'small',
 'match-words':'medium','medium-word-search':'medium','pixel-picture':'medium',
 'draw-story':'large','word-search':'large',
};
test('Exact Red Sea review file produces ten validated word/visual candidates plus the six original kinds',()=>{
 const before=structuredClone(lesson);
 assert.deepEqual(validateLesson(lesson,schema),[]);
 assert.equal(lesson.publication.approved,false);
 assert.equal(converted.publicApproved,false);
 assert.deepEqual(converted.diagnostics,[]);
 assert.equal(WORD_VISUAL_LESSON_MODULE_IDS.length,10);
 assert.equal(CORE_LESSON_MODULE_IDS.length,6);
 assert.equal(converted.candidates.length,34,'8 questions plus 26 individually prepared module kinds');
 assert.deepEqual(new Set(converted.candidates.map(c=>c.moduleId)),
  new Set([...CORE_LESSON_MODULE_IDS,...WORD_VISUAL_LESSON_MODULE_IDS,
   ...VERSE_SPECIALTY_LESSON_MODULE_IDS]));
 for(const [id,size] of Object.entries(expectedSizes)){
  const candidate=visual(id);
  assert.ok(candidate,'missing '+id);
  assert.equal(candidate.module.type,id);
  assert.deepEqual(validateModule(candidate.module),[],id);
  assert.ok(moduleForSize(size).some(x=>x.id===id),id+' should use a '+size+' region');
  assert.ok(candidate.sourceIds.length,id+' must preserve a source trail');
  assert.ok(candidate.sourceIds.every(sourceId=>[
   ...lesson.storyNotes.map(x=>x.id),
   ...lesson.questions.map(x=>x.id),...lesson.facts.map(x=>x.id),
  ].includes(sourceId)),'unknown source ID on '+id);
 }
 assert.deepEqual(lesson,before,'converting modules cannot mutate editorial source data');
 assert.deepEqual(convert(),converted,'same seed yields byte-for-byte identical candidates');
});
test('Word searches preserve vocabulary and actually solve both medium and large seeded grids',()=>{
 for(const id of ['medium-word-search','word-search']){
  const module=visual(id).module;
  assert.equal(module.type,id);
  const source=lesson.preparedActivities[
   id==='medium-word-search'?'mediumWordSearch':'wordSearch'];
  assert.deepEqual(module.words.split('\n'),source.words);
  const grid=generateWordSearch(module);
  assert.equal(checkWordSearch(grid),true);
  assert.equal(grid.placements.length,source.words.length);
  assert.deepEqual(generateWordSearch(module),grid,'puzzles must be deterministic');
 }
});
test('Match Words preserves the authored pairs; sorting and scramble logic remain engine-owned',()=>{
 const matched=visual('match-words').module;
 assert.equal(matched.type,'match-words');
 assert.deepEqual(parsePairs(matched.pairs),lesson.preparedActivities.matchWords.map(x=>({
  left:x.left,right:x.right,
 })));
 assert.equal(matchRows(matched).length,6);
 const odd=visual('odd-words').module,checkboxes=visual('checkboxes').module;
 assert.equal(odd.type,'odd-words');assert.equal(checkboxes.type,'checkboxes');
 assert.deepEqual(odd.correct.split('\n'),lesson.preparedActivities.oddWords.related);
 assert.deepEqual(odd.incorrect.split('\n'),lesson.preparedActivities.oddWords.unrelated);
 assert.deepEqual(checkboxes.correct.split('\n'),lesson.preparedActivities.checkboxes.correct);
 assert.deepEqual(checkboxes.incorrect.split('\n'),lesson.preparedActivities.checkboxes.incorrect);
 assert.equal(shuffledWordList(odd).filter(x=>x.belongs).length,5);
 assert.equal(shuffledWordList(checkboxes).filter(x=>!x.belongs).length,5);
 assert.equal(visual('odd-words').teacherReviewRequired,true);
 assert.equal(visual('checkboxes').teacherReviewRequired,true);
 assert.equal(visual('odd-words').origin,'suggested','added non-story distractors need teacher review');
 assert.equal(visual('checkboxes').origin,'suggested','added incorrect words need teacher review');
 const scramble=visual('unscramble-words').module;
 assert.equal(scramble.type,'unscramble-words');
 assert.deepEqual([scramble.first,scramble.second],lesson.preparedActivities.unscrambleWords.answers);
 assert.notEqual(scramblePhrase(scramble.first,scramble.seed),scramble.first);
 assert.notEqual(scramblePhrase(scramble.second,scramble.seed),scramble.second);
});
test('Drawing, character and Pixel Picture modules retain source phrasing, picture shape and actual puzzle solution',()=>{
 assert.equal(visual('draw-picture').module.prompt,lesson.preparedActivities.drawPicture.prompt);
 const who=visual('who-am-i').module;
 assert.equal(who.type,'who-am-i');
 assert.equal(who.clue,lesson.preparedActivities.whoAmI.clue);
 assert.equal(who.answer,lesson.preparedActivities.whoAmI.answer);
 const drawing=visual('draw-story').module;
 assert.equal(drawing.type,'draw-story');
 assert.deepEqual(drawing.prompts.split('\n'),
  lesson.preparedActivities.drawStory.map(x=>x.prompt));
 assert.equal(boxGrid(drawing).items.length,6);
 const picture=visual('pixel-picture').module;
 assert.equal(picture.type,'pixel-picture');
 assert.equal(picture.phrase,lesson.preparedActivities.pixelPicture.phrase);
 assert.equal(picture.shapeId,'star','default shape is an existing certified 13x13 mask');
 const generated=generatePixelPicture(picture);
 assert.equal(generated.grid.length,13);
 assert.deepEqual(generated.grid,generatePixelPicture(picture).grid);
 assert.equal(generated.missingLetters.length,1);
 assert.ok(generated.missingPositions.length>=2);
});
test('Invalid word and picture input yields diagnostics and no invalid candidate, never silently repaired',()=>{
 const wrong=structuredClone(lesson);
 wrong.preparedActivities.pixelPicture.shapeId='not-a-shape';
 wrong.preparedActivities.wordSearch.words=['MOSES','MOSES','PHARAOH','CLOUD'];
 wrong.preparedActivities.drawPicture.prompt='word '.repeat(28);
 wrong.preparedActivities.matchWords[0].left='Cloud, Fire';
 wrong.preparedActivities.unscrambleWords.answers=['MOSES'];
 wrong.preparedActivities.mediumWordSearch.words=['TOO-LONG-OR-INVALID'];
 const r=convert(wrong);
 for(const id of ['pixel-picture','word-search','draw-picture','match-words','unscramble-words','medium-word-search']){
  assert.ok(r.diagnostics.some(d=>d.moduleId===id),id);
  assert.equal(r.candidates.some(c=>c.moduleId===id),false,id);
 }
 assert.equal(r.candidates.some(x=>x.moduleId==='story-order'),true);
 const missing=structuredClone(lesson);
 delete missing.preparedActivities.checkboxes;
 const absence=convert(missing);
 assert.ok(absence.diagnostics.some(x=>x.moduleId==='checkboxes'&&x.message.includes('No prepared')));
 assert.equal(absence.candidates.some(x=>x.moduleId==='checkboxes'),false);
 const second=convert(lesson,8);
 assert.notDeepEqual(visual('pixel-picture',second).module,visual('pixel-picture').module);
 assert.deepEqual(convert(lesson,8),second);
});
test('Existing Remember the Story and Fun & Games recipes remain untouched, with intentionally open Medium slot',()=>{
 for(const id of ['story-review','fun-and-games']){
  const built=buildWorksheetRecipe(lesson,id,{purpose:'editorial-review',seed:1});
  assert.equal(built.reviewOnly,true);
  assert.equal(built.requiresTeacherReview,true);
  assert.equal(built.selections.length,10);
  assert.equal(built.openSlots.length,1);
  assert.equal(built.openSlots[0].size,'medium');
  assert.ok(built.selections.every(selection=>CORE_LESSON_MODULE_IDS.includes(selection.moduleId)));
 }
});
test('A four-page review-only showcase with all ten new module kinds generates a complete vector PDF',async()=>{
 const assignments=[
  [1,'cover-activity','word-search'],
  [2,'top-left-small','draw-picture'],
  [2,'top-right-small','odd-words'],
  [2,'middle-medium','match-words'],
  [2,'bottom-medium','pixel-picture'],
  [3,'top-left-small','unscramble-words'],
  [3,'top-right-small','checkboxes'],
  [3,'middle-medium','medium-word-search'],
  [3,'bottom-medium','true-false-maze'],
  [4,'top-large','draw-story'],
  [4,'bottom-left-small','who-am-i'],
  [4,'bottom-right-small','multiple-choice'],
 ];
 const draft={
  ...structuredClone(EMPTY_DRAFT),
  title:lesson.lessonDetails.title,
  scripture:lesson.lessonDetails.scriptureDisplay,
  layouts:{
   2:'small-small-medium-medium',
   3:'small-small-medium-medium',
   4:'large-small-small',
  },
 };
 for(const [page,regionId,id] of assignments){
  const candidate=id==='multiple-choice'
   ?findLessonCandidate(converted,id,'mc-01')
   :visual(id);
  assert.ok(candidate,id);
  const slot=page+':'+regionId;
  const region=getRegions(page,page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page])
   .find(x=>x.id===regionId);
  assert.ok(region);
  assert.ok(moduleForSize(region.size).some(x=>x.id===id),slot);
  draft.modules[slot]=structuredClone(candidate.module);
 }
 assert.equal(Object.keys(draft.modules).length,12);
 assert.deepEqual(migrateDraftValue(draft),draft);
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const before=structuredClone(draft);
 const bytes=await createBookletPdf(draft,fonts);
 assert.deepEqual(draft,before,'the print engine must not mutate an editable draft');
 assert.ok(bytes.length>20000);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
 for(const page of pdf.getPages()){
  assert.deepEqual(page.getSize(),{width:792,height:612});
 }
});
