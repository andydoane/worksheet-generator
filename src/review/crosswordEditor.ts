import type {Lesson} from './model.ts';
import {validateModule} from '../modules.ts';
import {generateCrossword,checkCrossword} from '../specialtyModules.ts';

export type CrosswordPair={
 answer:string;clue:string;sourceIds?:string[];origin?:string;
 teacherReviewRequired?:boolean;source?:unknown;[key:string]:unknown;
};
export type CrosswordIssue={
 index?:number;field?:'answer'|'clue';kind:'count'|'field'|'layout';
 message:string;
};
const copy=<T,>(value:T):T=>structuredClone(value);
const normalizedAnswer=(value:string)=>value.toUpperCase().replace(/\s+/gu,'');
const values=(lesson:Lesson):CrosswordPair[]=>{
 const bank=lesson.preparedActivities?.crossword;
 if(bank===undefined)return [];
 if(!Array.isArray(bank))throw Error('Crossword entries are not an array. Repair the data using Advanced JSON.');
 return bank;
};
export const crosswordPairs=(lesson:Lesson):CrosswordPair[]=>values(lesson);

/** The converter serializes the exact same answer/clue format into the
 * crossword engine. Never normalize a teacher's text silently while typing.
 */
export const crosswordModule=(pairs:readonly CrosswordPair[])=>({
 type:'crossword' as const,
 entries:pairs.map(pair=>String(pair.answer??'')+', '+String(pair.clue??'')).join('\n'),
 seed:1,
});

/** Fast, deterministic per-keystroke checks. Do not call the crossword
 * backtracking engine here: the Review Studio uses these while typing.
 * The full converter preflight continues to call crosswordIssues().
 */
export function crosswordTextIssues(pairs:readonly CrosswordPair[]):CrosswordIssue[]{
 const issues:CrosswordIssue[]=[];
 if(pairs.length<6||pairs.length>10)issues.push({kind:'count',
  message:'Crossword needs 6–10 answer/clue pairs (currently '+pairs.length+').'});
 const seen=new Map<string,number>();
 for(const [index,pair] of pairs.entries()){
  const answer=typeof pair?.answer==='string'?pair.answer.trim():'';
  const clue=typeof pair?.clue==='string'?pair.clue.trim():'';
  const letters=normalizedAnswer(answer);
  if(!answer)issues.push({index,field:'answer',kind:'field',
   message:'Entry '+(index+1)+': enter an answer.'});
  if(answer&&( !/^[A-Za-z]+(?: [A-Za-z]+)*$/u.test(answer)||
   letters.length<3||letters.length>12))
   issues.push({index,field:'answer',kind:'field',
    message:'Entry '+(index+1)+': use 3–12 A–Z letters (spaces allowed in phrases).'});
  if(answer.includes(',')||answer.includes('\n'))
   issues.push({index,field:'answer',kind:'field',
    message:'Entry '+(index+1)+': an answer cannot contain commas or line breaks.'});
  if(letters){
   const duplicate=seen.get(letters);
   if(duplicate!==undefined)issues.push({index,field:'answer',kind:'field',
    message:'Entry '+(index+1)+': answer duplicates entry '+(duplicate+1)+'.'});
   else seen.set(letters,index);
  }
  if(!clue||clue.length>85)
   issues.push({index,field:'clue',kind:'field',
    message:'Entry '+(index+1)+': write a clue of 1–85 characters.'});
  if(clue.includes(',')||clue.includes('\n'))
   issues.push({index,field:'clue',kind:'field',
    message:'Entry '+(index+1)+': a clue cannot contain commas or line breaks.'});
 }
 return issues;
}

/** Full converter-equivalent validation, including the actual connected-grid
 * generator. The Review Studio delays this expensive check while typing;
 * explicit preflight and exports never accept this partial validation alone.
 */
export function crosswordIssues(pairs:readonly CrosswordPair[]):CrosswordIssue[]{
 const issues=crosswordTextIssues(pairs);
 if(issues.length)return issues;
 const module=crosswordModule(pairs);
 const engineErrors=validateModule(module);
 if(engineErrors.length)return engineErrors.map(message=>({kind:'field',message}));
 try{
  const grid=generateCrossword(module);
  if(!checkCrossword(grid)||grid.placements.length!==pairs.length)
   throw Error('The generated grid did not include every clue.');
 }catch(error){
  issues.push({kind:'layout',message:
   'All answers and clues are individually valid, but they cannot form one connected crossword. '+
   'Try replacing an answer with a source-backed word that shares more letters. '+
   (error instanceof Error?error.message:String(error))});
 }
 return issues;
}

