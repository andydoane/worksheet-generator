import type {Lesson} from './model.ts';
import {changeWordBankList,type WordBankKind} from './wordBanks.ts';
import {REVIEW_DECOY_POOL} from './decoyPool.ts';

export const DECOY_SUGGESTION_COUNT=5;
const key=(word:string)=>word.trim().normalize('NFKC').toLocaleLowerCase('en');
const strings=(value:unknown):string[]=>
 Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];

/**
 * Suggest five distinct words from the teacher's list; do not infer biblical
 * relatedness. Exclude correct words in BOTH activities, known vocabulary,
 * and decoys used in the OTHER activity (reviewed or not). A generation never
 * modifies the current teacher-approved list unless the UI confirms replacing.
 */
export function suggestDecoyWords(
 lesson:Lesson,kind:WordBankKind,
 random:()=>number=Math.random,pool:readonly string[]=REVIEW_DECOY_POOL,
):string[]{
 const prepared=lesson.preparedActivities;
 if(!prepared?.[kind])throw Error('No prepared word bank for '+kind+'.');
 const reserved=new Set([
  ...strings(prepared.oddWords?.related),
  ...strings(prepared.checkboxes?.correct),
  ...strings(kind==='oddWords'?prepared.checkboxes?.incorrect:prepared.oddWords?.unrelated),
  ...(Array.isArray(lesson.vocabulary?.entries)?
   lesson.vocabulary.entries.map((entry:unknown)=>
    entry&&typeof entry==='object'&&'term' in entry?
     (entry as {term?:unknown}).term:undefined):[]),
 ].filter((value):value is string=>typeof value==='string').map(key));
 const maxLength=kind==='oddWords'?12:14;
 const seen=new Set<string>();
 const eligible=pool.filter(word=>{
  const normalized=key(word);
  if(!/^\p{L}+$/u.test(word)||word.length>maxLength||
     reserved.has(normalized)||seen.has(normalized))return false;
  seen.add(normalized);
  return true;
 });
 if(eligible.length<DECOY_SUGGESTION_COUNT)
  throw Error('Not enough unique suggested decoys after excluding existing worksheet words.');
 // Partial Fisher-Yates shuffle: unbiased sampling without replacement.
 for(let i=0;i<DECOY_SUGGESTION_COUNT;i++){
  const n=i+Math.floor(random()*(eligible.length-i));
  [eligible[i],eligible[n]]=[eligible[n],eligible[i]];
 }
 return eligible.slice(0,DECOY_SUGGESTION_COUNT);
}

/** Immutable lesson change; the approved source and correct choices stay intact. */
export function replaceWithSuggestedDecoys(
 lesson:Lesson,kind:WordBankKind,random:()=>number=Math.random,
 pool:readonly string[]=REVIEW_DECOY_POOL,
):{lesson:Lesson;words:string[]}{
 const words=suggestDecoyWords(lesson,kind,random,pool);
 const field=kind==='oddWords'?'unrelated':'incorrect';
 const next=changeWordBankList(lesson,kind,field,words.join('\n'));
 const originField=kind==='oddWords'?'unrelatedOrigin':'incorrectOrigin';
 next.preparedActivities[kind][originField]='suggested';
 return {lesson:next,words};
}
