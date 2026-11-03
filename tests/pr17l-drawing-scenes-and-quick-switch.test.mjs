import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {WORKSHEET_RECIPES,buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {createLessonWorksheet,isWorksheetStartId,needsLessonSwitchConfirmation} from '../src/lessonQuickSwitch.ts';
import {picturePromptSentence,planDrawPicture} from '../src/smallFinishingLayout.ts';
import {migrateDraftValue,EMPTY_DRAFT} from '../src/draftMigration.ts';
import {buildYourOwnLessonDraft} from '../src/curriculumEditor.ts';

const readJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await readJson('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const rights=await readJson('curriculum/approved/rights-manifest.json');
const entries=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
},rights);
assert.equal(entries.length,1);
const entry=entries[0];

test('Drawing content is a reusable scene, not a redundant instruction',()=>{
 const scenes=[
  ...lesson.drawingPrompts.map(x=>x.prompt),
  lesson.preparedActivities.drawPicture.prompt,
  ...lesson.preparedActivities.drawStory.map(x=>x.prompt),
 ];
 assert.equal(scenes.length,14);
 for(const scene of scenes){
  assert.doesNotMatch(scene,/^(?:Draw|Sketch)\b/iu);
  assert.ok(scene.length>3&&scene.length<=105,scene);
  assert.doesNotMatch(scene,/[.!?]$/u,'Store noun phrases without terminal punctuation');
 }
 assert.equal(lesson.drawingPrompts[3].prompt,'Moses holding up his staff beside the Red Sea');
 assert.equal(lesson.drawingPrompts[1].prompt,'Pharaoh sending soldiers and chariots to chase the Israelites');
 assert.equal(lesson.preparedActivities.drawStory.length,6);
 for(const picture of lesson.preparedActivities.drawStory)
  assert.ok(lesson.drawingPrompts.some(scene=>scene.prompt===picture.prompt));
 assert.ok(lesson.drawingPrompts.some(scene=>
  scene.prompt===lesson.preparedActivities.drawPicture.prompt));
 assert.equal(lesson.publication.teacherSignoff.reviewer,'Andy Doane');
 assert.equal(lesson.lessonDetails.memoryVerse.translation,'BSB');
});

test('Draw a Picture adds one instruction; legacy imperatives are never prefixed twice',()=>{
 assert.equal(picturePromptSentence('the Israelites walking between walls of water'),
  'Draw a picture of the Israelites walking between walls of water.');
 assert.equal(picturePromptSentence('Moses holding up his staff'),
  'Draw a picture of Moses holding up his staff.');
 assert.equal(picturePromptSentence('Draw the Israelites walking between walls of water.'),
  'Draw the Israelites walking between walls of water.');
 assert.equal(picturePromptSentence('Sketch the cloud.'),
  'Sketch the cloud.');
 assert.equal(picturePromptSentence('Draw a picture of Moses.'),
  'Draw a picture of Moses.');
});

test('Small and large drawing modules use the same approved scenes with different displays',()=>{
 const recipe=createLessonWorksheet(entry,'preset-1');
 const small=Object.values(recipe.modules).filter(x=>x.type==='draw-picture');
 assert.equal(small.length,2);
 assert.notEqual(small[0].prompt,small[1].prompt);
 for(const s of small){
  assert.ok(lesson.drawingPrompts.some(x=>x.prompt===s.prompt));
  assert.match(picturePromptSentence(s.prompt),/^Draw a picture of /u);
  const plan=planDrawPicture(s.prompt,(t,size)=>t.length*size*.40);
  assert.ok(plan,'The approved scene must still fit the small drawing box');
  assert.match(plan.lines.map(l=>l.text).join(' '),/^Draw a picture of /u);
 }
 const large=createLessonWorksheet(entry,'preset-2').modules['1:cover-activity'];
 assert.equal(large.type,'draw-story');
 const lines=large.prompts.split('\n').map(s=>s.trim());
 assert.equal(lines.length,6);
 assert.ok(lines.every(line=>!line.startsWith('Draw ')),
  'Draw the Story captions are not independently prefixed');
});

