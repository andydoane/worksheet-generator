import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import { drawSmallModulePdf } from './smallPdf.ts';
import { isSmallModule } from './smallModules.ts';
import { isStoryVerseModule } from './storyVerseModules.ts';
import { drawStoryVersePdf } from './storyVersePdf.ts';
import { isPuzzleModule } from './puzzleEngines.ts';
import { drawPuzzlePdf } from './puzzlePdf.ts';
import {
  matchRows, parseStory, storyBank, validateModule, type ActivityModule,
} from './modules.ts';

type Rect = { x: number; y: number; width: number; height: number };
export type ModuleFonts = { title: PDFFont; body: PDFFont; puzzle: PDFFont };
const INCH = 72;
const INSET = BOOKLET.padding * INCH;
const INK = rgb(0.13, 0.13, 0.13);
const GREY = rgb(0.40, 0.40, 0.40);
const WHITE = rgb(1, 1, 1);

const measure = (font: PDFFont, text: string, size: number) => font.widthOfTextAtSize(text, size);
function interior(rect: Rect): Rect {
  return { x: rect.x + INSET, y: rect.y + INSET, width: rect.width - INSET * 2, height: rect.height - INSET * 2 };
}

/** Word wrapping with no clipping or invisible text. */
function lines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const output: string[] = [];
  let row = '';
  for (const word of words) {
    if (measure(font, word, size) > maxWidth) throw new Error('A word is too long to fit; please shorten the text.');
    const test = row ? row + ' ' + word : word;
    if (row && measure(font, test, size) > maxWidth) { output.push(row); row = word; }
    else row = test;
  }
  if (row) output.push(row);
  return output;
}

function centered(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number, size: number, color = INK): void {
  page.drawText(text, { x: x + (width - measure(font, text, size)) / 2, y, font, size, color });
}

function fittedSize(font: PDFFont, words: readonly string[], maxWidth: number, preferred: number, minimum: number): number {
  for (let size = preferred; size >= minimum; size -= .5) {
    if (words.every(word => measure(font, word, size) <= maxWidth)) return size;
  }
  throw new Error('A word or answer is too long for this module. Shorten it and try again.');
}

function drawPicture(page: PDFPage, rect: Rect, font: PDFFont, prompt: string): void {
  const inner = interior(rect);
  const promptText = 'Draw a picture of ' + prompt.trim();
  let fontSize = 15;
  let wrapped: string[] = [];
  while (fontSize >= 10) {
    try { wrapped = lines(promptText, font, fontSize, inner.width); } catch { wrapped = []; }
    if (wrapped.length > 0 && wrapped.length <= 3) break;
    fontSize -= 1;
  }
  if (!wrapped.length || wrapped.length > 3) throw new Error('Drawing prompt does not fit. Please shorten it.');

  const captionHeight = wrapped.length * (fontSize * 1.08) + 12;
  const drawingHeight = inner.height - captionHeight - 5;
  if (drawingHeight < 70) throw new Error('Drawing prompt leaves too little space for the picture.');

  page.drawRectangle({
    x: inner.x, y: inner.y + captionHeight + 5,
    width: inner.width, height: drawingHeight,
    borderColor: GREY, borderWidth: 1, color: WHITE,
  });

  const firstY = inner.y + captionHeight - fontSize * 1.05;
  wrapped.forEach((line, index) => {
    centered(page, font, line, inner.x, firstY - index * fontSize * 1.08, inner.width, fontSize);
  });
}

function drawMatching(page: PDFPage, rect: Rect, fonts: ModuleFonts, module: Extract<ActivityModule, { type: 'match-words' }>): void {
  const box = interior(rect);
  const rows = matchRows(module);
  centered(page, fonts.title, 'MATCH THE WORDS', box.x, box.y + box.height - 25, box.width, 22);
  const subtitle = 'Draw a line from each word on the left to its match on the right.';
  const instructionLines = lines(subtitle, fonts.body, 9, box.width);
  instructionLines.forEach((line, index) =>
    centered(page, fonts.body, line, box.x, box.y + box.height - 41 - index * 10, box.width, 9, GREY));
  const start = box.y + box.height - 60 - (instructionLines.length - 1) * 10;
  const bottom = box.y + 13;
  const spacing = (start - bottom) / Math.max(1, rows.length - 1);
  if (spacing < 16) throw new Error('Matching rows need more room; use fewer pairs.');
  const colWidth = box.width / 2 - 18;
  const names = rows.flatMap(row => [row.left.toUpperCase(), row.right.toUpperCase()]);
  // Matching words use embedded Zilla Slab Bold, like the browser preview.
  const size = fittedSize(fonts.puzzle, names, colWidth, 13.5, 8);
  rows.forEach((row, index) => {
    const y = start - index * spacing;
    page.drawText(row.left.toUpperCase(), { x: box.x + 7, y, size, font: fonts.puzzle, color: INK });
    page.drawText(row.right.toUpperCase(), { x: box.x + box.width / 2 + 12, y, size, font: fonts.puzzle, color: INK });
  });
}