function edit(lesson:Lesson):{next:Lesson;pairs:CrosswordPair[]}{
 const next=copy(lesson);
 next.preparedActivities??={};
 if(!Array.isArray(next.preparedActivities.crossword)){
  if(next.preparedActivities.crossword!==undefined)
   throw Error('Crossword entries are not an array. Repair this field using Advanced JSON.');
  next.preparedActivities.crossword=[];
 }
 return {next,pairs:next.preparedActivities.crossword};
}
export function editCrosswordPair(lesson:Lesson,index:number,
 field:'answer'|'clue',value:string):Lesson{
 const {next,pairs}=edit(lesson),pair=pairs[index];
 if(!pair)throw Error('This crossword entry no longer exists.');
 if(pair[field]===value)return next;
 pair[field]=value;
 pair.origin='suggested';
 pair.teacherReviewRequired=true;
 // Keep original sourceIds as context; a change to wording is never
 // silently presented as a verbatim source-authored clue.
 return next;
}
export function addCrosswordPair(lesson:Lesson):Lesson{
 const {next,pairs}=edit(lesson);
 if(pairs.length>=10)throw Error('Crossword supports a maximum of ten entries.');
 pairs.push({answer:'',clue:'',origin:'suggested',
  sourceIds:[],teacherReviewRequired:true});
 return next;
}
export function removeCrosswordPair(lesson:Lesson,index:number):Lesson{
 const {next,pairs}=edit(lesson);
 if(index<0||index>=pairs.length)throw Error('This crossword entry no longer exists.');
 if(pairs.length<=6)throw Error('Crossword needs at least six entries.');
 pairs.splice(index,1);
 return next;
}
export function moveCrosswordPair(lesson:Lesson,index:number,direction:-1|1):Lesson{
 const {next,pairs}=edit(lesson),target=index+direction;
 if(index<0||index>=pairs.length||target<0||target>=pairs.length)
  throw Error('Cannot move this entry beyond the first or last row.');
 [pairs[index],pairs[target]]=[pairs[target],pairs[index]];
 return next;
}
export type CrosswordVocabulary={
 term:string;sourceIds:string[];origin?:string;teacherReviewRequired:boolean;
};
export function crosswordVocabulary(lesson:Lesson):CrosswordVocabulary[]{
 const seen=new Set<string>();
 return (lesson.vocabulary?.entries??[]).flatMap((item:any)=>{
  const text=String(item.term??'').trim().toUpperCase();
  const letters=normalizedAnswer(text);
  if(item.scope==='application'||!/^[A-Z]+(?: [A-Z]+)*$/u.test(text)||
   letters.length<3||letters.length>12||seen.has(letters))return [];
  seen.add(letters);
  return [{term:text,sourceIds:[...(item.sourceIds??[])],
   origin:item.origin,teacherReviewRequired:item.teacherReviewRequired===true}];
 });
}
/** Replacing an answer invalidates its old clue. Require the teacher to write
 * a new clue, and replace stale source IDs with the selected word's sources.
 */
export function replaceCrosswordAnswerWithVocabulary(
 lesson:Lesson,index:number,term:string,
):Lesson{
 const item=crosswordVocabulary(lesson).find(x=>x.term===term);
 if(!item)throw Error('Choose existing source-linked curriculum vocabulary.');
 const {next,pairs}=edit(lesson),pair=pairs[index];
 if(!pair)throw Error('This crossword entry no longer exists.');
 if(pairs.some((entry,i)=>i!==index&&
  normalizedAnswer(entry.answer)===normalizedAnswer(item.term)))
  throw Error('That answer is already used in the crossword.');
 pair.answer=item.term;
 pair.clue='';
 pair.origin='suggested';
 pair.teacherReviewRequired=true;
 pair.sourceIds=[...item.sourceIds];
 delete pair.source;
 return next;
}
