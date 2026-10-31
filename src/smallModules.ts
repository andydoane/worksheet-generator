/**
 * Seven PR 5 small-format activities. These share the same typed inputs
 * and deterministic derived data in the HTML preview and exported PDF.
 */
import { shuffledIndices } from './shuffle.ts';
import {TRUE_FALSE_MAX_CHARACTERS} from './trueFalseLimits.ts';
import {WHO_AM_I_CLUE_MAX} from './whoAmILimits.ts';

export type MultipleChoice = {
  type: 'multiple-choice'; question: string; correct: string; wrong1: string; wrong2: string; seed: number;
};
export type TrueFalse = { type: 'true-false'; statement: string };
export type FirstLetters = { type: 'first-letters'; reference: string; verse: string };
export type OddWords = { type: 'odd-words'; correct: string; incorrect: string; seed: number };
export type Unscramble = { type: 'unscramble-words'; first: string; second: string; seed: number };
export type Checkboxes = { type: 'checkboxes'; correct: string; incorrect: string; seed: number };
export type WhoAmI = { type: 'who-am-i'; clue: string; answer: string };

export type SmallModule = MultipleChoice | TrueFalse | FirstLetters | OddWords | Unscramble | Checkboxes | WhoAmI;
export type SmallModuleId = SmallModule['type'];

export const SMALL_MODULES: readonly { id: SmallModuleId; name: string; size: 'small'; description: string }[] = [
  { id: 'multiple-choice', name: 'Multiple Choice Question', size: 'small', description: 'One question and three shuffled checkbox answers.' },
  { id: 'true-false', name: 'True or False Questions', size: 'small', description: 'A statement with thumbs-up and thumbs-down choices.' },
  { id: 'first-letters', name: 'First Letter Challenge', size: 'small', description: 'Recall the verse from only its initial letters.' },
  { id: 'odd-words', name: "What Doesn't Belong?", size: 'small', description: 'Cross out words unrelated to the story.' },
  { id: 'unscramble-words', name: 'Unscramble the Words', size: 'small', description: 'Unscramble two words and write their letters above.' },
  { id: 'checkboxes', name: 'Checkboxes', size: 'small', description: 'Check the words that belong in the story.' },
  { id: 'who-am-i', name: 'Who Am I?', size: 'small', description: 'Read a clue and fill one blank for each answer letter.' },
];

export function isSmallModuleId(value: unknown): value is SmallModuleId {
  return typeof value === 'string' && SMALL_MODULES.some((item) => item.id === value);
}

export function blankSmallModule(type: SmallModuleId): SmallModule {
  switch (type) {
    case 'multiple-choice': return { type, question: '', correct: '', wrong1: '', wrong2: '', seed: 1 };
    case 'true-false': return { type, statement: '' };
    case 'first-letters': return { type, reference: '', verse: '' };
    case 'odd-words': return { type, correct: '', incorrect: '', seed: 1 };
    case 'unscramble-words': return { type, first: '', second: '', seed: 1 };
    case 'checkboxes': return { type, correct: '', incorrect: '', seed: 1 };
    case 'who-am-i': return { type, clue: '', answer: '' };
  }
}

const validSeed = (seed: unknown): boolean => Number.isSafeInteger(seed) && Number(seed) >= 0;
const isText = (value: unknown): value is string => typeof value === 'string';

export function isSmallModule(value: unknown): value is SmallModule {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!isSmallModuleId(v.type)) return false;
  switch (v.type) {
    case 'multiple-choice': return isText(v.question) && isText(v.correct) && isText(v.wrong1) && isText(v.wrong2) && validSeed(v.seed);
    case 'true-false': return isText(v.statement);
    case 'first-letters': return isText(v.reference) && isText(v.verse);
    case 'odd-words':
    case 'checkboxes': return isText(v.correct) && isText(v.incorrect) && validSeed(v.seed);
    case 'unscramble-words': return isText(v.first) && isText(v.second) && validSeed(v.seed);
    case 'who-am-i': return isText(v.clue) && isText(v.answer);
  }
}

export function wordLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function shuffledChoices(module: MultipleChoice): string[] {
  const options = [module.correct.trim(), module.wrong1.trim(), module.wrong2.trim()];
  return shuffledIndices(3, options.join('\n'), module.seed).map((i) => options[i]);
}

export function shuffledWordList(module: OddWords | Checkboxes): { text: string; belongs: boolean }[] {
  const items = [
    ...wordLines(module.correct).map((text) => ({ text, belongs: true })),
    ...wordLines(module.incorrect).map((text) => ({ text, belongs: false })),
  ];
  const indices = shuffledIndices(items.length, JSON.stringify(items), module.seed);
  return indices.map((index) => items[index]);
}