type StoryToken = { kind: 'text' | 'blank'; value: string };
type StoryPlacement = { kind: 'text' | 'blank'; text: string; x: number; y: number; width: number };

function tokenizeStory(story: string): StoryToken[] {
  const { parts } = parseStory(story);
  const tokens: StoryToken[] = [];
  for (const part of parts) {
    if (part.kind === 'blank') tokens.push({ kind: 'blank', value: part.word });
    else for (const value of part.text.match(/\s+|[^\s]+/gu) ?? []) tokens.push({ kind: 'text', value });
  }
  return tokens;
}

/** Compute all text positions before drawing, so overflow fails instead of clipping. */
function positionStory(tokens: StoryToken[], font: PDFFont, size: number, box: Rect): StoryPlacement[] | null {
  const output: StoryPlacement[] = [];
  const lineHeight = size * 1.58;
  let x = box.x;
  let y = box.y + box.height - size * 1.1;
  for (const token of tokens) {
    const isWhitespace = token.kind === 'text' && /^\s+$/u.test(token.value);
    const tokenWidth = token.kind === 'blank'
      ? Math.max(16, measure(font, token.value, size) * 1.12)
      : measure(font, isWhitespace ? ' ' : token.value, size);
    if (isWhitespace && x === box.x) continue;
    if (!isWhitespace && tokenWidth > box.width) return null;
    if (x + tokenWidth > box.x + box.width && x > box.x) {
      x = box.x;
      y -= lineHeight;
      if (isWhitespace) continue;
    }
    if (y < box.y + 3) return null;
    if (!isWhitespace) output.push({ kind: token.kind, text: token.value, x, y, width: tokenWidth });
    x += tokenWidth;
  }
  return output;
}

function drawStory(page: PDFPage, rect: Rect, fonts: ModuleFonts, module: Extract<ActivityModule, { type: 'finish-story' }>): void {
  const inner = interior(rect);
  centered(page, fonts.title, 'FINISH THE STORY', inner.x, inner.y + inner.height - 28, inner.width, 25);

  const bank = storyBank(module);
  const columns = Math.ceil(bank.length / 2);
  const bankTop = inner.y + inner.height - 42;
  const bankHeight = 64;
  const bankBottom = bankTop - bankHeight;
  page.drawRectangle({
    x: inner.x, y: bankBottom, width: inner.width, height: bankHeight,
    borderColor: GREY, borderWidth: .8, color: WHITE,
  });

  const cellWidth = inner.width / columns;
  const size = fittedSize(fonts.body, bank.map(word => word.toUpperCase()), cellWidth - 6, 11.5, 6.5);
  bank.forEach((word, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    centered(page, fonts.body, word.toUpperCase(), inner.x + col * cellWidth, bankTop - 24 - row * 29, cellWidth, size);
  });

  const storyBox = {
    x: inner.x + 3, y: inner.y + 5,
    width: inner.width - 6,
    height: bankBottom - inner.y - 18,
  };
  const tokens = tokenizeStory(module.story);
  let placed: StoryPlacement[] | null = null;
  let bodySize = 13;
  for (; bodySize >= 9; bodySize -= .5) {
    placed = positionStory(tokens, fonts.body, bodySize, storyBox);
    if (placed) break;
  }
  if (!placed) throw new Error('Story text does not fit in the large area. Shorten it or use fewer words.');

  placed.forEach(token => {
    if (token.kind === 'blank') {
      page.drawLine({
        start: { x: token.x, y: token.y - 2 },
        end: { x: token.x + token.width, y: token.y - 2 },
        thickness: .95, color: INK,
      });
    } else {
      page.drawText(token.text, { x: token.x, y: token.y, size: bodySize, font: fonts.body, color: INK });
    }
  });
}

/** Single dispatch point for all module PDF renderers. */
export function drawModulePdf(page: PDFPage, rect: Rect, module: ActivityModule, fonts: ModuleFonts): void {
  const errors = validateModule(module);
  if (errors.length) throw new Error(errors.join(' '));
  if (isSmallModule(module)) return drawSmallModulePdf(page, rect, module, fonts);
  if (isStoryVerseModule(module)) return drawStoryVersePdf(page, rect, module, fonts);
  if (isPuzzleModule(module)) return drawPuzzlePdf(page, rect, module, fonts);
  switch (module.type) {
    case 'draw-picture': return drawPicture(page, rect, fonts.title, module.prompt);
    case 'match-words': return drawMatching(page, rect, fonts, module);
    case 'finish-story': return drawStory(page, rect, fonts, module);
  }
}
