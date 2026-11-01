import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {LARGE_EXAMPLES} from '../scripts/pr16e-fixtures.mjs';
import {BOOKLET} from '../src/booklet.ts';
import {MODULES,moduleForSize,validateModule} from '../src/modules.ts';
import {STORY_INNER_WIDTH,STORY_INNER_HEIGHT} from '../src/storyLayout.ts';
import {
 ACTIVITY_SAFE_AREAS,ACTIVITY_BORDER_ROTATION_DEGREES,
 ACTIVITY_BORDER_CATALOG,isActivityBorderReady,
 planLargeBorderFit,planSmallBorderFit,planMediumBorderFit,planActivityBorderFit,
} from '../src/activityBorders.ts';
import {createBookletPdf} from '../src/pdf.ts';

const slotKeys=['1:cover-activity','2:top-large','3:top-large','4:top-large'];
const styles=[1,6,11,3];
const layouts={2:'large-medium',3:'large-medium',4:'large-medium'};
const assets=new Map();
async function border(number){
 if(!assets.has(number))assets.set(number,await readFile(new URL(
  '../images/borders/large_border_'+number+'.png',import.meta.url)));
 return assets.get(number);
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
function draft(items,bordered){
 const modules={},activityBorders={};
 items.forEach((module,index)=>{
  modules[slotKeys[index]]=module;
  if(bordered)activityBorders[slotKeys[index]]='border-'+styles[index];
 });
 return {title:'David and Goliath',scripture:'1 Samuel 17',layouts,modules,activityBorders};
}
async function pngs(count){
 const result={};
 for(let i=0;i<count;i++)result[slotKeys[i]]=await border(styles[i]);
 return result;
}
test('Nine distinct Large types have individual enabled border choices',()=>{
 const registered=moduleForSize('large');
 assert.equal(registered.length,9);
 assert.deepEqual(new Set(LARGE_EXAMPLES.map(x=>x.type)),new Set(registered.map(x=>x.id)));
 assert.equal(MODULES.filter(x=>x.size==='large').length,9);
 for(const module of LARGE_EXAMPLES){
  assert.deepEqual(validateModule(module),[],module.type);
  assert.equal(isActivityBorderReady(module.type),true);
 }
 for(const m of MODULES)assert.equal(isActivityBorderReady(m.id),true,m.id);
 assert.equal(isActivityBorderReady(undefined),false);
});
test('Large safe-zone fit preserves original story geometry and uses one scale for both axes',()=>{
 const rect={x:35,y:85,width:BOOKLET.cell.width*2*72,height:BOOKLET.cell.height*2*72};
 const fit=planLargeBorderFit(rect),from=fit.source,to=fit.viewport.content;
 assert.deepEqual(fit,planActivityBorderFit('large',rect));
 assert.equal(ACTIVITY_SAFE_AREAS.large.width,4);
 assert.equal(ACTIVITY_SAFE_AREAS.large.height,4.35);
 assert.ok(Math.abs(from.width-STORY_INNER_WIDTH)<1e-8);
 assert.ok(Math.abs(from.height-STORY_INNER_HEIGHT)<1e-8);
 assert.ok(Math.abs(to.width-4*72)<1e-8);
 assert.ok(Math.abs(to.height-4.35*72)<1e-8);
 assert.ok(Math.abs(fit.scale-4/4.6)<1e-10);
 assert.ok(fit.scale>.86&&fit.scale<.88);
 assert.ok(Math.abs(fit.fittedWidth-to.width)<1e-8);
 assert.ok(fit.fittedHeight<=to.height+1e-8);
 assert.ok(to.height-fit.fittedHeight<.2);
 const left=fit.scale*from.x+fit.translateX;
 const bottom=fit.scale*from.y+fit.translateY;
 assert.ok(Math.abs(left-to.x)<1e-8);
 assert.ok(Math.abs(bottom-(to.y+(to.height-fit.fittedHeight)/2))<1e-8);
 const translated=planLargeBorderFit({...rect,x:810,y:600});
 assert.equal(translated.scale,fit.scale);
 assert.ok(translated.viewport.content.x>fit.viewport.content.x);
 assert.ok(translated.viewport.content.y>fit.viewport.content.y);
 const smallRect={x:10,y:20,width:2.4*72,height:2.6*72};
 assert.deepEqual(planSmallBorderFit(smallRect),planActivityBorderFit('small',smallRect));
 const mediumRect={x:10,y:20,width:4.8*72,height:2.6*72};
 assert.deepEqual(planMediumBorderFit(mediumRect),planActivityBorderFit('medium',mediumRect));
});
test('Every Large source PNG is landscape and requires the same upright 90° orientation',async()=>{
 assert.equal(ACTIVITY_BORDER_ROTATION_DEGREES.large,90);
 assert.equal(ACTIVITY_BORDER_CATALOG.large.length,11);
 for(let n=1;n<=11;n++){
  const bytes=await border(n);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert.ok(w>h,'Large original '+n+' is landscape');
  assert.ok(Math.abs(h/w-4.8/5.2)<.001,'Rotated image fits portrait Large slot');
 }
});
test('All nine Large modules export as real PDF with centered art, including mixed styles and dense examples',async()=>{
 const f=await fonts();
 const groups=[
  [LARGE_EXAMPLES[0],LARGE_EXAMPLES[3],LARGE_EXAMPLES[4],LARGE_EXAMPLES[2]],
  [LARGE_EXAMPLES[1],LARGE_EXAMPLES[5],LARGE_EXAMPLES[7],LARGE_EXAMPLES[6]],
  [LARGE_EXAMPLES[8],LARGE_EXAMPLES[2],LARGE_EXAMPLES[1],LARGE_EXAMPLES[0]],
 ];
 for(const group of groups){
  const selected=await createBookletPdf(draft(group,true),f,undefined,await pngs(group.length));
  const baseline=await createBookletPdf(draft(group,false),f);
  const parsed=await PDFDocument.load(selected),plain=await PDFDocument.load(baseline);
  assert.equal(parsed.getPageCount(),2);
  assert.equal(parsed.getPageCount(),plain.getPageCount());
  assert.deepEqual(parsed.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  assert.ok(selected.byteLength>baseline.byteLength+30000,'Border image bytes embedded');
 }
});
test('Large borderless drafts still work and missing artwork never silently removes a chosen border',async()=>{
 const f=await fonts();
 const source=draft([LARGE_EXAMPLES[0]],true);
 const control=await createBookletPdf(draft([LARGE_EXAMPLES[0]],false),f);
 assert.equal((await PDFDocument.load(control)).getPageCount(),2);
 await assert.rejects(()=>createBookletPdf(source,f),/Large border image is missing/u);
 const wrong={...source,modules:{'2:bottom-medium':LARGE_EXAMPLES[8]},
  activityBorders:{'2:bottom-medium':'border-1'}};
 await assert.rejects(()=>createBookletPdf(wrong,f),/not supported for this module and region/u);
});
test('Browser preview rotates Large PNG clockwise and uses exactly the PDF Large print-space fit',async()=>{
 const [app,css,pdf,exporter]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/exportPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/planLargeBorderFit\(/u);
 assert.match(app,/large-border-rotated/u);
 assert.match(app,/bordered-large-scene/u);
 assert.match(app,/moduleForSize\(region.size\)/u);
 assert.match(css,/rotate\(90deg\)/u);
 assert.match(css,/bordered-large-scene/u);
 assert.match(pdf,/rotate:degrees\(-90\)/u);
 assert.match(pdf,/planActivityBorderFit\(item.size,item.rect\)/u);
 assert.match(pdf,/concatTransformationMatrix\(fit.scale,0,0,fit.scale/u);
 assert.match(exporter,/moduleForSize\(region.size\)/u);
});
