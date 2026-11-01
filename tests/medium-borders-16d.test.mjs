import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {EXAMPLES} from '../scripts/pr16d-fixtures.mjs';
import {BOOKLET} from '../src/booklet.ts';
import {MODULES,moduleForSize,validateModule} from '../src/modules.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {generateWordSearch,checkWordSearch} from '../src/puzzleEngines.ts';
import {planMediumWordSearch} from '../src/mediumWordSearchLayout.ts';
import {
 ACTIVITY_SAFE_AREAS,ACTIVITY_BORDER_CATALOG,
 planActivityPrintViewport,planSmallBorderFit,planMediumBorderFit,
 planActivityBorderFit,isActivityBorderReady,
} from '../src/activityBorders.ts';
import {createBookletPdf} from '../src/pdf.ts';

const POINTS_PER_INCH=72;
const slots=['2:top-medium','2:middle-medium','3:top-medium','3:middle-medium','4:top-medium','4:middle-medium'];
const layouts={2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'};
const draft=(items,bordered=false)=>{
 const modules={},activityBorders={};
 items.forEach((item,index)=>{
  modules[slots[index]]=item;
  if(bordered)activityBorders[slots[index]]='border-'+[1,6,11,3,8,10][index];
 });
 return {title:'David and Goliath',scripture:'1 Samuel 17',layouts,modules,activityBorders};
};
async function fonts(){
 return {
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
}
const png=async n=>await readFile(new URL('../images/borders/medium_border_'+n+'.png',import.meta.url));
async function artwork(){
 const result={};
 for(const [i,key]of slots.entries())result[key]=await png([1,6,11,3,8,10][i]);
 return result;
}
test('All nine registered Medium activities accept individual border designs and Large stays gated',()=>{
 const medium=moduleForSize('medium'),small=moduleForSize('small'),large=moduleForSize('large');
 assert.equal(medium.length,9);
 assert.deepEqual(new Set(EXAMPLES.map(e=>e.type)),new Set(medium.map(e=>e.id)));
 assert.equal(ACTIVITY_BORDER_CATALOG.medium.length,11);
 for(const example of EXAMPLES){
  assert.deepEqual(validateModule(example),[],example.type);
  assert.ok(isActivityBorderReady(example.type),example.type);
 }
 for(const m of small)assert.ok(isActivityBorderReady(m.id),m.id);
 for(const m of large)assert.equal(isActivityBorderReady(m.id),false,m.id);
});
test('Medium 4.6×2.4 original viewport maps uniformly inside centered 4.3×2.1 bordered safe area',()=>{
 const rect={x:59,y:87,width:BOOKLET.cell.width*2*72,height:BOOKLET.cell.height*72};
 const source=planActivityPrintViewport('medium',rect,false).content;
 const safe=planActivityPrintViewport('medium',rect,true).content;
 const fit=planMediumBorderFit(rect);
 assert.ok(Math.abs(source.width-MEDIUM_PRINT_WIDTH)<1e-8);
 assert.ok(Math.abs(source.height-MEDIUM_PRINT_HEIGHT)<1e-8);
 assert.ok(Math.abs(safe.width-ACTIVITY_SAFE_AREAS.medium.width*72)<1e-8);
 assert.ok(Math.abs(safe.height-ACTIVITY_SAFE_AREAS.medium.height*72)<1e-8);
 assert.ok(Math.abs(fit.scale-.875)<1e-10);
 assert.ok(Math.abs(fit.fittedWidth-289.8)<1e-8);
 assert.ok(Math.abs(fit.fittedHeight-safe.height)<1e-8);
 assert.ok(Math.abs((safe.width-fit.fittedWidth)/2-9.9)<1e-8);
 assert.deepEqual(fit,planActivityBorderFit('medium',rect));
 assert.ok(Math.abs(fit.translateX+fit.source.x*fit.scale-(safe.x+(safe.width-fit.fittedWidth)/2))<1e-8);
 assert.ok(Math.abs(fit.translateY+fit.source.y*fit.scale-safe.y)<1e-8);
 const moved=planMediumBorderFit({...rect,x:1100,y:540});
 assert.equal(moved.scale,fit.scale);
 assert.deepEqual(moved.viewport.content,planActivityPrintViewport('medium',{...rect,x:1100,y:540},true).content);
 // The Small uniform fit must remain unchanged by the generalized planner.
 const smallRect={x:16,y:23,width:BOOKLET.cell.width*72,height:BOOKLET.cell.height*72};
 assert.deepEqual(planSmallBorderFit(smallRect),planActivityBorderFit('small',smallRect));
});
test('9×9 Word Search: one-to-six words, square grid, bank and title stay inside the Medium safe area',async()=>{
 const file=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const [puzzle,bank,title]=await Promise.all([
  doc.embedFont(file.zillaSlab,{subset:false}),
  doc.embedFont(file.nunitoSans900,{subset:false}),
  doc.embedFont(file.mouseMemoirs,{subset:false}),
 ]);
 const metrics={puzzle:(s,n)=>puzzle.widthOfTextAtSize(s,n),
  bank:(s,n)=>bank.widthOfTextAtSize(s,n),
  title:(s,n)=>title.widthOfTextAtSize(s,n)};
 const cases=['Moses','David\\nGoliath\\nSling',
  'Shepherd\\nPassover\\nCreation\\nJerusalem\\nRighteous\\nCommanded'];
 const rect={x:192,y:72,width:4.8*72,height:2.6*72};
 const fit=planMediumBorderFit(rect),target=fit.viewport.content;
 const toX=x=>(fit.source.x+x)*fit.scale+fit.translateX;
 const toY=y=>(fit.source.y+fit.source.height-y)*fit.scale+fit.translateY;
 for(const words of cases)for(const seed of [2,7]){
  const result=generateWordSearch({type:'medium-word-search',words:words.replaceAll('\\n','\n'),seed});
  assert.ok(checkWordSearch(result));
  const plan=planMediumWordSearch(result,metrics);
  assert.ok(plan,'must fit '+result.labels.length+' words');
  assert.equal(plan.letters.length,81);
  assert.ok(Math.abs(plan.gridHeight-plan.gridWidth)<1e-8);
  assert.ok(plan.cell*fit.scale>=15,'readable square grid after fitting');
  assert.ok(toX(plan.gridX-2)>=target.x-.001);
  assert.ok(toX(plan.gridX+plan.gridWidth+2)<=target.x+target.width+.001);
  assert.ok(toX(plan.titleX)>target.x+target.width/2);
  assert.ok(toX(plan.titleX)<target.x+target.width);
  assert.ok(toX(plan.bankX+plan.bankWidth)<=target.x+target.width+.001);
  assert.ok(toY(plan.gridTop-2)<=target.y+target.height+.001);
  assert.ok(toY(plan.gridTop+plan.gridHeight+2)>=target.y-.001);
  assert.ok(plan.bankEntries.every(e=>e.y>=2&&e.y<=MEDIUM_PRINT_HEIGHT-2));
  assert.ok(plan.rightStackTop>=0&&plan.rightStackTop+plan.rightStackHeight<=MEDIUM_PRINT_HEIGHT);
 }
});
test('All Medium types generate real bordered PDFs and preserve borderless export behavior',async()=>{
 const files=await fonts(),images=await artwork();
 const groups=[EXAMPLES.slice(0,6),[...EXAMPLES.slice(6),EXAMPLES[0],EXAMPLES[1],EXAMPLES[3]]];
 for(const examples of groups){
  const normal=await createBookletPdf(draft(examples,false),files);
  const bordered=await createBookletPdf(draft(examples,true),files,undefined,images);
  const a=await PDFDocument.load(normal),b=await PDFDocument.load(bordered);
  assert.equal(a.getPageCount(),2);assert.equal(b.getPageCount(),2);
  assert.deepEqual(b.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  assert.ok(bordered.byteLength>normal.byteLength+5000,'PNG art embeds when borders selected');
 }
});
test('Medium PDF refuses missing artwork, while unsupported Large borders remain rejected',async()=>{
 const files=await fonts();
 await assert.rejects(()=>createBookletPdf(draft([EXAMPLES[0]],true),files),/medium border image is missing/i);
 const bad={...draft([]),layouts:{...layouts,2:'large-medium'},
  modules:{'2:top-large':{type:'finish-story',story:'[David] [trusted] [in] [God] [before] [Goliath].',seed:1}},
  activityBorders:{'2:top-large':'border-1'}};
 await assert.rejects(()=>createBookletPdf(bad,files),/not yet supported/u);
});
test('Editor preview and PDF export share Medium artwork, safe area and uniform transform',async()=>{
 const [app,css,pdf,exporter]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/exportPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/ACTIVITY_SAFE_AREAS\[region.size\]/u);
 assert.ok(app.includes("region.size!=='large'"));
 assert.match(app,/bordered-small-safe/u);
 assert.match(css,/bordered-small-safe/u);
 assert.match(pdf,/planActivityBorderFit\(item.size,item.rect\)/u);
 assert.match(pdf,/concatTransformationMatrix\(fit.scale,0,0,fit.scale/u);
 assert.match(pdf,/item.size\+':'\+selections\[key\]/u);
 assert.match(exporter,/region.size==='large'/u);
});
