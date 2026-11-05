import type {StoredDraft} from './draftMigration.ts';
import type {LessonContentChange,LessonContentPlan} from './lessonContentSync.ts';
import type {LessonContentKind} from './lessonContentLinks.ts';
import {MODULES} from './modules.ts';

/** These are display helpers only; the canonical change planner still owns all
 * activity validation, teacher-edit conflict handling, and atomic updates.
 */
export function presetOriginalChange(
 draft:Pick<StoredDraft,'originalLessonContent'>,kind:LessonContentKind,
):LessonContentChange|null{
 const original=draft.originalLessonContent;
 if(!original)return null;
 if(kind==='bigIdea')return {kind,text:original.bigIdea};
 return {kind,reference:original.verseReference,text:original.verseText,
  translation:original.verseTranslation??null};
}

export function lessonContentIsCustomized(
 draft:Pick<StoredDraft,'originalLessonContent'|'bigIdea'|'verseReference'|'verseText'|'verseTranslation'>,
 kind:LessonContentKind,
):boolean{
 const original=draft.originalLessonContent;
 if(!original)return false;
 if(kind==='bigIdea')return draft.bigIdea!==original.bigIdea;
 return draft.verseReference!==original.verseReference||
  draft.verseText!==original.verseText||
  (draft.verseTranslation??'')!==(original.verseTranslation??'');
}
export function activitySlotLabel(
 draft:Pick<StoredDraft,'modules'>,slot:string,
):string{
 const activity=draft.modules[slot];
 const name=MODULES.find(item=>item.id===activity?.type)?.name??
  activity?.type?.replaceAll('-',' ')??'Activity';
 const page=slot.match(/^([1-4]):/u)?.[1];
 return (page?'Page '+page+' · ':'')+name;
}

export function changePlanMessages(draft:Pick<StoredDraft,'modules'>,plan:LessonContentPlan):string[]{
 return plan.issues.map(issue=>(issue.slot?activitySlotLabel(draft,issue.slot)+': ':'')+
  issue.message);
}
