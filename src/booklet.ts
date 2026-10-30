/**
 * Canonical booklet geometry in inches. Future PDF export will consume
 * this same model instead of reverse-engineering the browser preview.
 */
export const BOOKLET = {
  sheet: { width: 11, height: 8.5 },
  page: { width: 5.5, height: 8.5 },
  margin: 0.35,
  padding: 0.1, // default inset inside every module, in inches
  area: { width: 4.8, height: 7.8 },
  cell: { width: 2.4, height: 2.6 },
} as const;

export type PageNumber = 1 | 2 | 3 | 4;
export type LayoutId =
  | 'medium-large'
  | 'large-medium'
  | 'small-small-medium-medium'
  | 'medium-small-small-medium'
  | 'medium-medium-small-small'
  | 'large-small-small';

export type RegionSize = 'small' | 'medium' | 'large';
export type RegionKind = 'title' | 'activity';

type Cell = {
  id: string;
  col: 0 | 1;
  row: 0 | 1 | 2;
  cols: 1 | 2;
  rows: 1 | 2;
  kind?: RegionKind;
};

export type Region = Cell & {
  kind: RegionKind;
  size: RegionSize;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutDefinition = {
  id: LayoutId;
  name: string;
  description: string;
  cells: readonly Cell[];
};

export const LAYOUTS: readonly LayoutDefinition[] = [
  {
    id: 'medium-large',
    name: 'Medium + Large',
    description: 'Medium on top, large below',
    cells: [
      { id: 'top-medium', col: 0, row: 0, cols: 2, rows: 1 },
      { id: 'bottom-large', col: 0, row: 1, cols: 2, rows: 2 },
    ],
  },
  {
    id: 'large-medium',
    name: 'Large + Medium',
    description: 'Large on top, medium below',
    cells: [
      { id: 'top-large', col: 0, row: 0, cols: 2, rows: 2 },
      { id: 'bottom-medium', col: 0, row: 2, cols: 2, rows: 1 },
    ],
  },
  {
    id: 'small-small-medium-medium',
    name: 'Small Pair + 2 Medium',
    description: 'Two small on top, then two medium',
    cells: [
      { id: 'top-left-small', col: 0, row: 0, cols: 1, rows: 1 },
      { id: 'top-right-small', col: 1, row: 0, cols: 1, rows: 1 },
      { id: 'middle-medium', col: 0, row: 1, cols: 2, rows: 1 },
      { id: 'bottom-medium', col: 0, row: 2, cols: 2, rows: 1 },
    ],
  },
  {
    id: 'medium-small-small-medium',
    name: 'Medium + Small Pair + Medium',
    description: 'Medium, two small, then medium',
    cells: [
      { id: 'top-medium', col: 0, row: 0, cols: 2, rows: 1 },
      { id: 'middle-left-small', col: 0, row: 1, cols: 1, rows: 1 },
      { id: 'middle-right-small', col: 1, row: 1, cols: 1, rows: 1 },
      { id: 'bottom-medium', col: 0, row: 2, cols: 2, rows: 1 },
    ],
  },
  {
    id: 'medium-medium-small-small',
    name: '2 Medium + Small Pair',
    description: 'Two medium, then two small',
    cells: [
      { id: 'top-medium', col: 0, row: 0, cols: 2, rows: 1 },
      { id: 'middle-medium', col: 0, row: 1, cols: 2, rows: 1 },
      { id: 'bottom-left-small', col: 0, row: 2, cols: 1, rows: 1 },
      { id: 'bottom-right-small', col: 1, row: 2, cols: 1, rows: 1 },
    ],
  },
  {
    id: 'large-small-small',
    name: 'Large + Small Pair',
    description: 'Large on top, two small below',
    cells: [
      { id: 'top-large', col: 0, row: 0, cols: 2, rows: 2 },
      { id: 'bottom-left-small', col: 0, row: 2, cols: 1, rows: 1 },
      { id: 'bottom-right-small', col: 1, row: 2, cols: 1, rows: 1 },
    ],
  },
] as const;

const COVER: readonly Cell[] = [
  { id: 'cover-title', col: 0, row: 0, cols: 2, rows: 1, kind: 'title' },
  { id: 'cover-activity', col: 0, row: 1, cols: 2, rows: 2 },
] as const;

export const DEFAULT_LAYOUTS: Record<2 | 3 | 4, LayoutId> = {
  2: 'medium-large',
  3: 'small-small-medium-medium',
  4: 'large-medium',
};

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && LAYOUTS.some((layout) => layout.id === value);
}

function makeRegion(cell: Cell): Region {
  const size: RegionSize = cell.cols === 1 ? 'small' : cell.rows === 2 ? 'large' : 'medium';
  return {
    ...cell,
    kind: cell.kind ?? 'activity',
    size,
    x: BOOKLET.margin + cell.col * BOOKLET.cell.width,
    y: BOOKLET.margin + cell.row * BOOKLET.cell.height,
    width: cell.cols * BOOKLET.cell.width,
    height: cell.rows * BOOKLET.cell.height,
  };
}

export function getRegions(page: PageNumber, layout: LayoutId): Region[] {
  const cells = page === 1 ? COVER : LAYOUTS.find((item) => item.id === layout)?.cells;
  if (!cells) throw new Error('Unknown booklet layout: ' + layout);
  return cells.map(makeRegion);
}

/** Imposition order for one double-sided folded letter sheet. */
export const SHEETS: readonly { id: 'outside' | 'inside'; name: string; pages: readonly [PageNumber, PageNumber] }[] = [
  { id: 'outside', name: 'Outside · pages 4 + 1', pages: [4, 1] },
  { id: 'inside', name: 'Inside · pages 2 + 3', pages: [2, 3] },
] as const;

/** Scales inch coordinates for the responsive preview. */
export function regionStyle(region: Region): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  return {
    left: String((region.x / BOOKLET.page.width) * 100) + '%',
    top: String((region.y / BOOKLET.page.height) * 100) + '%',
    width: String((region.width / BOOKLET.page.width) * 100) + '%',
    height: String((region.height / BOOKLET.page.height) * 100) + '%',
  };
}
