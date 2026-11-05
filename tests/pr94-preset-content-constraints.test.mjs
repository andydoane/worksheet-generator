import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 createLessonWorksheet,createSamePresetForNewStory,
 createSameStoryPresetWithContent,PresetContentFitError,
 needsLessonSwitchConfirmation,
} from '../src/lessonQuickSwitch.ts';
import {planLessonContentChange,applyLessonContentChange} from '../src/lessonContentSync.ts';
import {BIG_IDEA_MAX_CHARACTERS,MEMORY_VERSE_MAX_CHARACTERS} from '../src/lessonContentLimits.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {validateModule} from '../src/modules.ts';
import {lessonContentIsCustomized,presetOriginalChange} from '../src/lessonContentDialogModel.ts';
import {arrangePresetBorders} from '../src/presetBorders.ts';
import {createBookletPdf} from '../src/pdf.ts';

const load=async path=>readFile(new URL('../'+path,import.meta.url));
const json=async path=>JSON.parse(await load(path));
const redSea=await json('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const wilderness=await json('curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json');
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+redSea.id+'.lesson.json']:redSea,
 ['../curriculum/approved/'+wilderness.id+'.lesson.json']:wilderness,
});
const redEntry=catalog.find(x=>x.lesson.id===redSea.id);
const wildernessEntry=catalog.find(x=>x.lesson.id===wilderness.id);
assert.ok(redEntry&&wildernessEntry);
const choices=['preset-1','preset-2','preset-3','build-own'];
const bigIdea='God always keeps His promises.';
const verse={kind:'memoryVerse',reference:'Psalm 23:1',
 text:'The LORD is my shepherd; I shall not want.',translation:'BSB'};

let printPromise;
async function metrics(){
 if(!printPromise)printPromise=(async()=>{
  const doc=await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes=await Promise.all([
   load('fonts/MouseMemoirs-Regular.ttf'),load('fonts/Nunito-Medium.ttf'),
   load('fonts/ZillaSlab-Bold-pdf.ttf'),load('fonts/Nunito-ExtraBold.ttf'),
   load('fonts/Nunito-Bold.ttf'),
  ]);
  const [title,body,puzzle,bank,subtitle]=await Promise.all(
   bytes.map(x=>doc.embedFont(x,{subset:false})));
  const measure=font=>(text,size)=>font.widthOfTextAtSize(text,size);
  return {title:measure(title),body:measure(body),puzzle:measure(puzzle),
   bank:measure(bank),subtitle:measure(subtitle)};
 })();
 return printPromise;
}
async function customized(startId='preset-1'){
 const print=await metrics();
 let draft=createLessonWorksheet(redEntry,startId);
 for(const change of [{kind:'bigIdea',text:bigIdea},verse]){
  const plan=planLessonContentChange(draft,change,{print});
  assert.ok(plan.updatedDraft,JSON.stringify({startId,change,issues:plan.issues}));
  draft=applyLessonContentChange(plan);
 }
 return draft;
}

test('Strict global character limits are shared with the underlying cryptogram validators',async()=>{
 assert.equal(BIG_IDEA_MAX_CHARACTERS,62);
 assert.equal(MEMORY_VERSE_MAX_CHARACTERS,145);
 const draft=createLessonWorksheet(redEntry,'build-own');
 for(const change of [
  {kind:'bigIdea',text:'X'.repeat(63)},
  {kind:'memoryVerse',reference:'Psalm 23:1',text:'X'.repeat(146)},
 ]){
  const plan=planLessonContentChange(draft,change);
  assert.equal(plan.updatedDraft,undefined,'No linked module may bypass the global cap');
  assert.ok(plan.issues.some(issue=>issue.message.includes(String(change.kind==='bigIdea'?62:145))));
 }
 const validBig=planLessonContentChange(draft,{kind:'bigIdea',text:bigIdea});
 const validVerse=planLessonContentChange(draft,verse);
 assert.ok(validBig.updatedDraft);
 assert.ok(validVerse.updatedDraft);
 const dialog=(await load('src/LessonContentDialog.tsx')).toString('utf8');
 assert.match(dialog,/maxLength=\{BIG_IDEA_MAX_CHARACTERS\}/u);
 assert.match(dialog,/maxLength=\{MEMORY_VERSE_MAX_CHARACTERS\}/u);
 assert.match(dialog,/maxCharacters=\{MEMORY_VERSE_MAX_CHARACTERS\}/u);
});

