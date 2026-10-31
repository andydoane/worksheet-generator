import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { DEFAULT_LAYOUTS } from '../src/booklet.ts';
import { createBookletPdf } from '../src/pdf.ts';
import {
  blankModule, isActivityModule, matchRows, moduleForSize,
  parsePairs, parseStory, readAssignments, shuffledIndices,
  slotKey, storyBank, validateModule,
} from '../src/modules.ts';

const fontFiles = async () => ({
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans: await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750: await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900: await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab: await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf', import.meta.url)),
});

const match = {
  type: 'match-words',
  pairs: 'Paul, Pharisee\nPeter, Fisherman\nJesus, Savior',
  seed: 1,
};
const finish = {
  type: 'finish-story',
  story: 'Young [David] was a [shepherd]. He faced [Goliath] using his [sling] and a [stone] and trusted in [God].',
  seed: 3,
};

test('module registry filters by region size', () => {
  assert.equal(moduleForSize('small').length, 8);
  assert.ok(moduleForSize('small').some((m) => m.id === 'draw-picture'));
  assert.ok(moduleForSize('small').some((m) => m.id === 'who-am-i'));
  assert.deepEqual(moduleForSize('medium').map((m) => m.id), ['match-words', 'finish-verse', 'unscramble-verse', 'circle-mistakes', 'true-false-maze', 'big-idea-cryptogram', 'upside-down-verse', 'connect-big-idea']);
  assert.deepEqual(moduleForSize('large').map((m) => m.id), ['finish-story', 'story-order', 'sort-story', 'draw-story', 'word-search', 'verse-cryptogram', 'crossword', 'spiral-verse', 'connect-verse']);
  assert.equal(blankModule('match-words').type, 'match-words');
});

test('persisted draft parser skips bad assignments', () => {
  const assignments = readAssignments({
    [slotKey(3, 'top-left-small')]: { type: 'draw-picture', prompt: 'Daniel praying' },
    '2:top-medium': { type: 'match-words', pairs: match.pairs, seed: 8 },
    'wrong-key': { type: 'draw-picture', prompt: 'Bad key' },
    '4:top-large': { type: 'finish-story', story: '', seed: 'nope' },
  });
  assert.equal(Object.keys(assignments).length, 2);
  assert.equal(isActivityModule(assignments['2:top-medium']), true);
});

test('matching pairs preserve left order and right-hand answers always rearrange', () => {
  assert.deepEqual(parsePairs(match.pairs).map((p) => p.left), ['Paul', 'Peter', 'Jesus']);
  const rows = matchRows(match);
  assert.deepEqual(rows.map((row) => row.left), ['Paul', 'Peter', 'Jesus']);
  assert.notDeepEqual(rows.map((row) => row.right), ['Pharisee', 'Fisherman', 'Savior']);
  assert.deepEqual([...rows.map((row) => row.right)].sort(), ['Fisherman', 'Pharisee', 'Savior'].sort());
  assert.deepEqual(matchRows(match), matchRows(match));
  assert.deepEqual(shuffledIndices(3, 'abc', 1), shuffledIndices(3, 'abc', 1));
  assert.deepEqual(validateModule(match), []);
  assert.ok(validateModule({ ...match, pairs: 'Only one, pair' }).length > 0);
  assert.ok(validateModule({ ...match, pairs: 'A, X\nB, X\nC, Y' }).length > 0);
});

test('bracketed missing words become equal-length blanks and a reproducible two-row bank', () => {
  const parts = parseStory(finish.story);
  assert.deepEqual(parts.answers, ['David', 'shepherd', 'Goliath', 'sling', 'stone', 'God']);
  const bank = storyBank(finish);
  assert.equal(bank.length, 6);
  assert.notDeepEqual(bank, parts.answers);
  assert.deepEqual(bank, storyBank(finish));
  assert.deepEqual(validateModule(finish), []);
  assert.ok(validateModule({ ...finish, story: 'A [single] missing word.' }).length > 0);
  assert.ok(validateModule({ ...finish, story: 'Text [with unclosed brackets [or bad] data.' }).length > 0);
});

test('the exported PDF contains the three real modules in their proper-size slots', async () => {
  const draft = {
    title: 'David and Goliath',
    scripture: '1 Samuel 17',
    layouts: { ...DEFAULT_LAYOUTS },
    modules: {
      '1:cover-activity': finish,
      '2:top-medium': match,
      '3:top-left-small': { type: 'draw-picture', prompt: 'David and his sling' },
    },
  };
  const result = await createBookletPdf(draft, await fontFiles());
  const pdf = await PDFDocument.load(result);
  assert.equal(pdf.getPageCount(), 2);
  assert.deepEqual(pdf.getPages().map((page) => [page.getWidth(), page.getHeight()]), [[792, 612], [792, 612]]);
});

test('invalid activity inputs are reported before creating a misleading PDF', async () => {
  const draft = {
    title: 'Example',
    scripture: '1 Samuel 17',
    layouts: { ...DEFAULT_LAYOUTS },
    modules: { '2:top-medium': { type: 'match-words', pairs: '', seed: 1 } },
  };
  await assert.rejects(async () => createBookletPdf(draft, await fontFiles()), /Page 2.*Enter 3/);
});
