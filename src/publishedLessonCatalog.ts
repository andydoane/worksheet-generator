import type {LessonWorksheetSource} from './worksheetRecipes.ts';

/**
 * Public lessons require TWO explicit gates:
 * - editor-approved curriculum with signed and resolved review flags
 * - cleared distribution rights for the exact Scripture translation excerpt.
 *
 * No review-stage JSON is imported here. PR17d launches with an empty public
 * catalog until the curriculum author signs off; later PRs can register only
 * reviewed, rights-cleared lesson files. Do not add curriculum/review imports.
 */
export type PublicLessonEntry={
 lesson:LessonWorksheetSource;
 scriptureDistributionCleared:true;
};
const PUBLIC_ENTRIES:readonly PublicLessonEntry[]=[];

export function approvedForPublic(entry:PublicLessonEntry):boolean{
 const {lesson}=entry,pub=lesson.publication;
 if(entry.scriptureDistributionCleared!==true||lesson.schemaVersion!==1||
  pub?.status!=='approved'||pub.approved!==true||
  !pub.teacherSignoff?.reviewer?.trim()||!pub.teacherSignoff.date?.trim())return false;
 const resolved=new Set(pub.resolvedReviewFlagIds??[]);
 return (lesson.reviewFlags??[]).filter(flag=>flag.type==='teacher-approval')
  .every(flag=>resolved.has(flag.id));
}

export const PUBLIC_LESSONS:readonly PublicLessonEntry[]=PUBLIC_ENTRIES.filter(approvedForPublic);
