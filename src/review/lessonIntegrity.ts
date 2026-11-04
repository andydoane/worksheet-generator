import {MODULES} from '../modules.ts';
import type {Lesson} from './model.ts';

export type IntegrityArea='lesson-details'|'lesson-sources'|'lesson-readiness'|'lesson-publication';
export type IntegrityIssue={
 area:IntegrityArea;message:string;path:string;
 repairPath?:(string|number)[];
 choiceType?:'sourceId'|'questionId'|'filename';
};
const sourceCollections=['storyNotes','questions','facts'] as const;
const preparedKey=(id:string)=>id.replace(/-([a-z])/gu,(_,letter:string)=>letter.toUpperCase());
const validText=(v:unknown)=>typeof v==='string'&&v.trim().length>0;
const labelPath=(path:(string|number)[])=>path.map((x,i)=>
 typeof x==='number'?'['+x+']':(i?'.':'')+x).join('');

export function lessonIntegrityIssues(lesson:Lesson):IntegrityIssue[]{
 const issues:IntegrityIssue[]=[];
 const add=(area:IntegrityArea,path:string,message:string,
  repairPath?:(string|number)[],choiceType?:IntegrityIssue['choiceType'])=>
  issues.push({area,path,message,...(repairPath?{repairPath}:{}),
   ...(choiceType?{choiceType}:{})});
 if(!validText(lesson.lessonDetails?.title))
  add('lesson-details','lessonDetails.title','A lesson title is required for every preset.');
 if(!validText(lesson.lessonDetails?.scriptureDisplay)&&
  !(lesson.lessonDetails?.scripturePassages??[]).some(validText))
  add('lesson-details','lessonDetails.scriptureDisplay',
   'Add a Scripture reference or passage list so the numbered presets have a cover reference.');
 if(!(lesson.lessonDetails?.bigIdeas??[]).some((x:any)=>validText(x?.text)))
  add('lesson-details','lessonDetails.bigIdeas',
   'Add an Important Idea from the curriculum; puzzle alternatives do not replace the original teaching idea.');
 const notes=Array.isArray(lesson.storyNotes)?lesson.storyNotes:[];
 const questions=Array.isArray(lesson.questions)?lesson.questions:[];
 const facts=Array.isArray(lesson.facts)?lesson.facts:[];
 const names=new Set((lesson.sourceFiles??[]).map((x:any)=>x.filename).filter(validText));
 if(!names.size)
  add('lesson-sources','sourceFiles','List the original curriculum source file(s) before publication.');
 const all=new Set<string>(),questionIds=new Set(questions.map((x:any)=>x.id));
 for(const collection of sourceCollections){
  const values=Array.isArray(lesson[collection])?lesson[collection]:[];
  for(const [i,item] of values.entries()){
   const path=collection+'['+i+']';
   if(!validText(item?.id))add('lesson-sources',path+'.id','Each original source record needs an ID.');
   else if(all.has(item.id))
    add('lesson-sources',path+'.id','Duplicate curriculum source ID '+item.id+
     '. Inspect both records before renaming; a blanket replacement could misattribute existing references.');
   else all.add(item.id);
   if(collection==='storyNotes'){
    if(item?.order!==i+1)
     add('lesson-sources',path+'.order','Story Note '+(i+1)+
      ' has an incorrect order number. Restore the source chronology without changing original words.');
    if(item?.origin!=='source')
     add('lesson-sources',path+'.origin','Original Story Note '+(i+1)+
      ' must retain source authorship. Compare against the original lesson.');
    if(!validText(item?.originalText)||!validText(item?.cleanText))
     add('lesson-sources',path+'.originalText','Story Note '+(i+1)+
      ' is missing original or cleaned text. Check the source document.');
   }
  }
 }
 const walk=(v:unknown,path:(string|number)[])=>{
  if(!v||typeof v!=='object')return;
  if(Array.isArray(v)){v.forEach((x,i)=>walk(x,[...path,i]));return;}
  const obj=v as Record<string,unknown>;
  if(Array.isArray(obj.sourceIds))obj.sourceIds.forEach((id,i)=>{
   if(typeof id==='string'&&!all.has(id)){
    const p=[...path,'sourceIds',i];
    add('lesson-sources',labelPath(p),'Unknown source ID '+id+' at '+labelPath(p)+
     '. Choose the correct original record instead of guessing.',p,'sourceId');
   }
  });
  if(Array.isArray(obj.sourceQuestionIds))obj.sourceQuestionIds.forEach((id,i)=>{
   if(typeof id==='string'&&!questionIds.has(id)){
    const p=[...path,'sourceQuestionIds',i];
    add('lesson-sources',labelPath(p),'Unknown question '+id+' at '+labelPath(p)+
     '. Choose an existing original question.',p,'questionId');
   }
  });
  if(obj.source&&typeof obj.source==='object'&&!Array.isArray(obj.source)){
   const source=obj.source as Record<string,unknown>;
   if(validText(source.filename)&&!names.has(source.filename as string)){
    const p=[...path,'source','filename'];
    add('lesson-sources',labelPath(p),'Source filename '+source.filename+
     ' is not listed in sourceFiles. Select the actual document.',p,'filename');
   }
  }
  for(const [key,value] of Object.entries(obj)){
   if(['source','sourceIds','sourceQuestionIds'].includes(key))continue;
   walk(value,[...path,key]);
  }
 };
 walk(lesson,[]);
 const readiness=Array.isArray(lesson.moduleReadiness)?lesson.moduleReadiness:[];
 const moduleIds=new Set(MODULES.map(x=>x.id));
 const seen=new Set<string>();
 for(const [i,item] of readiness.entries()){
  const id=item?.moduleId;
  if(!moduleIds.has(id))
   add('lesson-readiness','moduleReadiness['+i+'].moduleId',
    'Unknown module '+String(id)+' in module readiness.');
  if(seen.has(id))
   add('lesson-readiness','moduleReadiness['+i+'].moduleId',
    'Duplicate readiness entry for '+id+'; review metadata before consolidating.');
  seen.add(id);
  if(item?.preparedActivityKey!==preparedKey(String(id)))
   add('lesson-readiness','moduleReadiness['+i+'].preparedActivityKey',
    'Readiness field for '+id+' points to '+String(item?.preparedActivityKey)+
    ' instead of '+preparedKey(String(id))+'.');
  if(item?.status==='READY'&&lesson.preparedActivities?.[item.preparedActivityKey]===undefined)
   add('lesson-readiness','moduleReadiness['+i+'].status',
    id+' is marked READY without its prepared activity. It must not be approved automatically.');
 }
 if(readiness.length!==moduleIds.size)
  add('lesson-readiness','moduleReadiness',
   'Module readiness describes '+readiness.length+' activities; all '+moduleIds.size+
   ' are required (missing: '+[...moduleIds].filter(id=>!seen.has(id)).join(', ')+').');
 if(lesson.publication?.approved===true){
  if(!validText(lesson.publication?.teacherSignoff?.reviewer)||
   !validText(lesson.publication?.teacherSignoff?.date))
   add('lesson-publication','publication.teacherSignoff',
    'Approved curriculum needs a recorded teacher name and approval date.');
  if(lesson.publication?.scriptureRights?.status!=='cleared'||
   !validText(lesson.publication?.scriptureRights?.basis))
   add('lesson-publication','publication.scriptureRights',
    'Approved curriculum needs explicit per-lesson Scripture rights clearance. Recheck the official BSB source and sign off.');
 }
 return issues;
}
function setAt(lesson:Lesson,path:(string|number)[],value:string):Lesson{
 const next=structuredClone(lesson);
 let target:any=next;
 for(const segment of path.slice(0,-1)){
  if(target?.[segment]===undefined)throw Error('The linked source record no longer exists.');
  target=target[segment];
 }
 if(typeof target[path.at(-1)!]!=='string')throw Error('Expected a text source reference.');
 target[path.at(-1)!]=value;
 // This is an explicit editorial correction, never an automatic approval.
 if(path[0]==='preparedActivities'&&
  next.preparedActivities?.[path[1] as string]){
  const entry=next.preparedActivities[path[1] as string];
  const record=typeof path[2]==='number'&&Array.isArray(entry)?entry[path[2]]:entry;
  if(record&&typeof record==='object')record.teacherReviewRequired=true;
 }
 if(['facts','questions'].includes(String(path[0]))){
  const record=next[path[0] as string]?.[path[1] as number];
  if(record)record.teacherReviewRequired=true;
 }
 return next;
}
export function repairSourceReference(lesson:Lesson,entry:IntegrityIssue,value:string):Lesson{
 if(!entry.repairPath||!entry.choiceType)throw Error('This issue needs a different repair action.');
 const allowed=entry.choiceType==='filename'?
  (lesson.sourceFiles??[]).map((x:any)=>x.filename):
  entry.choiceType==='questionId'?
  (lesson.questions??[]).map((x:any)=>x.id):
  sourceCollections.flatMap(key=>(lesson[key]??[]).map((x:any)=>x.id));
 if(!allowed.includes(value))throw Error('Select an existing curriculum record, not a fabricated reference.');
 return setAt(lesson,entry.repairPath,value);
}
export function restoreStoryNoteNumbers(lesson:Lesson):Lesson{
 const next=structuredClone(lesson);
 if(!Array.isArray(next.storyNotes))throw Error('Story Notes must be a list.');
 next.storyNotes.forEach((note:any,i:number)=>{note.order=i+1;});
 return next;
}
export function editLessonDetails(lesson:Lesson,field:'title'|'scriptureDisplay'|'scripturePassages',
 value:string):Lesson{
 const next=structuredClone(lesson);
 next.lessonDetails??={};
 if(field==='scripturePassages')
  next.lessonDetails.scripturePassages=value.split(/\r?\n/gu).map(x=>x.trim()).filter(Boolean);
 else next.lessonDetails[field]=value;
 return next;
}
/** Repair metadata without claiming content is already reviewed/printable.
 * Every changed or newly added entry is explicitly marked for teacher review.
 */
