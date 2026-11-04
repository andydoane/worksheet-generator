import {validateModule} from '../modules.ts';
import {validUnscramblePhrase} from '../smallModules.ts';
import {generatePixelPicture,PIXEL_MAX_LENGTH,PIXEL_MIN_LENGTH} from '../pixelPicture.ts';
import type {Lesson} from './model.ts';

type SourceChoice={
 id:string;text:string;origin?:string;sourceIds:string[];source?:unknown;
 teacherReviewRequired:boolean;description:string;
};
const copy=<T,>(value:T):T=>structuredClone(value);
const unique=(values:readonly string[])=>[...new Set(values)];
const flag=(item:any)=>{
 item.origin='suggested';item.teacherReviewRequired=true;
 delete item.source;
};
function record(lesson:Lesson,key:'whoAmI'|'unscrambleWords'|'pixelPicture'|'finishStory'){
 const next=copy(lesson);
 next.preparedActivities??={};
 const defaults={
  whoAmI:{clue:'',answer:'',sourceIds:[]},
  unscrambleWords:{answers:['',''],sourceIds:[]},
  pixelPicture:{phrase:'',shapeId:'star',sourceIds:[]},
  finishStory:{markedParagraph:'',sourceIds:[]},
 };
 if(next.preparedActivities[key]===undefined)next.preparedActivities[key]=copy(defaults[key]);
 if(!next.preparedActivities[key]||typeof next.preparedActivities[key]!=='object'||
  Array.isArray(next.preparedActivities[key]))
  throw Error('This prepared activity is structurally invalid. Use Advanced JSON to restore an object.');
 return {next,item:next.preparedActivities[key]};
}

export function whoAmIChoices(lesson:Lesson):SourceChoice[]{
 const result:SourceChoice[]=[];
 for(const person of lesson.characters??[]){
  for(const [index,clue] of (person.clues??[]).entries()){
   const answer=String(person.name??'');
   const text=String(clue.text??'');
   if(validateModule({type:'who-am-i',clue:text,answer}).length)continue;
   result.push({id:person.id+':'+index,text,origin:clue.origin??person.origin,
    sourceIds:[...(person.sourceIds??[])],source:clue.source??person.source,
    teacherReviewRequired:clue.teacherReviewRequired===true||
     person.teacherReviewRequired===true||
     clue.origin==='suggested'||person.origin==='suggested',
    description:answer});
  }
 }
 return result;
}
export function whoAmIProblems(lesson:Lesson):string[]{
 const item=lesson.preparedActivities?.whoAmI;
 if(!item||typeof item.clue!=='string'||typeof item.answer!=='string')
  return ['Enter a character name and a clue.'];
 return validateModule({type:'who-am-i',clue:item.clue,answer:item.answer});
}
export function chooseWhoAmI(lesson:Lesson,id:string):Lesson{
 const option=whoAmIChoices(lesson).find(x=>x.id===id);
 if(!option)throw Error('Choose an existing reviewed character and clue.');
 const {next,item}=record(lesson,'whoAmI');
 item.clue=option.text;item.answer=option.description;
 item.origin=option.origin??'adapted';item.sourceIds=[...option.sourceIds];
 item.teacherReviewRequired=option.teacherReviewRequired;
 if(option.source)item.source=copy(option.source);
 else delete item.source;
 return next;
}
export function editWhoAmI(lesson:Lesson,field:'clue'|'answer',value:string):Lesson{
 const {next,item}=record(lesson,'whoAmI');
 if(item[field]===value)return next;
 item[field]=value;flag(item);
 // A manually changed answer must never claim attribution to a different
 // character. Teacher may deliberately write a new clue/answer and sign off.
 if(field==='answer')item.sourceIds=[];
 return next;
}