test('All 16 same-story transitions preserve canonical content and regenerate only linked activities',async()=>{
 const print=await metrics();
 for(const from of choices){
  const current=await customized(from);
  const before=JSON.stringify(current);
  for(const to of choices){
   const target=createSameStoryPresetWithContent(current,redEntry,to,print);
   assert.equal(target.curriculumLessonId,redSea.id);
   assert.equal(target.worksheetPresetId,to);
   assert.equal(target.bigIdea,bigIdea,from+' to '+to+' idea');
   assert.equal(target.verseText,verse.text,from+' to '+to+' verse');
   assert.equal(target.verseReference,verse.reference);
   assert.equal(target.verseTranslation,'BSB');
   assert.deepEqual(target.originalLessonContent,
    createLessonWorksheet(redEntry,to).originalLessonContent);
   assert.ok(lessonContentIsCustomized(target,'bigIdea'));
   assert.ok(lessonContentIsCustomized(target,'memoryVerse'));
   const canonical=target.activityContentLinks??{};
   for(const [slot,kind] of Object.entries(canonical)){
    const module=target.modules[slot];
    if(kind==='bigIdea')assert.equal(module.idea,bigIdea,from+' to '+to+' '+slot);
    if(kind==='memoryVerse'){
     assert.equal('verse' in module,true);
     const verseText=module.type==='finish-verse'||module.type==='unscramble-verse'
      ?module.verse.replace(/\[([^\[\]]*)\]/gu,'$1'):module.verse;
     assert.equal(verseText,verse.text,from+' to '+to+' '+slot);
     if('reference' in module)assert.equal(module.reference,verse.reference);
    }
   }
   for(const module of Object.values(target.modules))
    assert.deepEqual(validateModule(module),[],from+' to '+to+' '+module.type);
   assert.equal(JSON.stringify(current),before,'Switching must not mutate previous draft');
   assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(target))),target,
    'Custom choices and content links survive browser save/reload');
  }
 }
});

test('An existing custom title and unrelated activity edits are not mistaken for shared lesson content',async()=>{
 const start=await customized('preset-1');
 start.title='A hand-written worksheet title';
 const storySlot=Object.keys(start.modules).find(k=>start.modules[k].type==='finish-story');
 assert.ok(storySlot);
 const before=structuredClone(start);
 start.modules[storySlot]={...start.modules[storySlot],story:'Teacher made a custom story.'};
 const newPreset=createSameStoryPresetWithContent(start,redEntry,'preset-2',await metrics());
 assert.equal(newPreset.title,redSea.lessonDetails.title,'Preset still supplies its own title');
 assert.equal(newPreset.bigIdea,bigIdea);
 assert.equal(newPreset.verseText,verse.text);
 assert.ok(!Object.values(newPreset.modules).some(m=>
  m.type==='finish-story'&&m.story==='Teacher made a custom story.'));
 assert.equal(start.modules[storySlot].story,'Teacher made a custom story.');
 assert.notDeepEqual(start.modules[storySlot],before.modules[storySlot]);
});

test('An approved alternative Solve the Code phrase stays independent of the Big Idea',async()=>{
 const source=createLessonWorksheet(wildernessEntry,'preset-1');
 const plan=planLessonContentChange(source,{kind:'bigIdea',text:bigIdea},{print:await metrics()});
 assert.ok(plan.updatedDraft,JSON.stringify(plan.issues));
 const next=createSameStoryPresetWithContent(
  applyLessonContentChange(plan),wildernessEntry,'preset-2',await metrics());
 assert.equal(next.bigIdea,bigIdea);
 const code=Object.entries(next.modules).find(([,m])=>m.type==='big-idea-cryptogram');
 assert.ok(code,'The destination preset includes Solve the Code');
 const [slot,module]=code;
 assert.notEqual(module.idea,bigIdea,'Approved alternative story phrase remains in place');
 assert.notEqual(next.activityContentLinks?.[slot],'bigIdea',
  'An unrelated story phrase cannot be linked or overwritten');
});

test('Target-preset validation catches a verse reference fitting source preset but not destination',async()=>{
 const print=await metrics();
 let draft=createLessonWorksheet(redEntry,'preset-1');
 const extraRef='John 3:16 (Extended Study Version)';
 assert.ok(extraRef.length>32&&extraRef.length<=38);
 const plan=planLessonContentChange(draft,{...verse,reference:extraRef},{print});
 assert.ok(plan.updatedDraft,JSON.stringify(plan.issues));
 draft=applyLessonContentChange(plan);
 const before=JSON.stringify(draft);
 assert.throws(()=>createSameStoryPresetWithContent(draft,redEntry,'preset-2',print),
  error=>error instanceof PresetContentFitError&&error.kind==='Memory Verse'&&
   error.message.includes('First Letter')&&error.message.includes('unchanged'));
 assert.equal(JSON.stringify(draft),before,'Rejected switch cannot partially commit');
 const fine=createSameStoryPresetWithContent(draft,redEntry,'preset-3',print);
 assert.equal(fine.verseReference,extraRef);
});

