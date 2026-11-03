import {validateModule,type ActivityModule,type ModuleId} from './modules.ts';

/**
 * PR 17b: pure adapter from the versioned editorial lesson data to existing
 * printable activity payloads. This deliberately DOES NOT import files from
 * curriculum/review or register any unapproved preset with the public app.
 *
 * The full JSON Schema remains authoritative for lesson file validation.
 * These types describe only the v1 fields needed by the first six adapters.
 */
export type LessonFact={
 id:string;statement:string;isTrue:boolean;origin?:string;
 sourceIds?:string[];teacherReviewRequired?:boolean;
};
type Referenced={sourceIds?:string[];origin?:string;teacherReviewRequired?:boolean};
type StoryOrderItem=Referenced&{order:number;text:string};
type FinishStoryItem=Referenced&{markedParagraph:string};
type QuestionChoice={text:string;isCorrect:boolean;origin?:string};
type MultipleChoiceItem=Referenced&{
 id:string;question:string;correctAnswer:string;choices:QuestionChoice[];
 sourceQuestionIds?:string[];
};
type FactSelection=Referenced&{factId:string;statement:string;isTrue:boolean};
export type LessonActivityData={
 schemaVersion:number;
 id:string;
 publication?:{
  status:string;approved:boolean;
  teacherSignoff?:{reviewer:string;date:string};
  resolvedReviewFlagIds?:string[];
 };
 reviewFlags?:{id:string;type:string}[];
 facts:LessonFact[];
 storyNotes?:{id:string;order:number;cleanText:string}[];
 preparedActivities:{
  storyOrder?:StoryOrderItem[];
  finishStory?:FinishStoryItem;
  multipleChoice?:MultipleChoiceItem[];
  trueFalse?:FactSelection;
  trueFalseMaze?:FactSelection;
  sortStory?:FactSelection[];
 };
};
export type CoreLessonModuleId=
 'story-order'|'finish-story'|'multiple-choice'|'true-false'|'true-false-maze'|'sort-story';
export const CORE_LESSON_MODULE_IDS:readonly CoreLessonModuleId[]=[
 'story-order','finish-story','multiple-choice',
 'true-false','true-false-maze','sort-story',
];
export type ConvertedActivity={
 moduleId:CoreLessonModuleId;
 contentId:string;
 module:ActivityModule;
 sourceIds:string[];
 origin:'source'|'adapted'|'suggested';
 teacherReviewRequired:boolean;
 /** The small True/False module does not store an answer; retain it here. */
 answerKey?:boolean;
};
export type ConversionDiagnostic={
 moduleId:CoreLessonModuleId;
 contentId:string;
 message:string;
};
export type LessonConversionResult={
 lessonId:string;
 candidates:ConvertedActivity[];
 diagnostics:ConversionDiagnostic[];
 /** A pending lesson is never automatically eligible for public listing. */
 publicApproved:boolean;
};
export type ConversionOptions={seed?:number};

function normalizedOrigin(value:string|undefined):ConvertedActivity['origin']{
 return value==='source'?'source':value==='suggested'?'suggested':'adapted';
}
function refs(...values:(string[]|undefined)[]):string[]{
 return [...new Set(values.flatMap(x=>x??[]))];
}
/**
 * Return all valid activity candidates, not a fixed booklet. No automatic
 * selection, arbitrary question rewriting or unannounced content repair.
 * Invalid items are skipped WITH an explicit diagnostic, and all output
 * remains editable. A later PR will choose activities and assign page slots.
 */
