import {listReviewTasks,type Lesson} from './model.ts';

/** A checklist acknowledgement, not a content/rights/publication approval.
 * Keep already recorded review IDs, but never add optional repair-guide tasks
 * to the required checklist.
 */
export function markRequiredTasksReviewed(lesson:Lesson,already:readonly string[]):string[]{
 const required=listReviewTasks(lesson).filter(task=>!task.optional).map(task=>task.id);
 return [...new Set([...already,...required])];
}

export function reviewChecklistCounts(lesson:Lesson,reviewed:readonly string[]){
 const required=listReviewTasks(lesson).filter(task=>!task.optional);
 const done=required.filter(task=>reviewed.includes(task.id)).length;
 return {complete:done,total:required.length,remaining:required.length-done};
}
