import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {buildYourOwnLessonDraft} from '../src/curriculumEditor.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {validateModule} from '../src/modules.ts';
import {parseVerse} from '../src/storyVerseModules.ts';
import {
 contentLinkForModule,inferActivityContentLinks,planLessonContentChange,
 applyLessonContentChange,
} from '../src/lessonContentSync.ts';
import {createBookletPdf} from '../src/pdf.ts';

const file=path=>readFile(new URL('../'+path,import.meta.url));
const data=async path=>JSON.parse(await file(path));
const lesson=await data('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
});
assert.equal(catalog.length,1);
const make=id=>buildWorksheetRecipe(lesson,id,{purpose:'published'}).draft;
const fonts=async()=>({
 mouseMemoirs:await file('fonts/MouseMemoirs-Regular.ttf'),
 nunitoSans:await file('fonts/Nunito-Medium.ttf'),
 nunitoSans750:await file('fonts/Nunito-Bold.ttf'),
 nunitoSans900:await file('fonts/Nunito-ExtraBold.ttf'),
 zillaSlab:await file('fonts/ZillaSlab-Bold-pdf.ttf'),
});
let metricsPromise;
async function printMetrics(){
 if(!metricsPromise)metricsPromise=(async()=>{
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const buffers=await fonts();
  const [title,body,puzzle,bank,subtitle]=await Promise.all([
   doc.embedFont(buffers.mouseMemoirs,{subset:false}),
   doc.embedFont(buffers.nunitoSans,{subset:false}),
   doc.embedFont(buffers.zillaSlab,{subset:false}),
   doc.embedFont(buffers.nunitoSans900,{subset:false}),
   doc.embedFont(buffers.nunitoSans750,{subset:false}),
  ]);
  const width=font=>(s,size)=>font.widthOfTextAtSize(s,size);
  return {title:width(title),body:width(body),puzzle:width(puzzle),
   bank:width(bank),subtitle:width(subtitle)};
 })();
 return metricsPromise;
}
const shortVerse={kind:'memoryVerse',reference:'Psalm 23:1',
 text:'The LORD is my shepherd; I shall not want.',translation:'BSB'};
const shortIdea={kind:'bigIdea',text:'God always keeps His promises.'};

test('all numbered presets persist explicit links, original lesson values and BSB translation',()=>{
 for(const id of ['preset-1','preset-2','preset-3']){
  const original=structuredClone(lesson),draft=make(id);
  assert.ok(draft.originalLessonContent);
  assert.equal(draft.verseTranslation,'BSB');
  assert.equal(draft.originalLessonContent.verseText,lesson.lessonDetails.memoryVerse.text);
  const links=draft.activityContentLinks??{};
  assert.ok(Object.keys(links).length>=2,id+' links');
  for(const [slot,kind] of Object.entries(links)){
   assert.equal(contentLinkForModule(draft.modules[slot],draft),kind,
    'Only actual canonical verse/phrase values should be linked');
  }
  assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(draft))),draft);
  assert.deepEqual(lesson,original,'Never edit the published curriculum');
 }
});

test('story-event phrase alternatives are never inferred as canonical Big Idea links',()=>{
 const draft=make('preset-2');
 const phrase='The people walked safely through the sea.';
 const slot='4:top-medium';
 const custom={type:'big-idea-cryptogram',idea:phrase,seed:7};
 assert.equal(contentLinkForModule(custom,draft),null);
 const other=structuredClone(draft);
 other.modules[slot]=custom;
 other.activityDefaults[slot]=structuredClone(custom);
 delete other.activityContentLinks?.[slot];
 assert.equal(inferActivityContentLinks(other)[slot],undefined);
 const plan=planLessonContentChange(other,shortIdea);
 assert.ok(plan.updatedDraft,'Only the canonical idea should change');
 assert.deepEqual(plan.updatedDraft.modules[slot],custom);
 assert.equal(plan.updatedDraft.bigIdea,shortIdea.text);
});