export type WordChoice={term:string;sourceIds:string[];origin?:string;teacherReviewRequired:boolean};
export function unscrambleChoices(lesson:Lesson):WordChoice[]{
 const seen=new Set<string>(),results:WordChoice[]=[];
 for(const entry of lesson.vocabulary?.entries??[]){
  const term=String(entry.term??'').trim().toUpperCase().replace(/\s+/gu,' ');
  if(entry.scope==='application'||!validUnscramblePhrase(term)||seen.has(term))continue;
  seen.add(term);results.push({term,sourceIds:[...(entry.sourceIds??[])],
   origin:entry.origin,teacherReviewRequired:entry.teacherReviewRequired===true});
 }
 return results;
}
export function unscrambleWords(lesson:Lesson):string[]{
 const answers=lesson.preparedActivities?.unscrambleWords?.answers;
 return Array.isArray(answers)?answers:[];
}
export function unscrambleProblems(lesson:Lesson):string[]{
 const answers=unscrambleWords(lesson);
 if(answers.length!==2)return ['Unscramble the Words needs exactly two answers.'];
 if(answers.some(x=>typeof x!=='string'))return ['Both answers must be text.'];
 const problems=validateModule({
  type:'unscramble-words',first:answers[0],second:answers[1],seed:1,
 });
 if(answers[0].trim().toUpperCase()===answers[1].trim().toUpperCase())
  problems.push('Choose two different answers for the worksheet.');
 return problems;
}
function editAnswers(lesson:Lesson,index:number,value:string,choice?:WordChoice):Lesson{
 if(index!==0&&index!==1)throw Error('Choose answer 1 or 2.');
 const {next,item}=record(lesson,'unscrambleWords');
 if(!Array.isArray(item.answers)||item.answers.length!==2)
  throw Error('The two Unscramble answers are not an array. Use Advanced JSON to repair them.');
 if(item.answers[index]===value&&!choice)return next;
 item.answers[index]=value;
 flag(item);
 if(choice){
  const sourcePool=unscrambleChoices(next);
  const ids=item.answers.flatMap((answer:string)=>sourcePool.find(x=>
   x.term===String(answer).trim().toUpperCase())?.sourceIds??[]);
  item.sourceIds=unique(ids);
 }else item.sourceIds=[];
 return next;
}
export function editUnscramble(lesson:Lesson,index:number,value:string):Lesson{
 return editAnswers(lesson,index,value);
}
export function chooseUnscramble(lesson:Lesson,index:number,term:string):Lesson{
 const choice=unscrambleChoices(lesson).find(x=>x.term===term);
 if(!choice)throw Error('Choose a vocabulary word actually recorded in this lesson.');
 return editAnswers(lesson,index,choice.term,choice);
}

export type PixelPhraseChoice=SourceChoice;
export function pixelPhraseChoices(lesson:Lesson):PixelPhraseChoice[]{
 const ideas=(lesson.lessonDetails?.bigIdeas??[]).map((x:any,i:number)=>({
  ...x,id:'idea:'+i,text:x.text,description:'Original Important Idea',
 }));
 const keys=(lesson.keyPhrases??[]).map((x:any)=>({
  ...x,id:'phrase:'+x.id,description:'Key Phrase',
 }));
 const events=(lesson.preparedActivities?.storyOrder??[]).map((x:any,i:number)=>({
  ...x,id:'event:'+i,description:'Story Order',
 }));
 const seen=new Set<string>(),out:SourceChoice[]=[];
 for(const item of [...ideas,...keys,...events]){
  const phrase=String(item.text??'').trim();
  if(seen.has(phrase))continue;
  if(validateModule({type:'pixel-picture',phrase,shapeId:'star',seed:1}).length)continue;
  seen.add(phrase);out.push({id:String(item.id),text:phrase,
   description:item.description,origin:item.origin??'adapted',
   sourceIds:[...(item.sourceIds??[])],source:item.source,
   teacherReviewRequired:item.teacherReviewRequired===true||item.origin==='suggested'});
 }
 return out;
}
export function pixelProblems(lesson:Lesson):string[]{
 const item=lesson.preparedActivities?.pixelPicture;
 const module={type:'pixel-picture' as const,phrase:String(item?.phrase??''),
  shapeId:String(item?.shapeId??'star'),seed:1};
 const problems=validateModule(module);
 if(problems.length)return problems;
 try{generatePixelPicture(module);}
 catch(error){problems.push('The pixel puzzle could not be generated: '+
  (error instanceof Error?error.message:String(error)));}
 return problems;
}
export function choosePixelPhrase(lesson:Lesson,id:string):Lesson{
 const choice=pixelPhraseChoices(lesson).find(x=>x.id===id);
 if(!choice)throw Error('Choose an existing valid lesson phrase.');
 const {next,item}=record(lesson,'pixelPicture');
 item.phrase=choice.text;item.origin=choice.origin??'adapted';
 item.sourceIds=[...choice.sourceIds];item.teacherReviewRequired=choice.teacherReviewRequired;
 if(choice.source)item.source=copy(choice.source);
 else delete item.source;
 return next;
}
export function editPixelPhrase(lesson:Lesson,value:string):Lesson{
 const {next,item}=record(lesson,'pixelPicture');
 if(item.phrase===value)return next;
 item.phrase=value;item.sourceIds=[];flag(item);
 return next;
}
export function editPixelShape(lesson:Lesson,shapeId:string):Lesson{
 const {next,item}=record(lesson,'pixelPicture');
 if(item.shapeId===shapeId)return next;
 item.shapeId=shapeId;
 // This changes picture art, not the wording/source of the phrase.
 item.teacherReviewRequired=true;
 return next;
}
export {PIXEL_MIN_LENGTH,PIXEL_MAX_LENGTH};

export function finishStoryProblems(lesson:Lesson):string[]{
 const story=String(lesson.preparedActivities?.finishStory?.markedParagraph??'');
 return validateModule({type:'finish-story',story,seed:1});
}
/** Teacher-authored Fill in the Story may choose ANY meaningful blank words.
 * Source Story Note emphasis is reference context, never a validation gate.
 */
export function editFinishStory(lesson:Lesson,value:string):Lesson{
 const {next,item}=record(lesson,'finishStory');
 if(item.markedParagraph===value)return next;
 item.markedParagraph=value;flag(item);
 return next;
}
