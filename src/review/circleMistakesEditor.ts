import type {Lesson} from './model.ts';

export const MAX_CIRCLE_MISTAKES=8;

/** Make a blank, explicitly teacher-authored correction row without altering
 * the paragraph, existing corrections, or original source metadata.
 * An unfinished row intentionally fails preflight until the teacher fills it.
 */
export function addCircleMistake(lesson:Lesson):Lesson{
 const existing=lesson.preparedActivities?.circleMistakes?.mistakes;
 if(!Array.isArray(existing))
  throw Error('Circle the Mistakes does not have an editable mistake list.');
 if(existing.length>=MAX_CIRCLE_MISTAKES)
  throw Error('Circle the Mistakes supports at most eight mistakes.');
 const next=structuredClone(lesson);
 const activity=next.preparedActivities.circleMistakes;
 activity.mistakes.push({
  incorrect:'',correction:'',origin:'suggested',teacherReviewRequired:true,
 });
 activity.mistakeCount=activity.mistakes.length;
 return next;
}

/** Removing a mistake is deliberate; keep at least one and preserve
 * the remaining records exactly, including any real source references.
 */
export function removeCircleMistake(lesson:Lesson,index:number):Lesson{
 const existing=lesson.preparedActivities?.circleMistakes?.mistakes;
 if(!Array.isArray(existing))
  throw Error('Circle the Mistakes does not have an editable mistake list.');
 if(!Number.isInteger(index)||index<0||index>=existing.length)
  throw Error('The selected mistake no longer exists.');
 if(existing.length<=1)
  throw Error('Circle the Mistakes needs at least one mistake.');
 const next=structuredClone(lesson);
 const activity=next.preparedActivities.circleMistakes;
 activity.mistakes.splice(index,1);
 activity.mistakeCount=activity.mistakes.length;
 return next;
}