export function rebuildReadinessInventory(lesson:Lesson):Lesson{
 const next=structuredClone(lesson);
 const prior=Array.isArray(next.moduleReadiness)?next.moduleReadiness:[];
 next.moduleReadiness=MODULES.map(module=>{
  const key=preparedKey(module.id);
  const matching=prior.filter((x:any)=>x?.moduleId===module.id);
  const original=matching[0]??{};
  const exists=next.preparedActivities?.[key]!==undefined;
  const validReady=original.status==='READY'&&exists;
  const changed=matching.length!==1||original.preparedActivityKey!==key||
   original.size!==module.size[0].toUpperCase()+module.size.slice(1)||
   (original.status==='READY'&&!exists);
  return {...original,
   moduleName:module.name,moduleId:module.id,
   size:module.size[0].toUpperCase()+module.size.slice(1),
   preparedActivityKey:key,
   status:validReady?'READY':original.status==='READY'?'AUTHORING NEEDED':
    (['ADAPTATION NEEDED','AUTHORING NEEDED','UNAVAILABLE'].includes(original.status)?
     original.status:'AUTHORING NEEDED'),
   contentValidation:changed?'pending teacher review':original.contentValidation??'pending teacher review',
   generatorTested:changed?false:original.generatorTested===true,
   teacherReviewRequired:changed||original.teacherReviewRequired===true,
   ...(changed?{notes:[original.notes,...matching.slice(1).map((x:any)=>x.notes),
    'Readiness metadata rebuilt; inspect before approval.'].filter(Boolean).join(' | ')}:{}),
  };
 });
 return next;
}
