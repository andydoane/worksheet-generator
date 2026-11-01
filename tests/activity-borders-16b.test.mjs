import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {BOOKLET,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT} from '../src/coverBorders.ts';
import {
 ACTIVITY_BORDER_CATALOG,ACTIVITY_SAFE_AREAS,ACTIVITY_BORDER_ROTATION_DEGREES,BORDER_READY_MODULES,
 activityBorderUrl,isActivityBorderReady,readActivityBorders,setActivityBorder,
 planActivityPrintViewport,
} from '../src/activityBorders.ts';
import {MODULES} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

test('Shared 33-asset gallery catalog has 11 real PNGs per size',async()=>{
 for(const [size,dimensions] of Object.entries({
  small:[2.4,2.6],medium:[4.8,2.6],large:[4.8,5.2],
 })){
  assert.equal(ACTIVITY_BORDER_CATALOG[size].length,11);
  for(let i=1;i<=11;i++){
   const border=ACTIVITY_BORDER_CATALOG[size][i-1];
   assert.equal(border.id,'border-'+i);
   assert.equal(border.name,'Border '+i);
   assert.equal(activityBorderUrl(size,border.id),border.url);
   const bytes=await readFile(new URL('../images/borders/'+size+'_border_'+i+'.png',import.meta.url));
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
   assert.ok(w>100&&h>100,size+' border '+i+' must be print resolution');
   // Large PNGs were uploaded landscape (5.2x4.8), and must be
   // rotated 90° when used in the 4.8x5.2 portrait module.
   const ratio=ACTIVITY_BORDER_ROTATION_DEGREES[size]===90?h/w:w/h;
   assert.ok(Math.abs(ratio-dimensions[0]/dimensions[1])<.03,size+' '+i+' oriented image ratio');
  }
  assert.equal(ACTIVITY_BORDER_ROTATION_DEGREES[size],size==='large'?90:0);
  assert.equal(activityBorderUrl(size,'none'),undefined);
  assert.equal(activityBorderUrl(size,'border-12'),undefined);
 }
});
test('Safe-area rectangles are centered, preserve borderless inset and never overflow',()=>{
 const dims={small:[2.4,2.6],medium:[4.8,2.6],large:[4.8,5.2]};
 const requested={small:[1.95,2.15],medium:[4.3,2.1],large:[4,4.35]};
 for(const size of Object.keys(dims)){
  const [w,h]=dims[size],rect={x:42,y:51,width:w*72,height:h*72};
  const standard=planActivityPrintViewport(size,rect,false);
  const bordered=planActivityPrintViewport(size,rect,true);
  assert.deepEqual(standard.artwork,rect);
  assert.deepEqual(bordered.artwork,rect);
  assert.equal(standard.bordered,false);
  assert.equal(bordered.bordered,true);
  assert.equal(bordered.artworkRotationDegrees,size==='large'?90:0);
  assert.ok(Math.abs(standard.content.width-(w-BOOKLET.padding*2)*72)<1e-8);
  assert.ok(Math.abs(standard.content.height-(h-BOOKLET.padding*2)*72)<1e-8);
  assert.ok(Math.abs(standard.content.x-rect.x-BOOKLET.padding*72)<1e-7);
  assert.ok(Math.abs(standard.content.y-rect.y-BOOKLET.padding*72)<1e-7);
  assert.ok(Math.abs(bordered.content.width-requested[size][0]*72)<1e-8);
  assert.ok(Math.abs(bordered.content.height-requested[size][1]*72)<1e-8);
  assert.ok(Math.abs(bordered.content.x+(bordered.content.width/2)-(rect.x+rect.width/2))<1e-8);
  assert.ok(Math.abs(bordered.content.y+(bordered.content.height/2)-(rect.y+rect.height/2))<1e-8);
  assert.ok(bordered.content.x>rect.x&&bordered.content.y>rect.y);
  assert.ok(bordered.content.x+bordered.content.width<rect.x+rect.width);
  assert.ok(bordered.content.y+bordered.content.height<rect.y+rect.height);
  assert.deepEqual(ACTIVITY_SAFE_AREAS[size],{width:requested[size][0],height:requested[size][1]});
 }
 assert.throws(()=>planActivityPrintViewport('small',{x:0,y:0,width:50,height:50},true),/does not fit/);
});
test('Saved borders are separate from module contents, slot-specific and backwards compatible',()=>{
 assert.deepEqual(readActivityBorders(undefined),{});
 assert.deepEqual(readActivityBorders([]),{});
 const stored={'1:cover-activity':'border-4','2:top-left-small':'border-11',
  '3:middle-medium':'none','4:top-large':'border-12',
  'z:invalid':'border-1','2:top-right-small':9};
 assert.deepEqual(readActivityBorders(stored),{
  '1:cover-activity':'border-4','2:top-left-small':'border-11',
 });
 const original={'2:top-left-small':'border-4','3:top-medium':'border-9'};
 const updated=setActivityBorder(original,'2:top-left-small','border-5');
 assert.deepEqual(original,{'2:top-left-small':'border-4','3:top-medium':'border-9'});
 assert.deepEqual(updated,{'2:top-left-small':'border-5','3:top-medium':'border-9'});
 assert.deepEqual(setActivityBorder(updated,'2:top-left-small','none'),{'3:top-medium':'border-9'});
});
test('16e enables all registered Small, Medium and Large modules',async()=>{
 const enabled=MODULES;
 assert.equal(BORDER_READY_MODULES.length,enabled.length);
 for(const module of MODULES)assert.equal(isActivityBorderReady(module.id),true);
 assert.equal(isActivityBorderReady(undefined),false);
 const [app,picker,pdf,css]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/ActivityBorderPicker.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
 ]);
 assert.match(app,/readActivityBorders\(value.activityBorders\)/);
 assert.match(app,/isActivityBorderReady\(activeModule\?\.type\)/);
 assert.match(app,/chooseActivityBorder/);
 assert.match(picker,/disabled=\{!enabled\}/);
 assert.match(picker,/Preview border styles/);
 assert.match(picker,/has-rotated-art/);
 assert.match(pdf,/isActivityBorderReady\(assigned\?\.type\)/);
 assert.match(css,/activity-border-editor/);
});
test('Cover safe height is now 2.1in in PDF and live preview, with legacy border-free option',async()=>{
 assert.equal(COVER_BORDER_SAFE_WIDTH,4.3);
 assert.equal(COVER_BORDER_SAFE_HEIGHT,2.1);
 const css=await readFile(new URL('../src/layout.css',import.meta.url),'utf8');
 assert.match(css,/height:80\.7692307692%/);
 const bytes=await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url));
 assert.ok(bytes.length>1000);
});
test('Unsupported saved activity borders fail clearly instead of overlaying unfitted modules',async()=>{
 const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const draft={title:'David and Goliath',scripture:'1 Samuel 17',
  layouts:{...DEFAULT_LAYOUTS},modules:{
   '2:top-medium':{type:'match-words',pairs:'David,King\nSaul,Soldier\nGoliath,Giant',seed:1},
  }};
 const legacy=await PDFDocument.load(await createBookletPdf(draft,fonts));
 const empty=await PDFDocument.load(await createBookletPdf({...draft,activityBorders:{}},fonts));
 assert.equal(legacy.getPageCount(),empty.getPageCount());
 await assert.rejects(()=>createBookletPdf({...draft,activityBorders:{'2:top-medium':'border-1'}},fonts),
  /Medium border image is missing/);
 await assert.rejects(()=>createBookletPdf({...draft,activityBorders:{'1:cover-activity':'border-5'}},fonts),
  /Activity borders are not supported/);
});
