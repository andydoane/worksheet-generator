import type {PublicLessonEntry} from './publishedLessonCatalog.ts';
import {approvedForPublic} from './publishedLessonCatalog.ts';
import {approvedLessonForDraft,buildYourOwnLessonDraft,sameActivityContent} from './curriculumEditor.ts';
import type {StoredDraft} from './draftMigration.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from './worksheetRecipes.ts';

export const BUILD_OWN='build-own' as const;
export type WorksheetStartId='preset-1'|'preset-2'|'preset-3'|typeof BUILD_OWN;
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
 const keys=['title','scripture','bigIdea','verseReference','verseText',
  'coverBorder','layouts','modules','activityBorders'] as const;
 return keys.some(key=>!sameActivityContent(draft[key],original[key]));
}


/** Switching Bible stories preserves the selected numbered preset (or Build
 * My Own) and replaces *all* lesson-specific details and modules atomically.
 * Older worksheets without a recorded preset must choose a preset explicitly
 * first; never silently substitute another arrangement.
 */
export function createSamePresetForNewStory(
 draft:Pick<StoredDraft,'worksheetPresetId'>,entry:PublicLessonEntry,
):StoredDraft{
 if(!isWorksheetStartId(draft.worksheetPresetId))
  throw Error('This older worksheet has no recorded preset. Use Change Preset first to select one.');
 return createLessonWorksheet(entry,draft.worksheetPresetId);
}
