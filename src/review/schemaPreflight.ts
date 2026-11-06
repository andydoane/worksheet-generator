import lessonSchema from '../../curriculum/schema/lesson-v1.schema.json' with {type:'json'};
import {validateLessonSchema} from '../lessonSchemaValidation.ts';
import type {Lesson} from './model.ts';

/** A teacher can safely confirm these precise metadata repairs; anything
 * ambiguous must be corrected in the source JSON by a human reviewer.
 */
export type SchemaRepair=
 |{kind:'validation-check-name';index:number}
 |{kind:'known-module-alias';flagIndex:number;moduleIndex:number;oldId:string;newId:string}
 |{kind:'character-clue-strings';count:number};
export type ReviewSchemaIssue={
 path:string;message:string;taskId:string;fieldId:string;repair?:SchemaRepair;
};
const moduleAliases:Record<string,string>={
 'circle-the-mistakes':'circle-mistakes',
};
function taskForPath(path:string):{taskId:string;fieldId:string}{
 const taskId=path.startsWith('$.lessonDetails')?'lesson-details':
  /^(?:\$\.(?:sourceFiles|storyNotes|questions|facts|vocabulary|characters))/u.test(path)?'lesson-sources':
  path.startsWith('$.moduleReadiness')?'lesson-readiness':
  path.startsWith('$.reviewFlags')||path.startsWith('$.publication')?'lesson-publication':
  'review-general';
 return {taskId,fieldId:taskId==='review-general'?'review-general-details':'review-field-'+taskId};
}
export function reviewSchemaErrors(lesson:unknown):string[]{
 return validateLessonSchema(lesson,lessonSchema);
}
export function reviewSchemaIssues(lesson:Lesson):ReviewSchemaIssue[]{
 // Report every schema failure, but offer one deliberate batch action for all
 // legacy string clues. Empty strings require actual teacher editing instead.
 const legacy=(lesson.characters??[]).flatMap((character:any)=>
  Array.isArray(character?.clues)?
   character.clues.filter((clue:unknown)=>typeof clue==='string'):[]
 );
 const safeLegacy=legacy.length>0&&legacy.every((clue:string)=>clue.trim().length>0);
 let offered=false;
 return reviewSchemaErrors(lesson).map(raw=>{
  const path=raw.match(/^(\$[^:]*):/u)?.[1]??'$';
  const message='Curriculum schema '+raw;
  let repair:SchemaRepair|undefined;
  if(safeLegacy&&!offered&&
   /^\$\.characters\[\d+\]\.clues\[\d+\]: expected an object$/u.test(raw)){
   repair={kind:'character-clue-strings',count:legacy.length};
   offered=true;
  }
  const check=path.match(/^\$\.validation\.checks\[(\d+)\]\.check$/u);
  if(check&&raw.endsWith('required field missing')){
   const index=Number(check[1]),record=lesson.validation?.checks?.[index];
   if(record&&typeof record==='object'&&typeof record.name==='string'&&
    !Object.hasOwn(record,'check')){
    repair={kind:'validation-check-name',index};
   }
  }
  const affected=path.match(/^\$\.reviewFlags\[(\d+)\]\.affectedModules\[(\d+)\]$/u);
  if(affected&&raw.includes('invalid enum value')){
   const flagIndex=Number(affected[1]),moduleIndex=Number(affected[2]);
   const oldId=lesson.reviewFlags?.[flagIndex]?.affectedModules?.[moduleIndex];
   const newId=typeof oldId==='string'?moduleAliases[oldId]:undefined;
   if(typeof oldId==='string'&&newId)
    repair={kind:'known-module-alias',flagIndex,moduleIndex,oldId,newId};
  }
  return {path,message,...taskForPath(path),...(repair?{repair}:{})};
 });
}
export function schemaRepairLabel(repair:SchemaRepair):string{
 if(repair.kind==='character-clue-strings')
  return 'Convert '+repair.count+' character clues to reviewed text/origin objects (keep every word)';
 if(repair.kind==='validation-check-name')
  return 'Rename “name” to “check” (keep the original description)';
 return 'Replace “'+repair.oldId+'” with “'+repair.newId+'”';
}
export function applyReviewSchemaRepair(lesson:Lesson,repair:SchemaRepair):Lesson{
 const next=structuredClone(lesson);
 if(repair.kind==='character-clue-strings'){
  const current=(next.characters??[]).flatMap((character:any)=>
   Array.isArray(character?.clues)?
    character.clues.filter((clue:unknown)=>typeof clue==='string'):[]
  );
  if(current.length!==repair.count||current.some((clue:string)=>!clue.trim()))
   throw Error('Character clues have changed. Run preflight again before repairing.');
  for(const character of next.characters??[]){
   if(!Array.isArray(character.clues))continue;
   character.clues=character.clues.map((clue:unknown)=>
    typeof clue==='string'?
     {text:clue,origin:'suggested',teacherReviewRequired:true}:clue
   );
  }
  return next;
 }
 if(repair.kind==='validation-check-name'){
  const record=next.validation?.checks?.[repair.index];
  if(!record||typeof record.name!=='string'||Object.hasOwn(record,'check'))
   throw Error('The validation record has changed. Run preflight again before repairing.');
  record.check=record.name;
  delete record.name;
  return next;
 }
 const modules=next.reviewFlags?.[repair.flagIndex]?.affectedModules;
 if(!Array.isArray(modules)||modules[repair.moduleIndex]!==repair.oldId||
  moduleAliases[repair.oldId]!==repair.newId)
  throw Error('The review-flag activity has changed. Run preflight again before repairing.');
 modules[repair.moduleIndex]=repair.newId;
 return next;
}
