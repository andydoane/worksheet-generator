import {isCoverBorderId,type CoverBorderId} from './coverBorders.ts';
import {readActivityBorders,type ActivityBorders} from './activityBorders.ts';
import {readAssignments,type ModuleAssignments} from './modules.ts';
import {DEFAULT_LAYOUTS,isLayoutId,type LayoutId} from './booklet.ts';

/** Keep the original v1 storage key and schema; migration is pure and never
 * replaces existing user-entered text with new starter examples.
 */
export type StoredDraft={
 title:string;scripture:string;coverBorder:CoverBorderId;bigIdea:string;
 verseReference:string;verseText:string;
 layouts:Record<2|3|4,LayoutId>;modules:ModuleAssignments;
 activityBorders:ActivityBorders;
 /** Optional context for approved, lesson-prepopulated activities. Older drafts omit it. */
 curriculumLessonId?:string;
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
 return {
  title:text('title'),scripture:text('scripture'),
  coverBorder:isCoverBorderId(value.coverBorder)?value.coverBorder:'none',
  bigIdea:text('bigIdea'),verseReference:text('verseReference'),verseText:text('verseText'),
  layouts:{
   2:isLayoutId(savedLayouts[2])?savedLayouts[2]:DEFAULT_LAYOUTS[2],
   3:isLayoutId(savedLayouts[3])?savedLayouts[3]:DEFAULT_LAYOUTS[3],
   4:isLayoutId(savedLayouts[4])?savedLayouts[4]:DEFAULT_LAYOUTS[4],
  },
  modules:readAssignments(value.modules),
  activityBorders:readActivityBorders(value.activityBorders),
  ...(typeof value.curriculumLessonId==='string'&&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.curriculumLessonId)&&
    value.curriculumLessonId.length<=120
    ?{curriculumLessonId:value.curriculumLessonId}:{}),
 };
}
