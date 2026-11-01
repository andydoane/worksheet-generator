import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planCoverText,balancedCoverTitle} from '../src/coverTitleLayout.ts';
import {COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT} from '../src/coverBorders.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';
import {LARGE_EXAMPLES} from '../scripts/pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from '../scripts/pr16d-fixtures.mjs';
import {SMALL_EXAMPLES} from '../scripts/pr16f-fixtures.mjs';

async function source(file){
 return readFile(new URL('../src/'+file,import.meta.url),'utf8');
}
async function fontFiles(){
 return {
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
}
const measure=(face)=>(text,size)=>face.layout(text).positions.reduce(
 (sum,position)=>sum+position.xAdvance,0)*size/face.unitsPerEm;

test('Balanced cover title removes a short orphan without adding lines',()=>{
 const mono=(text,size)=>text.length*size;
 const text='AAAAAA BBBBB CCCCC DDDDD';
 assert.deepEqual(balancedCoverTitle(text,1,19,mono),['AAAAAA BBBBB','CCCCC DDDDD']);
 assert.deepEqual(balancedCoverTitle('SHORT TITLE',1,19,mono),['SHORT TITLE']);
});

test('Measured cover title fits and centers in both bordered and legacy text zones',async()=>{
 const [titleBytes,bodyBytes]=await Promise.all([
  readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 ]);
 const title=measure(fontkit.create(titleBytes));
 const body=measure(fontkit.create(bodyBytes));
 for(const [width,height] of [[4.6*72,2.4*72],
   [COVER_BORDER_SAFE_WIDTH*72,COVER_BORDER_SAFE_HEIGHT*72]]){
  for(const name of [
   'David and Goliath',
   'God Makes a Way for His People Even When They Feel Afraid',
   'The Lord Is Our Shepherd and Cares for His Children',
  ]){
   const plan=planCoverText(name,'1 Samuel 17:1–58',width,height,title,body);
   assert.ok(plan,'title should fit: '+name);
   assert.ok(plan.titleLines.length>=1&&plan.titleLines.length<=3);
   assert.ok(plan.referenceLines.length>=1&&plan.referenceLines.length<=2);
   assert.equal(plan.titleLines.map(line=>line.text).join(' '),name);
   for(const line of [...plan.titleLines,...plan.referenceLines]){
    const widthUsed=(line===undefined?0:(plan.titleLines.includes(line)?title:body)(line.text,line.size));
    assert.ok(line.x>=-1e-5&&line.x+widthUsed<=width+1e-5,'line exceeds safe width');
    assert.ok(Math.abs(line.x-(width-widthUsed)/2)<1e-5,'line is not centered');
    assert.ok(line.y>=line.size-1e-5&&line.y<=height+1e-5,'line exceeds safe height');
   }
   assert.ok(Math.abs((height-plan.totalHeight)/2-
     (plan.titleLines[0].y-plan.titleSize))<1e-5,'composition not vertically centered');
  }
 }
 assert.equal(planCoverText('Whatever', 'Exodus 3:14',0,120,title,body),null);
});

test('The selected border state reaches both SVG and PDF activity outlines',async()=>{
 const [app,preview,puzzlePreview,word,medium,small,pdf,puzzlePdf,modulePdf,cover]=await Promise.all([
  source('App.tsx'),source('ModulePreview.tsx'),source('PuzzlePreview.tsx'),
  source('WordSearchPrintPreview.tsx'),source('MediumWordSearchPrintPreview.tsx'),
  source('SmallFinishingPreview.tsx'),source('pdf.ts'),
  source('puzzlePdf.ts'),source('modulePdf.ts'),source('CoverTitlePreview.tsx'),
 ]);
 assert.match(app,/bordered=\{!!selectedBorder\}/u);
 assert.match(preview,/bordered=\{bordered\}/u);
 assert.match(puzzlePreview,/bordered=\{bordered\}/u);
 for(const text of [word,medium])assert.match(text,/\{!bordered&&<rect /u);
 assert.match(small,/stroke=\{bordered\?'none':'#666'\} strokeWidth=\{bordered\?0:1\}/u);
 assert.equal([...puzzlePdf.matchAll(/if\(!bordered\)page\.drawRectangle\(/gu)].length,2);
 assert.match(modulePdf,/borderColor:bordered\?undefined:GREY,borderWidth:bordered\?0:1,color:WHITE/u);
 assert.match(modulePdf,/drawPuzzlePdf\(page, rect, module, fonts, bordered\)/u);
 assert.match(pdf,/drawModulePdf\(page,item\.rect,assigned,fonts,true\)/u);
 assert.match(pdf,/drawModulePdf\(page, item\.rect, assigned, fonts\)/u);
 assert.match(cover,/planCoverText\(/u);
 assert.match(pdf,/planCoverText\(/u);
});

test('Mixed sample PDF exports with borders and without, preserving all module data',async()=>{
 const files=await fontFiles();
 const draft=makeParityDraft(6,{allBorderless:true});
 draft.title='God Keeps His Promises to All His People in Every Generation';
 draft.scripture='Genesis 12:1–9';
 draft.modules['2:top-left-small']=structuredClone(SMALL_EXAMPLES[0]);
 draft.modules['2:middle-medium']=structuredClone(MEDIUM_EXAMPLES[0]);
 draft.modules['3:bottom-large']=structuredClone(LARGE_EXAMPLES[1]);
 const before=structuredClone(draft);
 const plain=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.equal(plain.getPageCount(),2);
 assert.deepEqual(draft,before,'plain export must not alter draft');
 const bordered=structuredClone(draft);
 bordered.coverBorder='border-1';
 bordered.activityBorders={
  '2:top-left-small':'border-10',
  '2:middle-medium':'border-6',
  '3:bottom-large':'border-11',
 };
 const inputs={};
 for(const [slot,id] of Object.entries(bordered.activityBorders)){
  const region=getPrintableSheetRegions(bordered).flat().find(item=>
   item.bookletPage+':'+item.id===slot);
  assert.ok(region,slot);
  inputs[slot]=await readFile(new URL(
   '../images/borders/'+region.size+'_border_'+id.slice(7)+'.png',import.meta.url));
 }
 const cover=await readFile(new URL('../images/borders/medium_border_1.png',import.meta.url));
 const beforeBordered=structuredClone(bordered);
 const pdf=await PDFDocument.load(await createBookletPdf(bordered,files,cover,inputs));
 assert.equal(pdf.getPageCount(),2);
 assert.equal(pdf.getPage(0).getWidth(),792);
 assert.equal(pdf.getPage(0).getHeight(),612);
 assert.deepEqual(bordered,beforeBordered,'bordered export must not alter draft');
});