test('Memory Verse update regenerates bracketed words, preserves seeds and unaffected story modules',async()=>{
 const metrics=await printMetrics();
 for(const id of ['preset-1','preset-2','preset-3']){
  const draft=make(id),unchanged=JSON.stringify(draft);
  const plan=planLessonContentChange(draft,shortVerse,{print:metrics});
  assert.deepEqual(plan.issues,[],id+': '+JSON.stringify(plan.issues));
  assert.deepEqual(plan.conflicts,[],id);
  assert.ok(plan.updatedDraft,id+' should permit a short verse');
  const next=applyLessonContentChange(plan);
  assert.equal(next.verseReference,'Psalm 23:1');
  assert.equal(next.verseText,shortVerse.text);
  assert.equal(next.verseTranslation,'BSB');
  assert.deepEqual(next.originalLessonContent,draft.originalLessonContent,
   'Remember the approved original for the later Restore Original action');
  assert.deepEqual(next.layouts,draft.layouts);
  assert.deepEqual(next.activityBorders,draft.activityBorders);
  assert.equal(next.bigIdea,draft.bigIdea);
  assert.ok(plan.updatedSlots.length>0,id+' updated some linked activities');
  for(const [slot,module] of Object.entries(draft.modules)){
   const current=next.modules[slot];
   if(plan.updatedSlots.includes(slot)){
    assert.equal(current.type,module.type);
    assert.deepEqual(validateModule(current),[],id+' '+slot);
    if('seed' in module)assert.equal(current.seed,module.seed,'Preserve puzzle seed');
    if('verse' in current){
     const restored=['finish-verse','unscramble-verse'].includes(current.type)
      ?current.verse.replace(/\[([^\[\]]*)\]/gu,'$1'):current.verse;
     assert.equal(restored,shortVerse.text,id+' '+slot);
    }
    if('reference' in current)assert.equal(current.reference,shortVerse.reference);
    assert.deepEqual(next.activityDefaults[slot],current,
     'New shared content is the restorable baseline for later activity edits');
   }else{
    assert.deepEqual(current,module,'Unlinked questions, events and phrases are unchanged');
   }
  }
  assert.equal(JSON.stringify(draft),unchanged,'No mutation of existing worksheet');
  assert.deepEqual(planLessonContentChange(draft,shortVerse,{print:metrics}).updatedDraft,next,
   'The plan must be deterministic');
 }
});

test('changing only the verse reference preserves exact teacher-approved missing-word pattern',async()=>{
 const draft=make('preset-1'),metrics=await printMetrics();
 const module=Object.entries(draft.modules).find(([,m])=>m.type==='unscramble-verse');
 assert.ok(module);
 const [slot,original]=module;
 const plan=planLessonContentChange(draft,{kind:'memoryVerse',text:draft.verseText,
  reference:'Psalm 23:1',translation:null},{print:metrics});
 assert.ok(plan.updatedDraft,JSON.stringify(plan.issues));
 assert.equal(plan.updatedDraft.modules[slot].verse,original.verse);
 assert.equal(plan.updatedDraft.modules[slot].reference,'Psalm 23:1');
 assert.equal(plan.updatedDraft.verseTranslation,undefined,'Manual text may clear the BSB label');
});

test('edited linked modules are blocked, or explicitly kept independent or replaced',async()=>{
 const draft=make('preset-1'),metrics=await printMetrics();
 const slot=Object.keys(draft.activityContentLinks).find(
  key=>draft.modules[key].type==='verse-cryptogram');
 assert.ok(slot);
 draft.modules[slot]={...draft.modules[slot],verse:'I customized this verse by hand!'};
 const before=JSON.stringify(draft);
 const blocked=planLessonContentChange(draft,shortVerse,{print:metrics});
 assert.equal(blocked.updatedDraft,undefined);
 assert.equal(blocked.conflicts.length,1);
 assert.equal(blocked.conflicts[0].slot,slot);
 assert.throws(()=>applyLessonContentChange(blocked),/Resolve all/);
 assert.equal(JSON.stringify(draft),before,'Blocking leaves source data unchanged');
 const kept=planLessonContentChange(draft,shortVerse,{customized:'keep',print:metrics});
 assert.ok(kept.updatedDraft,JSON.stringify(kept.issues));
 assert.deepEqual(kept.preservedSlots,[slot]);
 assert.equal(kept.updatedDraft.modules[slot].verse,'I customized this verse by hand!');
 assert.equal(kept.updatedDraft.activityContentLinks[slot],'independent');
 assert.equal(inferActivityContentLinks(kept.updatedDraft)[slot],'independent');
 assert.equal(kept.updatedDraft.verseText,shortVerse.text);
 const replacement=planLessonContentChange(draft,shortVerse,{customized:'replace',print:metrics});
 assert.ok(replacement.updatedDraft,JSON.stringify(replacement.issues));
 assert.equal(replacement.updatedDraft.modules[slot].verse,shortVerse.text);
 assert.equal(replacement.updatedDraft.activityContentLinks[slot],'memoryVerse');
 assert.equal(JSON.stringify(draft),before);
});

test('different approved story phrases and seed-only regenerations remain safe',async()=>{
 const draft=make('preset-2'),metrics=await printMetrics();
 const source=Object.keys(draft.activityContentLinks).find(key=>
  draft.activityContentLinks[key]==='memoryVerse'&&'seed' in draft.modules[key]);
 assert.ok(source);
 draft.modules[source]={...draft.modules[source],seed:draft.modules[source].seed+3};
 const plan=planLessonContentChange(draft,shortVerse,{print:metrics});
 assert.ok(plan.updatedDraft,JSON.stringify(plan.issues));
 assert.equal(plan.conflicts.length,0,'Seed change is not an edit to canonical Scripture');
 assert.equal(plan.updatedDraft.modules[source].seed,draft.modules[source].seed);
});

