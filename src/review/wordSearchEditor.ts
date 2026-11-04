import {validateModule} from '../modules.ts';
import {generateWordSearch} from '../puzzleEngines.ts';
import type {Lesson} from './model.ts';

export type SearchKind='wordSearch'|'mediumWordSearch';
export type SearchIssue={index?:number;message:string};
const isMedium=(kind:SearchKind)=>kind==='mediumWordSearch';
const maxWords=(kind:SearchKind)=>isMedium(kind)?6:12;
const minWords=(kind:SearchKind)=>isMedium(kind)?1:4;
export const searchModuleId=(kind:SearchKind)=>
 isMedium(kind)?'medium-word-search' as const:'word-search' as const;
export function searchWords(lesson:Lesson,kind:SearchKind):string[]{
 const words=lesson.preparedActivities?.[kind]?.words;
 return Array.isArray(words)?words:[];
}
export function sourceVocabulary(lesson:Lesson,kind:SearchKind):{
 term:string;sourceIds:string[];origin?:string;teacherReviewRequired?:boolean;
}[]{
 const limit=isMedium(kind)?9:12;
 const results=new Map<string,{term:string;sourceIds:string[];origin?:string;teacherReviewRequired?:boolean}>();
 for(const entry of lesson.vocabulary?.entries??[]){
  const term=String(entry.term??'').trim().replace(/\s+/gu,' ').toUpperCase();
  if(entry.scope==='application'||!(/^[A-Z]+(?: [A-Z]+)*$/u.test(term)))continue;
  const letters=term.replace(/ /gu,'');
  if(letters.length<2||letters.length>limit||results.has(letters))continue;
  results.set(letters,{term,sourceIds:[...(entry.sourceIds??[])],
   origin:entry.origin,teacherReviewRequired:entry.teacherReviewRequired===true});
 }
 return [...results.values()];
}
/** Report authoring problems before asking the actual 9x9 / 12x10 engine to
 * generate. No guessed/unsourced vocabulary is ever added automatically.
 */
export function searchIssues(words:readonly string[],kind:SearchKind):SearchIssue[]{
 const problems:SearchIssue[]=[];
 const min=minWords(kind),max=maxWords(kind);
 if(words.length<min||words.length>max)
  problems.push({message:'Use '+min+'–'+max+' words (currently '+words.length+').'});
 const seen=new Map<string,number>();
 for(const [index,word] of words.entries()){
  const term=typeof word==='string'?word.trim():'';
  const letters=term.toUpperCase().replace(/ /gu,'');
  if(!term)problems.push({index,message:'Word '+(index+1)+' is empty.'});
  else if(!/^[A-Z]+(?: [A-Z]+)*$/u.test(term.toUpperCase()))
   problems.push({index,message:'Word '+(index+1)+' must use A–Z letters with single spaces.'});
  if(letters.length<2||letters.length>(isMedium(kind)?9:12))
   problems.push({index,message:'Word '+(index+1)+' must contain 2–'+(isMedium(kind)?9:12)+' letters.'});
  if(letters.length){
   const earlier=seen.get(letters);
   if(earlier!==undefined)
    problems.push({index,message:'Word '+(index+1)+' repeats word '+(earlier+1)+'.'});
   else seen.set(letters,index);
  }
 }
 if(problems.length)return problems;
 const module={type:searchModuleId(kind),words:words.join('\n'),seed:1};
 const errors=validateModule(module);
 if(errors.length)return errors.map(message=>({message}));
 try{generateWordSearch(module);}
 catch(error){problems.push({message:'The word-search grid cannot place these words: '+
  (error instanceof Error?error.message:String(error))});}
 return problems;
}
function nextBank(lesson:Lesson,kind:SearchKind){
 const next=structuredClone(lesson);
 next.preparedActivities??={};
 next.preparedActivities[kind]??={words:[],origin:'suggested',teacherReviewRequired:true,sourceIds:[]};
 const record=next.preparedActivities[kind];
 if(!Array.isArray(record.words))throw Error('The '+kind+' vocabulary must be an array.');
 return {next,record,words:record.words as string[]};
}
function markSuggested(record:any){
 record.origin='suggested';
 record.teacherReviewRequired=true;
 // A modified bank cannot inherit canonical source attribution as a whole.
 delete record.source;
}
export function setSearchWord(lesson:Lesson,kind:SearchKind,index:number,value:string):Lesson{
 const {next,record,words}=nextBank(lesson,kind);
 if(index<0||index>=words.length)throw Error('Word-search entry no longer exists.');
 if(words[index]===value)return next;
 words[index]=value;
 markSuggested(record);
 return next;
}
export function addSearchWord(lesson:Lesson,kind:SearchKind,value=''):Lesson{
 const {next,record,words}=nextBank(lesson,kind);
 if(words.length>=maxWords(kind))throw Error('This Word Search is already full.');
 words.push(value);
 markSuggested(record);
 return next;
}
export function removeSearchWord(lesson:Lesson,kind:SearchKind,index:number):Lesson{
 const {next,record,words}=nextBank(lesson,kind);
 if(index<0||index>=words.length)throw Error('Word-search entry no longer exists.');
 words.splice(index,1);
 markSuggested(record);
 return next;
}
export function moveSearchWord(lesson:Lesson,kind:SearchKind,index:number,direction:-1|1):Lesson{
 const {next,record,words}=nextBank(lesson,kind);
 if(index<0||index>=words.length||index+direction<0||index+direction>=words.length)
  throw Error('Cannot move a word beyond the first or last row.');
 [words[index],words[index+direction]]=[words[index+direction],words[index]];
 markSuggested(record);
 return next;
}
export function chooseSourceSearchWord(lesson:Lesson,kind:SearchKind,index:number,term:string):Lesson{
 const candidate=sourceVocabulary(lesson,kind).find(entry=>entry.term===term);
 if(!candidate)throw Error('Select vocabulary from this lesson; no new words are invented.');
 const next=setSearchWord(lesson,kind,index,candidate.term);
 const bank=next.preparedActivities[kind];
 bank.sourceIds=[...new Set([...(bank.sourceIds??[]),...candidate.sourceIds])];
 bank.teacherReviewRequired=true;
 return next;
}