test('Invalid legacy content or unavailable print metrics cannot be transferred silently',async()=>{
 const existing=await customized('preset-1');
 const original=JSON.stringify(existing);
 const legacy={...existing,bigIdea:'A'.repeat(63)};
 const print=await metrics();
 assert.throws(()=>createSameStoryPresetWithContent(legacy,redEntry,'preset-3',print),
  error=>error instanceof PresetContentFitError&&error.kind==='Big Idea'&&
   error.message.includes('62'));
 const noMetrics=()=>createSameStoryPresetWithContent(existing,redEntry,'preset-2');
 assert.throws(noMetrics,error=>error instanceof PresetContentFitError&&
  error.message.includes('Print font measurements'));
 const wrongStory=()=>createSameStoryPresetWithContent(existing,wildernessEntry,'preset-1',print);
 assert.throws(wrongStory,/same Bible story/);
 assert.equal(JSON.stringify(existing),original);
});

test('Missing original metadata in older drafts compares to approved lesson, preserving only real edits',async()=>{
 const print=await metrics();
 const legacy=await customized('preset-1');
 delete legacy.originalLessonContent;
 delete legacy.activityContentLinks;
 const saved=migrateDraftValue(JSON.parse(JSON.stringify(legacy)));
 const next=createSameStoryPresetWithContent(saved,redEntry,'preset-3',print);
 assert.equal(next.bigIdea,bigIdea);
 assert.equal(next.verseText,verse.text);
 const plain=createLessonWorksheet(redEntry,'preset-1');
 delete plain.originalLessonContent;delete plain.verseTranslation;
 const upgraded=createSameStoryPresetWithContent(plain,redEntry,'preset-2',print);
 assert.equal(upgraded.verseTranslation,'BSB','Missing old label is not a deliberate custom translation');
 assert.equal(upgraded.verseText,redSea.lessonDetails.memoryVerse.text);
});

test('Change Story still replaces custom values with the new approved story defaults',async()=>{
 const current=await customized('preset-3');
 for(const id of choices){
  const samePreset={...current,worksheetPresetId:id};
  const next=createSamePresetForNewStory(samePreset,wildernessEntry);
  assert.equal(next.curriculumLessonId,wilderness.id);
  assert.equal(next.worksheetPresetId,id);
  assert.equal(next.bigIdea,wilderness.lessonDetails.bigIdeas[0].text);
  assert.equal(next.verseText,wilderness.lessonDetails.memoryVerse.text);
  assert.equal(next.verseReference,wilderness.lessonDetails.memoryVerse.reference);
  assert.equal(next.verseTranslation,wilderness.lessonDetails.memoryVerse.translation);
  assert.equal(lessonContentIsCustomized(next,'bigIdea'),false);
  assert.equal(lessonContentIsCustomized(next,'memoryVerse'),false);
  assert.deepEqual(presetOriginalChange(next,'memoryVerse').text,
   wilderness.lessonDetails.memoryVerse.text);
 }
});

test('Saved border mode is carried across preset changes and linked values are still retained',async()=>{
 const draft=arrangePresetBorders(await customized('preset-1'),
  {mode:'same',style:'border-6',seed:7});
 const next=createSameStoryPresetWithContent(draft,redEntry,'preset-3',await metrics());
 assert.equal(next.borderArrangement.mode,'same');
 assert.equal(next.borderArrangement.style,'border-6');
 assert.equal(next.borderArrangement.seed,8);
 assert.equal(next.bigIdea,bigIdea);
 assert.equal(next.verseText,verse.text);
});

test('Updated destination is still a printable two-sheet booklet after cross-preset changes',async()=>{
 const next=createSameStoryPresetWithContent(await customized('preset-1'),
  redEntry,'preset-2',await metrics());
 const fontFiles=await Promise.all([
  load('fonts/MouseMemoirs-Regular.ttf'),load('fonts/Nunito-Medium.ttf'),
  load('fonts/Nunito-Bold.ttf'),load('fonts/Nunito-ExtraBold.ttf'),
  load('fonts/ZillaSlab-Bold-pdf.ttf'),
 ]);
 const [mouseMemoirs,nunitoSans,nunitoSans750,nunitoSans900,zillaSlab]=fontFiles;
 const bytes=await createBookletPdf(next,{
  mouseMemoirs,nunitoSans,nunitoSans750,nunitoSans900,zillaSlab,
 });
 const doc=await PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);
 assert.ok(bytes.length>20000);
});

test('Preset picker calls the safe helper and uses measured PDF fonts before committing',async()=>{
 const app=(await load('src/App.tsx')).toString('utf8');
 assert.match(app,/async function chooseQuickLessonWorksheet/u);
 assert.match(app,/const widths=await mediumWidths\(\)/u);
 assert.match(app,/createSameStoryPresetWithContent\(draft,entry,startId/u);
 assert.match(app,/if\(entryOverride\)/u);
 assert.match(app,/next=createSamePresetForNewStory\(draft,entry\)/u);
 assert.match(app,/startWorksheet\(next,true\)/u);
 assert.match(app,/switchingWorksheetRef\.current/u);
 assert.match(app,/Switch presets\? Your chosen Big Idea, Memory Verse and translation will be preserved/u);
 assert.match(app,/Switch Bible stories\? Your current Big Idea, Memory Verse/u);
});
