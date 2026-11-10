import {getRegions,type LayoutId,type PageNumber,type RegionSize} from './booklet.ts';
import {EMPTY_DRAFT,type StoredDraft,type OriginalLessonContent} from './draftMigration.ts';
import {inferActivityContentLinks} from './lessonContentSync.ts';
import {
 lessonContentPool,chooseUnusedLessonContent,chooseDistinctPresetWordBanks,
 contentClaimsForModule,type LessonContentChoice,
} from './lessonContentPool.ts';
import {slotKey,moduleForSize,validateModule,type ModuleAssignments} from './modules.ts';
import {
 convertLessonActivities,findLessonCandidate,
type ConvertedActivity,type LessonModuleId,type LessonActivityData,
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
  memoryVerse?:{reference:string;text:string;translation?:string;bsbSource?:{sourceUrl:string}};
 };
};
export type NumberedRecipeId='preset-1'|'preset-2'|'preset-3'|'preset-4';
export type RecipeId=NumberedRecipeId|'story-review'|'fun-and-games';
export type RecipeStep={
 page:PageNumber;
 regionId:string;
 moduleId:LessonModuleId;
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
const LEGACY_RECIPES:readonly WorksheetRecipe[]=[
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
/** Author-designed booklet presets, transcribed from Layouts.ods.
 * Each region is filled with independent, approved curriculum content.
 * Legacy recipe IDs remain buildable for historical regression fixtures only.
 */
export const WORKSHEET_RECIPES:readonly WorksheetRecipe[]=[
 {
  id:'preset-1',name:'Preset 1',
  description:'Story completion, questions, drawing, word and Scripture puzzles.',
  layouts:{2:'small-small-medium-medium',3:'large-medium',4:'medium-medium-small-small'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'finish-story'},
   {page:2,regionId:'top-left-small',moduleId:'multiple-choice'},
   {page:2,regionId:'top-right-small',moduleId:'draw-picture'},
   {page:2,regionId:'middle-medium',moduleId:'true-false-maze'},
   {page:2,regionId:'bottom-medium',moduleId:'medium-word-search'},
   {page:3,regionId:'top-large',moduleId:'verse-cryptogram'},
   {page:3,regionId:'bottom-medium',moduleId:'match-words'},
   {page:4,regionId:'top-medium',moduleId:'unscramble-verse'},
   {page:4,regionId:'middle-medium',moduleId:'circle-mistakes'},
   {page:4,regionId:'bottom-left-small',moduleId:'unscramble-words'},
   {page:4,regionId:'bottom-right-small',moduleId:'draw-picture'},
  ],
 },
 {
  id:'preset-2',name:'Preset 2',
  description:'Draw the story, connect the verse, codebreaking, words and clues.',
  layouts:{2:'large-medium',3:'small-small-large',4:'medium-medium-small-small'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'draw-story'},
   {page:2,regionId:'top-large',moduleId:'connect-verse'},
   {page:2,regionId:'bottom-medium',moduleId:'pixel-picture'},
   {page:3,regionId:'top-left-small',moduleId:'odd-words'},
   {page:3,regionId:'top-right-small',moduleId:'multiple-choice'},
   {page:3,regionId:'bottom-large',moduleId:'word-search'},
   {page:4,regionId:'top-medium',moduleId:'big-idea-cryptogram'},
   {page:4,regionId:'middle-medium',moduleId:'finish-verse'},
   {page:4,regionId:'bottom-left-small',moduleId:'who-am-i'},
   {page:4,regionId:'bottom-right-small',moduleId:'first-letters'},
  ],
 },
 {
  id:'preset-3',name:'Preset 3',
  description:'True/False, Scripture reading, phrase puzzles and story sequence.',
  layouts:{2:'medium-small-small-medium',3:'large-medium',4:'large-medium'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'sort-story'},
   {page:2,regionId:'top-medium',moduleId:'upside-down-verse'},
   {page:2,regionId:'middle-left-small',moduleId:'true-false'},
   {page:2,regionId:'middle-right-small',moduleId:'checkboxes'},
   {page:2,regionId:'bottom-medium',moduleId:'connect-big-idea'},
   {page:3,regionId:'top-large',moduleId:'spiral-verse'},
   {page:3,regionId:'bottom-medium',moduleId:'true-false-maze'},
   {page:4,regionId:'top-large',moduleId:'story-order'},
   {page:4,regionId:'bottom-medium',moduleId:'unscramble-verse'},
  ],
 },
 {
  id:'preset-4',name:'Preset 4',
  description:'Crossword, word search, verse reading, drawing and short story puzzles.',
  layouts:{2:'large-medium',3:'small-small-medium-medium',4:'medium-small-small-medium'},
  steps:[
   {page:1,regionId:'cover-activity',moduleId:'crossword'},
   {page:2,regionId:'top-large',moduleId:'word-search'},
   {page:2,regionId:'bottom-medium',moduleId:'upside-down-verse'},
   {page:3,regionId:'top-left-small',moduleId:'multiple-choice'},
   {page:3,regionId:'top-right-small',moduleId:'draw-picture'},
   {page:3,regionId:'middle-medium',moduleId:'pixel-picture'},
   {page:3,regionId:'bottom-medium',moduleId:'big-idea-cryptogram'},
   {page:4,regionId:'top-medium',moduleId:'match-words'},
   {page:4,regionId:'middle-left-small',moduleId:'true-false'},
   {page:4,regionId:'middle-right-small',moduleId:'odd-words'},
   {page:4,regionId:'bottom-medium',moduleId:'unscramble-verse'},
  ],
 },
] as const;

