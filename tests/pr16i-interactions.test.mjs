import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {SORT_STORY_SYMBOL_COUNT,sortStorySymbolIds,sortStorySymbolUrl,loadSortStorySymbolPng} from '../src/sortStorySymbols.ts';
import {planSortStory,SORT_STORY_WIDTH,SORT_STORY_HEIGHT} from '../src/sortStoryLayout.ts';
import {spiralPoints,spiralTurns,spiralWritingPoints,generateCrossword} from '../src/specialtyModules.ts';
import {planCrossword,CROSSWORD_HEIGHT} from '../src/crosswordLayout.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {LARGE_EXAMPLES} from '../scripts/pr16e-fixtures.mjs';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const story=LARGE_EXAMPLES.find(x=>x.type==='sort-story');
const spiral=LARGE_EXAMPLES.find(x=>x.type==='spiral-verse');
const crossword=LARGE_EXAMPLES.find(x=>x.type==='crossword');
const close=(a,b,tol=.0001)=>assert.ok(Math.abs(a-b)<=tol,String(a)+' ≈ '+String(b));
let cache;
async function fonts(){
 if(!cache)cache=Promise.all([
  'MouseMemoirs-Regular.ttf','Nunito-Medium.ttf','Nunito-Bold.ttf',
  'Nunito-ExtraBold.ttf','ZillaSlab-Bold-pdf.ttf'
 ].map(name=>readFile(new URL('../fonts/'+name,import.meta.url)))).then(
 ([title,body,bold,bank,puzzle])=>{
  const width=face=>(s,n)=>face.layout(s).positions.reduce(
   (sum,p)=>sum+p.xAdvance,0)*n/face.unitsPerEm;
  return {measures:{body:width(fontkit.create(body)),instruction:width(fontkit.create(bold))},
   pdf:{mouseMemoirs:title,nunitoSans:body,nunitoSans750:bold,
    nunitoSans900:bank,zillaSlab:puzzle}};
 });
 return cache;
}
test('All 30 uploaded symbol PNGs are square, uniform and sufficiently sharp',async()=>{
 assert.equal(SORT_STORY_SYMBOL_COUNT,30);
 let dimensions;
 for(let id=1;id<=30;id++){
  const bytes=await loadSortStorySymbolPng(id);
  assert.deepEqual(Array.from(bytes.slice(0,8)),[137,80,78,71,13,10,26,10]);
  const w=new DataView(bytes.buffer,bytes.byteOffset+16,8).getUint32(0);
  const h=new DataView(bytes.buffer,bytes.byteOffset+20,4).getUint32(0);
  assert.equal(w,h,'not square');
  assert.ok(w>=120);
  if(dimensions)assert.deepEqual([w,h],dimensions,'different symbol dimensions');
  dimensions=[w,h];
  assert.match(sortStorySymbolUrl(id),new RegExp('symbol__'+String(id).padStart(2,'0')+'\\.png'));
 }
 assert.throws(()=>sortStorySymbolUrl(31),/Unknown/);
});
test('Symbols are unique, seeded and kept inside the shared printable row boxes',async()=>{
 const {measures}=await fonts();
 for(const source of [story,{...story,statements:story.statements.split('\n').slice(0,5).join('\n')}]) {
  const ids=sortStorySymbolIds(source);
  assert.deepEqual(ids,sortStorySymbolIds(source));
  assert.equal(new Set(ids).size,ids.length);
  const plan=planSortStory(source,measures);
  assert.ok(plan);
  assert.deepEqual(plan.rows.map(x=>x.symbolId),ids);
  for(const row of plan.rows){
   assert.ok(row.symbolBox.x>=0&&row.symbolBox.y>=plan.bank.y);
   assert.ok(row.symbolBox.x+row.symbolBox.width<SORT_STORY_WIDTH);
   assert.ok(row.symbolBox.y+row.symbolBox.height<=plan.bank.y+plan.bank.height);
   assert.ok(row.lines.every(line=>line.x>=row.symbolBox.x+row.symbolBox.width));
  }
  assert.ok(plan.answers.every(x=>x.box.y+x.box.height<=SORT_STORY_HEIGHT));
 }
 assert.notDeepEqual(sortStorySymbolIds(story),sortStorySymbolIds({...story,seed:story.seed+1}));
});
test('Spiral points rotate exactly 90 degrees CCW without changing their radius',async()=>{
 for(const verse of ['Jesus wept.',spiral.verse]){
  const old=spiralPoints(800,spiralTurns(verse)).reverse();
  const now=spiralWritingPoints(verse);
  assert.equal(now.length,800);
  for(const i of [0,1,100,400,799]){
   close(now[i].x,old[i].y);
   close(now[i].y,1-old[i].x);
  }
 }
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/SpecialtyPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/spiralWritingPoints\(module\.verse\)/);
 assert.match(pdf,/spiralWritingPoints\(module\.verse\)/);
});
test('Crossword expands grid-to-clue space only when room remains, staying centered',async()=>{
 const {measures}=await fonts();
 const short={type:'crossword',seed:4,entries:[
  'DAVID, Young shepherd','GOLIATH, Giant from Gath',
  'SLING, Tool David used','STONE, Smooth rock',
  'SAUL, King of Israel','SHEEP, Animals in the field'
 ].join('\n')};
 let grew=false;
 for(const entry of [short,crossword])for(const height of [CROSSWORD_HEIGHT,420]){
  const plan=planCrossword(generateCrossword(entry),measures.body,331.2,height);
  assert.ok(plan);
  close(plan.contentTop,height-plan.contentBottom,.03);
  assert.ok(plan.clueGapGrowth>=0&&plan.clueGapGrowth<=30);
  assert.ok(plan.gridTop+plan.gridHeight+8<=plan.acrossHeader.y);
  assert.ok(plan.gridTop+plan.gridHeight+8<=plan.downHeader.y);
  if(plan.clueGapGrowth>1)grew=true;
  for(const row of [...plan.acrossRows,...plan.downRows])
   assert.ok(row.y+plan.clueFontSize*.3<=plan.contentBottom+.001);
 }
 assert.ok(grew,'The short puzzle should have room to spread out');
});
test('New Sort symbols export in identical mixed-content plain and bordered booklets',async()=>{
 const {pdf:fontFiles}=await fonts();
 const draft=makeParityDraft(6,{allBorderless:true});
 draft.modules['1:cover-activity']=structuredClone(story);
 draft.modules['4:top-large']=structuredClone(spiral);
 draft.modules['3:bottom-large']=structuredClone(crossword);
 const old=structuredClone(draft);
 const plain=await PDFDocument.load(await createBookletPdf(draft,fontFiles));
 assert.equal(plain.getPageCount(),2);
 assert.deepEqual(draft,old);
 const bordered=structuredClone(draft);
 bordered.activityBorders={
  '1:cover-activity':'border-3','4:top-large':'border-3','3:bottom-large':'border-3'
 };
 const slots=getPrintableSheetRegions(bordered).flat(),images={};
 for(const [slot,id] of Object.entries(bordered.activityBorders)){
  const region=slots.find(item=>item.bookletPage+':'+item.id===slot);
  assert.ok(region,slot);
  images[slot]=await readFile(new URL('../images/borders/'+region.size+
   '_border_'+id.slice(7)+'.png',import.meta.url));
 }
 const before=structuredClone(bordered);
 const pdf=await PDFDocument.load(await createBookletPdf(bordered,fontFiles,undefined,images));
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(bordered,before);
});
