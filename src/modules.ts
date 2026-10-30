import type { PageNumber, RegionSize } from './booklet.ts';

/**
 * Each module has one typed payload, a compatible region size, and shared
 * parsing/validation. HTML preview and PDF use the same derived content.
 */
export type ModuleId = 'draw-picture' | 'match-words' | 'finish-story';

export type DrawPictureModule = { type: 'draw-picture'; prompt: string };
export type MatchWordsModule = { type: 'match-words'; pairs: string; seed: number };
export type FinishStoryModule = { type: 'finish-story'; story: string; seed: number };
export type ActivityModule = DrawPictureModule | MatchWordsModule | FinishStoryModule;
export type ModuleAssignments = Record<string, ActivityModule>;

export const MODULES: readonly { id: ModuleId; name: string; size: RegionSize; description: string }[] = [
  { id: 'draw-picture', name: 'Draw a Picture', size: 'small', description: 'A blank drawing box and a short prompt.' },
  { id: 'match-words', name: 'Match the Words', size: 'medium', description: 'Match 3–6 pairs by drawing connecting lines.' },
  { id: 'finish-story', name: 'Finish the Story', size: 'large', description: 'Complete the story using a two-row word bank.' },
];

export function slotKey(page: PageNumber, regionId: string): string {
  return page + ':' + regionId;
}

export function moduleForSize(size: RegionSize): (typeof MODULES)[number][] {
  return MODULES.filter((module) => module.size === size);
}

export function blankModule(type: ModuleId): ActivityModule {
  switch (type) {
    case 'draw-picture': return { type, prompt: '' };
    case 'match-words': return { type, pairs: '', seed: 1 };
    case 'finish-story': return { type, story: '', seed: 1 };
  }
}

export function isActivityModule(raw: unknown): raw is ActivityModule {
  if (!raw || typeof raw !== 'object') return false;
  const object = raw as Record<string, unknown>;
  switch (object.type) {
    case 'draw-picture': return typeof object.prompt === 'string';
    case 'match-words': return typeof object.pairs === 'string' && Number.isSafeInteger(object.seed) && Number(object.seed) >= 0;
    case 'finish-story': return typeof object.story === 'string' && Number.isSafeInteger(object.seed) && Number(object.seed) >= 0;
    default: return false;
  }
}

/** Ignore malformed saved entries rather than losing the rest of an older draft. */
export function readAssignments(value: unknown): ModuleAssignments {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ModuleAssignments = {};
  for (const [key, module] of Object.entries(value)) {
    if (/^[1-4]:[a-z0-9-]+$/.test(key) && isActivityModule(module)) result[key] = module;
  }
  return result;
}

export type WordPair = { left: string; right: string };

/** Left words stay in source order. Each right-hand entry is separated by the first comma. */
export function parsePairs(input: string): WordPair[] {
  return input.split(/\r?\n/).filter((line) => line.trim() !== '').map((line) => {
    const index = line.indexOf(',');
    return index === -1
      ? { left: line.trim(), right: '' }
      : { left: line.slice(0, index).trim(), right: line.slice(index + 1).trim() };
  });
}

export type StoryPart = { kind: 'text'; text: string } | { kind: 'blank'; word: string };

/** Only square-bracketed single words become answer blanks. */
export function parseStory(input: string): { parts: StoryPart[]; answers: string[] } {
  const parts: StoryPart[] = [];
  const answers: string[] = [];
  const pattern = /\[([^\[\]]*)\]/g;
  let start = 0;
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > start) parts.push({ kind: 'text', text: input.slice(start, index) });
    const word = match[1].trim();
    parts.push({ kind: 'blank', word });
    answers.push(word);
    start = index + match[0].length;
  }
  if (start < input.length) parts.push({ kind: 'text', text: input.slice(start) });
  return { parts, answers };
}

function hash(text: string, seed: number): number {
  let value = (seed >>> 0) ^ 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Fisher–Yates; enforce a different visible order when possible. */
export function shuffledIndices(length: number, content: string, seed: number): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  let state = hash(content, seed) || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  if (length > 1 && indices.every((item, index) => item === index)) {
    indices.push(indices.shift()!);
  }
  return indices;
}

export function matchRows(module: MatchWordsModule): { left: string; right: string }[] {
  const pairs = parsePairs(module.pairs);
  const indices = shuffledIndices(pairs.length, module.pairs, module.seed);
  return pairs.map((pair, i) => ({ left: pair.left, right: pairs[indices[i]].right }));
}

export function storyBank(module: FinishStoryModule): string[] {
  const answers = parseStory(module.story).answers;
  return shuffledIndices(answers.length, module.story, module.seed).map((index) => answers[index]);
}

/** Returns user-facing messages; empty inputs aren't silently printed as completed puzzles. */
export function validateModule(module: ActivityModule): string[] {
  if (module.type === 'draw-picture') {
    if (!module.prompt.trim()) return ['Enter what the child should draw.'];
    if (module.prompt.trim().length > 105) return ['Keep the drawing prompt under 105 characters.'];
    return [];
  }
  if (module.type === 'match-words') {
    const pairs = parsePairs(module.pairs);
    const errors: string[] = [];
    if (pairs.length < 3 || pairs.length > 6) errors.push('Enter 3–6 matching pairs, one per line.');
    if (pairs.some((pair) => !pair.left || !pair.right)) errors.push('Each pair must contain both entries, separated by a comma.');
    if (pairs.some((pair) => pair.left.length > 22 || pair.right.length > 22)) errors.push('Keep each matching entry at 22 characters or fewer.');
    if (new Set(pairs.map((pair) => pair.left.toLowerCase())).size !== pairs.length ||
        new Set(pairs.map((pair) => pair.right.toLowerCase())).size !== pairs.length) {
      errors.push('Use distinct words in both columns so each match is unambiguous.');
    }
    return errors;
  }
  const story = parseStory(module.story);
  const errors: string[] = [];
  if (story.answers.length < 6 || story.answers.length > 12) errors.push('Use 6–12 [bracketed] missing words.');
  if (story.answers.some((answer) => !/^[\p{L}]+(?:['’-][\p{L}]+)*$/u.test(answer) || answer.length > 16)) {
    errors.push('Each [bracketed answer] must be one word of 1–16 letters (hyphens and apostrophes are allowed).');
  }
  if (module.story.length > 1100) errors.push('Keep the story under 1,100 characters so it can fit inside the large area.');
  if (!module.story.replace(/\[[^\[\]]*\]/g, '').trim()) errors.push('Include story text around the missing words.');
  if (module.story.includes('[') && module.story.split('[').length - 1 !== story.answers.length ||
      module.story.includes(']') && module.story.split(']').length - 1 !== story.answers.length) {
    errors.push('Check that every missing word has one opening [ and closing ] bracket.');
  }
  return errors;
}
