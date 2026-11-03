import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {WORKSHEET_RECIPES,buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {getRegions} from '../src/booklet.ts';
import {validateModule,moduleForSize} from '../src/modules.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {getPrintableSheetRegions,createBookletPdf} from '../src/pdf.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';

const readJson=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));
const lesson=await readJson('tests/fixtures/ot-031-original-review.json');
const schema=await readJson('curriculum/schema/lesson-v1.schema.json');
const review={purpose:'editorial-review'};
const ids=['story-review','fun-and-games'];
const build=(id,options={})=>buildWorksheetRecipe(lesson,id,{...review,...options});
const clone=()=>structuredClone(lesson);

test('Both explicitly review-only recipes produce standalone, fully editable v1 drafts from the exact Red Sea lesson',()=>{
 assert.deepEqual(validateLesson(lesson,schema),[]);
 assert.deepEqual(WORKSHEET_RECIPES.map(r=>r.id),ids);
 const before=clone();
 for(const id of ids){
  const output=build(id);
  assert.equal(output.recipeId,id);
  assert.equal(output.lessonId,lesson.id);
  assert.equal(output.reviewOnly,true);
  assert.equal(output.requiresTeacherReview,true);
  assert.deepEqual(output.diagnostics,[]);
  assert.equal(output.draft.title,lesson.lessonDetails.title);
  assert.equal(output.draft.scripture,lesson.lessonDetails.scriptureDisplay);
  assert.equal(output.draft.bigIdea,lesson.lessonDetails.bigIdeas[0].text);
  assert.equal(output.draft.verseReference,lesson.lessonDetails.memoryVerse.reference);
  assert.equal(output.draft.verseText,lesson.lessonDetails.memoryVerse.text);
  assert.equal(output.draft.coverBorder,'none');
  assert.deepEqual(output.draft.activityBorders,{});
  assert.equal(output.selections.length,10,'all six modules fit into 10 activity regions');
  assert.equal(Object.keys(output.draft.modules).length,10);
  assert.equal(output.openSlots.length,1,'one extra medium workspace slot intentionally remains');
  assert.equal(output.openSlots[0].size,'medium');
  assert.equal(output.openSlots[0].page,2);
  assert.ok(!(output.openSlots[0].slot in output.draft.modules));
  assert.deepEqual(output.draft,migrateDraftValue(output.draft),
   'recipe output remains 100% compatible with existing browser saved-draft schema');
  assert.deepEqual(build(id),output,'same lesson and seed must build an identical draft');
 }
 assert.deepEqual(lesson,before,'all authored facts, questions and metadata must stay untouched');
});
test('Recipes choose all six validated activity types, compatible printed regions, without duplicate questions',()=>{
 const expected=new Set(['story-order','finish-story','sort-story','multiple-choice','true-false','true-false-maze']);
 const sourceIds=new Set([
  ...lesson.storyNotes.map(n=>n.id),...lesson.questions.map(q=>q.id),
  ...lesson.facts.map(f=>f.id),
 ]);
 for(const id of ids){
  const output=build(id);
  assert.deepEqual(new Set(output.selections.map(x=>x.moduleId)),expected);
  const pageSlots=new Map([1,2,3,4].flatMap(page=>
   getRegions(page,output.draft.layouts[page===1?2:page])
    .filter(r=>r.kind==='activity').map(r=>[page+':'+r.id,{page,region:r}])));
  const keys=new Set();
  for(const selection of output.selections){
   assert.ok(!keys.has(selection.slot),'no duplicate assignment');
   keys.add(selection.slot);
   const slot=pageSlots.get(selection.slot);
   assert.ok(slot);
   assert.equal(selection.page,slot.page);
   assert.equal(selection.size,slot.region.size);
   assert.ok(moduleForSize(slot.region.size).some(m=>m.id===selection.moduleId));
   const module=output.draft.modules[selection.slot];
   assert.equal(module.type,selection.moduleId);
   assert.deepEqual(validateModule(module),[]);
   assert.ok(selection.sourceIds.length);
   assert.ok(selection.sourceIds.every(ref=>sourceIds.has(ref)),selection.slot);
  }
  assert.equal(output.selections.filter(x=>x.moduleId==='multiple-choice').length,5);
  const questions=output.selections.filter(x=>x.moduleId==='multiple-choice').map(x=>x.contentId);
  assert.equal(new Set(questions).size,5,'distinct questions within booklet');
  assert.ok(output.selections.some(x=>x.teacherReviewRequired),
   'generated distractors and false facts must retain review metadata');
  const available=convertLessonActivities(lesson).candidates.map(c=>c.contentId);
  assert.ok(questions.every(x=>available.includes(x)));
 }
 assert.notDeepEqual(build(ids[0]).draft.layouts,build(ids[1]).draft.layouts,
  'the recipe alternatives should use distinct page-2 arrangements');
 assert.notDeepEqual(build(ids[0]).selections.map(x=>x.contentId),
  build(ids[1]).selections.map(x=>x.contentId),
  'the two recipes should also choose different questions/positions');
});
test('The story and Fun & Games recipes vary questions deterministically with seed without changing source text',()=>{
 for(const id of ids){
  const a=build(id,{seed:1}),b=build(id,{seed:2});
  const q=out=>out.selections.filter(x=>x.moduleId==='multiple-choice').map(x=>x.contentId);
  assert.notDeepEqual(q(a),q(b),'seed rotates the multiple-choice pool');
  assert.deepEqual(build(id,{seed:2}),b);
  for(const out of [a,b]){
   assert.ok(out.selections.filter(x=>x.moduleId==='story-order').length===1);
   const entry=out.selections.find(x=>x.moduleId==='finish-story');
   assert.equal(out.draft.modules[entry.slot].story,lesson.preparedActivities.finishStory.markedParagraph);
  }
 }
});
test('Review gate is explicit and there is no implicit public preset or localStorage mutation',async()=>{
 assert.throws(()=>buildWorksheetRecipe(lesson,'story-review'),/editorial review only/);
 assert.throws(()=>buildWorksheetRecipe(lesson,'story-review',{purpose:'public'}),/editorial review only/);
 assert.throws(()=>build('not-a-recipe'),/Unknown worksheet recipe/);
 for(const seed of [-1,1.4,1_000_001,Number.MAX_SAFE_INTEGER]){
  assert.throws(()=>build('story-review',{seed}),/Recipe seed/);
 }
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 const vite=await readFile(new URL('../vite.config.ts',import.meta.url),'utf8');
 assert.doesNotMatch(app,/curriculum\/review|ot-031-god-parts-the-red-sea/u);
 assert.doesNotMatch(vite,/curriculum\/review/u);
 assert.ok(!('localStorage' in EMPTY_DRAFT));
});
test('A missing required prepared activity or malformed content aborts the recipe instead of creating a partial misleading worksheet',()=>{
 const absent=clone();delete absent.preparedActivities.finishStory;
 assert.throws(()=>buildWorksheetRecipe(absent,'story-review',review),/no valid finish-story/);
 const missingQuestions=clone();absent.preparedActivities.multipleChoice.length=2;
 const msg=/Not enough valid multiple-choice questions/;
 assert.throws(()=>buildWorksheetRecipe(absent,'story-review',review),msg);
 missingQuestions.preparedActivities.sortStory[0].isTrue=
  !missingQuestions.preparedActivities.sortStory[0].isTrue;
 assert.throws(()=>buildWorksheetRecipe(missingQuestions,'fun-and-games',review),/no valid sort-story/);
 const invalidVersion=clone();invalidVersion.schemaVersion=2;
 assert.throws(()=>buildWorksheetRecipe(invalidVersion,'story-review',review),/Unsupported curriculum schema/);
 const missingTitle=clone();missingTitle.lessonDetails.title='';
 assert.throws(()=>buildWorksheetRecipe(missingTitle,'story-review',review),/title and Scripture/);
});
test('Recipe allocations produce real complete two-sheet vector PDFs, including cover content and all six kinds of activity',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 for(const id of ids){
  const {draft}=build(id);
  const regions=getPrintableSheetRegions(draft).flat();
  for(const [key,module] of Object.entries(draft.modules)){
   const region=regions.find(x=>key===x.bookletPage+':'+x.id);
   assert.ok(region,key);
   assert.ok(moduleForSize(region.size).some(x=>x.id===module.type));
   assert.deepEqual(validateModule(module),[]);
  }
  const before=structuredClone(draft);
  const bytes=await createBookletPdf(draft,fonts);
  assert.deepEqual(draft,before,'PDF must not mutate the prepared editable draft');
  assert.ok(bytes.length>20000);
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2,'four booklet pages on two printable sheets');
  for(const page of pdf.getPages()){
   assert.equal(page.getSize().width,792);
   assert.equal(page.getSize().height,612);
  }
 }
});
