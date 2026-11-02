import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {MODULES,validateModule} from '../src/modules.ts';
import {MODULE_GUIDANCE,newModuleWithExample,isAutofilledModule} from '../src/moduleGuidance.ts';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';
import {explainActivityError} from '../src/editorFeedback.ts';
import {planSortStory} from '../src/sortStoryLayout.ts';
import {sortStorySymbolIds} from '../src/sortStorySymbols.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const THEME_IDS=[
 'first-letters','finish-verse','unscramble-verse','spiral-verse',
 'upside-down-verse','connect-verse','verse-cryptogram',
 'connect-big-idea','big-idea-cryptogram',
];
const ALL_IDS=MODULES.map(x=>x.id);
test('Every module supplies a one-sentence instruction and new manual samples are valid',()=>{
 assert.deepEqual(Object.keys(MODULE_GUIDANCE).sort(),[...ALL_IDS].sort());
 for(const {id} of MODULES){
  const guide=MODULE_GUIDANCE[id];
  assert.ok(guide.instruction.trim().length>=35,'missing useful instruction for '+id);
  assert.equal(guide.instruction.trim().split(/[.!?]/u).filter(Boolean).length,1,
   'instructions should be one sentence: '+id);
  const selected=newModuleWithExample(id);
  assert.equal(selected.type,id);
  assert.deepEqual(validateModule(selected),THEME_IDS.includes(id)?validateModule(selected):[],
   'sample should validate immediately: '+id);
  assert.equal(isAutofilledModule(id),THEME_IDS.includes(id));
  if(THEME_IDS.includes(id))assert.equal(guide.sample,undefined,'theme-linked text must not be replaced');
 }
 const order=newModuleWithExample('story-order');
 assert.equal(order.events.split('\n').length,5);
 assert.match(order.events,/pillar of cloud/u);
 assert.match(order.events,/Pharaoh sent his soldiers/u);
 assert.deepEqual(validateModule(order),[]);
});
test('Saved drafts retain PR1 text, layout defaults, module assignments and chosen borders',()=>{
 const legacy={
  title:'My Old Lesson',scripture:'Exodus 14',
  bigIdea:'God keeps his promises',verseReference:'Psalm 23:1',
  verseText:'The Lord is my shepherd.',
  modules:{'2:top-large':{type:'story-order',seed:91,events:'My own events'},
   '3:bottom-large':{type:'sort-story',seed:12,
    statements:'God saved them. true\nThe people swam. false'}},
 };
 const copy=structuredClone(legacy);
 const old=migrateDraftValue(legacy);
 assert.deepEqual(legacy,copy);
 assert.equal(old.title,legacy.title);
 assert.equal(old.verseText,legacy.verseText);
 assert.equal(old.modules['2:top-large'].events,'My own events');
 assert.equal(old.modules['2:top-large'].seed,91);
 assert.equal(old.modules['3:bottom-large'].statements,legacy.modules['3:bottom-large'].statements);
 assert.deepEqual(old.activityBorders,{});
 assert.deepEqual(old.layouts,EMPTY_DRAFT.layouts);
 const complete=migrateDraftValue({...legacy,coverBorder:'border-1',
  layouts:{2:'bogus',3:EMPTY_DRAFT.layouts[3],4:EMPTY_DRAFT.layouts[4]},
  activityBorders:{'2:top-large':'border-3','5:wrong':'border-3'},
  modules:{...legacy.modules,'1:cover-activity':{type:'unknown',notReal:1}},
 });
 assert.deepEqual(complete.modules,old.modules,'only malformed module is omitted');
 assert.deepEqual(complete.activityBorders,{'2:top-large':'border-3'});
 assert.equal(complete.layouts[2],EMPTY_DRAFT.layouts[2]);
 assert.equal(complete.layouts[3],EMPTY_DRAFT.layouts[3]);
 assert.equal(complete.title,legacy.title);
});
test('Malformed storage input cannot erase or contaminate the next new draft',()=>{
 for(const value of [null,undefined,0,'invalid',[],{}]){
  assert.deepEqual(migrateDraftValue(value),EMPTY_DRAFT);
 }
 const a=migrateDraftValue({}),b=migrateDraftValue({});
 a.layouts[2]='not-a-layout';
 a.modules['2:top-large']=newModuleWithExample('story-order');
 assert.equal(b.layouts[2],EMPTY_DRAFT.layouts[2]);
 assert.deepEqual(b.modules,{});
 const malformed=migrateDraftValue({title:55,scripture:{},modules:[],
  coverBorder:'not-a-border',activityBorders:'invalid',layouts:[]});
 assert.deepEqual(malformed,EMPTY_DRAFT);
});
test('Editor errors identify missing events, invalid truth suffix, missing matching comma and missing crossword clue',()=>{
 const story={...newModuleWithExample('story-order'),events:'First\nSecond\nThird'};
 assert.match(explainActivityError(story,'Enter 5–8 story events, one per line, in chronological order.'),
  /3 story events.*Add 2 more/u);
 const sort={...newModuleWithExample('sort-story'),statements:
  'God guided them. true\nThis line is missing a suffix\nThey crossed the sea. false\nGod saved them. true'};
 assert.match(explainActivityError(sort,'End every line with true or false, separated by a space.'),/Line 2/u);
 const pair={...newModuleWithExample('match-words'),pairs:'Moses, Leader\nPharaoh\nSea, Water'};
 assert.match(explainActivityError(pair,'Each pair must contain both entries, separated by a comma.'),/Pair 2/u);
 const crossword={...newModuleWithExample('crossword'),entries:'DAVID, Shepherd\nSTONE\nGOLIATH, Giant'};
 assert.match(explainActivityError(crossword,'Each clue must contain 1–85 characters, following a comma.'),/entry 2/u);
 assert.equal(explainActivityError(story,'A different error'),'A different error');
});
test('Sort Story symbols grow to 21pt square with no strokes in both SVG preview and PDF',async()=>{
 const m=newModuleWithExample('sort-story');
 const face=fontkit.create(await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)));
 const bold=fontkit.create(await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)));
 const measure=font=>(value,size)=>font.layout(value).positions.reduce(
  (sum,pos)=>sum+pos.xAdvance,0)*size/font.unitsPerEm;
 const plan=planSortStory(m,{body:measure(face),instruction:measure(bold)});
 assert.ok(plan);
 assert.equal(plan.rows.length,6);
 assert.deepEqual(plan.rows.map(x=>x.symbolId),sortStorySymbolIds(m));
 for(const row of plan.rows){
  assert.equal(row.symbolBox.width,21);
  assert.equal(row.symbolBox.height,21);
  assert.ok(row.symbolBox.y>=plan.bank.y&&row.symbolBox.y+21<=plan.bank.y+plan.bank.height);
 }
 const [svg,pdf]=await Promise.all([
  readFile(new URL('../src/SortStoryPrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/storyVersePdf.ts',import.meta.url),'utf8')]);
 assert.doesNotMatch(svg,/<rect x=\{row\.symbolBox\.x\}/u);
 assert.doesNotMatch(pdf,/rectangle\(row\.symbolBox\)/u);
 assert.match(svg,/width=\{row\.symbolBox\.width\}/u);
 assert.match(pdf,/width:row\.symbolBox\.width,height:row\.symbolBox\.height/u);
});
test('Selector uses new samples only for new activities and shows appropriate guidance and validation',async()=>{
 const [app,css]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8')]);
 assert.match(app,/newModuleWithExample\(type\)/u);
 assert.match(app,/migrateDraftValue\(JSON\.parse\(stored\)\)/u);
 assert.match(app,/MODULE_GUIDANCE\[activeModule\.type\]\.instruction/u);
 assert.match(app,/explainActivityError\(activeModule!,error\)/u);
 assert.match(app,/compatible module choices/u);
 assert.match(app,/aria-describedby="activity-module-help"/u);
 assert.match(css,/\.activity-guidance/u);
});
test('Starter story-order, Sort symbols and Crossword export as actual PDF without mutating draft',async()=>{
 const data=makeParityDraft(6,{allBorderless:true});
 data.modules['1:cover-activity']=newModuleWithExample('sort-story');
 data.modules['4:top-large']=newModuleWithExample('story-order');
 data.modules['3:bottom-large']=newModuleWithExample('crossword');
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const old=structuredClone(data);
 const pdf=await PDFDocument.load(await createBookletPdf(data,fonts));
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(data,old);
});
