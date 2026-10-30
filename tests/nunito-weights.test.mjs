import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
import {embedNunitoWeights,NUNITO_WEIGHTS} from '../src/nunitoPdf.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {DEFAULT_LAYOUTS} from '../src/booklet.ts';
const source=(weight)=>readFile(new URL('../fonts/NunitoSans-'+weight+'.ttf',import.meta.url));
const instances=async()=>({body:await source(600),bodyBold:await source(750),bank:await source(900)});
const files=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await source(600),
  nunitoSans750:await source(750),
  nunitoSans900:await source(900),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
test('Nunito uses three actual static font weights, not variable ExtraLight glyphs',async()=>{
  assert.deepEqual(NUNITO_WEIGHTS,{body:600,bodyBold:750,bank:900});
  const pdf=await PDFDocument.create();
  const {body,bodyBold,bank}=await embedNunitoWeights(pdf,await instances());
  assert.equal(new Set([body.ref.toString(),bodyBold.ref.toString(),bank.ref.toString()]).size,3);
  const page=pdf.addPage([792,612]);
  for(const [i,font] of [body,bodyBold,bank].entries()){
    assert.ok(font.widthOfTextAtSize('God loves every child.',13)>40);
    page.drawText('God loves every child.',{x:80,y:500-i*45,size:18,font});
  }
  const bytes=await pdf.save();
  assert.ok(bytes.length>20000,'all three actual TrueType fonts should embed');
  const loaded=await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(),1);
  const names=loaded.context.enumerateIndirectObjects()
    .filter(([,obj])=>obj instanceof PDFDict)
    .map(([,obj])=>obj.get(PDFName.of('BaseFont'))?.toString()??'');
  for(const weight of [600,750,900]){
    assert.ok(names.some(name=>name.includes('NunitoSans-'+weight)),
      'Missing Nunito '+weight+' vector face: '+names.join(', '));
  }
});
test('all font weights work in a normal two-page booklet',async()=>{
  const pdf=await PDFDocument.load(await createBookletPdf({
    title:'The Good Shepherd',scripture:'John 10',
    layouts:{...DEFAULT_LAYOUTS},
    modules:{'1:cover-activity':{type:'finish-story',
      story:'[Jesus] is the good [shepherd]. He [knows] each [sheep]. The sheep [hear] his [voice].',seed:1}},
  },await files()));
  assert.equal(pdf.getPageCount(),2);
});
