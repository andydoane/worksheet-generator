import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {getRegions,LAYOUTS} from '../src/booklet.ts';
import {MODULES,validateModule} from '../src/modules.ts';
import {WORKSHEET_RECIPES,buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {lessonContentPool,contentClaimsForModule,chooseUnusedLessonContent} from '../src/lessonContentPool.ts';
import {buildYourOwnLessonDraft,chooseActivityForDraft} from '../src/curriculumEditor.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {cryptogramLetters} from '../src/cryptograms.ts';
import {createBookletPdf} from '../src/pdf.ts';

const getJson=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const lesson=await getJson('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const rights=await getJson('curriculum/approved/rights-manifest.json');
const approved=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
},rights)[0];
assert.ok(approved,'Use the real teacher-signed and rights-cleared Red Sea lesson.');

const expected=[
 {id:'preset-1',layouts:['small-small-medium-medium','large-medium','medium-medium-small-small'],
  types:['finish-story','multiple-choice','draw-picture','true-false-maze','medium-word-search',
   'verse-cryptogram','match-words','unscramble-verse','circle-mistakes','unscramble-words','draw-picture']},
 {id:'preset-2',layouts:['large-medium','small-small-large','medium-medium-small-small'],
  types:['draw-story','connect-verse','pixel-picture','odd-words','multiple-choice','word-search',
   'big-idea-cryptogram','finish-verse','who-am-i','first-letters']},
 {id:'preset-3',layouts:['medium-small-small-medium','large-medium','large-medium'],
  types:['sort-story','upside-down-verse','true-false','checkboxes','connect-big-idea',
   'spiral-verse','true-false-maze','story-order','unscramble-verse']},
];

test('Three numbered preset definitions match the author spreadsheet and fill every activity region',()=>{
 assert.deepEqual(WORKSHEET_RECIPES.map(r=>r.id),expected.map(x=>x.id));
 assert.ok(LAYOUTS.some(x=>x.id==='small-small-large'));
 const regions=getRegions(3,'small-small-large');
 assert.deepEqual(regions.map(r=>[r.id,r.size]),[
  ['top-left-small','small'],['top-right-small','small'],['bottom-large','large'],
 ]);
 for(const specification of expected){
  const recipe=WORKSHEET_RECIPES.find(x=>x.id===specification.id);
  assert.deepEqual(Object.values(recipe.layouts),specification.layouts);
  assert.deepEqual(recipe.steps.map(x=>x.moduleId),specification.types);
  for(const step of recipe.steps){
   const region=getRegions(step.page,recipe.layouts[step.page===1?2:step.page])
    .find(r=>r.id===step.regionId);
   assert.ok(region,step.regionId);
   assert.equal(MODULES.find(x=>x.id===step.moduleId).size,region.size);
  }
 }
});

test('All numbered presets fill every region with approved, valid, globally nonrepeating items',()=>{
 for(const {id} of expected){
  const original=structuredClone(lesson);
  const built=buildWorksheetRecipe(approved.lesson,id,{purpose:'published'});
  assert.equal(built.openSlots.length,0,id);
  assert.equal(built.selections.length,built.draft&&Object.keys(built.draft.modules).length,id);
  assert.equal(built.draft.curriculumLessonId,lesson.id);
  assert.deepEqual(built.draft.activityDefaults,built.draft.modules);
  assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(built.draft))),built.draft);
  const seen=new Set();
  for(const selection of built.selections){
   const m=built.draft.modules[selection.slot];
   assert.equal(m.type,selection.moduleId,id+' '+selection.slot);
   assert.deepEqual(validateModule(m),[],id+' '+selection.slot);
   for(const key of contentClaimsForModule(m,lesson)){
    assert.equal(seen.has(key),false,id+' duplicated '+key+' at '+selection.slot);
    seen.add(key);
   }
  }
  assert.deepEqual(lesson,original,'a recipe cannot modify an approved curriculum source');
 }
});

test('The two drawings in Preset 1 are distinct and sourced from approved lesson prompts',()=>{
 const built=buildWorksheetRecipe(approved.lesson,'preset-1',{purpose:'published'});
 const drawings=built.selections.filter(s=>s.moduleId==='draw-picture')
  .map(s=>built.draft.modules[s.slot].prompt);
 assert.equal(drawings.length,2);
 assert.notEqual(drawings[0],drawings[1]);
 for(const text of drawings)assert.ok(lesson.drawingPrompts.some(d=>d.prompt===text));
});