test('A selected preset or Build My Own persists through existing draft migration',()=>{
 for(const id of [...WORKSHEET_RECIPES.map(x=>x.id),'build-own']){
  const current=createLessonWorksheet(entry,id);
  assert.equal(current.worksheetPresetId,id);
  assert.equal(current.curriculumLessonId,lesson.id);
  const saved=migrateDraftValue(JSON.parse(JSON.stringify(current)));
  assert.deepEqual(saved,current);
  assert.equal(needsLessonSwitchConfirmation(saved,entries),false,id+' pristine');
 }
 const legacy=buildWorksheetRecipe(entry.lesson,'preset-1',{purpose:'published'}).draft;
 delete legacy.worksheetPresetId;
 assert.equal(needsLessonSwitchConfirmation(legacy,entries),true,
  'Unknown historical selection cannot safely skip confirmation');
 assert.deepEqual(migrateDraftValue(EMPTY_DRAFT),EMPTY_DRAFT);
 const malicious=migrateDraftValue({...EMPTY_DRAFT,worksheetPresetId:'preset-1'});
 assert.equal(malicious.worksheetPresetId,undefined,'No context on scratch drafts');
 assert.ok(isWorksheetStartId('preset-3'));
 assert.ok(isWorksheetStartId('build-own'));
 assert.equal(isWorksheetStartId('story-review'),false);
 assert.equal(isWorksheetStartId('bad-ID'),false);
});

test('Edited details, modules, layouts, or borders protect the single browser draft',()=>{
 const base=createLessonWorksheet(entry,'preset-1');
 const variants=[
  {...base,title:'Teacher wrote another title'},
  {...base,bigIdea:'Teacher wrote a new big idea'},
  {...base,verseText:'Teacher edited memory verse'},
  {...base,layouts:{...base.layouts,3:'medium-large'}},
  {...base,coverBorder:'none',activityBorders:{'2:top-left-small':'frame-stars'}},
 ];
 for(const variant of variants){
  // The modified property must actually differ from the generated preset.
  assert.equal(needsLessonSwitchConfirmation(variant,entries),true);
 }
 const moduleSlot=Object.keys(base.modules)[0];
 const edited=structuredClone(base);
 edited.modules[moduleSlot]={...edited.modules[moduleSlot],story:'Teacher-customized words'};
 assert.equal(needsLessonSwitchConfirmation(edited,entries),true);
 assert.equal(needsLessonSwitchConfirmation(base,entries),false);
 const own=buildYourOwnLessonDraft(entry);
 assert.equal(needsLessonSwitchConfirmation(own,entries),false);
 own.modules['1:cover-activity']=base.modules[moduleSlot];
 assert.equal(needsLessonSwitchConfirmation(own,entries),true);
 const unavailable={...base,curriculumLessonId:'withdrawn-lesson'};
 assert.equal(needsLessonSwitchConfirmation(unavailable,entries),true);
});

test('All story and preset transitions reconstruct only approved lesson content',()=>{
 const initial=createLessonWorksheet(entry,'preset-1');
 const untouched=JSON.stringify(initial);
 for(const presetId of WORKSHEET_RECIPES.map(x=>x.id)){
  const next=createLessonWorksheet(entry,presetId);
  assert.equal(next.worksheetPresetId,presetId);
  assert.equal(next.curriculumLessonId,initial.curriculumLessonId);
  assert.notStrictEqual(next.modules,initial.modules);
 }
 const blank=createLessonWorksheet(entry,'build-own');
 assert.equal(Object.keys(blank.modules).length,0);
 assert.equal(blank.title,initial.title);
 assert.equal(JSON.stringify(initial),untouched);
 const review=await readJson('tests/fixtures/ot-031-original-review.json');
 const unapproved={...entry,lesson:review};
 assert.throws(()=>createLessonWorksheet(unapproved,'build-own'),/not approved/u);
});

test('Quick switch controls appear only for lesson-backed editor drafts and never modify state on open/cancel',async()=>{
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/draft\.curriculumLessonId&&<section className="lesson-switcher"/u);
 assert.match(app,/Change Preset/u);
 assert.match(app,/Change Story/u);
 assert.match(app,/Choose a Preset/u);
 assert.match(app,/setLessonPicker\(null\)/u);
 assert.match(app,/setNextStoryId\(null\)/u);
 assert.match(app,/needsLessonSwitchConfirmation\(draft,PUBLIC_LESSONS\)/u);
 assert.match(app,/createLessonWorksheet\(entry,startId\)/u);
 assert.match(app,/startWorksheet\(next,true\)/u);
 assert.match(app,/if\(!skipConfirmation&&hasMeaningfulDraft/u);
 assert.match(app,/PUBLIC_LESSONS\.filter\(approvedForPublic\)/u);
});