/** First letter of each word, no spaces; punctuation and the reference are not encoded. */
export function verseInitials(verse: string): string {
  return (verse.match(/[\p{L}]+(?:['’-][\p{L}]+)*/gu) ?? [])
    .map((word) => Array.from(word)[0].toUpperCase()).join('');
}

/** Supports one word or a two-word answer, up to 10 total letters. */
export function validUnscramblePhrase(text:string):boolean{
 const parts=text.trim().split(' ');
 const letters=parts.join('');
 return parts.length>=1&&parts.length<=2&&letters.length>=3&&letters.length<=10&&
   parts.every(word=>/^[A-Za-z]{2,10}$/u.test(word)&&new Set(word.toUpperCase()).size>1)&&
   (parts.length===2||parts[0].length>=3);
}

/** Scramble each word on its own, retaining exactly one inter-word gap. */
export function scramblePhrase(phrase:string,seed:number):string{
 return phrase.trim().split(' ').map((word,i)=>scrambleWord(word,seed+i*97)).join(' ');
}

/** Return an actually changed word even when a letter index shuffle leaves duplicates in place. */
export function scrambleWord(word: string, seed: number): string {
  const normalized = word.trim().toUpperCase();
  const letters = Array.from(normalized);
  if (letters.length < 2 || new Set(letters).size < 2) return normalized;
  const shuffle = (salt: number) =>
    shuffledIndices(letters.length, normalized, salt).map((i) => letters[i]).join('');
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = shuffle(seed + attempt);
    if (candidate !== normalized) return candidate;
  }
  // Guaranteed change when at least two different letters exist.
  const index = letters.findIndex((letter) => letter !== letters[0]);
  [letters[0], letters[index]] = [letters[index], letters[0]];
  return letters.join('');
}

export function answerCharacters(answer: string): string[] {
  return Array.from(answer.trim().toUpperCase());
}

const within = (value: string, max: number): boolean => value.trim().length > 0 && value.trim().length <= max;
const upperUnique = (items: string[]): boolean => new Set(items.map((x) => x.toUpperCase())).size === items.length;

function checkWordLists(module: OddWords | Checkboxes): string[] {
  const correct = wordLines(module.correct);
  const incorrect = wordLines(module.incorrect);
  const words = [...correct, ...incorrect];
  const errors: string[] = [];
  if (!correct.length || !incorrect.length || correct.length > 5 || incorrect.length > 5) {
    errors.push('Enter 1–5 story words and 1–5 unrelated words.');
  }
  if (module.type === 'odd-words' && (words.length < 6 || words.length > 10)) {
    errors.push('What Doesn’t Belong needs 6–10 words total.');
  }
  if (module.type === 'odd-words') {
    // One or more words per entry, with each internal space counting
    // toward the 12-character limit. Keep all words of a phrase together.
    if (words.some((word) =>
      !/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u.test(word) || word.length > 12)) {
      errors.push('Use entries of at most 12 characters, including spaces.');
    }
  } else if (words.some((word) =>
    !/^[\p{L}]+(?:[-'][\p{L}]+)*(?: [\p{L}]+(?:[-'][\p{L}]+)*)?$/u.test(word) ||
    word.length > 14)) {
    errors.push('Use one- or two-word entries of at most 14 characters, including spaces.');
  }
  if (!upperUnique(words)) errors.push('Use distinct words so each answer is clear.');
  return errors;
}

export function validateSmallModule(module: SmallModule): string[] {
  switch (module.type) {
    case 'multiple-choice': {
      const choices = [module.correct, module.wrong1, module.wrong2].map((x) => x.trim());
      const errors: string[] = [];
      if (!within(module.question, 105)) errors.push('Enter a question of 1–105 characters.');
      if (choices.some((choice) => !choice || choice.length > 42)) errors.push('Enter three answers of 1–42 characters each.');
      if (!upperUnique(choices)) errors.push('All three answers must be different.');
      return errors;
    }
    case 'true-false':
      return within(module.statement, TRUE_FALSE_MAX_CHARACTERS) ? [] : ['Enter a true-or-false statement of 1–80 characters.'];
    case 'first-letters': {
      const initials = verseInitials(module.verse);
      const errors: string[] = [];
      if (!within(module.reference, 32)) errors.push('Enter a verse reference of 1–32 characters.');
      if (initials.length < 3 || initials.length > 75) errors.push('Use a verse of 3–75 words for the small space.');
      return errors;
    }
    case 'odd-words':
    case 'checkboxes': return checkWordLists(module);
    case 'unscramble-words': {
      const words = [module.first, module.second];
      return words.every(validUnscramblePhrase)
        ? [] : ['Enter two answers with 3–10 letters each (one or two words, up to 10 letters total, not counting the space). Each word needs at least two different letters.'];
    }
    case 'who-am-i': {
      const errors: string[] = [];
      if (!within(module.clue, WHO_AM_I_CLUE_MAX)) errors.push('Enter a character clue of 1–120 characters.');
      const name = module.answer.trim();
      if (!/^[\p{L}]+(?:[ -][\p{L}]+)*$/u.test(name) || Array.from(name).filter((c) => /\p{L}/u.test(c)).length > 14) {
        errors.push('Enter an answer of 1–14 letters (spaces and hyphens allowed).');
      }
      return errors;
    }
  }
}
