import type {PublicLessonEntry} from './publishedLessonCatalog.ts';
import {approvedForPublic} from './publishedLessonCatalog.ts';
import {convertLessonActivities,type ConvertedActivity} from './lessonActivityConverter.ts';
import {EMPTY_DRAFT,type StoredDraft} from './draftMigration.ts';
import {blankModule,type ActivityModule,type ModuleId,validateModule} from './modules.ts';

/**
 * PR17i: The editor only resolves curriculum content from the same
 * approval-and-rights-gated catalog used by the story chooser.
 *
 * A lesson ID is context, never authorization to load review-stage data.
 * Saving a draft retains the actual edited modules as ordinary draft content.
 */
export function approvedLessonForDraft(
 draft:Pick<StoredDraft,'curriculumLessonId'>,
 entries:readonly PublicLessonEntry[],
):PublicLessonEntry|undefined {
 if(!draft.curriculumLessonId)return undefined;
 return entries.find(item=>
  item.lesson.id===draft.curriculumLessonId&&approvedForPublic(item));
}

/** Start with an approved lesson's metadata and an empty, editable booklet. */
export function buildYourOwnLessonDraft(entry:PublicLessonEntry):StoredDraft{
 if(!approvedForPublic(entry))throw Error('This Bible story is not approved for public use.');
 const lesson=entry.lesson;
 const details=lesson.lessonDetails;
 const title=details.title?.trim();
 const scripture=details.scriptureDisplay?.trim()||
  details.scripturePassages?.join(', ')?.trim();
 if(!title||!scripture)throw Error('This Bible story is missing its title or Scripture reference.');
 return {
  ...structuredClone(EMPTY_DRAFT),
  curriculumLessonId:lesson.id,
  title,scripture,
  bigIdea:details.bigIdeas?.[0]?.text??'',
  verseReference:details.memoryVerse?.reference??'',
  verseText:details.memoryVerse?.text??'',
 };
}

export type ActivitySelection={
 module:ActivityModule;
 source:'lesson'|'scratch'|'unavailable';
 message:string;
 contentId?:string;
};

/** Preserve the editor's pre-existing behavior for scratch and example worksheets. */
export function createManualModule(type:ModuleId,draft:StoredDraft):ActivityModule{
 if(type==='first-letters')return {type,reference:draft.verseReference,verse:draft.verseText};
 if(type==='finish-verse'||type==='unscramble-verse')
  return {type,reference:draft.verseReference,verse:draft.verseText,seed:1};
 if(type==='verse-cryptogram')
  return {type,reference:draft.verseReference,verse:draft.verseText,seed:1};
 if(type==='big-idea-cryptogram'||type==='connect-big-idea')
  return {type,idea:draft.bigIdea,seed:1};
 if(type==='spiral-verse'||type==='upside-down-verse')
  return {type,reference:draft.verseReference,verse:draft.verseText};
 if(type==='connect-verse')return {type,verse:draft.verseText,seed:1};
 return blankModule(type);
}

function chooseUnusedCandidate(
 options:ConvertedActivity[],draft:StoredDraft,slot:string,
):ConvertedActivity|undefined{
 // Prefer a question/prompt that is not already used elsewhere in the booklet.
 // Multiple Choice has eight approved alternatives in the first lesson.
 const used=new Set(Object.entries(draft.modules)
  .filter(([key])=>key!==slot)
  .map(([,module])=>JSON.stringify(module)));
 return options.find(candidate=>!used.has(JSON.stringify(candidate.module)))??options[0];
}

/**
 * Choose real, independently editable module content for a single region.
 * Never overwrite any other region. Missing/withdrawn curriculum produces a
 * clearly explained empty activity, not fabricated Scripture or sample data.
 */
export function chooseActivityForDraft(
 type:ModuleId,draft:StoredDraft,slot:string,
 entries:readonly PublicLessonEntry[],
):ActivitySelection{
 if(!draft.curriculumLessonId){
  return {module:createManualModule(type,draft),source:'scratch',
   message:'Start by editing this activity.'};
 }
 const entry=approvedLessonForDraft(draft,entries);
 if(!entry){
  return {module:blankModule(type),source:'unavailable',
   message:'This worksheet’s Bible story is no longer in the approved library. Enter activity content manually; your existing activities are unchanged.'};
 }
 const converted=convertLessonActivities(entry.lesson,{seed:1});
 const options=converted.candidates.filter(candidate=>
  candidate.moduleId===type&&validateModule(candidate.module).length===0);
 const candidate=chooseUnusedCandidate(options,draft,slot);
 if(!candidate){
  const details=converted.diagnostics
   .filter(issue=>issue.moduleId===type)
   .map(issue=>issue.message).join(' ');
  return {module:blankModule(type),source:'unavailable',
   message:'No ready '+type.replaceAll('-',' ')+' content exists for this Bible story. Fill it in manually.'+
    (details?' '+details:'')};
 }
 return {module:structuredClone(candidate.module),source:'lesson',
  contentId:candidate.contentId,
  message:'Pre-filled from '+entry.lesson.lessonDetails.title+'. You can edit this activity without changing the curriculum or any other booklet activity.'};
}
