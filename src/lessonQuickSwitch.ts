import type {PublicLessonEntry} from './publishedLessonCatalog.ts';
import {approvedForPublic} from './publishedLessonCatalog.ts';
import {approvedLessonForDraft,buildYourOwnLessonDraft,sameActivityContent} from './curriculumEditor.ts';
import type {StoredDraft} from './draftMigration.ts';
import {carryPresetBorderMode} from './presetBorders.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from './worksheetRecipes.ts';
import {planLessonContentChange,applyLessonContentChange,type LessonContentPrintMetrics,type LessonContentChange} from './lessonContentSync.ts';
import {changePlanMessages} from './lessonContentDialogModel.ts';

export const BUILD_OWN='build-own' as const;
export type WorksheetStartId='preset-1'|'preset-2'|'preset-3'|'preset-4'|typeof BUILD_OWN;
const publicIds=new Set<string>(WORKSHEET_RECIPES.map(recipe=>recipe.id));
export function isWorksheetStartId(value:unknown):value is WorksheetStartId{
 return value===BUILD_OWN||(typeof value==='string'&&publicIds.has(value));
}

/** Build and validate a *replacement* before touching the existing worksheet.
 * No review-stage data or unapproved lesson is ever loaded.
 */
export function createLessonWorksheet(entry:PublicLessonEntry,startId:WorksheetStartId):StoredDraft{
 if(!approvedForPublic(entry))throw Error('This Bible story is not approved for public use.');
 const result=startId===BUILD_OWN?buildYourOwnLessonDraft(entry):
  buildWorksheetRecipe(entry.lesson,startId,{purpose:'published'}).draft;
 return {...result,worksheetPresetId:startId};
}

/** Apply the teacher's chosen lesson content to a newly generated preset,
 * never transfer old activity payloads. The new recipe defines the story's
 * questions, alternative phrases, layouts and activity placements. Each
 * canonical link in that recipe is regenerated and print-validated.
 *
 * This is intentionally pure and atomic: if either change fails, no draft is
 * returned and the caller must keep the existing worksheet untouched.
 */
export class PresetContentFitError extends Error{
 readonly kind:'Big Idea'|'Memory Verse';
 readonly issues:string[];
 constructor(kind:'Big Idea'|'Memory Verse',issues:string[]){
  super('This preset cannot use your chosen '+kind+': '+issues.join(' ')+
   ' Your current worksheet is unchanged. Edit your '+kind+
   ' or choose a shorter passage before trying again.');
  this.name='PresetContentFitError';
  this.kind=kind;
  this.issues=issues;
 }
}

export function createSameStoryPresetWithContent(
 current:StoredDraft,entry:PublicLessonEntry,startId:WorksheetStartId,
 print?:LessonContentPrintMetrics,
):StoredDraft{
 if(!current.curriculumLessonId||current.curriculumLessonId!==entry.lesson.id)
  throw Error('Custom content can only be retained when changing presets within the same Bible story.');
 let next=carryPresetBorderMode(current,createLessonWorksheet(entry,startId));
 // A missing originalLessonContent is common in older saved worksheets. Use
 // the approved destination's baseline for comparison, but never assume a
 // missing legacy translation label was a deliberate edit.
 const original=current.originalLessonContent??next.originalLessonContent;
 if(!original)throw Error('The approved lesson has no original content to compare.');
 const ideaChanged=current.bigIdea!==original.bigIdea;
 const verseChanged=current.verseReference!==original.verseReference||
  current.verseText!==original.verseText||
  (current.originalLessonContent
   ?(current.verseTranslation??'')!==(original.verseTranslation??'')
   :current.verseTranslation!==undefined&&
    current.verseTranslation!==(original.verseTranslation??''));
 const apply=(change:LessonContentChange,label:'Big Idea'|'Memory Verse')=>{
  const plan=planLessonContentChange(next,change,{print});
  if(!plan.updatedDraft){
   const messages=changePlanMessages(next,plan);
   const conflicts=plan.conflicts.map(c=>c.message);
   throw new PresetContentFitError(label,[...messages,...conflicts].slice(0,6));
  }
  next=applyLessonContentChange(plan);
 };
 if(ideaChanged)apply({kind:'bigIdea',text:current.bigIdea},'Big Idea');
 if(verseChanged)apply({kind:'memoryVerse',reference:current.verseReference,
  text:current.verseText,translation:current.verseTranslation??null},'Memory Verse');
 return next;
}

/** The browser keeps only one draft. Only skip confirmation when every
 * author-editable value is identical to the originally selected preset.
 * Older drafts without a remembered preset are handled conservatively.
 */
export function needsLessonSwitchConfirmation(
 draft:StoredDraft,entries:readonly PublicLessonEntry[],
):boolean{
 const entry=approvedLessonForDraft(draft,entries);
 if(!entry||!isWorksheetStartId(draft.worksheetPresetId))return true;
 let original:StoredDraft;
 try{original=createLessonWorksheet(entry,draft.worksheetPresetId);}
 catch{return true;}
 const keys=['title','scripture','bigIdea','verseReference','verseText','verseTranslation',
  'coverBorder','layouts','modules','activityBorders','borderArrangement'] as const;
 return keys.some(key=>!sameActivityContent(draft[key],original[key]));
}


/** Switching Bible stories preserves the selected numbered preset (or Build
 * My Own) and replaces *all* lesson-specific details and modules atomically.
 * Older worksheets without a recorded preset must choose a preset explicitly
 * first; never silently substitute another arrangement.
 */
export function createSamePresetForNewStory(
 draft:Pick<StoredDraft,'worksheetPresetId'|'borderArrangement'>,entry:PublicLessonEntry,
):StoredDraft{
 if(!isWorksheetStartId(draft.worksheetPresetId))
  throw Error('This older worksheet has no recorded preset. Use Change Preset first to select one.');
 return carryPresetBorderMode(draft,createLessonWorksheet(entry,draft.worksheetPresetId));
}
