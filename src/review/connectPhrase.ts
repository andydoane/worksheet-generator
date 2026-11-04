import {validateModule} from '../modules.ts';
import {connectPositions,parseConnectionWords} from '../specialtyModules.ts';
import {solveCodeChoices,type Lesson} from './model.ts';

/** Connect the Phrase is independently editable; neither the authored
 * Important Idea nor Solve the Code is rewritten by these actions.
 */
export function connectPhraseChoices(lesson:Lesson){
 return solveCodeChoices(lesson);
}
export function connectPhraseProblems(text:string):string[]{
 const module={type:'connect-big-idea' as const,idea:text,seed:1};
 const errors=validateModule(module);
 if(errors.length)return errors;
 try{
  if(connectPositions(module).length<4)errors.push('The phrase cannot produce four usable word boxes.');
 }catch(e){errors.push('Could not scatter these words: '+(e instanceof Error?e.message:String(e)));}
 return errors;
}
function nextItem(lesson:Lesson){
 const next=structuredClone(lesson);
 next.preparedActivities??={};
 next.preparedActivities.connectBigIdea??={
  phrase:'',origin:'suggested',teacherReviewRequired:true,sourceIds:[],
 };
 return {next,item:next.preparedActivities.connectBigIdea};
}
export function writeConnectPhrase(lesson:Lesson,value:string):Lesson{
 const {next,item}=nextItem(lesson);
 if(item.phrase===value)return next;
 item.phrase=value;
 // Unverified typed wording cannot claim existing source provenance.
 item.origin='suggested';
 item.teacherReviewRequired=true;
 item.sourceIds=[];
 delete item.source;
 return next;
}
export function chooseConnectPhrase(lesson:Lesson,value:string):Lesson{
 const selected=connectPhraseChoices(lesson).find(option=>option.text===value);
 if(!selected)throw Error('Choose an original or source-linked phrase from the lesson.');
 const errors=connectPhraseProblems(value);
 if(errors.length)throw Error(errors.join(' '));
 const {next,item}=nextItem(lesson);
 item.phrase=selected.text;
 item.origin=selected.origin??'adapted';
 item.teacherReviewRequired=selected.teacherReviewRequired===true;
 item.sourceIds=[...(selected.sourceIds??[])];
 if(selected.source)item.source=structuredClone(selected.source);
 else delete item.source;
 return next;
}
export function addSuggestedConnectPhrase(lesson:Lesson):Lesson{
 const text=String(lesson.preparedActivities?.connectBigIdea?.phrase??'').trim();
 const problems=connectPhraseProblems(text);
 if(problems.length)throw Error(problems.join(' '));
 if(connectPhraseChoices(lesson).some(option=>option.text===text))
  return chooseConnectPhrase(lesson,text);
 const {next,item}=nextItem(lesson);
 next.keyPhrases??=[];
 const ids=new Set(next.keyPhrases.map((p:{id:string})=>p.id));
 let number=1;
 while(ids.has('kp-review-'+number))number++;
 next.keyPhrases.push({
  id:'kp-review-'+number,text,origin:'suggested',
  sourceIds:[],teacherReviewRequired:true,
 });
 item.phrase=text;
 item.origin='suggested';
 item.teacherReviewRequired=true;
 item.sourceIds=[];
 delete item.source;
 return next;
}
export function connectPhraseWordCount(text:string):number{
 return parseConnectionWords(text).length;
}
