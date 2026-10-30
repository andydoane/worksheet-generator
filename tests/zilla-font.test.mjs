import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { createBookletPdf } from '../src/pdf.ts';
import { DEFAULT_LAYOUTS } from '../src/booklet.ts';

const zilla = () => readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf', import.meta.url));
const original = () => readFile(new URL('../fonts/ZillaSlab-Bold.ttf', import.meta.url));
const fonts = async () => ({
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans: await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf', import.meta.url)),
  zillaSlab: await zilla(),
});

test('normalized Zilla Slab retains the original full TrueType font data', async () => {
  const [a,b]=await Promise.all([original(),zilla()]);
  assert.equal(a.length, b.length);
  // The files differ in internal representation, enabling fontkit compatibility.
  assert.notDeepEqual(a,b);
});

test('Zilla Slab Bold embeds, measures glyphs, and serializes as PDF vector text', async () => {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await zilla(), { subset: false });
  assert.match(font.name, /Zilla/i);
  for (const text of ['MATCH THE WORDS','PAUL PETER JESUS','SHEPHERD FISHERMAN PHARISEE','ABC XYZ 123','Á É Ñ']) {
    assert.ok(font.widthOfTextAtSize(text, 13) > 0);
  }
  doc.addPage([792,612]).drawText('MATCH THE WORDS 123', {x:32,y:540,font,size:18});
  const result = await doc.save();
  assert.ok(result.length > 20_000);
  assert.equal((await PDFDocument.load(result)).getPageCount(), 1);
});

test('booklet generated with a matching puzzle embeds Zilla Slab', async () => {
  const result = await createBookletPdf({
    title: 'The Good Shepherd',
    scripture: 'John 10',
    layouts: { ...DEFAULT_LAYOUTS },
    modules: {'2:top-medium': {
      type: 'match-words',
      pairs: 'PAUL, PHARISEE\nPETER, FISHERMAN\nJESUS, SAVIOR',
      seed: 3,
    }},
  }, await fonts());
  const pdf = await PDFDocument.load(result);
  assert.equal(pdf.getPageCount(), 2);
  // pdf-lib compresses object streams by default; inspect parsed font
  // dictionaries rather than searching raw compressed PDF bytes.
  const embeddedNames = pdf.context.enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFDict)
    .map(([, object]) => object.get(PDFName.of('BaseFont'))?.toString())
    .filter(Boolean);
  assert.ok(embeddedNames.some(name => /ZillaSlab/i.test(name)),
    'expected Zilla Slab in embedded PDF font resources: ' + embeddedNames.join(', '));
});
