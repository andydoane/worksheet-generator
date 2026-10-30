import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { BOOKLET, DEFAULT_LAYOUTS } from '../src/booklet.ts';
import { createBookletPdf, getPrintableSheetRegions } from '../src/pdf.ts';

const fonts = async () => ({
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans: await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf', import.meta.url)),
  zillaSlab: await readFile(new URL('../fonts/ZillaSlab-Bold.ttf', import.meta.url)),
});

const draft = {
  title: 'David and Goliath',
  scripture: '1 Samuel 17',
  layouts: { ...DEFAULT_LAYOUTS },
};

test('print positions obey sheet imposition, trim margins and region dimensions', () => {
  const sheets = getPrintableSheetRegions(draft);
  assert.equal(sheets.length, 2);
  const left = sheets[0].filter((part) => part.side === 'left');
  const right = sheets[0].filter((part) => part.side === 'right');
  assert.deepEqual([...new Set(left.map((part) => part.bookletPage))], [4]);
  assert.deepEqual([...new Set(right.map((part) => part.bookletPage))], [1]);
  assert.deepEqual([...new Set(sheets[1].filter((part) => part.side === 'left').map((part) => part.bookletPage))], [2]);
  assert.deepEqual([...new Set(sheets[1].filter((part) => part.side === 'right').map((part) => part.bookletPage))], [3]);
  assert.equal(right.some((part) => part.kind === 'title' && part.size === 'medium'), true);

  const margin = BOOKLET.margin * 72;
  const halfWidth = BOOKLET.page.width * 72;
  for (const sheet of sheets) {
    for (const region of sheet) {
      const half = region.side === 'left' ? 0 : 1;
      assert.ok(region.rect.x >= half * halfWidth + margin - 1e-8);
      assert.ok(region.rect.x + region.rect.width <= (half + 1) * halfWidth - margin + 1e-8);
      assert.ok(region.rect.y >= margin - 1e-8);
      assert.ok(region.rect.y + region.rect.height <= BOOKLET.sheet.height * 72 - margin + 1e-8);
      assert.ok(region.rect.width > 0 && region.rect.height > 0);
    }
  }
});

test('generated PDF contains exactly two landscape US Letter pages', async () => {
  const bytes = await createBookletPdf(draft, await fonts());
  assert.ok(bytes.length > 20_000);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  for (const page of pdf.getPages()) {
    assert.equal(page.getWidth(), 11 * 72);
    assert.equal(page.getHeight(), 8.5 * 72);
  }
  assert.ok((pdf.getTitle() ?? '').includes('David and Goliath'));
});

test('long cover text is wrapped rather than spilling into neighboring regions', async () => {
  const longDraft = {
    ...draft,
    title: 'The Story of David, Goliath, and the Courage to Trust God at Every Step',
    scripture: '1 Samuel 17:1-58',
  };
  const bytes = await createBookletPdf(longDraft, await fonts());
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
});
