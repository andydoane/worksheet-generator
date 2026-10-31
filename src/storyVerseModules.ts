import { shuffledIndices } from './shuffle.ts';
import { scrambleWord } from './smallModules.ts';
import {letterOnly,validBracketedAnswer} from './versePunctuation.ts';

export type StoryOrder = { type: 'story-order'; events: string; seed: number };
export type SortStory = { type: 'sort-story'; statements: string; seed: number };
export type DrawStory = { type: 'draw-story'; prompts: string };
export type FinishVerse = { type: 'finish-verse'; reference: string; verse: string; seed: number };
export type UnscrambleVerse = { type: 'unscramble-verse'; reference: string; verse: string; seed: number };
export type CircleMistakes = { type: 'circle-mistakes'; text: string; count: number };

export type StoryVerseModule = StoryOrder | SortStory | DrawStory | FinishVerse | UnscrambleVerse | CircleMistakes;
export type StoryVerseId = StoryVerseModule['type'];

export const STORY_VERSE_MODULES = [
  { id: 'story-order', name: 'Story Order', size: 'large', description: 'Number five to eight shuffled story events.' },
  { id: 'sort-story', name: 'Sort the Story', size: 'large', description: 'Sort true and false story statements by letter.' },
  { id: 'draw-story', name: 'Draw the Story', size: 'large', description: 'Four to six framed story illustrations with captions.' },
  { id: 'finish-verse', name: 'Finish the Verse', size: 'medium', description: 'Fill missing verse words with a word bank and letter boxes.' },
  { id: 'unscramble-verse', name: 'Unscramble the Verse', size: 'medium', description: 'Unscramble letters beneath the missing verse words.' },
  { id: 'circle-mistakes', name: 'Circle the Mistakes', size: 'medium', description: 'Find the stated number of errors in a short paragraph.' },
] as const;

export function isStoryVerseId(value: unknown): value is StoryVerseId {
  return typeof value === 'string' && STORY_VERSE_MODULES.some(item => item.id === value);
}
export function blankStoryVerseModule(type: StoryVerseId): StoryVerseModule {
  switch (type) {
    case 'story-order': return {type, events: '', seed: 1};
    case 'sort-story': return {type, statements: '', seed: 1};
    case 'draw-story': return {type, prompts: ''};
    case 'finish-verse': return {type, reference: '', verse: '', seed: 1};
    case 'unscramble-verse': return {type, reference: '', verse: '', seed: 1};
    case 'circle-mistakes': return {type, text: '', count: 3};
  }
}

const isStr = (x: unknown): x is string => typeof x === 'string';
const isSeed = (x: unknown): boolean => Number.isSafeInteger(x) && Number(x) >= 0;
export function isStoryVerseModule(value: unknown): value is StoryVerseModule {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  if (!isStoryVerseId(m.type)) return false;
  switch (m.type) {
    case 'story-order': return isStr(m.events) && isSeed(m.seed);
    case 'sort-story': return isStr(m.statements) && isSeed(m.seed);
    case 'draw-story': return isStr(m.prompts);
    case 'finish-verse':
    case 'unscramble-verse': return isStr(m.reference) && isStr(m.verse) && isSeed(m.seed);
    case 'circle-mistakes': return isStr(m.text) && Number.isInteger(m.count) && Number(m.count) >= 1 && Number(m.count) <= 8;
  }
}
export function linesFromInput(input: string): string[] {
  return input.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
}

export type MarkedStatement = { text: string; truth: boolean };
export function parseStatements(input: string): MarkedStatement[] {
  return linesFromInput(input).map(line => {
    const match = line.match(/^(.*?)\s+(true|false)\s*$/iu);
    return match ? {text: match[1].trim(), truth: match[2].toLowerCase()==='true'} :
      {text: line, truth: false};
  });
}
/** The editor groups legacy truth-suffixed lines without changing saved data. */
export function sortStoryEditorGroups(statements:string):{trueStatements:string;falseStatements:string}{
 const rows=parseStatements(statements);
 return {
  trueStatements:rows.filter(row=>row.truth).map(row=>row.text).join('\n'),
  falseStatements:rows.filter(row=>!row.truth).map(row=>row.text).join('\n'),
 };
}
/** Retain the untouched group's existing positions, so editing one field
 * does not silently reorder the other statements in old saved worksheets.
 * Blank editor lines are local editing whitespace, not printed statements.
 */
export function updateSortStoryGroup(statements:string,truth:boolean,value:string):string{
 const replacement=linesFromInput(value);
 let index=0;
 const result:string[]=[];
 for(const row of parseStatements(statements)){
  if(row.truth!==truth){result.push(row.text+' '+(row.truth?'true':'false'));continue;}
  if(index<replacement.length)result.push(replacement[index++]+' '+(truth?'true':'false'));
 }
 while(index<replacement.length)result.push(replacement[index++]+' '+(truth?'true':'false'));
 return result.join('\n');
}
export function orderedStoryEvents(module: StoryOrder): string[] {
  const events = linesFromInput(module.events);
  return shuffledIndices(events.length, module.events, module.seed).map(i => events[i]);
}
export function sortedStoryBank(module: SortStory): MarkedStatement[] {
  const items = parseStatements(module.statements);
  return shuffledIndices(items.length, module.statements, module.seed).map(i => items[i]);
}
export function boxGrid(module: DrawStory): { cols: 2 | 3; rows: 2; items: string[] } {
  const items = linesFromInput(module.prompts);
  return {cols: items.length <= 4 ? 2 : 3, rows:2, items};
}

