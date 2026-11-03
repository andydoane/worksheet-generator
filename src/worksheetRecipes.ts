import {getRegions,type LayoutId,type PageNumber,type RegionSize} from './booklet.ts';
import {EMPTY_DRAFT,type StoredDraft} from './draftMigration.ts';
import {slotKey,moduleForSize,validateModule,type ModuleAssignments} from './modules.ts';
import {
 convertLessonActivities,findLessonCandidate,
 type ConvertedActivity,type CoreLessonModuleId,type LessonActivityData,
 type ConversionDiagnostic,
} from './lessonActivityConverter.ts';

/** PR 17c: a recipe is an arrangement, not curriculum or a saved draft.
 * No import of review-stage lesson JSON is made by the application.
 */
export type LessonWorksheetSource=LessonActivityData&{
 lessonDetails:{
  title:string;
  scriptureDisplay?:string;
  scripturePassages?:string[];
  bigIdeas?:{text:string;origin?:string}[];
  memoryVerse?:{reference:string;text:string;translation?:string};
 };
};
export type RecipeId='story-review'|'fun-and-games';
export type RecipeStep={
 page:PageNumber;
 regionId:string;
 moduleId:CoreLessonModuleId;
 /** Zero-based order among the available multiple-choice alternatives. */
 questionIndex?:number;
};
export type WorksheetRecipe={
 id:RecipeId;
 name:string;
 description:string;
 layouts:Record<2|3|4,LayoutId>;
 steps:readonly RecipeStep[];
};
export const WORKSHEET_RECIPES:readonly WorksheetRecipe[]=[
 {
  id:'story-review',
  name:'Remember the Story',
  description:'Follow the Bible story, recall key facts and practice the main events.',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'story-order'},
   {page:2,regionId:'top-left-small',moduleId:'multiple-choice',questionIndex:0},
   {page:2,regionId:'top-right-small',moduleId:'true-false'},
   {page:2,regionId:'middle-medium',moduleId:'true-false-maze'},
   {page:3,regionId:'top-large',moduleId:'finish-story'},
   {page:3,regionId:'bottom-left-small',moduleId:'multiple-choice',questionIndex:1},
   {page:3,regionId:'bottom-right-small',moduleId:'multiple-choice',questionIndex:2},
   {page:4,regionId:'top-large',moduleId:'sort-story'},
   {page:4,regionId:'bottom-left-small',moduleId:'multiple-choice',questionIndex:3},
   {page:4,regionId:'bottom-right-small',moduleId:'multiple-choice',questionIndex:4},
  ],
 },
 {
  id:'fun-and-games',
  name:'Fun & Games',
  description:'Lead with sorting and puzzles, then revisit the story with quick questions.',
  layouts:{2:'medium-medium-small-small',3:'large-small-small',4:'large-small-small'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'sort-story'},
   {page:2,regionId:'top-medium',moduleId:'true-false-maze'},
   {page:2,regionId:'bottom-left-small',moduleId:'multiple-choice',questionIndex:0},
   {page:2,regionId:'bottom-right-small',moduleId:'multiple-choice',questionIndex:1},
   {page:3,regionId:'top-large',moduleId:'story-order'},
   {page:3,regionId:'bottom-left-small',moduleId:'multiple-choice',questionIndex:2},
   {page:3,regionId:'bottom-right-small',moduleId:'multiple-choice',questionIndex:3},
   {page:4,regionId:'top-large',moduleId:'finish-story'},
   {page:4,regionId:'bottom-left-small',moduleId:'true-false'},
   {page:4,regionId:'bottom-right-small',moduleId:'multiple-choice',questionIndex:4},
  ],
 },
] as const;
export type RecipeSelection={
 slot:string;page:PageNumber;size:RegionSize;
 moduleId:CoreLessonModuleId;contentId:string;
 sourceIds:string[];origin:ConvertedActivity['origin'];
 teacherReviewRequired:boolean;answerKey?:boolean;
};
export type RecipeOpenSlot={slot:string;page:PageNumber;size:RegionSize};
export type WorksheetRecipeResult={
 recipeId:RecipeId;
 lessonId:string;
 /** An exact independently editable, v1-browser-storage-compatible draft. */
 draft:StoredDraft;
 selections:RecipeSelection[];
 /** Layout cells not filled because PR 17b offers no matching activity yet. */
 openSlots:RecipeOpenSlot[];
 diagnostics:ConversionDiagnostic[];
 /** Never indicate that a review-generated PDF is a published preset. */
 reviewOnly:true;
 requiresTeacherReview:boolean;
};
export type RecipeOptions={purpose:'editorial-review'|'published';seed?:number};

function recipeForId(id:RecipeId):WorksheetRecipe{
 const recipe=WORKSHEET_RECIPES.find(item=>item.id===id);
 if(!recipe)throw Error('Unknown worksheet recipe: '+id);
 return recipe;
}
function regionsFor(recipe:WorksheetRecipe){
 return ([1,2,3,4] as PageNumber[]).flatMap(page=>
  getRegions(page,page===1?recipe.layouts[2]:recipe.layouts[page]).filter(r=>r.kind==='activity')
   .map(region=>({page,region,slot:slotKey(page,region.id)})));
}
/**
 * Build a previewable, printable draft using existing module payloads.
 *
 * The user must explicitly request editorial-review mode, or a published lesson
 * with verified curriculum teacher signoff. The separate public catalog also
 * checks Scripture distribution clearance before exposing any story.
 * A successful draft build alone never implies editorial approval.
 *
 * Throws (instead of making a partial booklet) when a required candidate,
 * module validation, recipe slot, or other constraint cannot be satisfied.
 * The caller's lesson and every converted candidate stay untouched.
 */
