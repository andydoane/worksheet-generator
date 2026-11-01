import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {BOOKLET,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {MODULES,validateModule} from '../src/modules.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from '../src/smallParityLayout.ts';
import {planSmallBorderFit,ACTIVITY_SAFE_AREAS,isActivityBorderReady} from '../src/activityBorders.ts';
import {createBookletPdf} from '../src/pdf.ts';

const PT=72;
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
const data=[
 {type:'draw-picture',prompt:'David collects five smooth stones and prepares to face the giant Goliath'},
 {type:'multiple-choice',question:'What did David use to defeat the giant when he trusted in the Lord?',correct:'A small stone and a sling',wrong1:'An enormous sharp sword',wrong2:'A heavy protective shield',seed:3},
 {type:'true-false',statement:'The Lord helped David defeat the giant Goliath with just a smooth stone.'},
 {type:'first-letters',reference:'1 Samuel 17:47',verse:'All those gathered here will know that it is not by sword or spear that the Lord saves for the battle is the Lord'},
 {type:'odd-words',correct:'DAVID\\nGOLIATH\\nSHEPHERD\\nSTONE\\nSLING',incorrect:'PHARAOH\\nJONAH\\nRAVEN\\nCANAAN\\nMATTHEW',seed:8},
 {type:'unscramble-words',first:'GOLIATH',second:'SMOOTH ROCK',seed:6},
 {type:'checkboxes',correct:'SLING\\nSTONE\\nSHEPHERD\\nGOLIATH\\nISRAEL',incorrect:'GARDEN\\nPHARAOH\\nTEMPLE\\nRAINBOW\\nMANGER',seed:4},
 {type:'who-am-i',clue:'I used a sling and a smooth stone, trusted God, and defeated a giant before becoming king.',answer:'DAVID'},
];
for(const m of data)for(const k of ['correct','incorrect'])if(k in m)m[k]=m[k].replaceAll('\\n','\n');
const art=async n=>await readFile(new URL('../images/borders/small_border_'+n+'.png',import.meta.url));
const layout={2:'small-small-medium-medium',3:'small-small-medium-medium',4:'small-small-medium-medium'};
const slots=['2:top-left-small','2:top-right-small','3:top-left-small','3:top-right-small','4:top-left-small','4:top-right-small'];
const base={title:'David and Goliath',scripture:'1 Samuel 17',layouts:layout,modules:{}};
function assign(modules,borderNos){
 const result={...base,modules:{},activityBorders:{}};
 const assets={};
 modules.forEach((module,i)=>{
  const key=slots[i];
  result.modules[key]=module;
  result.activityBorders[key]='border-'+borderNos[i];
 });
 return result;
}
test('Eight Small types remain enabled alongside Medium, while Large is disabled',()=>{
 assert.equal(data.length,8);
 assert.equal(MODULES.filter(m=>m.size==='small').length,8);
 for(const m of data){
  assert.equal(validateModule(m).length,0,m.type);
  assert.equal(isActivityBorderReady(m.type),true,m.type);
 }
 for(const m of MODULES.filter(m=>m.size!=='small'))
  assert.equal(isActivityBorderReady(m.id),m.size==='medium',m.id);
});
test('Unbordered 2.2x2.4in print planner fits uniformly into 1.95x2.15in content without warping',()=>{
 const rect={x:123,y:79,width:BOOKLET.cell.width*PT,height:BOOKLET.cell.height*PT};
 const fitted=planSmallBorderFit(rect);
 assert.ok(Math.abs(fitted.source.width-SMALL_PRINT_WIDTH)<1e-8);
 assert.ok(Math.abs(fitted.source.height-SMALL_PRINT_HEIGHT)<1e-8);
 assert.ok(Math.abs(fitted.viewport.content.width-ACTIVITY_SAFE_AREAS.small.width*PT)<1e-8);
 assert.ok(Math.abs(fitted.viewport.content.height-ACTIVITY_SAFE_AREAS.small.height*PT)<1e-8);
 assert.ok(fitted.scale>.88&&fitted.scale<.90,'letter/cell size must remain close to original');
 assert.ok(fitted.fittedWidth<=fitted.viewport.content.width+1e-8);
 assert.ok(fitted.fittedHeight<=fitted.viewport.content.height+1e-8);
 for(const x of [fitted.source.x,fitted.source.x+fitted.source.width])
  assert.ok(fitted.scale*x+fitted.translateX>=fitted.viewport.content.x-1e-8&&
    fitted.scale*x+fitted.translateX<=fitted.viewport.content.x+fitted.viewport.content.width+1e-8);
 for(const y of [fitted.source.y,fitted.source.y+fitted.source.height])
  assert.ok(fitted.scale*y+fitted.translateY>=fitted.viewport.content.y-1e-8&&
    fitted.scale*y+fitted.translateY<=fitted.viewport.content.y+fitted.viewport.content.height+1e-8);
 const unchanged=planSmallBorderFit({...rect,x:rect.x+500,y:rect.y+70});
 assert.equal(unchanged.scale,fitted.scale);
});
test('Real printed PDF supports six mixed bordered Small modules, mixed designs, and legacy export',async()=>{
 const ff=await fonts();
 const allPngs=await Promise.all([art(1),art(6),art(11)]);
 const source=assign(data.slice(0,6),[1,6,11,1,6,11]);
 const assets=Object.fromEntries(slots.map((key,i)=>[key,allPngs[i%3]]));
 const bytes=await createBookletPdf(source,ff,undefined,assets);
 const parsed=await PDFDocument.load(bytes);
 assert.equal(parsed.getPageCount(),2);
 assert.deepEqual(parsed.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
 const plain=await PDFDocument.load(await createBookletPdf({...source,activityBorders:{}},ff));
 assert.equal(plain.getPageCount(),parsed.getPageCount());
 assert.ok(bytes.length>150000);
});
test('Checkbox, Who Am I and writing modules print inside bordered Small slots',async()=>{
 const ff=await fonts();
 const source=assign([data[6],data[7],data[0]],[11,6,1]);
 const bytes=await createBookletPdf(source,ff,undefined,{
  [slots[0]]:await art(11),[slots[1]]:await art(6),[slots[2]]:await art(1),
 });
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
});
test('Unprovided Small PNG fails visibly and Large borders remain gated',async()=>{
 const ff=await fonts();
 const draft=assign([data[0]],[2]);
 await assert.rejects(()=>createBookletPdf(draft,ff),/Small border image is missing/u);
 const bad={...base,layouts:{...base.layouts,2:'large-medium'},modules:{'2:top-large':{type:'finish-story',story:'[Jesus] is the [Lord] and [King] of all the [earth].',seed:1}},activityBorders:{'2:top-large':'border-1'}};
 await assert.rejects(()=>createBookletPdf(bad,ff),/not yet supported/u);
});
test('Preview uses the same full-art and centered safe zone as the PDF, without changing borderless geometry',async()=>{
 const [app,css,pdf,exporter]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/exportPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/bordered-small-activity/u);
 assert.match(app,/activityBorderUrl\(region.size/u);
 assert.match(app,/ACTIVITY_SAFE_AREAS.small/u);
 assert.match(css,/bordered-small-safe/u);
 assert.match(css,/object-fit:fill/u);
 assert.match(pdf,/planActivityBorderFit\(item.size,item.rect\)/u);
 assert.match(pdf,/concatTransformationMatrix\(fit.scale,0,0,fit.scale/u);
 assert.match(pdf,/page.drawImage\(image/u);
 assert.match(exporter,/activityBorderUrl\(region.size,id\)/u);
});

test('Boundary-length inputs have the same PDF fit outcome with and without a Small border',async()=>{
 const ff=await fonts(),png=await art(11),key=slots[0];
 // These are the published *editor* maxima, including layouts that already
 // correctly ask users to shorten the text in the normal borderless mode.
 const scenarios=[
  {type:'draw-picture',prompt:'David and his friends traveled through the village to share good news with every family in the town.'},
  {type:'true-false',statement:'D'.repeat(80)},
  {type:'multiple-choice',question:'What '.repeat(21).slice(0,105),
   correct:'stone '.repeat(7).slice(0,42).trim(),wrong1:'shield '.repeat(6).slice(0,42).trim(),
   wrong2:'sword '.repeat(7).slice(0,42).trim(),seed:6},
  {type:'first-letters',reference:'1 Corinthians 13:4',verse:Array.from({length:75},()=> 'love').join(' ')},
  {type:'odd-words',correct:['BETHLEHEM','NAZARETH','GOLIATH','JERUSALEM','DAVID'].join(String.fromCharCode(10)),
   incorrect:['NEBUCHADNEZ','PHARAOH','MATTHEW','CANAAN','JONATHAN'].join(String.fromCharCode(10)),seed:8},
  {type:'unscramble-words',first:'BETHLEHEM',second:'JERUSALEM',seed:12},
  {type:'checkboxes',correct:['BETHLEHEM','NAZARETH','GOLIATH','JERUSALEM','DAVID'].join(String.fromCharCode(10)),
   incorrect:['NEBUCHADNEZ','PHARAOH','MATTHEW','CANAAN','JONATHAN'].join(String.fromCharCode(10)),seed:10},
  {type:'who-am-i',clue:'Who '.repeat(30).slice(0,120),answer:'NEBUCHADNEZZAR'},
 ];
 for(const scenario of scenarios){
  assert.deepEqual(validateModule(scenario),[],scenario.type+' input validity');
  const plain={...base,modules:{[key]:scenario}};
  const selected={...plain,activityBorders:{[key]:'border-11'}};
  const [noBorder,withBorder]=await Promise.allSettled([
   createBookletPdf(plain,ff),
   createBookletPdf(selected,ff,undefined,{[key]:png}),
  ]);
  assert.equal(withBorder.status,noBorder.status,
   scenario.type+' must behave the same in both modes even at validation boundaries');
  if(noBorder.status==='fulfilled')
   assert.ok(withBorder.value.length>0,scenario.type+' bordered PDF must be nonempty');
 }
});
