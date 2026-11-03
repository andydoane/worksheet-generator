import {validateModule,type ActivityModule,type ModuleId} from './modules.ts';
import {generateWordSearch} from './puzzleEngines.ts';
import {generatePixelPicture} from './pixelPicture.ts';
import {parseVerse,verseBank,verseScrambles} from './storyVerseModules.ts';
import {generateCryptogram,checkCryptogram} from './cryptograms.ts';
import {generateCrossword,checkCrossword,connectPositions,spiralWritingPoints} from './specialtyModules.ts';

/**
 * PR 17b: pure adapter from the versioned editorial lesson data to existing
 * printable activity payloads. This deliberately DOES NOT import files from
 * curriculum/review or register any unapproved preset with the public app.
 *
 * The full JSON Schema remains authoritative for lesson file validation.
 * These types describe only the v1 fields needed by the first six adapters.
 */
export type LessonFact={
 id:string;statement:string;isTrue:boolean;origin?:string;
 sourceIds?:string[];teacherReviewRequired?:boolean;
};
type Referenced={sourceIds?:string[];origin?:string;teacherReviewRequired?:boolean};
type StoryOrderItem=Referenced&{order:number;text:string};
type FinishStoryItem=Referenced&{markedParagraph:string};
type QuestionChoice={text:string;isCorrect:boolean;origin?:string};
type MultipleChoiceItem=Referenced&{
 id:string;question:string;correctAnswer:string;choices:QuestionChoice[];
 sourceQuestionIds?:string[];
};
type FactSelection=Referenced&{factId:string;statement:string;isTrue:boolean};
type LessonWordBank=Referenced&{words:string[]};
type LessonSortWords=Referenced&{
 related:string[];unrelated:string[];unrelatedOrigin?:string;
};
type LessonCheckboxWords=Referenced&{
 correct:string[];incorrect:string[];incorrectOrigin?:string;
};
type LessonWordPair=Referenced&{id?:string;left:string;right:string};
type LessonDrawPrompt=Referenced&{prompt:string};
type LessonWhoAmI=Referenced&{clue:string;answer:string};
type LessonUnscramble=Referenced&{answers:string[]};
type LessonPixelPicture=Referenced&{phrase:string;shapeId?:string};
export type LessonSourceLocation={
 filename:string;section:string;page:number;sourceParagraphIndex:number;details?:string;
};
type Located=Referenced&{source?:LessonSourceLocation};
type LessonVerse=Located&{reference:string;verse:string};
type LessonMarkedVerse=Located&{reference:string;markedVerse:string;sourceVerse:string};
type LessonPhrase=Located&{phrase:string};
type LessonMistake=Referenced&{incorrect:string;correction:string};
type LessonCircleMistakes=Located&{
 paragraph:string;mistakeCount:number;mistakes:LessonMistake[];
};
type LessonCrosswordEntry=Located&{answer:string;clue:string};
export type LessonMistakeCorrection={
 incorrect:string;correction:string;sourceIds:string[];
};


export type LessonActivityData={
 schemaVersion:number;
 id:string;
 publication?:{
  status:string;approved:boolean;
  teacherSignoff?:{reviewer:string;date:string};
  resolvedReviewFlagIds?:string[];
 };
 reviewFlags?:{id:string;type:string}[];
 facts:LessonFact[];
 storyNotes?:{id:string;order:number;cleanText:string}[];
 vocabulary?:{entries?:{term:string;sourceIds?:string[]}[]};
 lessonDetails?:{
  memoryVerse?:{reference:string;text:string;source?:LessonSourceLocation};
  bigIdeas?:{text:string;source?:LessonSourceLocation}[];
 };
 preparedActivities:{
  storyOrder?:StoryOrderItem[];
  finishStory?:FinishStoryItem;
  multipleChoice?:MultipleChoiceItem[];
  trueFalse?:FactSelection;
  trueFalseMaze?:FactSelection;
  sortStory?:FactSelection[];
  drawPicture?:LessonDrawPrompt;
  oddWords?:LessonSortWords;
  unscrambleWords?:LessonUnscramble;
  checkboxes?:LessonCheckboxWords;
  whoAmI?:LessonWhoAmI;
  matchWords?:LessonWordPair[];
  mediumWordSearch?:LessonWordBank;
  pixelPicture?:LessonPixelPicture;
  drawStory?:LessonDrawPrompt[];
  wordSearch?:LessonWordBank;
  firstLetters?:LessonVerse;
  finishVerse?:LessonMarkedVerse;
  unscrambleVerse?:LessonMarkedVerse;
  circleMistakes?:LessonCircleMistakes;
  bigIdeaCryptogram?:LessonPhrase;
  upsideDownVerse?:LessonVerse;
  connectBigIdea?:LessonPhrase;
  verseCryptogram?:LessonVerse;
  crossword?:LessonCrosswordEntry[];
  spiralVerse?:LessonVerse;
  connectVerse?:LessonVerse;
 };
};
export type CoreLessonModuleId=
 'story-order'|'finish-story'|'multiple-choice'|'true-false'|'true-false-maze'|'sort-story';