export function buildWorksheetRecipe(
 lesson:LessonWorksheetSource,id:RecipeId,options:RecipeOptions,
):WorksheetRecipeResult{
 if(options?.purpose!=='editorial-review'&&!(
  options?.purpose==='published'&&convertLessonActivities(lesson).publicApproved
 )){
  throw Error('Worksheet recipes are for editorial review only until the approved public catalog exists.');
 }
 const seed=options.seed??1;
 if(!Number.isSafeInteger(seed)||seed<0||seed>1_000_000){
  throw Error('Recipe seed must be an integer between 0 and 1,000,000.');
 }
 const recipe=recipeForId(id);
 if(lesson.schemaVersion!==1)throw Error('Unsupported curriculum schema version.');
 const title=lesson.lessonDetails?.title?.trim();
 const scripture=lesson.lessonDetails?.scriptureDisplay?.trim()
  ||lesson.lessonDetails?.scripturePassages?.join(', ')?.trim();
 if(!title||!scripture){
  throw Error('A worksheet recipe needs a lesson title and Scripture reference.');
 }
 const conversion=convertLessonActivities(lesson,{seed});
 const regions=regionsFor(recipe);
 const regionBySlot=new Map(regions.map(x=>[x.slot,x]));
 const questionPool=conversion.candidates.filter(c=>c.moduleId==='multiple-choice')
  .sort((a,b)=>a.contentId.localeCompare(b.contentId));
 const questionSteps=recipe.steps.filter(x=>x.moduleId==='multiple-choice');
 if(questionPool.length<questionSteps.length){
  throw Error('Not enough valid multiple-choice questions for '+recipe.name+
   ' (need '+questionSteps.length+', have '+questionPool.length+').');
 }
 const modules:ModuleAssignments={};
 const selections:RecipeSelection[]=[];
 const usedContentIds=new Set<string>();
 for(const step of recipe.steps){
  const key=slotKey(step.page,step.regionId);
  const region=regionBySlot.get(key);
  if(!region)throw Error('Recipe '+id+' refers to missing activity slot '+key+'.');
  if(modules[key])throw Error('Recipe '+id+' assigns an activity slot twice: '+key+'.');
  const supported=moduleForSize(region.region.size).some(x=>x.id===step.moduleId);
  if(!supported){
   throw Error('Recipe '+id+' cannot place '+step.moduleId+' in '+region.region.size+' slot '+key+'.');
  }
  let choice:ConvertedActivity|undefined;
  if(step.moduleId==='multiple-choice'){
   if(step.questionIndex===undefined||step.questionIndex<0||
    !Number.isInteger(step.questionIndex)||step.questionIndex>=questionSteps.length){
    throw Error('Invalid question index in recipe '+id+'.');
   }
   const recipeOffset=id==='fun-and-games'?3:0;
   choice=questionPool[(step.questionIndex+seed+recipeOffset)%questionPool.length];
  }else{
   choice=findLessonCandidate(conversion,step.moduleId,step.moduleId);
  }
  if(!choice){
   const detail=conversion.diagnostics.filter(x=>x.moduleId===step.moduleId)
    .map(x=>x.message).join(' ');
   throw Error('Lesson '+lesson.id+' has no valid '+step.moduleId+
    ' for recipe '+id+(detail?': '+detail:''));
  }
  if(usedContentIds.has(choice.contentId)){
   throw Error('Recipe '+id+' repeats activity content '+choice.contentId+'.');
  }
  usedContentIds.add(choice.contentId);
  const errors=validateModule(choice.module);
  if(errors.length)throw Error('Invalid activity in '+key+': '+errors.join(' '));
  modules[key]=structuredClone(choice.module);
  selections.push({
   slot:key,page:step.page,size:region.region.size,
   moduleId:step.moduleId,contentId:choice.contentId,
   sourceIds:[...choice.sourceIds],origin:choice.origin,
   teacherReviewRequired:choice.teacherReviewRequired,
   ...(choice.answerKey!==undefined?{answerKey:choice.answerKey}:{}),
  });
 }
 const openSlots=regions.filter(x=>!modules[x.slot]).map(x=>({
  slot:x.slot,page:x.page,size:x.region.size,
 }));
 const draft:StoredDraft={
  ...structuredClone(EMPTY_DRAFT),
  title,scripture,
  bigIdea:lesson.lessonDetails.bigIdeas?.[0]?.text??'',
  verseReference:lesson.lessonDetails.memoryVerse?.reference??'',
  verseText:lesson.lessonDetails.memoryVerse?.text??'',
  layouts:{...recipe.layouts},
  modules,
  // Review-only sample data never becomes a public lesson context.
  ...(options.purpose==='published'?{curriculumLessonId:lesson.id}:{}),
 };
 return {
  lessonId:lesson.id,recipeId:id,draft,selections,openSlots,
  diagnostics:conversion.diagnostics.map(x=>({...x})),
  reviewOnly:true,
  requiresTeacherReview:lesson.publication?.approved!==true||
   selections.some(x=>x.teacherReviewRequired),
 };
}
