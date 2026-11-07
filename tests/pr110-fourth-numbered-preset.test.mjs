import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getRegions} from '../src/booklet.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from '../src/worksheetRecipes.ts';
import {contentClaimsForModule} from '../src/lessonContentPool.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 createLessonWorksheet,createSamePresetForNewStory,
 createSameStoryPresetWithContent,isWorksheetStartId,
} from '../src/lessonQuickSwitch.ts';
import {validateLessonSchema} from '../src/lessonSchemaValidation.ts';

const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const schema=await read('curriculum/schema/lesson-v1.schema.json');
const ot31=await read('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const ot32=await read('curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json');
const [redSea,wilderness]=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+ot31.id+'.lesson.json']:ot31,
 ['../curriculum/approved/'+ot32.id+'.lesson.json']:ot32,
});
assert.ok(redSea&&wilderness);
const expected=[
 ['1:cover-activity','crossword','large'],
 ['2:top-large','word-search','large'],
 ['2:bottom-medium','upside-down-verse','medium'],
 ['3:top-left-small','multiple-choice','small'],
 ['3:top-right-small','draw-picture','small'],
 ['3:middle-medium','pixel-picture','medium'],
 ['3:bottom-medium','big-idea-cryptogram','medium'],
 ['4:top-medium','match-words','medium'],
 ['4:middle-left-small','true-false','small'],
 ['4:middle-right-small','odd-words','small'],
 ['4:bottom-medium','unscramble-verse','medium'],
];

test('Preset 4 is exactly the requested four-page arrangement with eleven compatible regions',()=>{
 const recipe=WORKSHEET_RECIPES.find(p=>p.id==='preset-4');
 assert.ok(recipe);
 assert.equal(WORKSHEET_RECIPES.length,4);
 assert.deepEqual(recipe.layouts,{
  2:'large-medium',
  3:'small-small-medium-medium',
  4:'medium-small-small-medium',
 });
 assert.deepEqual(recipe.steps.map(step=>[
  step.page+':'+step.regionId,step.moduleId,
  getRegions(step.page,recipe.layouts[step.page===1?2:step.page])
   .find(region=>region.id===step.regionId)?.size,
 ]),expected);
 for(const [slot,id,size] of expected){
  assert.ok(moduleForSize(size).some(module=>module.id===id),slot+' cannot print '+id);
 }
 assert.deepEqual(expected.map(x=>x[0]),[
  '1:cover-activity','2:top-large','2:bottom-medium',
  '3:top-left-small','3:top-right-small','3:middle-medium','3:bottom-medium',
  '4:top-medium','4:middle-left-small','4:middle-right-small','4:bottom-medium',
 ]);
});

test('Preset 4 uses valid, distinct approved content and survives exact saved draft migration',()=>{
 for(const entry of [redSea,wilderness]){
  const original=JSON.stringify(entry.lesson);
  const output=buildWorksheetRecipe(entry.lesson,'preset-4',{purpose:'published'});
  assert.equal(output.openSlots.length,0);
  assert.equal(output.selections.length,11);
  assert.equal(output.draft.worksheetPresetId,'preset-4');
  assert.equal(Object.keys(output.draft.modules).length,11);
  assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(output.draft))),output.draft);
  const claims=new Set();
  for(const [slot,id] of expected){
   const module=output.draft.modules[slot];
   assert.equal(module.type,id,slot);
   assert.deepEqual(validateModule(module),[],slot);
   for(const item of contentClaimsForModule(module,entry.lesson)){
    assert.equal(claims.has(item),false,'Repeated content '+item+' at '+slot);
    claims.add(item);
   }
  }
  const wordSearch=output.draft.modules['2:top-large'];
  const oddWords=output.draft.modules['4:middle-right-small'];
  const wordClaims=new Set(contentClaimsForModule(wordSearch,entry.lesson));
  assert.equal(contentClaimsForModule(oddWords,entry.lesson)
   .some(item=>wordClaims.has(item)),false);
  assert.equal(JSON.stringify(entry.lesson),original,'Never mutate approved lesson data');
 }
});

test('New preset is selectable, switchable and persists through story changes',()=>{
 assert.equal(isWorksheetStartId('preset-4'),true);
 const draft=createLessonWorksheet(redSea,'preset-4');
 assert.equal(draft.worksheetPresetId,'preset-4');
 assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(draft))),draft);
 const other=createSamePresetForNewStory(draft,wilderness);
 assert.equal(other.worksheetPresetId,'preset-4');
 assert.equal(other.curriculumLessonId,wilderness.lesson.id);
 const fromPreset3=createLessonWorksheet(redSea,'preset-3');
 const changed=createSameStoryPresetWithContent(fromPreset3,redSea,'preset-4');
 assert.equal(changed.worksheetPresetId,'preset-4');
 assert.deepEqual(Object.keys(changed.modules).sort(),Object.keys(draft.modules).sort());
 assert.equal(changed.title,draft.title);
});

test('The strict schema preserves 3-preset historical approval and accepts new 4-preset evidence',()=>{
 const approval=structuredClone(ot31);
 const fixture={
  source:'Review Studio measured preflight',
  checkedAt:'2026-11-06T05:00:00.000Z',
  convertedCount:27,totalCount:27,issueCount:0,
  numberedPresetsChecked:3,scope:'Historical preflight audit',
  matchingWorksheetSource:'preparedActivities.matchWords',
  matchingCandidatePool:'Historical matching candidates remain untouched',
 };
 for(const count of [3,4]){
  approval.publication.reviewStudioVerification={...fixture,numberedPresetsChecked:count};
  assert.deepEqual(validateLessonSchema(approval,schema),[],
   'Both historical 3-preset and new 4-preset evidence must remain valid');
 }
 approval.publication.reviewStudioVerification={...fixture,numberedPresetsChecked:5};
 assert.ok(validateLessonSchema(approval,schema).length>0);
});

test('Preset 4 is covered by actual Review Studio and publication validation, not just the UI',async()=>{
 const [preflight,library,exportAudit,manual]=await Promise.all([
  readFile(new URL('../src/review/preflight.ts',import.meta.url),'utf8'),
  readFile(new URL('../scripts/curriculum-library.mjs',import.meta.url),'utf8'),
  readFile(new URL('../src/review/approvedExportMetadata.ts',import.meta.url),'utf8'),
  readFile(new URL('../docs/CURRICULUM-CONVERSION-GUIDE.md',import.meta.url),'utf8'),
 ]);
 assert.match(preflight,/for\(const recipe of WORKSHEET_RECIPES\)/u);
 assert.match(library,/for\(const recipe of WORKSHEET_RECIPES\)/u);
 assert.match(exportAudit,/const PRESETS_CHECKED=4/u);
 assert.match(exportAudit,/four numbered preset content checks/u);
 assert.match(manual,/Preset 4 — complete prescribed booklet layout/u);
 assert.match(manual,/Word Search.*Upside Down Verse/u);
 const pkg=await read('package.json');
 assert.ok(pkg.version.localeCompare('0.16.63',undefined,{numeric:true})>=0,
   'Feature must remain available in current or newer release');
});
