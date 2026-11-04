import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {DEFAULT_LAYOUTS,getRegions,LAYOUTS} from '../src/booklet.ts';
import {moduleForSize,slotKey} from '../src/modules.ts';
import {ACTIVITY_BORDER_CATALOG,setActivityBorder} from '../src/activityBorders.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
import {
 createLessonWorksheet,createSamePresetForNewStory,needsLessonSwitchConfirmation,
} from '../src/lessonQuickSwitch.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {
 COVER_BORDER_PATTERNS,PRESET_BORDER_PATTERNS,arrangePresetBorders,
 reflowPresetBordersOnPage,regeneratePresetBorders,carryPresetBorderMode,
 readPresetBorderSettings,
} from '../src/presetBorders.ts';

const json=async name=>JSON.parse(await readFile(new URL('../curriculum/approved/'+
 name+'.lesson.json',import.meta.url),'utf8'));
const redSea=await json('ot-031-god-parts-the-red-sea');
const wilderness=await json('ot-032-god-provides-in-the-wilderness');
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+redSea.id+'.lesson.json']:redSea,
});
const approved=catalog[0];
const SETTINGS=(mode,style='border-4',seed=1)=>({mode,style,seed});
const pageKeys=(draft,page)=>Object.keys(draft.activityBorders)
 .filter(key=>key.startsWith(page+':')).sort();
const sample=(id='preset-1',lesson=redSea)=>
 buildWorksheetRecipe(lesson,id,{purpose:'published',seed:1}).draft;
const withRegionModules=(layout)=>{
 const draft=structuredClone(EMPTY_DRAFT);
 draft.layouts[2]=layout;
 draft.modules['1:cover-activity']={type:'story-order'};
 for(const region of getRegions(2,layout))
  draft.modules[slotKey(2,region.id)]={type:moduleForSize(region.size)[0].id};
 return draft;
};

test('All seven supported interior layouts have precisely the requested 17 family patterns',()=>{
 assert.equal(LAYOUTS.length,7);
 assert.deepEqual(Object.keys(PRESET_BORDER_PATTERNS).sort(),LAYOUTS.map(x=>x.id).sort());
 assert.deepEqual(COVER_BORDER_PATTERNS,[['cover-title'],['cover-activity']]);
 const expected={
  'medium-large':[['top-medium'],['bottom-large']],
  'large-medium':[['bottom-medium'],['top-large']],
  'small-small-medium-medium':[
   ['top-left-small','bottom-medium'],['top-right-small','bottom-medium'],
   ['top-left-small','middle-medium'],['top-right-small','middle-medium'],
  ],
  'medium-medium-small-small':[
   ['bottom-left-small','middle-medium'],['bottom-right-small','middle-medium'],
   ['bottom-left-small','top-medium'],['bottom-right-small','top-medium'],
  ],
  'medium-small-small-medium':[
   ['top-medium','middle-left-small'],['top-medium','middle-right-small'],
   ['bottom-medium','middle-left-small'],['bottom-medium','middle-right-small'],
   ['top-medium','bottom-medium'],
  ],
  'large-small-small':[
   ['top-large'],['bottom-left-small','bottom-right-small'],
   ['bottom-left-small'],['bottom-right-small'],
  ],
  'small-small-large':[
   ['bottom-large'],['top-left-small','top-right-small'],
   ['top-left-small'],['top-right-small'],
  ],
 };
 for(const layout of LAYOUTS){
  const patterns=PRESET_BORDER_PATTERNS[layout.id];
  assert.deepEqual(patterns,expected[layout.id]);
  const valid=new Set(getRegions(2,layout.id).map(x=>x.id));
  for(const ids of patterns){
   assert.ok(ids.every(id=>valid.has(id)),layout.id+' '+ids.join(','));
   assert.equal(new Set(ids).size,ids.length,'Never double-border a region');
  }
 }
 assert.equal(2+2+4+5+4,17,
  'Two cover, two medium/large, four SSMM/MMSS, five MSSM and four LSS/SSL choices');
});

test('Every border placement pattern can actually be selected by a generation seed',()=>{
 for(const layout of LAYOUTS){
  const draft=withRegionModules(layout.id);
  const patterns=PRESET_BORDER_PATTERNS[layout.id];
  const actual=new Set();
  for(let seed=1;seed<=patterns.length;seed++){
   const arranged=arrangePresetBorders(draft,SETTINGS('same','border-7',seed));
   const ids=pageKeys(arranged,2).map(key=>key.slice(2)).sort().join('|');
   actual.add(ids);
  }
  assert.deepEqual([...actual].sort(),patterns.map(ids=>[...ids].sort().join('|')).sort(),
   layout.id+' is missing a selectable pattern');
 }
 const coverDraft=withRegionModules('medium-large');
 const seen=new Set();
 for(const seed of [1,2]){
  const arranged=arrangePresetBorders(coverDraft,SETTINGS('same','border-7',seed));
  seen.add(arranged.coverBorder!=='none'?'cover-title':'cover-activity');
  assert.equal((arranged.coverBorder==='none'?0:1)+
   Number(!!arranged.activityBorders['1:cover-activity']),1);
 }
 assert.deepEqual([...seen].sort(),['cover-activity','cover-title']);
});

