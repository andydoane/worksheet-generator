import {MODULES,type ModuleId} from '../modules.ts';
import {checkReviewContent,type Lesson} from './model.ts';
import {repairDestinationForModule} from './repairRegistry.ts';
import {lessonIntegrityIssues,type IntegrityArea} from './lessonIntegrity.ts';
import {reviewSchemaIssues,type SchemaRepair} from './schemaPreflight.ts';
import {
 buildWorksheetRecipe,WORKSHEET_RECIPES,RecipeContentConflictError,
 type LessonWorksheetSource,
} from '../worksheetRecipes.ts';

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
 recipeId?:string;
 slot?:string;
 conflicts?:string[];
 area?:IntegrityArea;
 path?:string;
 schemaRepair?:SchemaRepair;
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
/** Every converter diagnostic maps to a real Review Studio field. Activities
 * without a dedicated teacher-friendly form open the corresponding prepared
 * module in a focused advanced editor, never a nonfunctional error link.
 */
export function reviewIssueTarget(message:string):ReviewIssue{
 // Keep compatibility with legacy preset errors that were plain strings.
 // Typed RecipeContentConflictError carries these fields directly.
 const presetActivity=message.match(/^Preset [1-3]:.*?\b(medium-word-search|word-search|connect-big-idea|odd-words|match-words)\b/u)?.[1];
 if(presetActivity){
  const target=reviewIssueTarget(presetActivity+': '+message);
  return {...target,id:target.taskId+':'+message,message};
 }
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
 if(/^(?:A worksheet recipe needs a lesson title|Lesson (?:title|Scripture)|Invalid lesson (?:title|Scripture))/iu.test(message))
  return issue(message,'lesson-details','review-field-lesson-details');
 if(/^(?:Not enough valid multiple-choice|No approved multiple-choice content|Multiple-choice pool)/iu.test(message))
  return issue(message,'multiple-choice-bank','review-field-multiple-choice-bank','multiple-choice');
 // Catch recipe errors with the named activity, even if the prefix is
 // a preset name or the generator changes the prose around that activity.
 if(/^(?:Preset [1-3]|Recipe preset-[1-3]|No approved|Lesson .* has no valid)/iu.test(message)){
  const id=[...moduleIds].sort((a,b)=>b.length-a.length).find(id=>
   new RegExp('(^|[^a-z-])'+id+'([^a-z-]|$)','iu').test(message));
  if(id)return reviewIssueTarget(id+': '+message);
  return issue(message,'recipe-review','review-field-recipe');
 }
 if(/(?:rights clearance|teacher signoff|publication|license|licence)/iu.test(message))
  return issue(message,'lesson-publication','review-field-lesson-publication');
 if(/(?:source (?:file|record|reference)|sourceIds|sourceQuestionIds|Story Note)/iu.test(message))
  return issue(message,'lesson-sources','review-field-lesson-sources');
 if(/(?:readiness|27 activity types|moduleReadiness)/iu.test(message))
  return issue(message,'lesson-readiness','review-field-lesson-readiness');
 const moduleName=message.match(/^([a-z][a-z-]*):/u)?.[1];
 if(moduleName&&moduleIds.has(moduleName)){
  const id=moduleName as ModuleId;
  const destination=repairDestinationForModule(id);
  return issue(message,destination.taskId,destination.fieldId,id);
 }
 return issue(message,'review-general','review-general-details');
}

export function buildReviewPreflight(lesson:Lesson):ReviewPreflight{
 // CI validates schema before invoking the converter. Do exactly the same
 // here so malformed metadata cannot reach "Download approved lesson JSON".
 const schemaIssues=reviewSchemaIssues(lesson);
 if(schemaIssues.length)return {convertedCount:0,totalCount:27,
  issues:schemaIssues.map(entry=>({
   id:'schema:'+entry.path,
   message:entry.message,
   label:'Curriculum schema',
   taskId:entry.taskId,
   fieldId:entry.fieldId,
   path:entry.path,
   ...(entry.repair?{schemaRepair:entry.repair}:{}),
  })),
 };
 const messages=checkReviewContent(lesson);
 const structural=lessonIntegrityIssues(lesson);
 const recipeIssues:ReviewIssue[]=[];
 // All 27 activities may convert successfully while an assembled booklet
 // still fails (for example, two regions need distinct approved content).
 // Check the actual three numbered recipes after content checks are clean.
 if(messages.length===0&&structural.length===0){
  for(const recipe of WORKSHEET_RECIPES){
   try{
    const result=buildWorksheetRecipe(lesson as LessonWorksheetSource,recipe.id,
     {purpose:'editorial-review',seed:1});
    for(const region of result.openSlots){
     const step=recipe.steps.find(s=>s.page+':'+s.regionId===region.slot);
     if(step){
      const mapped=reviewIssueTarget(step.moduleId+': '+recipe.name+
       ' has an empty '+step.moduleId+' slot at '+region.slot+'.');
      recipeIssues.push({...mapped,id:recipe.id+':'+region.slot+':'+mapped.taskId,
       recipeId:recipe.id,slot:region.slot});
     }else recipeIssues.push({...issue(recipe.name+
      ' has an empty region at '+region.slot+
      '. Check the preset layout and corresponding activity.',
      'recipe-review','review-field-recipe'),
      recipeId:recipe.id,slot:region.slot});
    }
   }catch(error){
    if(error instanceof RecipeContentConflictError){
     const mapped=reviewIssueTarget(error.moduleId+': '+error.message);
     recipeIssues.push({...mapped,
      id:error.recipeId+':'+error.slot+':'+mapped.taskId,
      message:error.message,recipeId:error.recipeId,slot:error.slot,
      conflicts:[...error.conflicts],
     });
    }else messages.push(recipe.name+': '+(error instanceof Error?error.message:String(error)));
   }
  }
 }
 const summary=messages.find(message=>/^Only \d+\/27 activity types converted/u.test(message));
 const convertedCount=summary?Number(summary.match(/Only (\d+)\/27/u)?.[1]??0):27;
 // Conversion coverage is shown separately, not as a duplicate error. The
 // actionable diagnostics directly name the unavailable activity and cause.
 const issues=messages.filter(message=>!/^Only \d+\/27 activity types converted/u.test(message))
  .map(message=>{
   const target=reviewIssueTarget(message),id=target.moduleId;
   if(target.taskId.startsWith('mc:')&&!(lesson.preparedActivities?.multipleChoice??[])
    .some((item:any)=>'mc:'+item.id===target.taskId))
    return {...target,taskId:'multiple-choice-bank',fieldId:'review-field-multiple-choice-bank'};
   if(!id)return target;
   const record=lesson.preparedActivities?.[PREPARED_ACTIVITY_KEYS[id]];
   // Some visual editors can create missing records; other editors still
   // require the isolated JSON form for completely absent prepared content.
   const present=!!record&&(!Array.isArray(record)||record.length>0);
   const route=repairDestinationForModule(id,present);
   return {...target,taskId:route.taskId,fieldId:route.fieldId};
  }).concat(recipeIssues).concat(structural.map((entry,index)=>({
   id:entry.area+':'+entry.path+':'+index,
   message:entry.message,
   label:entry.area==='lesson-details'?'Lesson details':
    entry.area==='lesson-sources'?'Curriculum sources':
    entry.area==='lesson-readiness'?'Activity readiness':'Publication and rights',
   taskId:entry.area,fieldId:'review-field-'+entry.area,
   area:entry.area,path:entry.path,
  })));
 return {convertedCount,totalCount:27,issues};
}