test('too-long verses, short bracket banks and incorrect Big Ideas cannot be applied',async()=>{
 const draft=make('preset-1'),metrics=await printMetrics(),before=JSON.stringify(draft);
 const tooLong='The Lord our God has brought us through the sea and provided everything we need. '.repeat(4);
 const invalid=planLessonContentChange(draft,{kind:'memoryVerse',
  reference:'Psalm 23:1',text:tooLong},{print:metrics});
 assert.equal(invalid.updatedDraft,undefined);
 assert.ok(invalid.issues.some(x=>x.slot&&x.moduleType),
  'Errors must identify which exact linked activities cannot fit');
 const tooShort=planLessonContentChange(draft,{kind:'memoryVerse',
  reference:'Psalm 23:1',text:'Go.'},{print:metrics});
 assert.equal(tooShort.updatedDraft,undefined);
 assert.ok(tooShort.issues.some(x=>/distinct 3–9-letter words/u.test(x.message)));
 const unmeasured=planLessonContentChange(draft,shortVerse);
 assert.equal(unmeasured.updatedDraft,undefined);
 assert.ok(unmeasured.issues.some(x=>/Print font measurements/u.test(x.message)));
 const hugeMeasure=()=>100000;
 const giant=planLessonContentChange(draft,shortVerse,{print:{
  title:hugeMeasure,body:hugeMeasure,puzzle:hugeMeasure,bank:hugeMeasure,subtitle:hugeMeasure,
 }});
 assert.equal(giant.updatedDraft,undefined);
 assert.ok(giant.issues.some(x=>/printable area/u.test(x.message)));
 const ideaDraft=make('preset-3');
 const invalidIdea=planLessonContentChange(ideaDraft,{kind:'bigIdea',text:'A'.repeat(63)},{
  print:metrics});
 assert.equal(invalidIdea.updatedDraft,undefined);
 assert.match(invalidIdea.issues.map(x=>x.message).join(' '),/62 characters/);
 assert.equal(JSON.stringify(draft),before);
});

test('Build My Own and migrated old drafts preserve independent work without forced linking',async()=>{
 const buildOwn=buildYourOwnLessonDraft(catalog[0]);
 assert.deepEqual(buildOwn.modules,{});
 assert.equal(buildOwn.verseTranslation,'BSB');
 assert.ok(buildOwn.originalLessonContent);
 const noActivity=planLessonContentChange(buildOwn,shortVerse);
 assert.ok(noActivity.updatedDraft,'No dependent modules need print measurements');
 assert.equal(noActivity.updatedDraft.verseText,shortVerse.text);
 const saved=make('preset-3');
 delete saved.activityContentLinks;delete saved.originalLessonContent;delete saved.verseTranslation;
 const migrated=migrateDraftValue(JSON.parse(JSON.stringify(saved)));
 const inferred=inferActivityContentLinks(migrated);
 assert.ok(Object.values(inferred).includes('memoryVerse'));
 const changed=planLessonContentChange(migrated,shortVerse,{print:await printMetrics()});
 assert.ok(changed.updatedDraft,JSON.stringify(changed.issues));
 const manual=structuredClone(migrated);
 const slot=Object.keys(inferred).find(key=>inferred[key]==='bigIdea');
 if(slot){
  manual.modules[slot]={...manual.modules[slot],idea:'A deliberately different approved story phrase'};
  delete manual.activityDefaults?.[slot];
  assert.equal(inferActivityContentLinks(manual)[slot],undefined,
   'No source snapshot means a historical teacher edit cannot be silently linked');
 }
 const bad=structuredClone(saved);
 bad.activityContentLinks={'1:cover-activity':'memoryVerse','2:fake':'bigIdea'};
 assert.deepEqual(migrateDraftValue(bad).activityContentLinks,undefined,
  'Malformed link metadata is never trusted');
});

test('updated preset booklet still serializes to a real two-sheet printable PDF',async()=>{
 const draft=make('preset-1');
 const plan=planLessonContentChange(draft,shortVerse,{print:await printMetrics()});
 assert.ok(plan.updatedDraft,JSON.stringify(plan.issues));
 const data=await createBookletPdf(plan.updatedDraft,await fonts());
 const pdf=await PDFDocument.load(data);
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(pdf.getPages().map(page=>[page.getWidth(),page.getHeight()]),
  [[792,612],[792,612]]);
});
