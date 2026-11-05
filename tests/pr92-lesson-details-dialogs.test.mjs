import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {presetOriginalChange,lessonContentIsCustomized,activitySlotLabel,changePlanMessages} from '../src/lessonContentDialogModel.ts';
import {planLessonContentChange,applyLessonContentChange} from '../src/lessonContentSync.ts';
import {getBsbPassage,parseBsbText} from '../src/review/bsb.ts';

const file=async p=>(await readFile(new URL('../'+p,import.meta.url))).toString('utf8');
const lesson=JSON.parse(await file('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
const preset=id=>buildWorksheetRecipe(lesson,id,{purpose:'published'}).draft;

test('Lesson Details renders read-only summaries, not fields bypassing linked changes',async()=>{
 const app=await file('src/App.tsx');
 for(const label of ['Change Big Idea','Change Verse','Restore Original',
  'lesson-big-idea-heading','lesson-memory-verse-heading','lessonContentIsCustomized']){
  assert.ok(app.includes(label),'Missing UI '+label);
 }
 for(const old of ['textarea id="bigIdea"','input id="verseReference"','textarea id="verseText"',
  "edit('bigIdea'","edit('verseReference'","edit('verseText'"]){
  assert.ok(!app.includes(old),'Unsafe legacy field still present: '+old);
 }
 assert.match(app,/function edit\(field: 'title' \| 'scripture'/u);
 assert.match(app,/<LessonContentDialog/u);
 assert.match(app,/setDraft\(next\)/u);
});

test('Native modal contains BSB picker, custom entry, preview and conflict decisions',async()=>{
 const dialog=await file('src/LessonContentDialog.tsx');
 for(const word of ['showModal()','onCancel=','Choose from the BSB','Type my own verse',
  '<BsbPassagePicker','Review affected activities','Affected activities','value="keep"',
  'value="replace"','disabled={!valid}','applyLessonContentChange(plan)',
  'widths.finishBody','widths.puzzlePdf','widths.boldPdf',
  "translation:'BSB'","translation:translation.trim()||null"]){
  assert.ok(dialog.includes(word),'Missing required confirmation behavior: '+word);
 }
 assert.match(dialog,/validateSelection=\{validateBsb\}/u);
 assert.match(dialog,/planLessonContentChange\(draft/u);
 const css=await file('src/lessonContentDialog.css');
 assert.match(css,/::backdrop/u);
 assert.match(css,/@media\(max-width:540px\)/u);
});

test('Original content is restorable for every preset without modifying approved curriculum',()=>{
 const snapshot=JSON.stringify(lesson);
 for(const id of ['preset-1','preset-2','preset-3']){
  const draft=preset(id);
  assert.equal(lessonContentIsCustomized(draft,'bigIdea'),false);
  assert.equal(lessonContentIsCustomized(draft,'memoryVerse'),false);
  const originalIdea=presetOriginalChange(draft,'bigIdea');
  const originalVerse=presetOriginalChange(draft,'memoryVerse');
  assert.equal(originalIdea.text,draft.bigIdea);
  assert.equal(originalVerse.text,draft.verseText);
  assert.equal(originalVerse.reference,draft.verseReference);
  const edited={...draft,bigIdea:'Different idea',verseText:'Different verse'};
  assert.equal(lessonContentIsCustomized(edited,'bigIdea'),true);
  assert.equal(lessonContentIsCustomized(edited,'memoryVerse'),true);
  assert.deepEqual(presetOriginalChange(edited,'bigIdea'),originalIdea);
  assert.deepEqual(presetOriginalChange(edited,'memoryVerse'),originalVerse);
 }
 assert.equal(presetOriginalChange({originalLessonContent:undefined},'bigIdea'),null);
 assert.equal(JSON.stringify(lesson),snapshot);
});

test('Local BSB selection remains canonical while manual text clears translation attribution',async()=>{
 const index=parseBsbText(await file('public/bible/bsb.txt'),true);
 const passage=getBsbPassage(index,'Psalm 23:1');
 const draft=preset('preset-1');
 const original=JSON.stringify(draft);
 const bsb=planLessonContentChange(draft,{kind:'memoryVerse',reference:passage.reference,
  text:passage.text,translation:'BSB'});
 assert.equal(bsb.updatedDraft,undefined,'Print measurements required for linked puzzles');
 assert.ok(bsb.issues.some(x=>x.slot),'Fitting errors name affected activities');
 const manual=planLessonContentChange({...draft,modules:{},activityContentLinks:{}},
  {kind:'memoryVerse',reference:'Psalm 23:1',text:'My own translated verse',translation:null});
 assert.ok(manual.updatedDraft);
 assert.equal(applyLessonContentChange(manual).verseTranslation,undefined);
 assert.equal(JSON.stringify(draft),original);
});

test('Failure messages identify a page and activity; no invalid change can be applied',()=>{
 const draft=preset('preset-3');
 const change={kind:'memoryVerse',reference:'Psalm 23:1',
  text:'An extremely long memory verse phrase with more words than can ever fit. '.repeat(20),
  translation:null};
 const plan=planLessonContentChange(draft,change);
 assert.equal(plan.updatedDraft,undefined);
 assert.ok(plan.issues.length>0);
 const text=changePlanMessages(draft,plan);
 assert.ok(text.some(message=>message.includes('Page ')));
 const first=plan.issues.find(item=>item.slot);
 assert.ok(first);
 assert.ok(text.some(message=>message.includes(activitySlotLabel(draft,first.slot))));
 assert.throws(()=>applyLessonContentChange(plan),/Resolve all/u);
});
