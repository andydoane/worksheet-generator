import {clipToWords,markSelectedWords,type Passage} from './bsb.ts';
import {convertLessonActivities} from '../lessonActivityConverter.ts';
import {validateModule} from '../modules.ts';

export type Lesson=Record<string,any>;
export type ReviewTask={id:string;group:string;label:string;detail:string};
const clone=<T,>(x:T):T=>structuredClone(x);
const trim=(x:unknown)=>typeof x==='string'?x.trim():'';

export function listReviewTasks(lesson:Lesson):ReviewTask[]{
 const p=lesson.preparedActivities??{};
 const tasks:ReviewTask[]=[];
 for(const mc of p.multipleChoice??[])tasks.push({
  id:'mc:'+mc.id,group:'Multiple Choice',label:mc.question,
  detail:'Review the question, correct answer and suggested incorrect choices.',
 });
 for(const fact of lesson.facts??[]){
  if(fact.origin==='suggested'||fact.teacherReviewRequired)tasks.push({
   id:'fact:'+fact.id,group:'False facts and sorting',label:fact.id,
   detail:'Ensure the deliberately false statement is clear, not misleading.',
  });
 }
 if(p.finishStory)tasks.push({id:'finish-story',group:'Story narrative',
  label:'Finish the Story',detail:'Review the adapted paragraph and seven source emphasis words.'});
 if(p.circleMistakes)tasks.push({id:'circle-mistakes',group:'Story narrative',
  label:'Circle the Mistakes',detail:'Review the deliberately incorrect paragraph and corrections.'});
 if(p.oddWords?.unrelatedOrigin==='suggested')tasks.push({id:'odd-words',group:'Suggested vocabulary',
  label:'Odd Words',detail:'Review unrelated distractor vocabulary.'});
 if(p.checkboxes?.incorrectOrigin==='suggested')tasks.push({id:'checkboxes',group:'Suggested vocabulary',
  label:'Checkboxes',detail:'Review incorrect word choices.'});
 if(lesson.reviewFlags?.some((x:any)=>x.type==='sensitivity'))tasks.push({id:'sensitivity',
  group:'Editorial decisions',label:'Age suitability',detail:'Review language about the fate of the Egyptian army for your students.'});
 if(lesson.reviewFlags?.some((x:any)=>x.type==='source-wording'))tasks.push({id:'important-idea',
  group:'Editorial decisions',label:'Important Idea wording',detail:'Confirm the original displayed Important Idea.'});
 tasks.push({id:'bsb-verse',group:'Scripture',label:'Approved BSB memory verse',
  detail:'Select the exact public-domain wording, passage boundaries and puzzle blanks.'});
 return tasks;
}

export function editAt(lesson:Lesson,path:(string|number)[],value:string):Lesson{
 const next=clone(lesson);
 let target:any=next;
 for(const key of path.slice(0,-1)){
  if(target?.[key]===undefined)throw Error('Field no longer exists.');
  target=target[key];
 }
 if(typeof target[path.at(-1)!]!=='string')throw Error('Only text fields may be edited.');
 target[path.at(-1)!]=value;
 if(path[0]==='preparedActivities'&&path[1]==='multipleChoice'){
  const mc=next.preparedActivities.multipleChoice[path[2] as number];
  if(path[3]==='choices'){
   const choice=mc.choices[path[4] as number];
   if(choice.isCorrect)mc.correctAnswer=value;
  }else if(path[3]==='correctAnswer'){
   const correct=mc.choices.find((x:any)=>x.isCorrect);
   if(correct)correct.text=value;
  }
 }
 if(path[0]==='facts'&&path[2]==='statement'){
  const fact=next.facts[path[1] as number];
  for(const key of ['sortStory']){
   for(const item of next.preparedActivities?.[key]??[]){
    if(item.factId===fact.id)item.statement=value;
   }
  }
  for(const key of ['trueFalse','trueFalseMaze']){
   const item=next.preparedActivities?.[key];
   if(item?.factId===fact.id)item.statement=value;
  }
 }
 return next;
}

export function applyBsbVerse(
 lesson:Lesson,passage:Passage,start:number,end:number,
 finishBlanks:number[],unscrambleBlanks:number[],displayReference?:string,
):Lesson{
 const next=clone(lesson);
 const text=clipToWords(passage.text,start,end);
 const reference=trim(displayReference)||passage.reference;
 const memory=next.lessonDetails?.memoryVerse;
 if(!memory)throw Error('The lesson has no memory verse record.');
 if(reference.length>38)throw Error('Memory verse reference must be at most 38 characters.');
 const f=markSelectedWords(text,finishBlanks);
 const u=markSelectedWords(text,unscrambleBlanks);
 const noMarks=(x:string)=>x.replace(/\[([^\[\]]+)\]/gu,'$1');
 if(noMarks(f)!==text||noMarks(u)!==text)throw Error('Marked words must reconstruct the exact BSB excerpt.');
 Object.assign(memory,{reference,text,translation:'BSB',origin:'adapted',
  isExcerpt:text!==passage.text,hasEllipses:false,requiresTextReview:false,
  bsbSource:{reference:passage.reference,sourceUrl:'https://bereanbible.com/bsb.txt',
   publicDomainTerms:'https://berean.bible/terms.htm',startWord:start,endWord:end},
 });
 const p=next.preparedActivities;
 for(const key of ['firstLetters','upsideDownVerse','verseCryptogram','spiralVerse','connectVerse']){
  if(p[key])Object.assign(p[key],{reference,verse:text,origin:'adapted'});
 }
 if(p.finishVerse)Object.assign(p.finishVerse,{reference,markedVerse:f,sourceVerse:text,origin:'adapted'});
 if(p.unscrambleVerse)Object.assign(p.unscrambleVerse,{reference,markedVerse:u,sourceVerse:text,origin:'adapted'});
 if(next.validation){
  next.validation.actualGeneratorTested=false;
  next.validation.allTextChecksPassed=false;
  next.validation.basis='Original conversion tests predate teacher-approved BSB; revalidate actual engines and content after export.';
 }
 return next;
}

