import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKLET, LAYOUTS, DEFAULT_LAYOUTS, SHEETS,
  getRegions, isLayoutId, regionStyle,
} from '../src/booklet.ts';

const near = (a, b) => Math.abs(a - b) < 1e-10;

test('letter-size bifold margins and safe area agree', () => {
  assert.ok(near(BOOKLET.page.width - 2 * BOOKLET.margin, BOOKLET.area.width));
  assert.ok(near(BOOKLET.page.height - 2 * BOOKLET.margin, BOOKLET.area.height));
  assert.ok(near(BOOKLET.page.width * 2, BOOKLET.sheet.width));
  assert.ok(near(BOOKLET.page.height, BOOKLET.sheet.height));
});

test('all six layouts exactly tile a 2 by 3 grid without gaps or overlaps', () => {
  assert.equal(LAYOUTS.length, 6);
  for (const layout of LAYOUTS) {
    const occupied = Array.from({ length: 3 }, () => [0, 0]);
    const ids = new Set();
    for (const region of getRegions(2, layout.id)) {
      assert.equal(ids.has(region.id), false, 'duplicate slot id in ' + layout.id);
      ids.add(region.id);
      assert.ok(region.col >= 0 && region.col + region.cols <= 2);
      assert.ok(region.row >= 0 && region.row + region.rows <= 3);
      for (let row = region.row; row < region.row + region.rows; row++) {
        for (let col = region.col; col < region.col + region.cols; col++) {
          occupied[row][col]++;
        }
      }
      assert.ok(near(region.x + region.width, BOOKLET.margin + (region.col + region.cols) * BOOKLET.cell.width));
      assert.ok(near(region.y + region.height, BOOKLET.margin + (region.row + region.rows) * BOOKLET.cell.height));
      const p = regionStyle(region);
      assert.equal(p.left.endsWith('%'), true);
      assert.equal(p.height.endsWith('%'), true);
      assert.ok(region.x >= BOOKLET.margin && region.y >= BOOKLET.margin);
      assert.ok(region.x + region.width <= BOOKLET.page.width - BOOKLET.margin + 1e-10);
      assert.ok(region.y + region.height <= BOOKLET.page.height - BOOKLET.margin + 1e-10);
      assert.equal(region.size, region.cols === 1 ? 'small' : region.rows === 2 ? 'large' : 'medium');
    }
    assert.deepEqual(occupied, [[1, 1], [1, 1], [1, 1]], layout.id);
  }
});

test('fixed cover has top medium title and bottom large activity', () => {
  const regions = getRegions(1, 'large-small-small');
  assert.deepEqual(regions.map(({ id, kind, size, row }) => ({ id, kind, size, row })), [
    { id: 'cover-title', kind: 'title', size: 'medium', row: 0 },
    { id: 'cover-activity', kind: 'activity', size: 'large', row: 1 },
  ]);
});

test('valid layout IDs, defaults and physical sheet order', () => {
  assert.equal(isLayoutId('medium-large'), true);
  assert.equal(isLayoutId('not-a-layout'), false);
  for (const id of Object.values(DEFAULT_LAYOUTS)) assert.equal(isLayoutId(id), true);
  assert.deepEqual(SHEETS.map(({ pages }) => pages), [[4, 1], [2, 3]]);
});