export function convertLessonActivities(
 lesson:LessonActivityData,options:ConversionOptions={},
):LessonConversionResult{
 const candidates:ConvertedActivity[]=[];
 const diagnostics:ConversionDiagnostic[]=[];
 const seed=options.seed??1;
 const result:LessonConversionResult={
  lessonId:lesson.id,candidates,diagnostics,
  publicApproved:lesson.publication?.approved===true&&
  lesson.publication?.status==='approved'&&
  !!lesson.publication.teacherSignoff?.reviewer?.trim()&&
  !!lesson.publication.teacherSignoff?.date?.trim()&&
  (lesson.reviewFlags??[]).filter(flag=>flag.type==='teacher-approval')
   .every(flag=>lesson.publication?.resolvedReviewFlagIds?.includes(flag.id)),
 };
 if(lesson.schemaVersion!==1){
  diagnostics.push({moduleId:'story-order',contentId:'lesson',message:'Unsupported curriculum schemaVersion (expected 1).'});
  return result;
 }
 if(!Number.isSafeInteger(seed)||seed<0){
  diagnostics.push({moduleId:'story-order',contentId:'lesson',message:'The conversion seed must be a nonnegative safe integer.'});
  return result;
 }
 const prepared=lesson.preparedActivities??{};
 const factsById=new Map((lesson.facts??[]).map(fact=>[fact.id,fact]));
 const originalIds=new Set((lesson.storyNotes??[]).map(note=>note.id));
 function issue(moduleId:CoreLessonModuleId,contentId:string,message:string){
  diagnostics.push({moduleId,contentId,message});
 }
 function add(moduleId:CoreLessonModuleId,contentId:string,module:ActivityModule,
  sourceIds:string[],origin:string|undefined,review:boolean,answerKey?:boolean){
  const errors=validateModule(module);
  if(errors.length){
   issue(moduleId,contentId,errors.join(' '));return;
  }
  candidates.push({
   moduleId,contentId,module,sourceIds,
   origin:normalizedOrigin(origin),
   teacherReviewRequired:review||origin==='suggested',
   ...(answerKey!==undefined?{answerKey}:{}),
  });
 }
 function verifiedFact(item:FactSelection,moduleId:CoreLessonModuleId,contentId:string){
  const fact=factsById.get(item.factId);
  if(!fact){issue(moduleId,contentId,'Unknown canonical fact '+item.factId+'.');return null;}
  if(fact.statement!==item.statement||fact.isTrue!==item.isTrue){
   issue(moduleId,contentId,'Statement/truth does not match canonical fact '+item.factId+'.');return null;
  }
  return fact;
 }
 // The lesson supplies chronological events. The app shuffles them only when
 // rendering Story Order; their canonical order must remain stable here.
 if(prepared.storyOrder?.length){
  const ordered=[...prepared.storyOrder].sort((a,b)=>a.order-b.order);
  const sequential=ordered.every((entry,i)=>entry.order===i+1);
  const validRefs=ordered.every(entry=>entry.sourceIds?.every(id=>originalIds.has(id))??false);
  if(!sequential||!validRefs){
   issue('story-order','story-order','Story events need sequential order and valid source Story Note IDs.');
  }else{
   add('story-order','story-order',{
    type:'story-order',events:ordered.map(x=>x.text).join('\n'),seed,
   },refs(...ordered.map(x=>x.sourceIds)),
    ordered.some(x=>x.origin==='suggested')?'suggested':'adapted',
    ordered.some(x=>x.teacherReviewRequired===true));
  }
 }else issue('story-order','story-order','No prepared Story Order events.');
 if(prepared.finishStory?.markedParagraph){
  const entry=prepared.finishStory;
  add('finish-story','finish-story',{
   type:'finish-story',story:entry.markedParagraph,seed,
  },refs(entry.sourceIds),entry.origin,entry.teacherReviewRequired===true);
 }else issue('finish-story','finish-story','No prepared bracketed Finish the Story paragraph.');
 // One candidate per reviewed question: the future recipe can choose one,
 // without destroying alternatives or copying suggestions into the source.
 const questionIds=new Set<string>();
 if(prepared.multipleChoice?.length){
  prepared.multipleChoice.forEach((question,index)=>{
   const contentId=question.id||'question-'+(index+1);
   if(questionIds.has(contentId)){
    issue('multiple-choice',contentId,'Duplicate multiple-choice question ID.');return;
   }
   questionIds.add(contentId);
   const choices=question.choices??[];
   const correct=choices.filter(choice=>choice.isCorrect);
   if(choices.length!==3||correct.length!==1||
    correct[0]?.text.trim()!==question.correctAnswer.trim()){
    issue('multiple-choice',contentId,'Requires three choices with exactly one matching correctAnswer.');return;
   }
   const incorrect=choices.filter(choice=>!choice.isCorrect);
   add('multiple-choice',contentId,{
    type:'multiple-choice',question:question.question,
    correct:question.correctAnswer,wrong1:incorrect[0].text,
    wrong2:incorrect[1].text,seed:seed+index,
   },refs(question.sourceIds,question.sourceQuestionIds),
    question.origin,
    question.teacherReviewRequired===true||choices.some(choice=>choice.origin==='suggested'));
  });
 }else issue('multiple-choice','multiple-choice','No prepared multiple-choice questions.');
 for(const [moduleId,key] of [
  ['true-false','trueFalse'],['true-false-maze','trueFalseMaze'],
 ] as const){
  const item=prepared[key];
  if(!item){issue(moduleId,key,'No prepared canonical true/false selection.');continue;}
  const fact=verifiedFact(item,moduleId,key);
  if(!fact)continue;
  const module:ActivityModule=moduleId==='true-false'
   ?{type:moduleId,statement:fact.statement}
   :{type:moduleId,statement:fact.statement,answer:fact.isTrue,seed};
  add(moduleId,key,module,refs(item.sourceIds,fact.sourceIds),
   fact.origin,
   item.teacherReviewRequired===true||fact.teacherReviewRequired===true,
   fact.isTrue);
 }
 if(prepared.sortStory?.length){
  const checked:LessonFact[]=[];
  for(const [index,item] of prepared.sortStory.entries()){
   const fact=verifiedFact(item,'sort-story','sort-story['+index+']');
   if(fact)checked.push(fact);
  }
  if(checked.length===prepared.sortStory.length){
   add('sort-story','sort-story',{
    type:'sort-story',
    statements:checked.map(fact=>fact.statement+' '+String(fact.isTrue)).join('\n'),
    seed,
   },refs(...checked.map(x=>x.sourceIds)),
    checked.some(x=>x.origin==='suggested')?'suggested':'adapted',
    checked.some(x=>x.teacherReviewRequired===true));
  }
 }else issue('sort-story','sort-story','No prepared Sort the Story facts.');
 return result;
}
/** Select an individual candidate by exact type and content ID. */
export function findLessonCandidate(result:LessonConversionResult,
 moduleId:ModuleId,contentId:string):ConvertedActivity|undefined{
 return result.candidates.find(x=>x.moduleId===moduleId&&x.contentId===contentId);
}