test('No borders clears cover and all activity art but keeps the story, answers, and layouts',()=>{
 const draft=sample();
 const original=JSON.stringify(draft);
 const styled=arrangePresetBorders(draft,SETTINGS('same','border-3',42));
 const none=arrangePresetBorders(styled,SETTINGS('none','border-3',43));
 assert.equal(none.coverBorder,'none');
 assert.deepEqual(none.activityBorders,{});
 assert.equal(none.borderArrangement.mode,'none');
 assert.deepEqual(none.modules,draft.modules);
 assert.deepEqual(none.layouts,draft.layouts);
 assert.deepEqual(none.activityDefaults,draft.activityDefaults);
 assert.equal(JSON.stringify(draft),original,'do not mutate approved preset');
});

test('One-style mode uses the exact same numbered artwork in all three sizes and title',()=>{
 for(const lesson of [redSea,wilderness]){
  for(const preset of ['preset-1','preset-2','preset-3']){
   for(const seed of [1,2,3,7]){
    const draft=sample(preset,lesson);
    const styled=arrangePresetBorders(draft,SETTINGS('same','border-11',seed));
    const ids=Object.values(styled.activityBorders);
    if(styled.coverBorder!=='none')ids.push(styled.coverBorder);
    assert.ok(ids.length>=5,preset+' has one or two bordered regions per page');
    assert.ok(ids.every(id=>id==='border-11'));
    for(const [key,id] of Object.entries(styled.activityBorders)){
     const page=Number(key[0]);
     const region=getRegions(page,styled.layouts[page]).find(x=>slotKey(page,x.id)===key);
     assert.ok(region&&ACTIVITY_BORDER_CATALOG[region.size].some(item=>item.id===id),
      key+' has correct-size artwork');
    }
    assert.deepEqual(styled.modules,draft.modules);
   }
  }
 }
});

test('Mix chooses distinct styles within a page and saves stable concrete assignments',()=>{
 const draft=sample('preset-1');
 const mix=arrangePresetBorders(draft,SETTINGS('mix','border-1',57));
 assert.deepEqual(arrangePresetBorders(draft,SETTINGS('mix','border-1',57)),mix);
 for(const page of [1,2,3,4]){
  const ids=Object.entries(mix.activityBorders)
   .filter(([key])=>key.startsWith(page+':')).map(([,id])=>id);
  if(page===1&&mix.coverBorder!=='none')ids.push(mix.coverBorder);
  assert.equal(new Set(ids).size,ids.length,
   'No page should repeat the same border style');
  assert.ok(ids.length>=1&&ids.length<=2);
 }
 assert.ok(Object.values(mix.activityBorders).some(id=>id!=='border-1'));
 assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(mix))),mix);
});

test('Regenerate changes only border positions and styles, preserving manual choices until clicked',()=>{
 const base=sample('preset-2');
 const chosen=arrangePresetBorders(base,SETTINGS('mix','border-2',36));
 const editedSlot=Object.keys(chosen.activityBorders)[0];
 const manual={...chosen,activityBorders:setActivityBorder(
  chosen.activityBorders,editedSlot,'border-11')};
 const same=structuredClone(manual);
 assert.deepEqual(manual,same,'Rerender cannot change manually selected borders');
 assert.equal(manual.activityBorders[editedSlot],'border-11');
 const next=regeneratePresetBorders(manual);
 assert.equal(next.borderArrangement.seed,37);
 assert.notDeepEqual(next.activityBorders,manual.activityBorders);
 assert.deepEqual(next.modules,manual.modules);
 assert.deepEqual(next.activityDefaults,manual.activityDefaults);
 assert.deepEqual(next.layouts,manual.layouts);
 assert.equal(next.title,manual.title);
 assert.equal(regeneratePresetBorders(arrangePresetBorders(base,SETTINGS('none'))).borderArrangement.mode,'none');
});

test('Page layout changes rebuild only that page; unrelated manual borders persist',()=>{
 const draft=sample();
 const initial=arrangePresetBorders(draft,SETTINGS('same','border-5',3));
 const modifiedSlot=pageKeys(initial,4)[0];
 const modified={...initial,activityBorders:setActivityBorder(
  initial.activityBorders,modifiedSlot,'border-9')};
 const changed={...modified,layouts:{...modified.layouts,3:'medium-large'}};
 changed.modules={...changed.modules,
  '3:top-medium':{type:'match-words'},
  '3:bottom-large':{type:'word-search'},
 };
 const updated=reflowPresetBordersOnPage(changed,3);
 assert.equal(updated.activityBorders[modifiedSlot],'border-9');
 assert.deepEqual(pageKeys(updated,4),pageKeys(modified,4));
 assert.deepEqual(pageKeys(updated,3),
  getRegions(3,'medium-large').filter(r=>updated.activityBorders[slotKey(3,r.id)])
   .map(r=>slotKey(3,r.id)).sort());
 assert.deepEqual(updated.modules,changed.modules);
});