export type RecipeSelection={
 slot:string;page:PageNumber;size:RegionSize;
 moduleId:LessonModuleId;contentId:string;
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
 /** Unassigned activity regions (zero for the new numbered presets). */
 openSlots:RecipeOpenSlot[];
 diagnostics:ConversionDiagnostic[];
 /** Never indicate that a review-generated PDF is a published preset. */
 reviewOnly:true;
 requiresTeacherReview:boolean;
};
export type RecipeOptions={purpose:'editorial-review'|'published';seed?:number};

/** Preserve the affected activity and page region as structured data so the
 * review workbench never has to guess from a human-readable preset message.
 */
export type RecipeConflictSource={
 claim:string;moduleId:LessonModuleId;slot:string;
};
export class RecipeContentConflictError extends Error{
 readonly recipeId:RecipeId;
 readonly moduleId:LessonModuleId;
 readonly slot:string;
 readonly conflicts:string[];
 /** Which previously placed activity used the repeated printable item. */
 readonly sources:RecipeConflictSource[];
 /** All vocabulary words used earlier in the same preset, not just the
  * single word from the fallback candidate shown in the error. */
 readonly usedVocabulary:string[];
 constructor(recipeId:RecipeId,recipeName:string,moduleId:LessonModuleId,
  slot:string,conflicts:string[],sources:RecipeConflictSource[]=[],
  usedVocabulary:string[]=[]){
  const names=conflicts.map(claim=>{
   if(!claim.startsWith('vocab:'))return claim;
   const source=sources.find(item=>item.claim===claim);
   const printed=source?.moduleId==='medium-word-search'?'Medium Word Search':
    source?.moduleId==='word-search'?'Word Search':
    source?.moduleId==='odd-words'?"What Doesn't Belong":
    source?.moduleId==='checkboxes'?'Checkboxes':source?.moduleId;
   return claim.slice('vocab:'.length).toUpperCase()+
    (printed?' (already in '+printed+' on page '+source!.slot.split(':')[0]+')':'');
  });
  super(moduleId==='unscramble-words'?
   recipeName+' cannot place Unscramble the Words on page '+slot.split(':')[0]+
   ' without repeating words already printed earlier in that booklet. '+
   'For example: '+names.join(', ')+'. The preset also tries alternative '+
   'word pairs, so the named word may not be one of your two saved answers. '+
   'Choose two unused lesson vocabulary words in the repair editor, then rerun preflight.':
   recipeName+' needs a distinct '+moduleId+
   ' activity at '+slot+', but all approved alternatives repeat: '+
   conflicts.join(', ')+'. Review the curriculum data for more choices.');
  this.name='RecipeContentConflictError';
  this.recipeId=recipeId;
  this.moduleId=moduleId;
  this.slot=slot;
  this.conflicts=[...conflicts];
  this.sources=sources.map(source=>({...source}));
  this.usedVocabulary=[...usedVocabulary];
 }
}

