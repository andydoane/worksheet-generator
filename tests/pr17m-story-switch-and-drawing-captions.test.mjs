import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 createLessonWorksheet,createSamePresetForNewStory,
 needsLessonSwitchConfirmation,isWorksheetStartId,
} from '../src/lessonQuickSwitch.ts';
import {checkDrawingCopy} from '../src/review/model.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {contentClaimsForModule} from '../src/lessonContentPool.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {upgradeSavedDrawingCaptions} from '../src/drawingDraftUpgrade.ts';

const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await json('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
});
assert.equal(catalog.length,1);
const entry=catalog[0];

test('Small scene prompts remain noun phrases; six Large captions exactly match approved Story Order events by source ID',()=>{
 assert.deepEqual(checkDrawingCopy(lesson),[]);
 const scenes=lesson.drawingPrompts.map(x=>x.prompt);
 assert.equal(scenes.length,7);
 assert.equal(lesson.preparedActivities.drawPicture.prompt,
  'the Israelites walking on dry ground between two walls of water');
 for(const s of scenes)assert.doesNotMatch(s,/^(Draw|Sketch)\b|[.!?]$/u);
 const captions=lesson.preparedActivities.drawStory;
 assert.equal(captions.length,6);
 const expected=['sn-01','sn-02','sn-03','sn-05','sn-06','sn-07'];
 assert.deepEqual(captions.map(c=>c.sourceIds[0]),expected);
 for(const caption of captions){
  const matches=lesson.preparedActivities.storyOrder.filter(event=>
   caption.sourceIds.some(id=>event.sourceIds.includes(id)));
  assert.equal(matches.length,1);
  assert.equal(caption.prompt,matches[0].text);
  assert.match(caption.prompt,/^[A-Z].*[.!?]$/u);
 }
 const pdfModule=createLessonWorksheet(entry,'preset-2').modules['1:cover-activity'];
 assert.equal(pdfModule.type,'draw-story');
 assert.deepEqual(pdfModule.prompts.split('\n'),captions.map(x=>x.prompt));
 const claims=contentClaimsForModule(pdfModule,lesson);
 assert.ok(claims.some(id=>id.startsWith('phrase:')),'Large captions share exact event identities with Story Order');
});

test('Change Story preserves current numbered preset or Build My Own; no second preset choice',()=>{
 // A test-only second approved source with different lesson identity/title.
 // It is NOT part of the public catalog or published to the app.
 const second={...entry,lesson:{...structuredClone(lesson),id:'test-second-story',
  lessonDetails:{...structuredClone(lesson.lessonDetails),
   title:'A Different Approved Bible Story',scriptureDisplay:'Exodus 14'}}};
 for(const id of ['preset-1','preset-2','preset-3','build-own']){
  assert.ok(isWorksheetStartId(id));
  const current=createLessonWorksheet(entry,id);
  assert.equal(needsLessonSwitchConfirmation(current,catalog),false);
  const old=JSON.stringify(current);
  const next=createSamePresetForNewStory(current,second);
  assert.equal(next.worksheetPresetId,id,'Preset number must remain unchanged');
  assert.equal(next.curriculumLessonId,'test-second-story');
  assert.equal(next.title,'A Different Approved Bible Story');
  assert.equal(next.scripture,'Exodus 14');
  assert.equal(JSON.stringify(current),old,'An unconfirmed switch must not mutate current worksheet');
  assert.notStrictEqual(next.modules,current.modules);
  assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(next))),next);
 }
 const customized=createLessonWorksheet(entry,'preset-2');
 customized.title='Teacher changed the heading';
 assert.equal(needsLessonSwitchConfirmation(customized,catalog),true);
 const next=createSamePresetForNewStory(customized,second);
 assert.equal(next.worksheetPresetId,'preset-2');
 assert.equal(next.title,second.lesson.lessonDetails.title);
 const older={...createLessonWorksheet(entry,'preset-1')};
 delete older.worksheetPresetId;
 assert.throws(()=>createSamePresetForNewStory(older,second),/no recorded preset/u);
 assert.equal(older.curriculumLessonId,lesson.id);
 const denied={...second,scriptureDistributionCleared:false};
 assert.throws(()=>createSamePresetForNewStory(customized,denied),/not approved|approved/u);
});