export function checkReviewContent(lesson:Lesson):string[]{
 const errors:string[]=[];
 const p=lesson.preparedActivities??{};
 for(const mc of p.multipleChoice??[]){
  const choices=mc.choices??[];
  const correct=choices.filter((x:any)=>x.isCorrect);
  if(!trim(mc.question)||choices.length<3||correct.length!==1||
    trim(mc.correctAnswer)!==trim(correct[0]?.text)||choices.some((x:any)=>!trim(x.text))||
    new Set(choices.map((x:any)=>trim(x.text).toLowerCase())).size!==choices.length)
   errors.push('Multiple Choice '+mc.id+' has missing or inconsistent choices.');
 }
 for(const fact of lesson.facts??[])if(!trim(fact.statement))errors.push('Empty fact: '+fact.id);
 const expected=(lesson.storyNotes??[]).flatMap((n:any)=>n.emphasizedWords??[]);
 if(p.finishStory){
  const words=[...String(p.finishStory.markedParagraph??'').matchAll(/\[([^\[\]]+)\]/gu)].map(m=>m[1]);
  if(words.length!==expected.length||words.some((x,i)=>x.toUpperCase()!==String(expected[i]).toUpperCase()))
   errors.push('Finish the Story brackets must preserve the original emphasized Story Note words.');
 }
 const mistakes=p.circleMistakes;
 if(mistakes){
  if(mistakes.mistakes?.length!==mistakes.mistakeCount||!trim(mistakes.paragraph)||
   mistakes.mistakes?.some((m:any)=>!trim(m.incorrect)||!trim(m.correction)||
    !String(mistakes.paragraph).toLowerCase().includes(trim(m.incorrect).toLowerCase())))
   errors.push('Circle the Mistakes paragraph and corrections are inconsistent.');
 }
 const memory=lesson.lessonDetails?.memoryVerse;
 if(memory?.translation!=='BSB'||!trim(memory.text)||!memory.bsbSource?.sourceUrl)
  errors.push('Select and approve a Berean Standard Bible memory verse.');
 for(const id of ['finishVerse','unscrambleVerse']){
  const m=p[id];
  if(m&&m.markedVerse?.replace(/\[([^\[\]]+)\]/gu,'$1')!==memory?.text)
   errors.push(id+' does not reconstruct the exact memory verse.');
 }
 const converted=convertLessonActivities(lesson,{seed:1});
 for(const candidate of converted.candidates){
  const problems=validateModule(candidate.module);
  if(problems.length)errors.push(candidate.moduleId+': '+problems.join('; '));
 }
 const ids=new Set(converted.candidates.map(x=>x.moduleId));
 if(ids.size!==27)errors.push('Only '+ids.size+'/27 activity types converted; check detailed diagnostics before approving.');
 for(const d of converted.diagnostics)errors.push((d.moduleId??'Module')+': '+d.message);
 return [...new Set(errors)];
}

export function createApprovedLesson(lesson:Lesson,reviewer:string,date:string):Lesson{
 if(!trim(reviewer))throw Error('Enter the name of the curriculum reviewer.');
 if(!/^\d{4}-\d{2}-\d{2}$/u.test(date))throw Error('Enter a valid signoff date.');
 const next=clone(lesson);
 next.publication={...next.publication,status:'approved',approved:true,
  teacherSignoff:{reviewer:trim(reviewer),date,notes:'Approved with BSB verse through Curriculum Review Studio'},
  resolvedReviewFlagIds:(next.reviewFlags??[]).filter((f:any)=>[
   'teacher-approval','sensitivity','source-wording',
  ].includes(f.type)).map((f:any)=>f.id),
 };
 return next;
}
export function updatedRightsManifest(manifest:unknown,lessonId:string,reviewer:string,date:string){
 const source=(manifest&&typeof manifest==='object'&&!Array.isArray(manifest))?manifest as any:{};
 if(source.schemaVersion!==undefined&&source.schemaVersion!==1)
  throw Error('Unsupported rights-manifest version.');
 const lessons={...(source.lessons??{})};
 lessons[lessonId]={
  status:'cleared',
  basis:'Berean Standard Bible (BSB) dedicated to the public domain on April 30, 2023; https://berean.bible/terms.htm. Scripture excerpt selected verbatim from official https://bereanbible.com/bsb.txt.',
  reviewedBy:trim(reviewer),reviewedOn:date,
 };
 return {schemaVersion:1,lessons};
}
