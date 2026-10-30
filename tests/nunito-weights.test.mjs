import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
import {embedNunitoWeights,NUNITO_WEIGHTS} from '../src/nunitoPdf.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {DEFAULT_LAYOUTS} from '../src/booklet.ts';
const source=(weight)=>readFile(new URL('../fonts/Nunito-'+({500:'Medium',700:'Bold',800:'ExtraBold'}[weight])+'.ttf',import.meta.url));
const instances=async()=>({body:await source(500),bodyBold:await source(700),bank:await source(800)});
const files=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await source(500),
  nunitoSans750:await source(700),
  nunitoSans900:await source(800),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
test('Nunito uses the user-supplied Nunito Medium Bold and ExtraBold faces',async()=>{
  assert.deepEqual(NUNITO_WEIGHTS,{body:500,bodyBold:700,bank:800});
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
  for(const weight of [500,700,800]){
    assert.ok(names.some(name=>name.replace(/[-\s]/g,'').includes('Nunito'+({500:'Medium',700:'Bold',800:'ExtraBold'}[weight]))),
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
