import {validateModule} from '../modules.ts';
import type {Lesson} from './model.ts';

type Choice={text:string;isCorrect:boolean;origin?:string;teacherReviewRequired?:boolean};
export type MultipleChoiceRow={
 id:string;question:string;correctAnswer:string;choices:Choice[];
 sourceQuestionIds?:string[];sourceIds?:string[];
 origin?:string;teacherReviewRequired?:boolean;[key:string]:unknown;
};
/** Review order only. Keep each original array index so editing always writes
 * back to the right choice. The printable generator still shuffles by seed.
 */
export function reviewChoiceOrder(row:MultipleChoiceRow):{choice:Choice;originalIndex:number}[]{
 const choices=Array.isArray(row.choices)?row.choices:[];
 return choices.map((choice,originalIndex)=>({choice,originalIndex}))
  .sort((a,b)=>Number(b.choice?.isCorrect===true)-Number(a.choice?.isCorrect===true)||
   a.originalIndex-b.originalIndex);
}

export function multipleChoiceRows(lesson:Lesson):MultipleChoiceRow[]{
 const rows=lesson.preparedActivities?.multipleChoice;
 return Array.isArray(rows)?rows:[];
}
export function multipleChoiceIssues(lesson:Lesson):{index?:number;message:string}[]{
 const rows=multipleChoiceRows(lesson),issues:{index?:number;message:string}[]=[];
 if(lesson.preparedActivities?.multipleChoice!==undefined&&
  !Array.isArray(lesson.preparedActivities.multipleChoice))
  issues.push({message:'The saved Multiple Choice bank is not an array. Use scoped Advanced JSON to repair it.'});
 if(!rows.length)issues.push({message:'Add at least one prepared Multiple Choice question.'});
 const ids=new Set<string>();
 rows.forEach((row,index)=>{
  if(!row||typeof row!=='object'){
   issues.push({index,message:'This prepared question is not an object. Repair its structure in Advanced JSON.'});
   return;
  }
  if(!row.id||ids.has(row.id))issues.push({index,message:'A question ID is missing or repeated.'});
  ids.add(row.id);
  if(!Array.isArray(row.choices)||row.choices.length!==3){
   issues.push({index,message:'Exactly three answer choices are required.'});return;
  }
  const correct=row.choices.filter(x=>x.isCorrect===true);
  if(correct.length!==1||correct[0].text.trim()!==String(row.correctAnswer??'').trim())
   issues.push({index,message:'Exactly one correct choice must match the saved correct answer.'});
  const incorrect=row.choices.filter(x=>!x.isCorrect);
  if(incorrect.length!==2)issues.push({index,message:'Provide two incorrect choices.'});
  if(row.choices.some(x=>!String(x.text??'').trim())||!String(row.question??'').trim())
   issues.push({index,message:'Write the question and all three answers.'});
  const texts=row.choices.map(x=>String(x.text??'').trim().toLowerCase());
  if(new Set(texts).size!==3)issues.push({index,message:'All three answer choices must be different.'});
  if(row.choices.length===3&&correct.length===1&&incorrect.length===2){
   const engineErrors=validateModule({type:'multiple-choice',question:row.question,
    correct:row.correctAnswer,wrong1:incorrect[0].text,wrong2:incorrect[1].text,seed:1});
   issues.push(...engineErrors.map(message=>({index,message})));
  }
 });
 return issues;
}
const clone=(lesson:Lesson)=>structuredClone(lesson);
export function chooseOriginalQuestion(lesson:Lesson,questionId:string):Lesson{
 const source=(lesson.questions??[]).find((x:any)=>x.id===questionId);
 if(!source||!String(source.question??'').trim()||!String(source.answer??'').trim())
  throw Error('Choose an original question with a complete answer.');
 const next=clone(lesson);
 next.preparedActivities??={};
 next.preparedActivities.multipleChoice??=[];
 if(!Array.isArray(next.preparedActivities.multipleChoice))
  throw Error('Prepared Multiple Choice bank must be an array.');
 const existing=new Set(next.preparedActivities.multipleChoice.map((x:any)=>x.id));
 let i=1;while(existing.has('mc-review-'+i))i++;
 next.preparedActivities.multipleChoice.push({
  id:'mc-review-'+i,question:source.question,correctAnswer:source.answer,
  choices:[{text:source.answer,isCorrect:true,origin:'source'},
   {text:'',isCorrect:false,origin:'suggested'},
   {text:'',isCorrect:false,origin:'suggested'}],
  origin:'suggested',teacherReviewRequired:true,
  sourceIds:[...(source.sourceIds??[])],sourceQuestionIds:[source.id],
 });
 return next;
}
export function editMultipleChoice(lesson:Lesson,index:number,
 field:'question'|'correctAnswer'|'wrong1'|'wrong2',value:string):Lesson{
 const next=clone(lesson),row=next.preparedActivities?.multipleChoice?.[index];
 if(!row)throw Error('Multiple Choice question no longer exists.');
 if(!Array.isArray(row.choices)||row.choices.length!==3)
  throw Error('Fix the damaged answer-choice structure in Advanced JSON first.');
 const correct=row.choices.find((x:Choice)=>x.isCorrect===true);
 const wrong=row.choices.filter((x:Choice)=>!x.isCorrect);
 if(!correct||wrong.length!==2)throw Error('A question must have one correct and two incorrect choices.');
 if(field==='question')row.question=value;
 if(field==='correctAnswer'){
  row.correctAnswer=value;correct.text=value;correct.origin='suggested';
  // New correct answer cannot retain attribution to the original question.
  row.sourceQuestionIds=[];row.sourceIds=[];
 }
 if(field==='wrong1')wrong[0].text=value;
 if(field==='wrong2')wrong[1].text=value;
 row.origin='suggested';row.teacherReviewRequired=true;
 return next;
}
export function removeMultipleChoice(lesson:Lesson,index:number):Lesson{
 const next=clone(lesson),rows=next.preparedActivities?.multipleChoice;
 if(!Array.isArray(rows)||index<0||index>=rows.length)
  throw Error('The question no longer exists.');
 rows.splice(index,1);
 return next;
}