test('Sort Story, True/False, and True/False Maze never share the same fact in Preset 3',()=>{
 const built=buildWorksheetRecipe(approved.lesson,'preset-3',{purpose:'published'});
 const modules=built.draft.modules;
 const sort=modules['1:cover-activity'];
 const tf=modules['2:middle-left-small'];
 const maze=modules['3:bottom-medium'];
 assert.equal(sort.type,'sort-story');
 assert.equal(tf.type,'true-false');
 assert.equal(maze.type,'true-false-maze');
 const sortClaims=new Set(contentClaimsForModule(sort,lesson));
 const tfClaims=contentClaimsForModule(tf,lesson);
 const mazeClaims=contentClaimsForModule(maze,lesson);
 assert.equal(tfClaims.length,1);
 assert.equal(mazeClaims.length,1);
 assert.equal(sortClaims.has(tfClaims[0]),false);
 assert.equal(sortClaims.has(mazeClaims[0]),false);
 assert.notEqual(tfClaims[0],mazeClaims[0]);
 assert.notEqual(tf.statement,maze.statement);
});

test('Manual authoring avoids shared content even across different module types',()=>{
 const scenarios=[
  ['true-false','true-false-maze'],
  ['big-idea-cryptogram','connect-big-idea'],
  ['connect-big-idea','big-idea-cryptogram'],
  ['story-order','big-idea-cryptogram'],
  ['draw-picture','draw-picture'],
  ['multiple-choice','multiple-choice'],
  ['who-am-i','who-am-i'],
  ['unscramble-words','unscramble-words'],
  ['odd-words','odd-words'],
  ['checkboxes','checkboxes'],
  ['match-words','match-words'],
 ];
 for(const [one,two] of scenarios){
  const draft=buildYourOwnLessonDraft(approved);
  const first=chooseActivityForDraft(one,draft,'2:top-left-small',[approved]);
  assert.equal(first.source,'lesson',one);
  draft.modules['2:top-left-small']=first.module;
  const second=chooseActivityForDraft(two,draft,'3:top-left-small',[approved]);
  assert.equal(second.source,'lesson',two);
  const a=new Set(contentClaimsForModule(first.module,lesson));
  const b=contentClaimsForModule(second.module,lesson);
  assert.equal(b.some(x=>a.has(x)),false,one+' vs '+two+' duplicate '+b.filter(x=>a.has(x)));
  assert.notDeepEqual(first.module,second.module);
 }
});

test('Shared fact and phrase identities are stable and survive manual edits',()=>{
 const pool=lessonContentPool(approved.lesson);
 assert.equal(pool.publicApproved,true);
 assert.ok(pool.candidates.filter(x=>x.moduleId==='draw-picture').length>=7);
 assert.ok(pool.candidates.filter(x=>x.moduleId==='multiple-choice').length>=8);
 assert.ok(pool.candidates.filter(x=>x.moduleId==='true-false-maze').length>=20);
 assert.ok(pool.candidates.filter(x=>x.moduleId==='unscramble-words').length>=5);
 assert.ok(pool.candidates.filter(x=>x.moduleId==='who-am-i').length>=4);
 const variants=pool.candidates.filter(x=>x.moduleId==='big-idea-cryptogram');
 assert.ok(variants.length>=2);
 const first=variants[0];
 const alternative=chooseUnusedLessonContent(variants,new Set(first.claims));
 assert.ok(alternative&&!alternative.reused.length);
 assert.notEqual(alternative.candidate.module.idea,first.module.idea);
 const sort=pool.candidates.find(x=>x.moduleId==='sort-story');
 assert.ok(sort.claims.includes('fact:tf-07'));
 const selectedMaze=chooseUnusedLessonContent(pool.candidates.filter(x=>x.moduleId==='true-false-maze'),
  new Set(sort.claims));
 assert.ok(selectedMaze&&!selectedMaze.reused.length);
});

test('Verse cipher key has exactly two logical rows for every count of 3–26 letters',async()=>{
 const [preview,pdf,css]=await Promise.all([
  readFile(new URL('../src/CryptogramPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/cryptogramPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
 ]);
 for(let n=3;n<=26;n++)assert.equal(cryptogramLetters('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0,n)).length,n);
 assert.match(preview,/gridTemplateColumns:/u);
 assert.doesNotMatch(preview,/chunks\.map/u);
 assert.match(pdf,/keyCols=data\.key\.length,keyRows=1/u);
 assert.match(pdf,/cellWidth\*\.70/u);
 assert.match(css,/\.cipher-key-row \{display:grid/u);
 assert.match(css,/\.cipher-key-row \.cipher-key-cell \{max-width:none/u);
});

test('All three teacher-selected presets produce printable two-sheet PDFs',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 for(const {id} of expected){
  const result=buildWorksheetRecipe(approved.lesson,id,{purpose:'published'});
  const bytes=await createBookletPdf(result.draft,fonts);
  const pdf=await PDFDocument.load(bytes);
  assert.ok(bytes.length>15000,id);
  assert.equal(pdf.getPageCount(),2,id);
  assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),
   [[792,612],[792,612]],id);
 }
});