test('Quick story picker is single-step and keeps current preset; Change Preset remains separate',async()=>{
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 const helper=await readFile(new URL('../src/lessonQuickSwitch.ts',import.meta.url),'utf8');
 assert.match(app,/onSelect=\{chooseQuickStory\}/u);
 assert.match(app,/<StoryPicker stories=\{PUBLIC_LESSONS.filter\(approvedForPublic\)\}/u);
 assert.match(app,/chooseQuickLessonWorksheet\(startId,entry\)/u);
 assert.match(app,/createSamePresetForNewStory\(draft,entry\)/u);
 assert.match(app,/needsLessonSwitchConfirmation\(draft,PUBLIC_LESSONS\)/u);
 assert.match(app,/if\(!isWorksheetStartId\(startId\)\)/u);
 assert.doesNotMatch(app,/story-presets|nextStoryId/u);
 assert.match(app,/onClick=\{\(\)=>openLessonPicker\('presets'\)\}/u);
 assert.match(app,/setLessonPicker\(null\)/u);
 assert.match(helper,/createLessonWorksheet\(entry,draft\.worksheetPresetId\)/u);
});

test('Preset 2 with sentence captions remains a printable two-sheet Red Sea booklet',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const bytes=await createBookletPdf(createLessonWorksheet(entry,'preset-2'),fonts);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
 assert.ok(bytes.length>25000);
});


test('Resuming an old pristine Draw the Story upgrades captions without overwriting teacher edits',()=>{
 const approved=lesson.preparedActivities.drawStory;
 const oldPrompts=approved.map(caption=>lesson.drawingPrompts.find(scene=>
  caption.sourceIds.some(id=>scene.sourceIds.includes(id))).prompt);
 const modern=createLessonWorksheet(entry,'preset-2');
 const original=modern.modules['1:cover-activity'];
 assert.equal(original.type,'draw-story');
 for(const prompts of [oldPrompts.join('\n'),oldPrompts.map(x=>'Draw '+x+'.').join('\n')]){
  const saved=structuredClone(modern);
  saved.modules['1:cover-activity']={type:'draw-story',prompts};
  saved.activityDefaults['1:cover-activity']={type:'draw-story',prompts};
  const updated=upgradeSavedDrawingCaptions(saved,catalog);
  assert.deepEqual(updated.modules['1:cover-activity'],original);
  assert.deepEqual(updated.activityDefaults['1:cover-activity'],original);
  assert.deepEqual(saved.modules['1:cover-activity'],{type:'draw-story',prompts},
   'Migration never mutates the input draft');
  assert.equal(needsLessonSwitchConfirmation(updated,catalog),false);
  assert.equal(updated.worksheetPresetId,'preset-2');
 }
 const legacy=structuredClone(modern);
 legacy.modules['1:cover-activity']={type:'draw-story',prompts:oldPrompts.join('\n')};
 delete legacy.activityDefaults;
 const migrated=upgradeSavedDrawingCaptions(legacy,catalog);
 assert.deepEqual(migrated.modules['1:cover-activity'],original);
 const custom=structuredClone(legacy);
 custom.modules['1:cover-activity'].prompts+=' A teacher wrote something new.';
 assert.strictEqual(upgradeSavedDrawingCaptions(custom,catalog),custom,
  'Teacher-written drawing captions must never be rewritten');
 const editedBaseline=structuredClone(legacy);
 editedBaseline.activityDefaults={'1:cover-activity':original};
 assert.strictEqual(upgradeSavedDrawingCaptions(editedBaseline,catalog),editedBaseline);
 assert.strictEqual(upgradeSavedDrawingCaptions(legacy,[]),legacy);
 const scratch=structuredClone(legacy);
 delete scratch.curriculumLessonId;
 assert.strictEqual(upgradeSavedDrawingCaptions(scratch,catalog),scratch);
});