export const CORE_LESSON_MODULE_IDS:readonly CoreLessonModuleId[]=[
 'story-order','finish-story','multiple-choice',
 'true-false','true-false-maze','sort-story',
];
/** Ten word, visual and matching adapters added in PR 17e (roadmap PR 5). */
export type WordVisualLessonModuleId=
 'draw-picture'|'odd-words'|'unscramble-words'|'checkboxes'|'who-am-i'|
 'match-words'|'medium-word-search'|'pixel-picture'|'draw-story'|'word-search';
export const WORD_VISUAL_LESSON_MODULE_IDS:readonly WordVisualLessonModuleId[]=[
 'draw-picture','odd-words','unscramble-words','checkboxes','who-am-i',
 'match-words','medium-word-search','pixel-picture','draw-story','word-search',
];
/** Eleven verse and specialty data adapters, completing all 27 module kinds. */
export type VerseSpecialtyLessonModuleId=
 'first-letters'|'finish-verse'|'unscramble-verse'|'circle-mistakes'|
 'big-idea-cryptogram'|'upside-down-verse'|'connect-big-idea'|
 'verse-cryptogram'|'crossword'|'spiral-verse'|'connect-verse';
export const VERSE_SPECIALTY_LESSON_MODULE_IDS:readonly VerseSpecialtyLessonModuleId[]=[
 'first-letters','finish-verse','unscramble-verse','circle-mistakes',
 'big-idea-cryptogram','upside-down-verse','connect-big-idea',
 'verse-cryptogram','crossword','spiral-verse','connect-verse',
];
export type LessonModuleId=CoreLessonModuleId|WordVisualLessonModuleId|VerseSpecialtyLessonModuleId;
export type ConvertedActivity={
 moduleId:LessonModuleId;
 contentId:string;
 module:ActivityModule;
 sourceIds:string[];
 /** Original ODT source location when the module does not cite a Story Note ID. */
 sourceLocations?:LessonSourceLocation[];
 /** Teacher correction key for deliberately false Circle the Mistakes prose. */
 mistakeCorrections?:LessonMistakeCorrection[];
 origin:'source'|'adapted'|'suggested';
 teacherReviewRequired:boolean;
 /** The small True/False module does not store an answer; retain it here. */
 answerKey?:boolean;
};
export type ConversionDiagnostic={
 moduleId:LessonModuleId;
 contentId:string;
 message:string;
};
export type LessonConversionResult={
 lessonId:string;
 candidates:ConvertedActivity[];
 diagnostics:ConversionDiagnostic[];
 /** A pending lesson is never automatically eligible for public listing. */
 publicApproved:boolean;
};
export type ConversionOptions={seed?:number};

function normalizedOrigin(value:string|undefined):ConvertedActivity['origin']{
 return value==='source'?'source':value==='suggested'?'suggested':'adapted';
}
function refs(...values:(string[]|undefined)[]):string[]{
 return [...new Set(values.flatMap(x=>x??[]))];
}
/**
 * Return all valid activity candidates, not a fixed booklet. No automatic
 * selection, arbitrary question rewriting or unannounced content repair.
 * Invalid items are skipped WITH an explicit diagnostic, and all output
 * remains editable. A later PR will choose activities and assign page slots.
 */
