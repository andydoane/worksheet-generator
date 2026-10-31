import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {COVER_BORDERS,isCoverBorderId,coverBorderUrl,COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT} from '../src/coverBorders.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {BOOKLET,DEFAULT_LAYOUTS} from '../src/booklet.ts';

async function fonts(){
 return {
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
}
const draft={title:'David and Goliath',scripture:'1 Samuel 17',
 layouts:{...DEFAULT_LAYOUTS},modules:{}};
test('All 11 cover border assets have stable IDs and valid PNG files',async()=>{
 assert.equal(COVER_BORDERS.length,11);
 assert.equal(isCoverBorderId(undefined),false);
 assert.equal(isCoverBorderId('none'),true);
 assert.equal(isCoverBorderId('border-12'),false);
 assert.equal(coverBorderUrl('none'),undefined);
 assert.equal(COVER_BORDER_SAFE_WIDTH,4.3);
 assert.equal(COVER_BORDER_SAFE_HEIGHT,2.15);
 assert.equal(BOOKLET.cell.width*2,4.8);
 assert.equal(BOOKLET.cell.height,2.6);
 for(const [index,border] of COVER_BORDERS.entries()){
  assert.equal(border.id,'border-'+(index+1));
  assert.ok(isCoverBorderId(border.id));
  const bytes=await readFile(new URL('../images/borders/medium_border_'+(index+1)+'.png',import.meta.url));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.ok(bytes.length>1000);
 }
});
test('Bordered PDF embeds PNG, fits cover text and legacy border-free draft still works',async()=>{
 const files=await fonts();
 const plain=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.equal(plain.getPageCount(),2);
 for(const id of ['border-1','border-6','border-11']){
  const selected=COVER_BORDERS.find(b=>b.id===id);
  assert.ok(selected);
  const bytes=await readFile(new URL('../images/borders/medium_border_'+id.split('-')[1]+'.png',import.meta.url));
  const pdf=await PDFDocument.load(await createBookletPdf({...draft,coverBorder:selected.id},files,bytes));
  assert.equal(pdf.getPageCount(),2);
  assert.ok(pdf.getPage(0).getWidth()===792);
  assert.ok(pdf.getPage(0).getHeight()===612);
  assert.ok(pdf.getPageCount()===plain.getPageCount());
 }
 await assert.rejects(()=>createBookletPdf({...draft,coverBorder:'border-2'},files),/border image is unavailable/i);
});
test('Browser gallery and PDF use the same border catalog and geometry',async()=>{
 const [app,pdf,exporter,css]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/exportPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/layout.css',import.meta.url),'utf8'),
 ]);
 assert.match(app,/cover-border-gallery/u);
 assert.match(app,/cover-border-choice/u);
 assert.match(app,/coverBorderUrl/u);
 assert.match(app,/isCoverBorderId/u);
 assert.match(pdf,/document.embedPng/u);
 assert.match(pdf,/COVER_BORDER_SAFE_WIDTH/u);
 assert.match(pdf,/COVER_BORDER_SAFE_HEIGHT/u);
 assert.match(exporter,/coverBorderUrl/u);
 assert.match(css,/cover-content-bordered .cover-text-safe/u);
});
