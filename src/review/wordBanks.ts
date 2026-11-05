import type {Lesson} from './model.ts';
import {validateModule} from '../modules.ts';

export type WordBankKind='oddWords'|'checkboxes';
export type WordBankField='related'|'unrelated'|'correct'|'incorrect';
export const WORD_BANK_FIELDS={
 oddWords:['related','unrelated'],
 checkboxes:['correct','incorrect'],
} as const;

function validField(kind:WordBankKind,field:WordBankField):boolean{
 return (WORD_BANK_FIELDS[kind] as readonly string[]).includes(field);
}
function wordsAt(lesson:Lesson|null,kind:WordBankKind,field:WordBankField):string[]{
 if(!validField(kind,field))return [];
 const raw=lesson?.preparedActivities?.[kind]?.[field];
 return Array.isArray(raw)?raw.filter((value):value is string=>typeof value==='string'):[];
}
export function wordBankText(lesson:Lesson|null,kind:WordBankKind,field:WordBankField):string{
 return wordsAt(lesson,kind,field).join('\n');
}
export function wordBankDrafts(lesson:Lesson|null){
 return {
  oddWords:{
   related:wordBankText(lesson,'oddWords','related'),
   unrelated:wordBankText(lesson,'oddWords','unrelated'),
  },
  checkboxes:{
   correct:wordBankText(lesson,'checkboxes','correct'),
   incorrect:wordBankText(lesson,'checkboxes','incorrect'),
  },
 };
}

/** One editable line becomes one worksheet choice. Preserve source/provenance
 * records and every other activity; editing a prepared word bank never edits
 * the original curriculum vocabulary, Story Notes or review citations.
 */
export function changeWordBankList(
 lesson:Lesson,kind:WordBankKind,field:WordBankField,rawText:string,
):Lesson{
 if(!validField(kind,field))throw Error('Invalid word-bank field for '+kind);
 if(!lesson.preparedActivities?.[kind])throw Error('No prepared word bank for '+kind);
 const next=structuredClone(lesson);
 next.preparedActivities[kind][field]=rawText.split(/\r?\n/u)
  .map(line=>line.trim()).filter(Boolean);
 return next;
}
export function wordBankCounts(lesson:Lesson|null,kind:WordBankKind){
 const [first,second]=WORD_BANK_FIELDS[kind];
 const a=wordsAt(lesson,kind,first).length;
 const b=wordsAt(lesson,kind,second).length;
 return {story:a,unrelated:b,total:a+b};
}

/** Uses the actual printable module validator, not a second set of
 * hand-maintained rules. The same errors are enforced by Review preflight.
 */
export function wordBankIssues(lesson:Lesson|null,kind:WordBankKind):string[]{
 if(!lesson?.preparedActivities?.[kind])return ['No prepared word bank for this activity.'];
 const [first,second]=WORD_BANK_FIELDS[kind];
 return validateModule({
  type:kind==='oddWords'?'odd-words':'checkboxes',
  correct:wordsAt(lesson,kind,first).join('\n'),
  incorrect:wordsAt(lesson,kind,second).join('\n'),
  seed:1,
 });
}
