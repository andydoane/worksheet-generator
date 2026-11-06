import {isCoverBorderId,type CoverBorderId} from './coverBorders.ts';
import {readActivityBorders,type ActivityBorders} from './activityBorders.ts';
import {readPresetBorderSettings,type PresetBorderSettings} from './presetBorders.ts';
import {readAssignments,type ModuleAssignments} from './modules.ts';
import {readActivityContentLinks,type ActivityContentLinks} from './lessonContentLinks.ts';
import {DEFAULT_LAYOUTS,isLayoutId,type LayoutId} from './booklet.ts';

/** Keep the original v1 storage key and schema; migration is pure and never
 * replaces existing user-entered text with new starter examples.
 */
export type OriginalLessonContent={
 bigIdea:string;verseReference:string;verseText:string;verseTranslation?:string;
};
export type StoredDraft={
 title:string;scripture:string;coverBorder:CoverBorderId;bigIdea:string;
 verseReference:string;verseText:string;verseTranslation?:string;
 layouts:Record<2|3|4,LayoutId>;modules:ModuleAssignments;
 activityBorders:ActivityBorders;
 /** Optional automatic preset border mode; old hand-styled drafts remain intact. */
 borderArrangement?:PresetBorderSettings;
 /** Optional context for approved, lesson-prepopulated activities. Older drafts omit it. */
 curriculumLessonId?:string;
 /** Selected numbered preset or Build My Own; optional on historical drafts. */
 worksheetPresetId?:'preset-1'|'preset-2'|'preset-3'|'preset-4'|'build-own';
 /** Initial module content by region: used only to protect meaningful teacher edits. */
 activityDefaults?:ModuleAssignments;
 /** Explicit links from activity slots to shared lesson content, or independent overrides. */
 activityContentLinks?:ActivityContentLinks;
 /** Approved content saved on preset selection, retained when a teacher changes it. */
 originalLessonContent?:OriginalLessonContent;
};
export const EMPTY_DRAFT:StoredDraft={
 title:'',scripture:'',coverBorder:'none',bigIdea:'',
 verseReference:'',verseText:'',
 layouts:{...DEFAULT_LAYOUTS},modules:{},activityBorders:{},
};
export function migrateDraftValue(data:unknown):StoredDraft{
 if(!data||typeof data!=='object'||Array.isArray(data))return structuredClone(EMPTY_DRAFT);
 const value=data as Record<string,unknown>;
 const savedLayouts=value.layouts&&typeof value.layouts==='object'&&!Array.isArray(value.layouts)
  ?value.layouts as Record<number,unknown>:{};
 const text=(key:'title'|'scripture'|'bigIdea'|'verseReference'|'verseText')=>
  typeof value[key]==='string'?value[key] as string:'';
 const modules=readAssignments(value.modules);
 // Ignore stale or mismatched defaults rather than using them to permit
 // deletion of a different activity after restoring an old saved draft.
 const candidateDefaults=readAssignments(value.activityDefaults);
 const activityDefaults:ModuleAssignments=Object.fromEntries(Object.entries(candidateDefaults)
  .filter(([slot,initial])=>modules[slot]?.type===initial.type));
 const activityContentLinks=readActivityContentLinks(value.activityContentLinks,modules);
 const original=value.originalLessonContent&&typeof value.originalLessonContent==='object'&&
  !Array.isArray(value.originalLessonContent)?value.originalLessonContent as Record<string,unknown>:null;
 const originalLessonContent:OriginalLessonContent|undefined=original&&
  typeof original.bigIdea==='string'&&original.bigIdea.length<=350&&
  typeof original.verseReference==='string'&&original.verseReference.length<=120&&
  typeof original.verseText==='string'&&original.verseText.length<=1500?{
   bigIdea:original.bigIdea,verseReference:original.verseReference,verseText:original.verseText,
   ...(typeof original.verseTranslation==='string'&&original.verseTranslation.length<=80
    ?{verseTranslation:original.verseTranslation}:{}),
  }:undefined;
 return {
  title:text('title'),scripture:text('scripture'),
  coverBorder:isCoverBorderId(value.coverBorder)?value.coverBorder:'none',
  bigIdea:text('bigIdea'),verseReference:text('verseReference'),verseText:text('verseText'),
  ...(typeof value.verseTranslation==='string'&&value.verseTranslation.length<=80
   ?{verseTranslation:value.verseTranslation}:{}),
  layouts:{
   2:isLayoutId(savedLayouts[2])?savedLayouts[2]:DEFAULT_LAYOUTS[2],
   3:isLayoutId(savedLayouts[3])?savedLayouts[3]:DEFAULT_LAYOUTS[3],
   4:isLayoutId(savedLayouts[4])?savedLayouts[4]:DEFAULT_LAYOUTS[4],
  },
  modules,
  activityBorders:readActivityBorders(value.activityBorders),
  ...(readPresetBorderSettings(value.borderArrangement)?
   {borderArrangement:readPresetBorderSettings(value.borderArrangement)}:{}),
  ...(typeof value.curriculumLessonId==='string'&&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.curriculumLessonId)&&
    value.curriculumLessonId.length<=120
    ?{curriculumLessonId:value.curriculumLessonId}:{}),
  ...(typeof value.curriculumLessonId==='string'&&
    ['preset-1','preset-2','preset-3','preset-4','build-own'].includes(String(value.worksheetPresetId))
    ?{worksheetPresetId:value.worksheetPresetId as 'preset-1'|'preset-2'|'preset-3'|'preset-4'|'build-own'}:{}),
  ...(Object.keys(activityDefaults).length?{activityDefaults}:{}),
  ...(Object.keys(activityContentLinks).length?{activityContentLinks}:{}),
  ...(originalLessonContent?{originalLessonContent}:{}),
 };
}
