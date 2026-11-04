import {MODULES,type ModuleId} from '../modules.ts';
import {checkReviewContent,type Lesson} from './model.ts';

export const PREPARED_ACTIVITY_KEYS:Record<ModuleId,string>={
 'draw-picture':'drawPicture',
 'multiple-choice':'multipleChoice',
 'true-false':'trueFalse',
 'first-letters':'firstLetters',
 'odd-words':'oddWords',
 'unscramble-words':'unscrambleWords',
 'checkboxes':'checkboxes',
 'who-am-i':'whoAmI',
 'match-words':'matchWords',
 'finish-verse':'finishVerse',
 'unscramble-verse':'unscrambleVerse',
 'circle-mistakes':'circleMistakes',
 'medium-word-search':'mediumWordSearch',
 'true-false-maze':'trueFalseMaze',
 'big-idea-cryptogram':'bigIdeaCryptogram',
 'upside-down-verse':'upsideDownVerse',
 'connect-big-idea':'connectBigIdea',
 'pixel-picture':'pixelPicture',
 'finish-story':'finishStory',
 'story-order':'storyOrder',
 'sort-story':'sortStory',
 'draw-story':'drawStory',
 'word-search':'wordSearch',
 'verse-cryptogram':'verseCryptogram',
 'crossword':'crossword',
 'spiral-verse':'spiralVerse',
 'connect-verse':'connectVerse',
};

export type ReviewIssue={
 id:string;
 message:string;
 label:string;
 taskId:string;
 fieldId:string;
 moduleId?:ModuleId;
};
export type ReviewPreflight={
 convertedCount:number;
 totalCount:27;
 issues:ReviewIssue[];
};
const moduleIds=new Set<string>(MODULES.map(item=>item.id));
const labelFor=(id:string)=>MODULES.find(item=>item.id===id)?.name??id;
const issue=(message:string,taskId:string,fieldId:string,moduleId?:ModuleId):ReviewIssue=>({
 id:taskId+':'+message,label:moduleId?labelFor(moduleId):'Review content',
 message,taskId,fieldId,...(moduleId?{moduleId}:{}),
});
const verseIds=new Set([
 'first-letters','finish-verse','unscramble-verse',
 'upside-down-verse','verse-cryptogram','spiral-verse','connect-verse',
]);

/** Every converter diagnostic maps to a real Review Studio field. Activities
 * without a dedicated teacher-friendly form open the corresponding prepared
 * module in a focused advanced editor, never a nonfunctional error link.
 */
export function reviewIssueTarget(message:string):ReviewIssue{
 if(message.startsWith('Finish the Story')||message.startsWith('finishStory'))
  return issue(message,'finish-story','review-field-finish-story','finish-story');
 if(message.startsWith('Multiple Choice ')){
  const id=message.slice('Multiple Choice '.length).split(' ')[0];
  return issue(message,'mc:'+id,'review-mc-'+id,'multiple-choice');
 }
 if(message.startsWith('Empty fact: ')){
  const id=message.slice('Empty fact: '.length);
  return issue(message,'fact:'+id,'review-fact-'+id);
 }
 if(message.startsWith('preparedActivities.drawStory')){
  const i=message.match(/drawStory\[(\d+)\]/u)?.[1];
  return issue(message,'drawing-captions',i?'review-field-large-drawing-'+i:'review-field-drawing','draw-story');
 }
 if(message.startsWith('drawingPrompts[')){
  const i=message.match(/drawingPrompts\[(\d+)\]/u)?.[1];
  return issue(message,'drawing-captions',i?'review-field-drawing-'+i:'review-field-drawing','draw-picture');
 }
 if(message.startsWith('preparedActivities.drawPicture'))
  return issue(message,'drawing-captions','review-field-small-drawing','draw-picture');
 if(message.startsWith('Circle the Mistakes'))
  return issue(message,'circle-mistakes','review-field-circle-mistakes','circle-mistakes');
 if(message.startsWith('Select and approve a Berean')||message.includes('does not reconstruct the exact memory verse'))
  return issue(message,'bsb-verse','review-field-bsb');
 const moduleName=message.match(/^([a-z][a-z-]*):/u)?.[1];
 if(moduleName&&moduleIds.has(moduleName)){
  const id=moduleName as ModuleId;
  if(id==='big-idea-cryptogram')
   return issue(message,'solve-code','review-field-solve-code',id);
  if(id==='finish-story')
   return issue(message,'finish-story','review-field-finish-story',id);
  if(id==='circle-mistakes')
   return issue(message,'circle-mistakes','review-field-circle-mistakes',id);
  if(id==='draw-picture'||id==='draw-story')
   return issue(message,'drawing-captions','review-field-drawing',id);
  if(id==='odd-words')
   return issue(message,'odd-words','review-field-odd-words',id);
  if(id==='checkboxes')
   return issue(message,'checkboxes','review-field-checkboxes',id);
  if(verseIds.has(id))
   return issue(message,'bsb-verse','review-field-bsb',id);
  return issue(message,'module:'+id,'review-module-json',id);
 }
 return issue(message,'review-general','review-general-details');
}

export function buildReviewPreflight(lesson:Lesson):ReviewPreflight{
 const messages=checkReviewContent(lesson);
 const summary=messages.find(message=>/^Only \d+\/27 activity types converted/u.test(message));
 const convertedCount=summary?Number(summary.match(/Only (\d+)\/27/u)?.[1]??0):27;
 // Conversion coverage is shown separately, not as a duplicate error. The
 // actionable diagnostics directly name the unavailable activity and cause.
 const issues=messages.filter(message=>!/^Only \d+\/27 activity types converted/u.test(message))
  .map(message=>{
   const target=reviewIssueTarget(message),id=target.moduleId;
   if(!id)return target;
   const record=lesson.preparedActivities?.[PREPARED_ACTIVITY_KEYS[id]];
   // A dedicated review form cannot edit a module that has no prepared
   // content yet. Send those cases to the isolated module-data editor.
   if(record&&(!Array.isArray(record)||record.length>0))return target;
   return {...target,taskId:'module:'+id,fieldId:'review-module-json'};
  });
 return {convertedCount,totalCount:27,issues};
}