export type VersePiece = {kind:'text'|'blank'; value:string};
export function parseVerse(verse: string): {parts:VersePiece[]; answers:string[]; malformed:boolean} {
  const parts:VersePiece[]=[];
  const answers:string[]=[];
  const re=/\[([^\[\]]*)\]/gu;
  let start=0;
  for(const m of verse.matchAll(re)){
    const pos=m.index??0;
    if(pos>start)parts.push({kind:'text',value:verse.slice(start,pos)});
    const word=m[1].trim();
    parts.push({kind:'blank',value:word});
    answers.push(word);
    start=pos+m[0].length;
  }
  if(start<verse.length)parts.push({kind:'text',value:verse.slice(start)});
  return {
    parts,answers,
    malformed:(verse.match(/\[/gu)??[]).length!==answers.length ||
      (verse.match(/\]/gu)??[]).length!==answers.length,
  };
}
export function verseBank(module: FinishVerse): string[] {
  const answers=parseVerse(module.verse).answers;
  return shuffledIndices(answers.length, module.verse, module.seed).map(i=>answers[i]);
}
export function verseScrambles(module: UnscrambleVerse): string[] {
  return parseVerse(module.verse).answers.map((word,index)=>scrambleWord(letterOnly(word),module.seed+index*29));
}
export function mistakesTitle(count:number):string {
  const names=['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT'];
  return 'CIRCLE ALL '+(names[count]??String(count))+' MISTAKES!';
}
function validateVerse(module:FinishVerse|UnscrambleVerse):string[] {
  const problems:string[]=[];
  const parsed=parseVerse(module.verse);
  const min=module.type==='finish-verse'?2:4,max=8;
  if(!module.reference.trim() || module.reference.length>38) problems.push('Enter a verse reference no longer than 38 characters.');
  if(parsed.answers.length<min || parsed.answers.length>max) problems.push('Mark '+min+'–'+max+' missing words using [square brackets].');
  if(parsed.malformed) problems.push('Each missing verse word needs matching [square brackets].');
  if(parsed.answers.some(x=>module.type==='finish-verse'
      ? (!/^[\p{L}]+(?:['’-][\p{L}]+)*$/u.test(x)||x.length>9)
      : !validBracketedAnswer(x)))
    problems.push('Bracketed answers must contain at most 9 letters (punctuation is allowed in Unscramble).');
  const maxLength=module.type==='finish-verse'?300:240;
  if(module.verse.length>maxLength) problems.push('Keep the marked verse under '+maxLength+' characters for the medium region.');
  if(!parsed.parts.some(x=>x.kind==='text' && x.value.trim())) problems.push('Include some ordinary verse text outside the blanks.');
  return problems;
}
export function validateStoryVerse(module:StoryVerseModule):string[] {
  switch(module.type){
    case 'story-order': {
      const lines=linesFromInput(module.events);
      const errors:string[]=[];
      if(lines.length<5||lines.length>8)errors.push('Enter 5–8 story events, one per line, in chronological order.');
      if(lines.some(line=>line.length>115))errors.push('Keep each event under 115 characters.');
      return errors;
    }
    case 'sort-story':{
      const lines=linesFromInput(module.statements);
      const rows=parseStatements(module.statements);
      const errors:string[]=[];
      if(rows.length<4||rows.length>8)errors.push('Enter 4–8 story statements, one per line.');
      if(lines.some(line=>!/^(.*?)\s+(true|false)\s*$/iu.test(line))) errors.push('End every line with true or false, separated by a space.');
      if(rows.some(row=>!row.text || row.text.length>115))errors.push('Keep each statement under 115 characters.');
      if(!rows.some(row=>row.truth)||!rows.some(row=>!row.truth))errors.push('Include at least one true and one false statement.');
      return errors;
    }
    case 'draw-story': {
      const prompts=linesFromInput(module.prompts);
      const errors:string[]=[];
      if(prompts.length<4||prompts.length>6)errors.push('Enter 4–6 drawing prompts, one per line.');
      if(prompts.some(x=>x.length>105))errors.push('Keep each drawing prompt under 105 characters.');
      return errors;
    }
    case 'finish-verse':
    case 'unscramble-verse':return validateVerse(module);
    case 'circle-mistakes':{
      const errors:string[]=[];
      if(!module.text.trim()||module.text.length>475)errors.push('Enter a mistake-filled paragraph of 1–475 characters.');
      if(!Number.isInteger(module.count)||module.count<1||module.count>8)errors.push('Specify 1–8 mistakes to find.');
      return errors;
    }
  }
}