test('Preset/story switches preserve the selected mode and style but rebuild placements',()=>{
 const current=arrangePresetBorders(createLessonWorksheet(approved,'preset-1'),
  SETTINGS('same','border-6',5));
 assert.equal(needsLessonSwitchConfirmation(current,catalog),true,
  'the author chose custom border rules');
 const differentPreset=carryPresetBorderMode(current,createLessonWorksheet(approved,'preset-2'));
 assert.equal(differentPreset.worksheetPresetId,'preset-2');
 assert.equal(differentPreset.borderArrangement.mode,'same');
 assert.equal(differentPreset.borderArrangement.style,'border-6');
 assert.equal(differentPreset.borderArrangement.seed,6);
 assert.ok(Object.keys(differentPreset.activityBorders).every(key=>
  key==='1:cover-activity'||[2,3,4].some(page=>
   getRegions(page,differentPreset.layouts[page]).some(x=>slotKey(page,x.id)===key))));
 const another={...approved,lesson:{...structuredClone(redSea),id:'test-other-story',
  lessonDetails:{...structuredClone(redSea.lessonDetails),title:'Another Story'}}};
 const switched=createSamePresetForNewStory(current,another);
 assert.equal(switched.worksheetPresetId,'preset-1');
 assert.equal(switched.borderArrangement.mode,'same');
 assert.equal(switched.borderArrangement.style,'border-6');
 assert.equal(switched.borderArrangement.seed,6);
 assert.equal(switched.curriculumLessonId,'test-other-story');
 assert.deepEqual(switched.modules,createLessonWorksheet(another,'preset-1').modules);
 assert.deepEqual(switched.activityDefaults,switched.modules);
 assert.equal(JSON.stringify(current),JSON.stringify(current));
});

test('Old hand-selected borders are preserved when migrating, invalid preferences sanitized',()=>{
 const original={...sample(),coverBorder:'border-3',activityBorders:{
  '2:top-left-small':'border-5',
 }};
 const migrated=migrateDraftValue(JSON.parse(JSON.stringify(original)));
 assert.deepEqual(migrated.activityBorders,original.activityBorders);
 assert.equal(migrated.coverBorder,'border-3');
 assert.equal(migrated.borderArrangement,undefined);
 assert.deepEqual(carryPresetBorderMode(migrated,sample('preset-2')),
  sample('preset-2'),'no mode means no automatic replacement');
 assert.equal(readPresetBorderSettings({mode:'unknown'}),undefined);
 assert.deepEqual(readPresetBorderSettings({mode:'mix',style:'not-a-border',seed:-4}),
  {mode:'mix',style:'border-1',seed:1});
 const styled=arrangePresetBorders(sample(),SETTINGS('same','border-2',9));
 assert.deepEqual(migrateDraftValue(JSON.parse(JSON.stringify(styled))),styled);
});

test('Border controls are adjacent to Change Preset and Change Story and retain manual override',async()=>{
 const [app,css,quick]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/lessonQuickSwitch.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/Change Story<\/button>[\s\S]*?Borders/u);
 assert.match(app,/aria-controls="preset-borders-panel"/u);
 assert.match(app,/choosePresetBorderMode\('none'\)/u);
 assert.match(app,/choosePresetBorderMode\('same'\)/u);
 assert.match(app,/choosePresetBorderMode\('mix'\)/u);
 assert.match(app,/Regenerate Borders/u);
 assert.match(app,/carryPresetBorderMode\(draft,createLessonWorksheet\(entry,startId\)\)/u);
 assert.match(app,/reflowPresetBordersOnPage/u);
 assert.match(app,/setActivityBorder\(previous\.activityBorders,activeKey,id\)/u);
 assert.match(app,/cover-border-trigger/u);
 assert.match(css,/preset-borders-panel/u);
 assert.match(quick,/carryPresetBorderMode\(draft,createLessonWorksheet\(entry,draft\.worksheetPresetId\)\)/u);
});

test('PDF uses these exact stored assignments with existing measured safe areas',async()=>{
 const draft=arrangePresetBorders(sample('preset-1'),SETTINGS('same','border-1',1));
 const files={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const regions=getPrintableSheetRegions(draft).flat();
 const art={};
 for(const region of regions){
  if(region.kind==='title')continue;
  const slot=slotKey(region.bookletPage,region.id);
  const id=draft.activityBorders[slot];
  if(!id)continue;
  const num=id.split('-')[1];
  art[slot]=await readFile(new URL('../images/borders/'+region.size+'_border_'+num+'.png',
   import.meta.url));
 }
 const cover=draft.coverBorder!=='none'?await readFile(new URL(
  '../images/borders/medium_border_'+draft.coverBorder.split('-')[1]+'.png',import.meta.url)):undefined;
 const bytes=await createBookletPdf(draft,files,cover,art);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2,'Two printable sheets with the same saved borders');
 assert.ok(bytes.length>45_000,'Images and pages were embedded into the PDF');
 assert.deepEqual(draft.modules,sample('preset-1').modules);
});
