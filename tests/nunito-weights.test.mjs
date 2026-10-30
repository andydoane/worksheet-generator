import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
import {embedNunitoWeights,NUNITO_WEIGHTS} from '../src/nunitoPdf.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {DEFAULT_LAYOUTS} from '../src/booklet.ts';
const source=()=>readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url));
const files=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await source(),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
test('Nunito uses three distinct physical variable-font instances, not a single ExtraLight face',async()=>{
  assert.deepEqual(NUNITO_WEIGHTS,{body:600,bodyBold:750,bank:900});
  const pdf=await PDFDocument.create();
  const {body,bodyBold,bank}=await embedNunitoWeights(pdf,await source());
  assert.equal(new Set([body.ref.toString(),bodyBold.ref.toString(),bank.ref.toString()]).size,3);
  const page=pdf.addPage([792,612]);
  for(const [i,font] of [body,bodyBold,bank].entries()){
    assert.ok(font.widthOfTextAtSize('God loves every child.',13)>40);
    page.drawText('God loves every child.',{x:80,y:500-i*45,size:18,font});
  }
  const bytes=await pdf.save();
  assert.ok(bytes.length>2000,'embedded TrueType subset should produce a nonempty PDF');
  const loaded=await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(),1);
  const names=loaded.context.enumerateIndirectObjects()
    .filter(([,obj])=>obj instanceof PDFDict)
    .map(([,obj])=>obj.get(PDFName.of('BaseFont'))?.toString()??'');
  assert.ok(names.filter(name=>/Nunito/i.test(name)).length>=3,
    'Expected three vector Nunito font resources: '+names.join(', '));
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