export function convertLessonActivities(
 lesson:LessonActivityData,options:ConversionOptions={},
):LessonConversionResult{
 const candidates:ConvertedActivity[]=[];
 const diagnostics:ConversionDiagnostic[]=[];
 const seed=options.seed??1;
 const result:LessonConversionResult={
  lessonId:lesson.id,candidates,diagnostics,
  publicApproved:lesson.publication?.approved===true&&
  lesson.publication?.status==='approved'&&
  !!lesson.publication.teacherSignoff?.reviewer?.trim()&&
  !!lesson.publication.teacherSignoff?.date?.trim()&&
  (lesson.reviewFlags??[]).filter(flag=>flag.type==='teacher-approval')
   .every(flag=>lesson.publication?.resolvedReviewFlagIds?.includes(flag.id)),
 };
 if(lesson.schemaVersion!==1){
  diagnostics.push({moduleId:'story-order',contentId:'lesson',message:'Unsupported curriculum schemaVersion (expected 1).'});
  return result;
 }
 if(!Number.isSafeInteger(seed)||seed<0){
  diagnostics.push({moduleId:'story-order',contentId:'lesson',message:'The conversion seed must be a nonnegative safe integer.'});
  return result;
 }
 const prepared=lesson.preparedActivities??{};
 const factsById=new Map((lesson.facts??[]).map(fact=>[fact.id,fact]));
 const originalIds=new Set((lesson.storyNotes??[]).map(note=>note.id));
 function issue(moduleId:LessonModuleId,contentId:string,message:string){
  diagnostics.push({moduleId,contentId,message});
 }
 function add(moduleId:LessonModuleId,contentId:string,module:ActivityModule,
  sourceIds:string[],origin:string|undefined,review:boolean,answerKey?:boolean,
  editorial?:{sourceLocations?:LessonSourceLocation[];mistakeCorrections?:LessonMistakeCorrection[]}){
  const errors=validateModule(module);
  if(errors.length){
   issue(moduleId,contentId,errors.join(' '));return;
  }
  candidates.push({
   moduleId,contentId,module,sourceIds,
   origin:normalizedOrigin(origin),
   teacherReviewRequired:review||origin==='suggested',
   ...(answerKey!==undefined?{answerKey}:{}),
   ...(editorial?.sourceLocations?.length?{
    sourceLocations:editorial.sourceLocations.map(x=>({...x})),
   }:{}),
   ...(editorial?.mistakeCorrections?.length?{
    mistakeCorrections:editorial.mistakeCorrections.map(x=>({...x,sourceIds:[...x.sourceIds]})),
   }:{}),
  });
 }
 function verifiedFact(item:FactSelection,moduleId:CoreLessonModuleId,contentId:string){
  const fact=factsById.get(item.factId);
  if(!fact){issue(moduleId,contentId,'Unknown canonical fact '+item.factId+'.');return null;}
  if(fact.statement!==item.statement||fact.isTrue!==item.isTrue){
   issue(moduleId,contentId,'Statement/truth does not match canonical fact '+item.factId+'.');return null;
  }
  return fact;
 }
 // The lesson supplies chronological events. The app shuffles them only when
 // rendering Story Order; their canonical order must remain stable here.
 if(prepared.storyOrder?.length){
  const ordered=[...prepared.storyOrder].sort((a,b)=>a.order-b.order);
  const sequential=ordered.every((entry,i)=>entry.order===i+1);
  const validRefs=ordered.every(entry=>entry.sourceIds?.every(id=>originalIds.has(id))??false);
  if(!sequential||!validRefs){
   issue('story-order','story-order','Story events need sequential order and valid source Story Note IDs.');
  }else{
   add('story-order','story-order',{
    type:'story-order',events:ordered.map(x=>x.text).join('\n'),seed,
   },refs(...ordered.map(x=>x.sourceIds)),
    ordered.some(x=>x.origin==='suggested')?'suggested':'adapted',
    ordered.some(x=>x.teacherReviewRequired===true));
  }
 }else issue('story-order','story-order','No prepared Story Order events.');
 if(prepared.finishStory?.markedParagraph){
  const entry=prepared.finishStory;
  add('finish-story','finish-story',{
   type:'finish-story',story:entry.markedParagraph,seed,
  },refs(entry.sourceIds),entry.origin,entry.teacherReviewRequired===true);
 }else issue('finish-story','finish-story','No prepared bracketed Finish the Story paragraph.');
 // One candidate per reviewed question: the future recipe can choose one,
 // without destroying alternatives or copying suggestions into the source.
 const questionIds=new Set<string>();
 if(prepared.multipleChoice?.length){
  prepared.multipleChoice.forEach((question,index)=>{
   const contentId=question.id||'question-'+(index+1);
   if(questionIds.has(contentId)){
    issue('multiple-choice',contentId,'Duplicate multiple-choice question ID.');return;
   }
   questionIds.add(contentId);
   const choices=question.choices??[];
   const correct=choices.filter(choice=>choice.isCorrect);
   if(choices.length!==3||correct.length!==1||
    correct[0]?.text.trim()!==question.correctAnswer.trim()){
    issue('multiple-choice',contentId,'Requires three choices with exactly one matching correctAnswer.');return;
   }
   const incorrect=choices.filter(choice=>!choice.isCorrect);
   add('multiple-choice',contentId,{
    type:'multiple-choice',question:question.question,
    correct:question.correctAnswer,wrong1:incorrect[0].text,
    wrong2:incorrect[1].text,seed:seed+index,
   },refs(question.sourceIds,question.sourceQuestionIds),
    question.origin,
    question.teacherReviewRequired===true||choices.some(choice=>choice.origin==='suggested'));
  });
 }else issue('multiple-choice','multiple-choice','No prepared multiple-choice questions.');
 for(const [moduleId,key] of [
  ['true-false','trueFalse'],['true-false-maze','trueFalseMaze'],
 ] as const){
  const item=prepared[key];
  if(!item){issue(moduleId,key,'No prepared canonical true/false selection.');continue;}
  const fact=verifiedFact(item,moduleId,key);
  if(!fact)continue;
  const module:ActivityModule=moduleId==='true-false'
   ?{type:moduleId,statement:fact.statement}
   :{type:moduleId,statement:fact.statement,answer:fact.isTrue,seed};
  add(moduleId,moduleId,module,refs(item.sourceIds,fact.sourceIds),
   fact.origin,
   item.teacherReviewRequired===true||fact.teacherReviewRequired===true,
   fact.isTrue);
 }
 if(prepared.sortStory?.length){
  const checked:LessonFact[]=[];
  for(const [index,item] of prepared.sortStory.entries()){
   const fact=verifiedFact(item,'sort-story','sort-story['+index+']');
   if(fact)checked.push(fact);
  }
  if(checked.length===prepared.sortStory.length){
   add('sort-story','sort-story',{
    type:'sort-story',
    statements:checked.map(fact=>fact.statement+' '+String(fact.isTrue)).join('\n'),
    seed,
   },refs(...checked.map(x=>x.sourceIds)),
    checked.some(x=>x.origin==='suggested')?'suggested':'adapted',
    checked.some(x=>x.teacherReviewRequired===true));
  }
 }else issue('sort-story','sort-story','No prepared Sort the Story facts.');
 // Word and picture content should share the same authored lesson data.
 // In particular, vocabulary entries carry Story Note provenance even when
 // a prepared module's word list only contains the words themselves.
 const vocab=lesson.vocabulary?.entries??[];
 const wordRefs=(words:string[])=>refs(...words.map(word=>
  vocab.find(entry=>entry.term.toLocaleLowerCase()===word.toLocaleLowerCase())?.sourceIds));
 if(prepared.drawPicture){
  const item=prepared.drawPicture;
  add('draw-picture','draw-picture',{type:'draw-picture',prompt:item.prompt},
   refs(item.sourceIds),item.origin,item.teacherReviewRequired===true);
 }else issue('draw-picture','draw-picture','No prepared drawing prompt.');
 if(prepared.oddWords){
  const item=prepared.oddWords;
  const suggested=item.unrelatedOrigin==='suggested';
  add('odd-words','odd-words',{
   type:'odd-words',correct:item.related.join('\n'),
   incorrect:item.unrelated.join('\n'),seed,
  },refs(item.sourceIds,wordRefs(item.related)),
  suggested?'suggested':item.origin,suggested||item.teacherReviewRequired===true);
 }else issue('odd-words','odd-words','No prepared story/nonstory vocabulary.');
 if(prepared.unscrambleWords){
  const item=prepared.unscrambleWords;
  if(item.answers.length!==2){
   issue('unscramble-words','unscramble-words','Exactly two unscramble answers are required.');
  }else{
   add('unscramble-words','unscramble-words',{
    type:'unscramble-words',first:item.answers[0],second:item.answers[1],seed,
   },refs(item.sourceIds,wordRefs(item.answers)),
    item.origin,item.teacherReviewRequired===true);
  }
 }else issue('unscramble-words','unscramble-words','No prepared unscramble answers.');
 if(prepared.checkboxes){
  const item=prepared.checkboxes;
  const suggested=item.incorrectOrigin==='suggested';
  add('checkboxes','checkboxes',{
   type:'checkboxes',correct:item.correct.join('\n'),
   incorrect:item.incorrect.join('\n'),seed,
  },refs(item.sourceIds,wordRefs(item.correct)),
  suggested?'suggested':item.origin,suggested||item.teacherReviewRequired===true);
 }else issue('checkboxes','checkboxes','No prepared checkbox word bank.');
 if(prepared.whoAmI){
  const item=prepared.whoAmI;
  add('who-am-i','who-am-i',{
   type:'who-am-i',clue:item.clue,answer:item.answer,
  },refs(item.sourceIds),item.origin,item.teacherReviewRequired===true);
 }else issue('who-am-i','who-am-i','No prepared character clue.');
 if(prepared.matchWords?.length){
  const items=prepared.matchWords;
  if(items.some(item=>item.left.includes(',')||item.right.includes(','))){
   issue('match-words','match-words','Matching pairs cannot contain commas in either entry.');
  }else{
   add('match-words','match-words',{
    type:'match-words',pairs:items.map(item=>item.left+','+item.right).join('\n'),seed,
   },refs(...items.map(item=>item.sourceIds)),
    items.some(item=>item.origin==='suggested')?'suggested':'adapted',
    items.some(item=>item.teacherReviewRequired===true));
  }
 }else issue('match-words','match-words','No prepared matching pairs.');
 function addSearch(moduleId:'word-search'|'medium-word-search',
  contentId:string,item:LessonWordBank|undefined){
  if(!item){
   issue(moduleId,contentId,'No prepared word-search vocabulary.');return;
  }
  const module={type:moduleId,words:item.words.join('\n'),seed};
  const errors=validateModule(module);
  if(errors.length){issue(moduleId,contentId,errors.join(' '));return;}
  try{generateWordSearch(module);}
  catch(error){
   issue(moduleId,contentId,'Word-search grid cannot be generated: '+
    (error instanceof Error?error.message:String(error)));return;
  }
  add(moduleId,contentId,module,refs(item.sourceIds,wordRefs(item.words)),
   item.origin,item.teacherReviewRequired===true);
 }
 addSearch('medium-word-search','medium-word-search',prepared.mediumWordSearch);
 if(prepared.pixelPicture){
  const item=prepared.pixelPicture;
  const module={
   type:'pixel-picture' as const,phrase:item.phrase,shapeId:item.shapeId??'star',seed,
  };
  const errors=validateModule(module);
  if(errors.length)issue('pixel-picture','pixel-picture',errors.join(' '));
  else{
   try{
    generatePixelPicture(module);
    add('pixel-picture','pixel-picture',module,refs(item.sourceIds),
     item.origin,item.teacherReviewRequired===true);
   }catch(error){
    issue('pixel-picture','pixel-picture','Pixel picture generation failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('pixel-picture','pixel-picture','No prepared Pixel Picture phrase.');
 if(prepared.drawStory?.length){
  const items=prepared.drawStory;
  add('draw-story','draw-story',{
   type:'draw-story',prompts:items.map(item=>item.prompt).join('\n'),
  },refs(...items.map(item=>item.sourceIds)),
  items.some(item=>item.origin==='suggested')?'suggested':'adapted',
  items.some(item=>item.teacherReviewRequired===true));
 }else issue('draw-story','draw-story','No prepared drawing sequence.');
 addSearch('word-search','word-search',prepared.wordSearch);

 // PR17f: Scripture and Important Idea are canonical lesson content. Refuse
 // drifted references or verse wording rather than silently editing theology.
 const memory=lesson.lessonDetails?.memoryVerse;
 const importantIdea=lesson.lessonDetails?.bigIdeas?.[0];
 const location=(item:Located|undefined,fallback:LessonSourceLocation|undefined)=>
  item?.source??fallback;
 const editorialLocation=(item:Located|undefined,fallback:LessonSourceLocation|undefined)=>
  location(item,fallback)?{sourceLocations:[location(item,fallback)!]}:{};
 function consistentVerse(id:VerseSpecialtyLessonModuleId,entry:LessonVerse|LessonMarkedVerse){
  if(memory&&(entry.reference!==memory.reference||
     ('verse' in entry?entry.verse:entry.sourceVerse)!==memory.text)){
   issue(id,id,'Verse text or reference differs from the canonical lesson memory verse.');
   return false;
  }
  return true;
 }
 function consistentIdea(id:VerseSpecialtyLessonModuleId,entry:LessonPhrase){
  if(importantIdea&&entry.phrase!==importantIdea.text){
   issue(id,id,'Prepared phrase differs from the source-authored Important Idea.');
   return false;
  }
  return true;
 }
 function addPrepared(id:VerseSpecialtyLessonModuleId,module:ActivityModule,
  entry:Located,fallback:LessonSourceLocation|undefined){
  add(id,id,module,refs(entry.sourceIds),entry.origin,
   entry.teacherReviewRequired===true,undefined,editorialLocation(entry,fallback));
 }
 if(prepared.firstLetters){
  const item=prepared.firstLetters;
  if(consistentVerse('first-letters',item))
   addPrepared('first-letters',{type:'first-letters',reference:item.reference,verse:item.verse},
    item,memory?.source);
 }else issue('first-letters','first-letters','No prepared First Letters verse.');
 function addMarkedVerse(id:'finish-verse'|'unscramble-verse',
  item:LessonMarkedVerse|undefined){
  if(!item){issue(id,id,'No prepared marked verse.');return;}
  const parsed=parseVerse(item.markedVerse);
  const reconstructed=item.markedVerse.replace(/\\[([^\\[\\]]*)\\]/gu,'$1');
  if(parsed.malformed||reconstructed!==item.sourceVerse){
   issue(id,id,'Bracketed verse does not recover the exact source verse, or brackets are malformed.');
   return;
  }
  if(!consistentVerse(id,item))return;
  const module={type:id,reference:item.reference,verse:item.markedVerse,seed};
  const errors=validateModule(module);
  if(errors.length){issue(id,id,errors.join(' '));return;}
  // Use the unchanged rendering engine's answer-bank and letter scrambler.
  const answers=id==='finish-verse'?verseBank(module):verseScrambles(module);
  if(answers.length!==parsed.answers.length){
   issue(id,id,'Verse puzzle answer count does not match its marked blanks.');return;
  }
  addPrepared(id,module,item,memory?.source);
 }
 addMarkedVerse('finish-verse',prepared.finishVerse);
 addMarkedVerse('unscramble-verse',prepared.unscrambleVerse);
 if(prepared.circleMistakes){
  const item=prepared.circleMistakes;
  const mistakes=item.mistakes??[];
  const unique=new Set(mistakes.map(m=>m.incorrect.toLocaleLowerCase()));
  if(!Number.isInteger(item.mistakeCount)||
   item.mistakeCount!==mistakes.length||
   unique.size!==mistakes.length||
   mistakes.some(m=>!m.incorrect?.trim()||!m.correction?.trim()||
    !item.paragraph.includes(m.incorrect))){
   issue('circle-mistakes','circle-mistakes',
    'Mistake count, unique incorrect phrases, corrections and paragraph must agree.');
  }else{
   add('circle-mistakes','circle-mistakes',{
    type:'circle-mistakes',text:item.paragraph,count:item.mistakeCount,
   },refs(item.sourceIds,...mistakes.map(m=>m.sourceIds)),
    item.origin,true,undefined,{
     ...editorialLocation(item,undefined),
     mistakeCorrections:mistakes.map(m=>({
      incorrect:m.incorrect,correction:m.correction,sourceIds:refs(m.sourceIds),
     })),
    });
  }
 }else issue('circle-mistakes','circle-mistakes','No prepared mistake-filled paragraph.');
 if(prepared.bigIdeaCryptogram){
  const item=prepared.bigIdeaCryptogram;
  const id='big-idea-cryptogram';
  if(consistentIdea(id,item)){
   const module={type:id,idea:item.phrase,seed};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    if(!checkCryptogram(generateCryptogram(module)))
     throw Error('Generated cryptogram failed its solution check.');
    addPrepared(id,module,item,importantIdea?.source);
   }catch(error){
    issue(id,id,'Cryptogram generation failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('big-idea-cryptogram','big-idea-cryptogram','No prepared Big Idea cryptogram.');
 if(prepared.upsideDownVerse){
  const item=prepared.upsideDownVerse;
  if(consistentVerse('upside-down-verse',item))
   addPrepared('upside-down-verse',{
    type:'upside-down-verse',reference:item.reference,verse:item.verse,
   },item,memory?.source);
 }else issue('upside-down-verse','upside-down-verse','No prepared upside-down verse.');
 if(prepared.connectBigIdea){
  const item=prepared.connectBigIdea,id='connect-big-idea';
  if(consistentIdea(id,item)){
   const module={type:id,idea:item.phrase,seed};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    if(connectPositions(module).length<4)throw Error('Connection puzzle contains too few positions.');
    addPrepared(id,module,item,importantIdea?.source);
   }catch(error){
    issue(id,id,'Connection puzzle generation failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('connect-big-idea','connect-big-idea','No prepared Important Idea connection.');
 if(prepared.verseCryptogram){
  const item=prepared.verseCryptogram,id='verse-cryptogram';
  if(consistentVerse(id,item)){
   const module={type:id,reference:item.reference,verse:item.verse,seed};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    if(!checkCryptogram(generateCryptogram(module)))
     throw Error('Generated cryptogram failed its solution check.');
    addPrepared(id,module,item,memory?.source);
   }catch(error){
    issue(id,id,'Cryptogram generation failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('verse-cryptogram','verse-cryptogram','No prepared verse cryptogram.');
 if(prepared.crossword?.length){
  const items=prepared.crossword,id='crossword';
  if(items.some(item=>item.answer.includes(',')||item.clue.includes(','))){
   issue(id,id,'Crossword answers and clues must not contain commas.');
  }else{
   const module={type:id,entries:items.map(x=>x.answer+', '+x.clue).join('\\n'),seed};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    const grid=generateCrossword(module);
    if(!checkCrossword(grid)||grid.placements.length!==items.length)
     throw Error('Crossword solution does not contain all source clue entries.');
    add(id,id,module,refs(...items.map(x=>x.sourceIds)),
     items.some(x=>x.origin==='suggested')?'suggested':'adapted',
     items.some(x=>x.teacherReviewRequired===true),undefined,{
      sourceLocations:items.flatMap(x=>x.source?[x.source]:[]),
     });
   }catch(error){
    issue(id,id,'Crossword grid cannot be generated with all authored entries: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('crossword','crossword','No prepared Crossword answers and clues.');
 if(prepared.spiralVerse){
  const item=prepared.spiralVerse,id='spiral-verse';
  if(consistentVerse(id,item)){
   const module={type:id,reference:item.reference,verse:item.verse};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    if(spiralWritingPoints(module.verse,60).length!==60)
     throw Error('Spiral handwriting path generation failed.');
    addPrepared(id,module,item,memory?.source);
   }catch(error){
    issue(id,id,'Spiral verse generation failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('spiral-verse','spiral-verse','No prepared Spiral Verse.');
 if(prepared.connectVerse){
  const item=prepared.connectVerse,id='connect-verse';
  if(consistentVerse(id,item)){
   const module={type:id,verse:item.verse,seed};
   const errors=validateModule(module);
   if(errors.length)issue(id,id,errors.join(' '));
   else try{
    if(connectPositions(module).length<4)
     throw Error('Verse connection puzzle contains too few words.');
    addPrepared(id,module,item,memory?.source);
   }catch(error){
    issue(id,id,'Verse connection puzzle failed: '+
     (error instanceof Error?error.message:String(error)));
   }
  }
 }else issue('connect-verse','connect-verse','No prepared Connect Verse.');
 return result;
}
/** Select an individual candidate by exact type and content ID. */
export function findLessonCandidate(result:LessonConversionResult,
 moduleId:ModuleId,contentId:string):ConvertedActivity|undefined{
 return result.candidates.find(x=>x.moduleId===moduleId&&x.contentId===contentId);
}
