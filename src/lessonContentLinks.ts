import type {ActivityModule,ModuleAssignments} from './modules.ts';

export type LessonContentKind='bigIdea'|'memoryVerse';
/** 'independent' prevents an explicitly preserved custom puzzle from being
 * silently relinked during migration or the next lesson-level change.
 */
export type ActivityContentLinks=Record<string,LessonContentKind|'independent'>;

/** A module's *type* is not evidence that its phrase is the main Big Idea.
 * The actual content must match before we establish a shared link.
 */
export function linkedContentKind(module:ActivityModule):LessonContentKind|null{
 switch(module.type){
  case 'first-letters':
  case 'finish-verse':
  case 'unscramble-verse':
  case 'upside-down-verse':
  case 'verse-cryptogram':
  case 'spiral-verse':
  case 'connect-verse':
   return 'memoryVerse';
  case 'big-idea-cryptogram':
  case 'connect-big-idea':
   return 'bigIdea';
  default:return null;
 }
}

/** Untrusted localStorage metadata must never bind an unknown slot or wrong module type. */
export function readActivityContentLinks(value:unknown,modules:ModuleAssignments):ActivityContentLinks{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result:ActivityContentLinks={};
 for(const [slot,kind] of Object.entries(value)){
  const module=modules[slot];
  if(!module)continue;
  const possible=linkedContentKind(module);
  if(kind===possible||(kind==='independent'&&possible!==null))
   result[slot]=kind;
 }
 return result;
}
