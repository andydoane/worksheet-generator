import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 buildYourOwnLessonDraft,canRecreateApprovedActivity,chooseActivityForDraft,
 createManualModule,isActivityCustomized,originalApprovedActivity,sameActivityContent,
} from '../src/curriculumEditor.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {blankModule,validateModule} from '../src/modules.ts';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await json('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const entry=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
})[0];
if(!entry)throw Error('The approved Red Sea lesson is needed for switching regression tests.');
const catalog=[entry];

test('Published recipes save exact pristine baselines for every preset module',()=>{
 for(const recipeId of ['story-review','fun-and-games']){
  const built=buildWorksheetRecipe(entry.lesson,recipeId,{purpose:'published'});
  const draft=built.draft;
  assert.equal(draft.curriculumLessonId,lesson.id);
  assert.equal(Object.keys(draft.activityDefaults??{}).length,10);
  assert.notStrictEqual(draft.activityDefaults,draft.modules);
  for(const [slot,module] of Object.entries(draft.modules)){
   assert.deepEqual(draft.activityDefaults[slot],module);
   assert.notStrictEqual(draft.activityDefaults[slot],module,
    'the baseline cannot change when React edits the module');
   assert.equal(isActivityCustomized(draft,slot,catalog),false,slot);
   assert.equal(canRecreateApprovedActivity(draft,slot,catalog),true,slot);
  }
  const saved=migrateDraftValue(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(saved,draft);
  for(const slot of Object.keys(saved.modules))
   assert.equal(isActivityCustomized(saved,slot,catalog),false,'resume '+slot);
 }
});

test('Pristine Sort Story -> Story Order switches without losing other modules',()=>{
 const draft=buildWorksheetRecipe(entry.lesson,'fun-and-games',{purpose:'published'}).draft;
 const slot='1:cover-activity';
 assert.equal(draft.modules[slot].type,'sort-story');
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
 assert.equal(canRecreateApprovedActivity(draft,slot,catalog),true);
 const others=structuredClone(Object.fromEntries(Object.entries(draft.modules)
  .filter(([key])=>key!==slot)));
 const replacement=chooseActivityForDraft('story-order',draft,slot,catalog);
 assert.equal(replacement.source,'lesson');
 assert.deepEqual(validateModule(replacement.module),[]);
 draft.modules[slot]=replacement.module;
 draft.activityDefaults[slot]=structuredClone(replacement.module);
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
 assert.equal(canRecreateApprovedActivity(draft,slot,catalog),true);
 assert.deepEqual(Object.fromEntries(Object.entries(draft.modules).filter(([key])=>key!==slot)),others);
 const back=chooseActivityForDraft('sort-story',draft,slot,catalog);
 assert.equal(back.source,'lesson');
 assert.deepEqual(validateModule(back.module),[]);
});

test('A teacher edit or shuffle seed warns, but undoing the edit makes content pristine again',()=>{
 const draft=buildWorksheetRecipe(entry.lesson,'fun-and-games',{purpose:'published'}).draft;
 const slot='1:cover-activity';
 const original=structuredClone(draft.modules[slot]);
 draft.modules[slot]={...draft.modules[slot],statements:'Teacher changed the true/false statements.'};
 assert.equal(isActivityCustomized(draft,slot,catalog),true);
 assert.deepEqual(draft.activityDefaults[slot],original,'the approved snapshot is immutable');
 draft.modules[slot]=structuredClone(original);
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
 draft.modules[slot]={...draft.modules[slot],seed:original.seed+1};
 assert.equal(isActivityCustomized(draft,slot,catalog),true,
  'a regenerated puzzle is a meaningful customization');
 draft.modules[slot]=structuredClone(original);
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
});

test('Restore returns the exact original Multiple Choice question, not an arbitrary alternate',()=>{
 const draft=buildWorksheetRecipe(entry.lesson,'story-review',{purpose:'published'}).draft;
 const slot='2:top-left-small',other='2:top-right-small';
 const original=structuredClone(draft.modules[slot]);
 const otherModule=structuredClone(draft.modules[other]);
 assert.equal(original.type,'multiple-choice');
 draft.modules[slot]={...draft.modules[slot],question:'Teacher-edited wording?'};
 assert.equal(isActivityCustomized(draft,slot,catalog),true);
 const restored=originalApprovedActivity(draft,slot,catalog);
 assert.deepEqual(restored,original);
 assert.notStrictEqual(restored,draft.activityDefaults[slot]);
 draft.modules[slot]=restored;
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
 assert.deepEqual(draft.modules[other],otherModule);
});

test('BSB Finish/Unscramble Verse preserve approved brackets and can be restored after edits',()=>{
 const draft=buildYourOwnLessonDraft(entry);
 for(const type of ['finish-verse','unscramble-verse']){
  const slot='2:'+type;
  const selection=chooseActivityForDraft(type,draft,slot,catalog);
  assert.equal(selection.source,'lesson');
  assert.match(selection.module.verse,/\[among\]/u);
  draft.modules[slot]=selection.module;
  draft.activityDefaults={...draft.activityDefaults,[slot]:structuredClone(selection.module)};
  assert.equal(isActivityCustomized(draft,slot,catalog),false);
  const initial=structuredClone(draft.modules[slot]);
  draft.modules[slot]={...draft.modules[slot],verse:'Teacher-selected [different] words.'};
  assert.equal(isActivityCustomized(draft,slot,catalog),true);
  const restored=originalApprovedActivity(draft,slot,catalog);
  assert.deepEqual(restored,initial);
  assert.equal(restored.reference,'Exodus 15:11');
  assert.deepEqual(validateModule(restored),[]);
  draft.modules[slot]=restored;
  assert.equal(isActivityCustomized(draft,slot,catalog),false);
 }
});

test('Existing saved worksheets without snapshots still protect edits and recognize pristine approved content',()=>{
 const recipe=buildWorksheetRecipe(entry.lesson,'story-review',{purpose:'published'}).draft;
 const legacy=structuredClone(recipe);
 delete legacy.activityDefaults;
 assert.equal(isActivityCustomized(legacy,'1:cover-activity',catalog),false);
 assert.equal(isActivityCustomized(legacy,'2:top-left-small',catalog),false,
  'any approved MC alternative is pristine');
 const edit=structuredClone(legacy);
 edit.modules['1:cover-activity'].events='A new teacher-authored story order';
 assert.equal(isActivityCustomized(edit,'1:cover-activity',catalog),true);
 const loaded=migrateDraftValue(JSON.parse(JSON.stringify(edit)));
 assert.equal(isActivityCustomized(loaded,'1:cover-activity',catalog),true);
 assert.equal(isActivityCustomized(loaded,'2:top-left-small',catalog),false);
});

test('Scratch mode preserves plain defaults without warning and detects later teacher edits',()=>{
 const draft=structuredClone(EMPTY_DRAFT);
 const slot='2:bottom-medium';
 draft.modules[slot]=createManualModule('finish-verse',{
  ...draft,verseReference:'Psalm 23:1',verseText:'The LORD is my shepherd.'
 });
 draft.verseReference='Psalm 23:1';
 draft.verseText='The LORD is my shepherd.';
 assert.equal(isActivityCustomized(draft,slot,[]),false);
 draft.modules[slot]={...draft.modules[slot],verse:'The LORD is [my] shepherd.'};
 assert.equal(isActivityCustomized(draft,slot,[]),true);
 draft.modules[slot]=blankModule('finish-verse');
 assert.equal(isActivityCustomized(draft,slot,[]),false);
});

test('Withdrawn approval or altered source cannot silently discard even pristine activity',()=>{
 const draft=buildWorksheetRecipe(entry.lesson,'story-review',{purpose:'published'}).draft;
 const slot='1:cover-activity';
 assert.equal(isActivityCustomized(draft,slot,catalog),false);
 assert.equal(canRecreateApprovedActivity(draft,slot,[]),false);
 assert.equal(originalApprovedActivity(draft,slot,[]),undefined);
 const changed=structuredClone(lesson);
 changed.preparedActivities.storyOrder[0].text='A later, revised approved edition';
 const revised=[{...entry,lesson:changed}];
 assert.equal(canRecreateApprovedActivity(draft,slot,revised),false,
  'changed lesson content must be treated as irreplaceable even when not edited');
});

test('Malformed saved baselines cannot silently make another activity appear untouched',()=>{
 const draft=buildWorksheetRecipe(entry.lesson,'story-review',{purpose:'published'}).draft;
 const slot='1:cover-activity';
 const corrupted=JSON.parse(JSON.stringify(draft));
 corrupted.activityDefaults[slot]=blankModule('finish-verse');
 corrupted.activityDefaults['4:not-a-region']=blankModule('finish-verse');
 const loaded=migrateDraftValue(corrupted);
 assert.equal(loaded.activityDefaults?.[slot],undefined);
 assert.equal(loaded.activityDefaults?.['4:not-a-region'],undefined);
 assert.equal(loaded.modules[slot].type,'story-order');
 assert.equal(isActivityCustomized(loaded,slot,catalog),false);
 assert.deepEqual(migrateDraftValue(EMPTY_DRAFT),EMPTY_DRAFT);
});

test('Source code only confirms destructive changes and restores a single activity',async()=>{
 const [app,css,recipes,migration]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/worksheetRecipes.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/draftMigration.ts',import.meta.url),'utf8'),
 ]);
 const change=app.slice(app.indexOf('  function setModuleType('),
  app.indexOf('  function chooseActivityBorder('));
 assert.match(change,/isActivityCustomized\(draft,activeKey,PUBLIC_LESSONS\)/u);
 assert.match(change,/canRecreateApprovedActivity\(draft,activeKey,PUBLIC_LESSONS\)/u);
 assert.match(change,/if\(\(hasEditedContent\|\|cannotRecreate\|\|borderWillBeLost\)&&!window\.confirm\(/u);
 assert.match(change,/if\(selected\)modules\[activeKey\]=selected\.module/u);
 assert.match(change,/delete activityDefaults\[activeKey\]/u);
 assert.match(change,/originalApprovedActivity\(draft,activeKey,PUBLIC_LESSONS\)/u);
 assert.doesNotMatch(change,/onClick=\{restoreOriginalActivity\}/u);
 assert.match(app,/onClick=\{restoreOriginalActivity\}/u);
 assert.match(css,/\.restore-original-activity:focus-visible/u);
 assert.match(recipes,/activityDefaults:structuredClone\(modules\)/u);
 assert.match(migration,/readAssignments\(value\.activityDefaults\)/u);
});

test('Deep equality is order-independent but finds differences in nested data',()=>{
 const a={type:'test',seed:1,words:['GOD','SEA'],meta:{b:2,a:1}};
 const b={meta:{a:1,b:2},words:['GOD','SEA'],seed:1,type:'test'};
 assert.equal(sameActivityContent(a,b),true);
 assert.equal(sameActivityContent(a,{...b,words:['GOD','MOSES']}),false);
 assert.equal(sameActivityContent(a,null),false);
});