function recipeForId(id:RecipeId):WorksheetRecipe{
 const recipe=[...WORKSHEET_RECIPES,...LEGACY_RECIPES].find(item=>item.id===id);
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
 const isLegacy=id==='story-review'||id==='fun-and-games';
 const pool=isLegacy?null:lessonContentPool(lesson,seed);
 const conversion=pool??convertLessonActivities(lesson,{seed});
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
 const usedClaims=new Set<string>();
 // Preset 2 selects Odd Words before Word Search. Preset 4 reverses that
 // order. Reserve a non-overlapping pair before selecting either activity.
 let reservedSearch:LessonContentChoice|undefined;
 let reservedOddWords:LessonContentChoice|undefined;
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
  if(!isLegacy){
   const choices=pool!.candidates.filter(c=>
    c.moduleId===step.moduleId&&!usedContentIds.has(c.moduleId+':'+c.contentId));
   let preselected:LessonContentChoice|undefined;
   // Reserve Odd Words and Large Word Search together. The original greedy
   // choice could use words required by every later search alternative.
   if(id==='preset-2'&&step.moduleId==='odd-words'){
    const future=pool!.candidates.filter(c=>c.moduleId==='word-search');
    const plan=chooseDistinctPresetWordBanks(choices,future,usedClaims);
    if(plan){preselected=plan.odd;reservedSearch=plan.search;}
   }
   if(id==='preset-4'&&step.moduleId==='word-search'){
    const laterOdd=pool!.candidates.filter(c=>c.moduleId==='odd-words');
    const plan=chooseDistinctPresetWordBanks(laterOdd,choices,usedClaims);
    if(plan){preselected=plan.search;reservedOddWords=plan.odd;}
   }
   if(step.moduleId==='word-search'&&reservedSearch&&
    choices.includes(reservedSearch))preselected=reservedSearch;
   if(step.moduleId==='odd-words'&&reservedOddWords&&
    choices.includes(reservedOddWords))preselected=reservedOddWords;
   const picked=preselected?{
    candidate:preselected,reused:preselected.claims.filter(claim=>usedClaims.has(claim)),
   }:chooseUnusedLessonContent(choices,usedClaims,{preferFullBank:true});
   if(!picked)throw Error('No approved '+step.moduleId+' content available for '+recipe.name+' at '+key+'.');
   if(picked.reused.length){
    // Explain exactly which previously printed activity claims each word;
    // teachers must not be asked to repair an opaque "vocab:jordan" token.
    const sources=selections.flatMap(selection=>
     contentClaimsForModule(modules[selection.slot],lesson)
      .filter(claim=>picked.reused.includes(claim))
      .map(claim=>({claim,moduleId:selection.moduleId,slot:selection.slot})));
    throw new RecipeContentConflictError(id,recipe.name,step.moduleId,key,
     picked.reused,sources,[...usedClaims].filter(claim=>claim.startsWith('vocab:')));
   }
   choice=picked.candidate;
   picked.candidate.claims.forEach(claim=>usedClaims.add(claim));
  }else if(step.moduleId==='multiple-choice'){
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
  const uniqueContentKey=isLegacy?choice.contentId:choice.moduleId+':'+choice.contentId;
  if(usedContentIds.has(uniqueContentKey)){
   throw Error('Recipe '+id+' repeats activity content '+uniqueContentKey+'.');
  }
  usedContentIds.add(uniqueContentKey);
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
 const originalLessonContent:OriginalLessonContent={
  bigIdea:lesson.lessonDetails.bigIdeas?.[0]?.text??'',
  verseReference:lesson.lessonDetails.memoryVerse?.reference??'',
  verseText:lesson.lessonDetails.memoryVerse?.text??'',
  ...(lesson.lessonDetails.memoryVerse?.translation
   ?{verseTranslation:lesson.lessonDetails.memoryVerse.translation}:{}),
 };
 const linked=inferActivityContentLinks({
  ...originalLessonContent,modules,activityDefaults:modules,
 });
 const draft:StoredDraft={
  ...structuredClone(EMPTY_DRAFT),
  title,scripture,
  ...originalLessonContent,
  layouts:{...recipe.layouts},
  modules,
  // Review-only sample data never becomes a public lesson context.
  ...(options.purpose==='published'?{
   curriculumLessonId:lesson.id,
   ...(!isLegacy?{worksheetPresetId:id as NumberedRecipeId}:{}),
   activityDefaults:structuredClone(modules),
   ...(Object.keys(linked).length?{activityContentLinks:linked}:{}),
   originalLessonContent:structuredClone(originalLessonContent),
  }:{}),
 };
 return {
  lessonId:lesson.id,recipeId:id,draft,selections,openSlots,
  diagnostics:conversion.diagnostics.map(x=>({...x})),
  reviewOnly:true,
  requiresTeacherReview:lesson.publication?.approved!==true||
   selections.some(x=>x.teacherReviewRequired),
 };
}
