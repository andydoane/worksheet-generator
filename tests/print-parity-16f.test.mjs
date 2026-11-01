import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {BOOKLET,LAYOUTS,DEFAULT_LAYOUTS,SHEETS,getRegions} from '../src/booklet.ts';
import {getPrintableSheetRegions,createBookletPdf} from '../src/pdf.ts';
import {MODULES,matchRows,validateModule} from '../src/modules.ts';
import {ACTIVITY_BORDER_CATALOG,ACTIVITY_BORDER_ROTATION_DEGREES,
 ACTIVITY_SAFE_AREAS,planActivityBorderFit,planActivityPrintViewport,
 readActivityBorders} from '../src/activityBorders.ts';
import {COVER_BORDER_SAFE_HEIGHT,COVER_BORDER_SAFE_WIDTH} from '../src/coverBorders.ts';
import {planMatching} from '../src/mediumParityLayout.ts';
import {planMultipleChoice} from '../src/smallParityLayout.ts';
import {generateWordSearch,checkWordSearch} from '../src/puzzleEngines.ts';
import {planMediumWordSearch} from '../src/mediumWordSearchLayout.ts';
import {planWordSearch} from '../src/wordSearchLayout.ts';
import {generateCrossword} from '../src/specialtyModules.ts';
import {planCrossword} from '../src/crosswordLayout.ts';
import {planStory,STORY_BODY_WIDTH,STORY_BODY_HEIGHT} from '../src/storyLayout.ts';
import {LARGE_EXAMPLES} from '../scripts/pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from '../scripts/pr16d-fixtures.mjs';
import {SMALL_EXAMPLES,AUDIT_SLOTS,ALL_EXAMPLES,auditCoverage,makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const EPS=1e-6, P=72;
const close=(actual,expected,tol=EPS)=>assert.ok(Math.abs(actual-expected)<tol,
 'expected '+actual+' to equal '+expected+' (tolerance '+tol+')');
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
 Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const within=(inner,outer,label)=>{
 assert.ok(inner.x>=outer.x-EPS&&inner.y>=outer.y-EPS,label+' min outside');
 assert.ok(inner.x+inner.width<=outer.x+outer.width+EPS,label+' right outside');
 assert.ok(inner.y+inner.height<=outer.y+outer.height+EPS,label+' top outside');
};
let facesPromise;
async function faces(){
 if(!facesPromise)facesPromise=Promise.all([
  readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
  readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 ]).then(bytes=>bytes.map(x=>fontkit.create(x)));
 return facesPromise;
}
async function fonts(){
 return {
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
}
const pngCache=new Map();
async function png(size,n){
 const key=size+':'+n;
 if(!pngCache.has(key))pngCache.set(key,await readFile(new URL(
  '../images/borders/'+size+'_border_'+n+'.png',import.meta.url)));
 return pngCache.get(key);
}
async function selectedAssets(draft){
 const sheetRegions=getPrintableSheetRegions(draft).flat();
 const files={};
 for(const [slot,id] of Object.entries(draft.activityBorders)){
  const region=sheetRegions.find(r=>r.bookletPage+':'+r.id===slot);
  assert.ok(region,'slot missing: '+slot);
  files[slot]=await png(region.size,Number(id.slice(7)));
 }
 return files;
}
test('11 printable styles exist per size with correct proportions, and cover uses updated safe area',async()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(ACTIVITY_BORDER_CATALOG).map(([size,items])=>
  [size,items.length])),{small:11,medium:11,large:11});
 assert.deepEqual([COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT],[4.3,2.1]);
 assert.deepEqual(ACTIVITY_SAFE_AREAS.medium,{width:4.3,height:2.1});
 const inches={small:[2.4,2.6],medium:[4.8,2.6],large:[4.8,5.2]};
 for(const [size,[w,h]] of Object.entries(inches)){
  for(let n=1;n<=11;n++){
   const entry=ACTIVITY_BORDER_CATALOG[size][n-1];
   assert.equal(entry.id,'border-'+n);
   const data=await png(size,n);
   assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   const px=data.readUInt32BE(16),py=data.readUInt32BE(20);
   const rotation=ACTIVITY_BORDER_ROTATION_DEGREES[size];
   const [uprightW,uprightH]=rotation===90?[py,px]:[px,py];
   close(uprightW/uprightH,w/h,.002);
   assert.ok(uprightW>=w*120&&uprightH>=h*120,'border '+size+'/'+n+' too low-res');
  }
 }
});
test('All 26 registered module types occur in real 11-style audit booklets, with intentional None slots',()=>{
 const registered=Object.fromEntries(Object.keys(ALL_EXAMPLES).map(size=>[
  size,MODULES.filter(x=>x.size===size).map(x=>x.id).sort(),
 ]));
 assert.equal(Object.values(registered).reduce((sum,list)=>sum+list.length,0),26);
 assert.deepEqual(auditCoverage(),registered);
 for(let n=1;n<=11;n++){
  const draft=makeParityDraft(n);
  const style='border-'+n;
  assert.equal(draft.activityBorders['2:top-left-small'],style);
  assert.equal(draft.activityBorders['2:middle-medium'],style);
  assert.equal(draft.activityBorders['4:top-large'],style);
  assert.equal(draft.activityBorders['2:top-right-small'],undefined);
  assert.equal(draft.activityBorders['2:bottom-medium'],undefined);
  assert.equal(draft.activityBorders['3:bottom-large'],undefined);
  assert.equal(draft.activityBorders['4:bottom-right-small'],undefined);
  assert.equal(Object.keys(draft.modules).length,10);
  for(const module of Object.values(draft.modules))
   assert.deepEqual(validateModule(module),[],module.type+' style '+n);
  assert.deepEqual(readActivityBorders(draft.activityBorders),draft.activityBorders);
 }
});
test('Every booklet layout/side preserves browser region coordinates and disjoint printable content',()=>{
 const inches={small:[1.95,2.15],medium:[4.3,2.1],large:[4,4.35]};
 for(const id of LAYOUTS.map(x=>x.id)){
  for(let page=2;page<=4;page++){
   const layouts={...DEFAULT_LAYOUTS,[page]:id};
   const draft={title:'Geometry',scripture:'John 3:16',layouts};
   const sheets=getPrintableSheetRegions(draft);
   for(const [sheetIndex,items] of sheets.entries()){
    for(const item of items){
     const physical=getRegions(item.bookletPage,layouts[item.bookletPage]??DEFAULT_LAYOUTS[2])
      .find(region=>region.id===item.id);
     assert.ok(physical,'missing browser region');
     close(item.rect.width,physical.width*P);
     close(item.rect.height,physical.height*P);
     close(item.rect.x,
      ((item.side==='right'?BOOKLET.page.width:0)+physical.x)*P);
     close(item.rect.y,(BOOKLET.sheet.height-physical.y-physical.height)*P);
     const fit=planActivityBorderFit(item.size,item.rect);
     const safe=fit.viewport.content,original=fit.source;
     if(item.kind==='activity'){
      close(safe.width,inches[item.size][0]*P);
      close(safe.height,inches[item.size][1]*P);
      within(safe,item.rect,item.bookletPage+':'+item.id+' safe');
      within(original,item.rect,item.bookletPage+':'+item.id+' source');
      assert.ok(fit.scale>0&&fit.scale<=1,'no content expansion');
      close(fit.fittedWidth,original.width*fit.scale);
      close(fit.fittedHeight,original.height*fit.scale);
      const projected={
       x:original.x*fit.scale+fit.translateX,
       y:original.y*fit.scale+fit.translateY,
       width:original.width*fit.scale,height:original.height*fit.scale,
      };
      within(projected,safe,'projected content');
      close((projected.x+projected.width/2),(safe.x+safe.width/2));
      close((projected.y+projected.height/2),(safe.y+safe.height/2));
      assert.equal(fit.viewport.artworkRotationDegrees,item.size==='large'?90:0);
     }
     within(item.rect,{x:0,y:0,width:BOOKLET.sheet.width*P,height:BOOKLET.sheet.height*P},
      'sheet '+sheetIndex+' '+item.id);
    }
    for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){
     assert.ok(overlap(items[a].rect,items[b].rect)<EPS,
      'overlapping regions: '+items[a].id+' vs '+items[b].id+' on '+sheetIndex);
     if(items[a].kind==='activity'&&items[b].kind==='activity'){
      const aa=planActivityBorderFit(items[a].size,items[a].rect).viewport.content;
      const bb=planActivityBorderFit(items[b].size,items[b].rect).viewport.content;
      assert.ok(overlap(aa,bb)<EPS,'two activities share printable safe-area ink');
     }
    }
   }
  }
 }
});
test('Dense print plans keep grid, word banks and clue rows separate after bordered fit',async()=>{
 const [nunito,bank,puzzleFont,titleFont]=await faces();
 const metrics=face=>(s,n)=>face.layout(s).positions.reduce((total,p)=>total+p.xAdvance,0)*n/face.unitsPerEm;
 const measure={body:metrics(nunito),bank:metrics(bank),puzzle:metrics(puzzleFont),title:metrics(titleFont)};
 const projected=(size,x,y,w,h)=>{
  const dims={small:[2.4,2.6],medium:[4.8,2.6],large:[4.8,5.2]}[size];
  const fit=planActivityBorderFit(size,{x:0,y:0,width:dims[0]*P,height:dims[1]*P});
  const src={x:fit.source.x+x,y:fit.source.y+y,width:w,height:h};
  const out={x:fit.scale*src.x+fit.translateX,y:fit.scale*src.y+fit.translateY,
   width:w*fit.scale,height:h*fit.scale};
  within(out,fit.viewport.content,'ink '+size);
  return {out,fit};
 };
 const search=generateWordSearch(LARGE_EXAMPLES.find(x=>x.type==='word-search'));
 assert.ok(checkWordSearch(search));
 const wp=planWordSearch(search,{puzzle:measure.puzzle,bank:measure.bank});
 assert.ok(wp,'dense 12×10 Word Search planner failed');
 const largeGrid=projected('large',wp.gridX,wp.gridTop,wp.gridWidth,wp.gridHeight);
 assert.ok(wp.bankTop>=wp.gridTop+wp.gridHeight+8,'large grid collides with bank');
 assert.ok(wp.bankBottom<=360+EPS,'large bank outside source scene');
 for(const e of wp.bankEntries)assert.ok(e.y>wp.gridTop+wp.gridHeight,'word bank above grid');
 assert.ok(wp.letterSize*largeGrid.fit.scale>=10,'Large grid letters too small');
 assert.ok(wp.bankSize*largeGrid.fit.scale>=6,'Large bank below print-readability floor');
 const mediumSearch=generateWordSearch(MEDIUM_EXAMPLES.find(x=>x.type==='medium-word-search'));
 const mp=planMediumWordSearch(mediumSearch,{puzzle:measure.puzzle,bank:measure.bank,title:measure.title});
 assert.ok(mp);
 const mediumGrid=projected('medium',mp.gridX,mp.gridTop,mp.gridWidth,mp.gridHeight);
 const mediumBank=projected('medium',mp.bankX,mp.bankTop,mp.bankWidth,mp.bankHeight);
 assert.equal(overlap(mediumGrid.out,mediumBank.out),0);
 close(mediumGrid.out.width,mediumGrid.out.height);
 assert.ok(mp.bankSize*mediumGrid.fit.scale>=7.5);
 assert.ok(mp.titleSize*mediumGrid.fit.scale>=20);
 const match=MEDIUM_EXAMPLES.find(x=>x.type==='match-words');
 const rows=matchRows(match);
 const matching=planMatching(rows,measure.bank,measure.puzzle);
 assert.ok(matching);
 const mfit=planActivityBorderFit('medium',{x:0,y:0,width:4.8*P,height:2.6*P});
 for(let i=0;i<matching.leftRows.length;i++){
  const l=matching.leftRows[i],r=matching.rightRows[i],sz=matching.fontSize;
  const lw=measure.puzzle(l.text,sz),rw=measure.puzzle(r.text,sz);
  assert.ok(l.x+lw+8<=r.x-rw,'matching columns overlap at row '+i);
  assert.ok(l.x>=0&&r.x<=mfit.source.width);
 }
 assert.ok(matching.fontSize*mfit.scale>=7);
 const crossword=generateCrossword(LARGE_EXAMPLES.find(x=>x.type==='crossword'));
 const cp=planCrossword(crossword,measure.body);
 assert.ok(cp,'dense 10-word Crossword planner failed');
 const cb=projected('large',cp.gridX,cp.gridTop,cp.gridWidth,cp.gridHeight);
 assert.ok(cp.acrossHeader.y>cp.gridTop+cp.gridHeight,'crossword clues collide with cells');
 assert.ok(cp.downHeader.y>cp.gridTop+cp.gridHeight,'crossword clues collide with cells');
 assert.ok(cp.clueFontSize*cb.fit.scale>=5.5,
  'Crossword clues fall below 5.5pt; review legibility at actual print size');
 assert.ok(5.6*cb.fit.scale>=4.8,'Crossword cell numbers below technical floor');
 for(const row of [...cp.acrossRows,...cp.downRows]){
  const w=measure.body(row.text,cp.clueFontSize);
  assert.ok(row.x>=0&&row.x+w<331.2+EPS,'Crossword clue outside printable source');
  assert.ok(row.y<=360+EPS,'Crossword clue below printable source');
 }
 const story=LARGE_EXAMPLES.find(x=>x.type==='finish-story');
 const sp=planStory(story.story,measure.body,STORY_BODY_WIDTH,STORY_BODY_HEIGHT);
 assert.ok(sp,'dense story no longer fits');
 assert.ok(sp.fontSize*cb.fit.scale>=7.5,'story font below print floor');
 for(const token of sp.placements)
  assert.ok(token.x>=0&&token.x+token.width<=STORY_BODY_WIDTH+EPS,'story tokens cross their text column');
 const choice=SMALL_EXAMPLES.find(x=>x.type==='multiple-choice');
 const cplan=planMultipleChoice(choice,measure.title,()=>0);
 assert.ok(cplan,'Small choice plan must still fit after audit work');
 const sfit=planActivityBorderFit('small',{x:0,y:0,width:2.4*P,height:2.6*P});
 assert.ok(cplan.questionSize*sfit.scale>=10);
 assert.ok(cplan.rows.every(row=>row.fontSize*sfit.scale>=7.5));
 for(const row of cplan.rows)
  for(const line of row.lines)assert.ok(line.x>=row.squareX+row.squareSize,
   'choice text overlaps checkbox');
});
test('SVG preview and vector PDF use identical centered safe geometry, not independently distorted artwork',async()=>{
 const [app,css,pdf,picker,exporter]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/ActivityBorderPicker.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/exportPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.ok(app.includes('ACTIVITY_SAFE_AREAS[region.size]'));
 assert.ok(app.includes('planLargeBorderFit('));
 assert.ok(app.includes('bordered-small-safe'));
 assert.ok(app.includes('bordered-large-scene'));
 assert.ok(app.includes('moduleForSize(region.size)'));
 assert.match(css,/rotate\(90deg\)/u);
 assert.match(css,/bordered-large-scene/u);
 assert.match(pdf,/rotate:degrees\(-90\)/u);
 assert.match(pdf,/planActivityBorderFit\(item.size,item.rect\)/u);
 assert.match(pdf,/concatTransformationMatrix\(fit.scale,0,0,fit.scale/u);
 assert.match(picker,/aria-pressed=\{value===border.id\}/u);
 assert.match(exporter,/moduleForSize\(region.size\)/u);
 assert.ok(!pdf.includes('concatTransformationMatrix(fit.scale,0,0,1'),
  'non-uniform PDF scaling is forbidden');
});
test('Mixed bordered and unbordered pages export correctly and do not mutate puzzles or saved choices',async()=>{
 const files=await fonts();
 for(const style of [1,6,11]){
  const selected=makeParityDraft(style),baseline=makeParityDraft(style,{allBorderless:true});
  const snapshot=JSON.stringify(selected);
  const cover=selected.coverBorder==='none'?undefined:await png('medium',style);
  const printed=await createBookletPdf(selected,files,cover,await selectedAssets(selected));
  const plain=await createBookletPdf(baseline,files);
  const pdf=await PDFDocument.load(printed),old=await PDFDocument.load(plain);
  assert.equal(pdf.getPageCount(),2);
  assert.equal(old.getPageCount(),2);
  assert.ok(printed.byteLength>plain.byteLength+15000,'selected art absent '+style);
  assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  assert.equal(JSON.stringify(selected),snapshot,'PDF export must not mutate modules or assignments');
  const none=makeParityDraft(style,{allBorderless:true});
  assert.deepEqual(none.modules,selected.modules,
   'border selection should not alter puzzle content or seeded answers');
  assert.deepEqual(none.activityBorders,{});
 }
});
