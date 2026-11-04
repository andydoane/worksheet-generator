import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {hasMeaningfulDraft,exampleWorksheetDraft} from '../src/welcomeFlow.ts';
import {approvedForPublic,PUBLIC_LESSONS} from '../src/publishedLessonCatalog.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {DEFAULT_LAYOUTS,getRegions} from '../src/booklet.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {validateLesson} from '../scripts/validate-curriculum.mjs';
import {normalizeLegacySmallDrawingScenes,useMatchingStoryOrderCaptions} from '../src/review/model.ts';

const fromRepo=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const getJson=async path=>JSON.parse(await fromRepo(path));
const redSea=await getJson('tests/fixtures/ot-031-original-review.json');
const schema=await getJson('curriculum/schema/lesson-v1.schema.json');

test('Blank automatically saved draft does not trigger Continue; every meaningful draft does',()=>{
 assert.equal(hasMeaningfulDraft(EMPTY_DRAFT),false);
 assert.equal(hasMeaningfulDraft(migrateDraftValue({})),false);
 for(const field of ['title','scripture','bigIdea','verseReference','verseText']){
  const draft=structuredClone(EMPTY_DRAFT);
  draft[field]='  Exodus 14 ';
  assert.equal(hasMeaningfulDraft(draft),true,field);
 }
 const moduleDraft=structuredClone(EMPTY_DRAFT);
 moduleDraft.modules['1:cover-activity']={type:'draw-story',prompts:''};
 assert.equal(hasMeaningfulDraft(moduleDraft),true,'chosen activity counts as work even before typing');
 const border=structuredClone(EMPTY_DRAFT);
 border.coverBorder='border-1';
 assert.equal(hasMeaningfulDraft(border),true,'customized cover remains resumable');
 const layout=structuredClone(EMPTY_DRAFT);
 layout.layouts[2]=DEFAULT_LAYOUTS[2]==='medium-large'?'large-medium':'medium-large';
 assert.equal(hasMeaningfulDraft(layout),true,'layout-only work is saved');
 const trimmed=structuredClone(EMPTY_DRAFT);
 trimmed.title='   ';
 assert.equal(hasMeaningfulDraft(trimmed),false,'spaces only are not meaningful content');
});
test('Explore Example builds an entirely populated four-page existing-placeholder demonstration',()=>{
 const sample=exampleWorksheetDraft();
 assert.equal(sample.title,'God Parts the Red Sea — Example Worksheet');
 assert.equal(sample.scripture,'Exodus 13–14');
 assert.equal(Object.keys(sample.modules).length,11);
 assert.equal(hasMeaningfulDraft(sample),true);
 assert.deepEqual(migrateDraftValue(sample),sample);
 assert.deepEqual(exampleWorksheetDraft(),sample,'built-in sample is deterministic');
 for(const page of [1,2,3,4]){
  for(const region of getRegions(page,page===1?DEFAULT_LAYOUTS[2]:sample.layouts[page])){
   if(region.kind!=='activity')continue;
   const module=sample.modules[page+':'+region.id];
   assert.ok(module,'example has no empty '+region.size+' placeholder on page '+page);
   assert.ok(moduleForSize(region.size).some(m=>m.id===module.type));
   assert.deepEqual(validateModule(module),[],module.type);
  }
 }
 const mod=sample.modules['1:cover-activity'];
 mod.events='Changed';
 assert.notDeepEqual(sample,exampleWorksheetDraft(),'every example receives an independent module copy');
 assert.deepEqual(EMPTY_DRAFT.modules,{});
});
test('Review-stage Red Sea lesson is completely absent from the public catalog until teacher approval and Scripture rights clearance',async()=>{
 assert.equal(PUBLIC_LESSONS.length,0);
 assert.deepEqual(validateLesson(redSea,schema),[]);
 const raw={lesson:redSea,scriptureDistributionCleared:true};
 assert.equal(approvedForPublic(raw),false);
 assert.throws(()=>buildWorksheetRecipe(redSea,'story-review',{purpose:'published'}),
  /editorial review only/);
 const flipped=structuredClone(redSea);
 flipped.publication.approved=true;
 assert.equal(approvedForPublic({lesson:flipped,scriptureDistributionCleared:true}),false);
 const approved=useMatchingStoryOrderCaptions(normalizeLegacySmallDrawingScenes(redSea));
 const source=await getJson('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
 approved.publication.approved=true;
 approved.publication.status='approved';
 approved.publication.teacherSignoff={reviewer:'Curriculum author',date:'2026-11-02'};
 approved.publication.resolvedReviewFlagIds=approved.reviewFlags
  .filter(f=>f.type==='teacher-approval').map(f=>f.id);
 // The historical review-stage fixture quotes ESV; move to the already
 // signed-off official BSB verse without rewriting its original Story Notes.
 approved.lessonDetails.memoryVerse=structuredClone(source.lessonDetails.memoryVerse);
 for(const key of ['firstLetters','finishVerse','unscrambleVerse',
  'upsideDownVerse','verseCryptogram','spiralVerse','connectVerse'])
  approved.preparedActivities[key]=structuredClone(source.preparedActivities[key]);
 approved.publication.scriptureRights=structuredClone(source.publication.scriptureRights);
 assert.deepEqual(validateLesson(approved,schema),[]);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:false}),false);
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true}),false,
  'a boolean is not enough; the caller must use the embedded evidence');
 assert.equal(approvedForPublic({lesson:approved,scriptureDistributionCleared:true,
  rightsEvidence:approved.publication.scriptureRights}),true);
 const removed=structuredClone(approved);
 delete removed.publication.scriptureRights;
 assert.equal(approvedForPublic({lesson:removed,scriptureDistributionCleared:true,
  rightsEvidence:source.publication.scriptureRights}),false,
  'detached rights evidence must never bypass the approved file');
 const result=buildWorksheetRecipe(approved,'story-review',{purpose:'published'});
 assert.equal(result.draft.title,approved.lessonDetails.title);
 assert.equal(result.reviewOnly,true,'draft build never itself certifies public publication');
 const publishedCatalog=await fromRepo('src/publishedLessonCatalog.ts');
 assert.doesNotMatch(publishedCatalog,/import.+curriculum\/review/u);
 assert.match(publishedCatalog,/curriculum\/approved\/\*\.lesson\.json/u);
 assert.doesNotMatch(publishedCatalog,/import\.meta\.glob\(['"]\.\.\/curriculum\/review/u);
});
test('A visit always starts at welcome, resume does not overwrite the draft, and replacements require confirmation',async()=>{
 const [app,welcome,css]=await Promise.all([
  fromRepo('src/App.tsx'),fromRepo('src/WelcomeScreen.tsx'),fromRepo('src/welcome.css')]);
 assert.match(app,/useState<'welcome'\|'editor'>\('welcome'\)/u);
 assert.match(app,/if\(view==='welcome'\)return <WelcomeScreen/u);
 assert.match(app,/hasSavedDraft=\{hasMeaningfulDraft\(draft\)\}/u);
 assert.match(app,/onResume=\{\(\)=>setView\('editor'\)\}/u);
 assert.match(app,/onStartBlank=\{\(\)=>startWorksheet\(structuredClone\(blank\)\)\}/u);
 assert.match(app,/onExploreExample=\{\(\)=>startWorksheet\(exampleWorksheetDraft\(\)\)\}/u);
 const replacement=app.slice(app.indexOf('  function startWorksheet('),
  app.indexOf('  function choosePublishedRecipe('));
 assert.ok(replacement.indexOf('window.confirm(')<replacement.indexOf('setDraft('));
 assert.match(replacement,/if\(!skipConfirmation&&hasMeaningfulDraft\(draft\)&&!window\.confirm\(/u);
 assert.match(replacement,/setDraft\(structuredClone\(next\)\)/u);
 assert.match(app,/className="welcome-home-button" type="button" onClick=\{\(\)=>setView\('welcome'\)\}/u);
 assert.match(welcome,/hasSavedDraft&&/u);
 assert.match(welcome,/Continue Your Worksheet/u);
 assert.match(welcome,/setScreen\('recipes'\)/u);
 assert.match(welcome,/Our story library is being prepared/u);
 assert.match(css,/@media \(max-width: 700px\)/u);
 assert.match(css, /prefers-reduced-motion/u);
 assert.doesNotMatch(app,/curriculum\/review|ot-031-god-parts-the-red-sea/u);
 assert.doesNotMatch(welcome,/curriculum\/review|ot-031-god-parts-the-red-sea/u);
});
test('Example booklet passes existing vector PDF pipeline without touching saved work',async()=>{
 const files={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const draft=exampleWorksheetDraft();
 const old=structuredClone(draft);
 const bytes=await createBookletPdf(draft,files);
 assert.deepEqual(draft,old);
 assert.ok(bytes.length>20000);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
});
