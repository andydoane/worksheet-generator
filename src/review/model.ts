import {clipToWords,markSelectedWords,type Passage} from './bsb.ts';
import {convertLessonActivities,type LessonActivityData} from '../lessonActivityConverter.ts';
import {validateModule} from '../modules.ts';

export type Lesson=Record<string,any>;
export type ReviewTask={id:string;group:string;label:string;detail:string};
const clone=<T,>(x:T):T=>structuredClone(x);
const trim=(x:unknown)=>typeof x==='string'?x.trim():'';

export function listReviewTasks(lesson:Lesson):ReviewTask[]{
 const p=lesson.preparedActivities??{};
 const tasks:ReviewTask[]=[];
 for(const mc of p.multipleChoice??[])tasks.push({
  id:'mc:'+mc.id,group:'Multiple Choice',label:mc.question,
  detail:'Review the question, correct answer and suggested incorrect choices.',
 });
 for(const fact of lesson.facts??[]){
  if(fact.origin==='suggested'||fact.teacherReviewRequired)tasks.push({
   id:'fact:'+fact.id,group:'False facts and sorting',label:fact.id,
   detail:'Ensure the deliberately false statement is clear, not misleading.',
  });
 }
 if((p.drawStory?.length??0)>0||(lesson.drawingPrompts?.length??0)>0)
  tasks.push({id:'drawing-captions',group:'Drawing activities',
   label:'Small scenes and Draw the Story captions',
   detail:'Small Draw a Picture scenes are short noun phrases. Large Draw the Story captions are full narrative sentences, preferably copied from the matching Story Order events.'});
 if(p.finishStory)tasks.push({id:'finish-story',group:'Story narrative',
  label:'Finish the Story',detail:'Review the adapted paragraph and seven source emphasis words.'});
 if(p.bigIdeaCryptogram)tasks.push({id:'solve-code',group:'Medium puzzle',
  label:'Solve the Code phrase',
  detail:'Select a concise, source-backed phrase for the Medium cryptogram without changing the lesson’s original Important Idea.'});
 if(p.circleMistakes)tasks.push({id:'circle-mistakes',group:'Story narrative',
  label:'Circle the Mistakes',detail:'Review the deliberately incorrect paragraph and corrections.'});
 if(p.oddWords?.unrelatedOrigin==='suggested')tasks.push({id:'odd-words',group:'Suggested vocabulary',
  label:'Odd Words',detail:'Review unrelated distractor vocabulary.'});
 if(p.checkboxes?.incorrectOrigin==='suggested')tasks.push({id:'checkboxes',group:'Suggested vocabulary',
  label:'Checkboxes',detail:'Review incorrect word choices.'});
 // A permanent task makes preflight repairs stay open while the teacher types.
 // Diagnostic-only tasks disappear when edits clear the old preflight report.
 tasks.push({id:'match-words',group:'Word activities',label:'Match the Words',
  detail:'Review 3–6 correct matching pairs. The printed worksheet shuffles only the right column.'});
 tasks.push({id:'crossword',group:'Large puzzles',label:'Crossword',
  detail:'Edit 6–10 answer/clue pairs, check that every word connects, and review the printable puzzle.'});
 tasks.push({id:'connect-phrase',group:'Medium puzzle',label:'Connect the Phrase',
  detail:'Choose source-linked phrasing, confirm word fit, and preview the scattered phrase.'});
 tasks.push({id:'word-search',group:'Vocabulary',label:'Word Search (Large)',
  detail:'Review 4–12 source-backed words and their nonrepeating preset selection.'});
 tasks.push({id:'medium-word-search',group:'Vocabulary',label:'Word Search (Medium)',
  detail:'Review 1–6 short words in the smaller nine-by-nine grid.'});
 if(lesson.reviewFlags?.some((x:any)=>x.type==='sensitivity'))tasks.push({id:'sensitivity',
  group:'Editorial decisions',label:'Age suitability',detail:'Review language about the fate of the Egyptian army for your students.'});
 if(lesson.reviewFlags?.some((x:any)=>x.type==='source-wording'))tasks.push({id:'important-idea',
  group:'Editorial decisions',label:'Important Idea wording',detail:'Confirm the original displayed Important Idea.'});
 tasks.push({id:'bsb-verse',group:'Scripture',label:'Approved BSB memory verse',
  detail:'Select the exact public-domain wording, passage boundaries and puzzle blanks.'});
 return tasks;
}

export function editAt(lesson:Lesson,path:(string|number)[],value:string):Lesson{
 const next=clone(lesson);
 let target:any=next;
 for(const key of path.slice(0,-1)){
  if(target?.[key]===undefined)throw Error('Field no longer exists.');
  target=target[key];
 }
 if(typeof target[path.at(-1)!]!=='string')throw Error('Only text fields may be edited.');
 const oldValue=target[path.at(-1)!];
 target[path.at(-1)!]=value;
 // Keep the one prepared Small prompt in sync when an identical canonical
 // reusable scene is edited. Do not change unrelated drawing scenes.
 if(path[0]==='drawingPrompts'&&path[2]==='prompt'&&
    next.preparedActivities?.drawPicture?.prompt===oldValue)
  next.preparedActivities.drawPicture.prompt=value;
 // If a caption was explicitly sourced from Story Order, keep it aligned with
 // edits to that event only while it still exactly matches the old sentence.
 if(path[0]==='preparedActivities'&&path[1]==='storyOrder'&&path[3]==='text'){
  const event=next.preparedActivities.storyOrder[path[2] as number];
  for(const caption of next.preparedActivities.drawStory??[]){
   if(caption.prompt===oldValue&&
      (caption.sourceIds??[]).some((id:string)=>event.sourceIds?.includes(id)))
    caption.prompt=value;
  }
 }
 if(path[0]==='preparedActivities'&&path[1]==='multipleChoice'){
  const mc=next.preparedActivities.multipleChoice[path[2] as number];
  if(path[3]==='choices'){
   const choice=mc.choices[path[4] as number];
   if(choice.isCorrect)mc.correctAnswer=value;
  }else if(path[3]==='correctAnswer'){
   const correct=mc.choices.find((x:any)=>x.isCorrect);
   if(correct)correct.text=value;
  }
 }
 if(path[0]==='facts'&&path[2]==='statement'){
  const fact=next.facts[path[1] as number];
  for(const key of ['sortStory']){
   for(const item of next.preparedActivities?.[key]??[]){
    if(item.factId===fact.id)item.statement=value;
   }
  }
  for(const key of ['trueFalse','trueFalseMaze']){
   const item=next.preparedActivities?.[key];
   if(item?.factId===fact.id)item.statement=value;
  }
 }
 return next;
}

/**
 * Preserve the translation of the author's ORIGINAL lesson separately from
 * the BSB text selected for the published worksheet. Older workbench exports
 * did not store this distinction; the Red Sea source is independently known
 * to be ESV from curriculum/review/ot-031-god-parts-the-red-sea.json.
 */
export function originalMemoryVerseTranslation(lesson:Lesson):string{
 const memory=lesson.lessonDetails?.memoryVerse;
 const explicit=trim(memory?.originalTranslation)||trim(memory?.bsbSource?.originalTranslation);
 if(explicit)return explicit;
 if(memory?.bsbSource){
  if(lesson.id==='ot-031-god-parts-the-red-sea')return 'ESV';
  return 'not recorded';
 }
 return trim(memory?.translation)||'not recorded';
}

export function applyBsbVerse(
 lesson:Lesson,passage:Passage,start:number,end:number,
 finishBlanks:number[],unscrambleBlanks:number[],displayReference?:string,
):Lesson{
 const next=clone(lesson);
 const text=clipToWords(passage.text,start,end);
 const reference=trim(displayReference)||passage.reference;
 const memory=next.lessonDetails?.memoryVerse;
 if(!memory)throw Error('The lesson has no memory verse record.');
 const originalTranslation=originalMemoryVerseTranslation(lesson);
 if(reference.length>38)throw Error('Memory verse reference must be at most 38 characters.');
 const f=markSelectedWords(text,finishBlanks);
 const u=markSelectedWords(text,unscrambleBlanks);
 const noMarks=(x:string)=>x.replace(/\[([^\[\]]+)\]/gu,'$1');
 if(noMarks(f)!==text||noMarks(u)!==text)throw Error('Marked words must reconstruct the exact BSB excerpt.');
 Object.assign(memory,{reference,text,translation:'BSB',origin:'adapted',
  ...(originalTranslation!=='not recorded'?{originalTranslation}:{}),
  isExcerpt:text!==passage.text,hasEllipses:false,requiresTextReview:false,
  bsbSource:{reference:passage.reference,sourceUrl:'https://bereanbible.com/bsb.txt',
   publicDomainTerms:'https://berean.bible/terms.htm',startWord:start,endWord:end},
 });
 const p=next.preparedActivities;
 for(const key of ['firstLetters','upsideDownVerse','verseCryptogram','spiralVerse','connectVerse']){
  if(p[key])Object.assign(p[key],{reference,verse:text,origin:'adapted'});
 }
 if(p.finishVerse)Object.assign(p.finishVerse,{reference,markedVerse:f,sourceVerse:text,origin:'adapted'});
 if(p.unscrambleVerse)Object.assign(p.unscrambleVerse,{reference,markedVerse:u,sourceVerse:text,origin:'adapted'});
 if(next.validation){
  next.validation.actualGeneratorTested=false;
  next.validation.allTextChecksPassed=false;
  next.validation.basis='Original conversion tests predate teacher-approved BSB; revalidate actual engines and content after export.';
 }
 return next;
}

/** Drawing data has two deliberately different contracts:
 * Small: source-backed noun-phrase scenes for "Draw a picture of ...".
 * Large: complete narrative sentences that fit under six picture panels.
 */
export function checkDrawingCopy(lesson:Lesson):string[]{
 const errors:string[]=[];
 const p=lesson.preparedActivities??{};
 const small=[
  ...(lesson.drawingPrompts??[]).map((item:any,i:number)=>({
   item,label:'drawingPrompts['+i+']',
  })),
  ...(p.drawPicture?[{item:p.drawPicture,label:'preparedActivities.drawPicture'}]:[]),
 ];
 for(const {item,label} of small){
  const scene=trim(item.prompt);
  if(!scene||scene.length>105||/^(?:draw|sketch|illustrate)\b/iu.test(scene)||
     /[.!?]$/u.test(scene))
   errors.push(label+': Small Draw a Picture scene must be a descriptive phrase (no Draw prefix or ending punctuation), at most 105 characters.');
 }
 const captions=p.drawStory??[];
 if(captions.length>0){
  if(captions.length<4||captions.length>6)
   errors.push('preparedActivities.drawStory: provide 4–6 complete narrative captions.');
  const used=new Set<string>();
  for(const [i,item] of captions.entries()){
   const sentence=trim(item.prompt);
   const label='preparedActivities.drawStory['+i+']';
   if(!sentence||sentence.length>105||
     !/^\p{Lu}/u.test(sentence)||
     !/[.!?](?:["\u201d\u2019])?$/u.test(sentence)||
     /^(?:draw|sketch|illustrate)\b/iu.test(sentence))
    errors.push(label+': Draw the Story caption must be a complete capitalized narrative sentence ending in punctuation (not an instruction), at most 105 characters.');
   if(used.has(sentence.toLocaleLowerCase()))
    errors.push(label+': duplicate Draw the Story caption.');
   used.add(sentence.toLocaleLowerCase());
  }
 }
 return errors;
}

/** Opt-in workbench action: derive the *same* authored story sentences as
 * Story Order by matching stable Story Note IDs, not matching fragile prose.
 * Missing/ambiguous references block conversion instead of inventing words.
 */
export function useMatchingStoryOrderCaptions(lesson:Lesson):Lesson{
 const next=clone(lesson);
 const events=next.preparedActivities?.storyOrder??[];
 const captions=next.preparedActivities?.drawStory??[];
 if(!captions.length)throw Error('This lesson has no Draw the Story captions.');
 const chosen=new Set<number>();
 for(const item of captions){
  const matches=events.map((event:any,i:number)=>({
   event,i,
  })).filter(({event}:any)=>
   (item.sourceIds??[]).some((id:string)=>event.sourceIds?.includes(id)));
  if(matches.length!==1||chosen.has(matches[0].i))
   throw Error('Draw the Story caption needs one unique matching Story Order event and source-note ID. Review these references manually.');
  const {event,i}=matches[0];
  if(!trim(event.text)||event.text.length>105)
   throw Error('Matching Story Order sentence is blank or too long for Draw the Story.');
  chosen.add(i);
  item.prompt=event.text;
  item.origin=event.origin??item.origin;
  if(event.teacherReviewRequired)item.teacherReviewRequired=true;
 }
 return next;
}

/** Assist imports authored before the short-scene convention existed.
 * Only changes Small drawing text; leaves Large captions to the separate
 * explicit Story Order action and leaves all original Story Notes untouched.
 */
export function normalizeLegacySmallDrawingScenes(lesson:Lesson):Lesson{
 const next=clone(lesson);
 const clean=(value:string)=>{
  const scene=trim(value).replace(/^(?:draw\s+(?:a\s+picture\s+of\s+)?|sketch\s+)/iu,'')
    .replace(/[.!?]$/u,'').trim();
  return scene.replace(/^The\b/u,'the');
 };
 for(const item of next.drawingPrompts??[])item.prompt=clean(item.prompt);
 if(next.preparedActivities?.drawPicture)
  next.preparedActivities.drawPicture.prompt=clean(next.preparedActivities.drawPicture.prompt);
 return next;
}

/** Return every source emphasis word in its original order while allowing
 * extra teacher-selected blanks, provided the generator accepts 6–12 total.
 * Subsequence matching keeps repeated emphasis words meaningful.
 */
export function finishStoryEmphasisInOrder(lesson:Lesson):boolean{
 const expected=(lesson.storyNotes??[]).flatMap((n:any)=>n.emphasizedWords??[])
  .map((word:string)=>String(word).toLocaleUpperCase());
 const blanks=[...String(lesson.preparedActivities?.finishStory?.markedParagraph??'')
  .matchAll(/\[([^\[\]]+)\]/gu)].map(m=>m[1].toLocaleUpperCase());
 let i=0;
 for(const blank of blanks)if(i<expected.length&&blank===expected[i])i++;
 return i===expected.length;
}

/** A separate Medium Solve the Code phrase can be drawn only from original
 * teaching material, the reviewed Key Phrases bank or Story Order events.
 * This does not edit the canonical Important Idea or Connect the Phrase.
 */
export function solveCodeChoices(lesson:Lesson):{
 text:string;origin?:string;sourceIds?:string[];source?:unknown;teacherReviewRequired?:boolean;
}[]{
 const original=lesson.lessonDetails?.bigIdeas?.[0];
 const candidates=[
  ...(original?[original]:[]),
  ...(lesson.keyPhrases??[]),
  ...(lesson.preparedActivities?.storyOrder??[]),
 ];
 const seen=new Set<string>();
 return candidates.flatMap(item=>{
  const text=trim(item.text);
  if(!text||seen.has(text))return [];
  seen.add(text);
  return [{text,origin:item.origin,sourceIds:item.sourceIds,
   source:item.source,teacherReviewRequired:item.teacherReviewRequired}];
 });
}

export function chooseSolveCodePhrase(lesson:Lesson,text:string):Lesson{
 const match=solveCodeChoices(lesson).find(item=>item.text===text);
 if(!match)throw Error('Choose the original Important Idea or a reviewed source-linked phrase.');
 const errors=validateModule({type:'big-idea-cryptogram',idea:text,seed:1});
 if(errors.length)throw Error(errors.join(' '));
 const next=clone(lesson);
 const item=next.preparedActivities.bigIdeaCryptogram;
 if(!item)throw Error('This lesson has no prepared Solve the Code activity.');
 item.phrase=text;
 item.origin=match.origin??'adapted';
 item.sourceIds=[...(match.sourceIds??[])];
 item.teacherReviewRequired=match.teacherReviewRequired===true;
 if(match.source)item.source=match.source;
 else delete item.source;
 return next;
}

export function checkReviewContent(lesson:Lesson):string[]{
 const errors:string[]=[...checkDrawingCopy(lesson)];
 const p=lesson.preparedActivities??{};
 for(const mc of p.multipleChoice??[]){
  const choices=mc.choices??[];
  const correct=choices.filter((x:any)=>x.isCorrect);
  if(!trim(mc.question)||choices.length<3||correct.length!==1||
    trim(mc.correctAnswer)!==trim(correct[0]?.text)||choices.some((x:any)=>!trim(x.text))||
    new Set(choices.map((x:any)=>trim(x.text).toLowerCase())).size!==choices.length)
   errors.push('Multiple Choice '+mc.id+' has missing or inconsistent choices.');
 }
 for(const fact of lesson.facts??[])if(!trim(fact.statement))errors.push('Empty fact: '+fact.id);
 if(p.finishStory&&!finishStoryEmphasisInOrder(lesson))
  errors.push('Finish the Story must retain all original emphasized Story Note words in order; extra [blanks] are allowed (6–12 total).');
 const mistakes=p.circleMistakes;
 if(mistakes){
  if(mistakes.mistakes?.length!==mistakes.mistakeCount||!trim(mistakes.paragraph)||
   mistakes.mistakes?.some((m:any)=>!trim(m.incorrect)||!trim(m.correction)||
    !String(mistakes.paragraph).toLowerCase().includes(trim(m.incorrect).toLowerCase())))
   errors.push('Circle the Mistakes paragraph and corrections are inconsistent.');
 }
 const memory=lesson.lessonDetails?.memoryVerse;
 if(memory?.translation!=='BSB'||!trim(memory.text)||!memory.bsbSource?.sourceUrl)
  errors.push('Select and approve a Berean Standard Bible memory verse.');
 for(const id of ['finishVerse','unscrambleVerse']){
  const m=p[id];
  if(m&&m.markedVerse?.replace(/\[([^\[\]]+)\]/gu,'$1')!==memory?.text)
   errors.push(id+' does not reconstruct the exact memory verse.');
 }
 const converted=convertLessonActivities(lesson as unknown as LessonActivityData,{seed:1});
 for(const candidate of converted.candidates){
  const problems=validateModule(candidate.module);
  if(problems.length)errors.push(candidate.moduleId+': '+problems.join('; '));
 }
 const ids=new Set(converted.candidates.map(x=>x.moduleId));
 if(ids.size!==27)errors.push('Only '+ids.size+'/27 activity types converted; check detailed diagnostics before approving.');
 for(const d of converted.diagnostics)errors.push((d.moduleId??'Module')+': '+d.message);
 return [...new Set(errors)];
}

/** Publish one self-contained lesson. The rights confirmation is a separate
 * explicit teacher action; it cannot be inferred from a valid Bible excerpt.
 * Historical review drafts remain unapproved until the user signs them.
 */
export function createApprovedLesson(
 lesson:Lesson,reviewer:string,date:string,scriptureRightsConfirmed:boolean,
):Lesson{
 if(!trim(reviewer))throw Error('Enter the name of the curriculum reviewer.');
 if(!/^\d{4}-\d{2}-\d{2}$/u.test(date)||!Number.isFinite(Date.parse(date))||
    new Date(date).toISOString().slice(0,10)!==date)
  throw Error('Enter a valid signoff date.');
 if(scriptureRightsConfirmed!==true)
  throw Error('Confirm the official BSB source and public-domain terms before final publication.');
 const memory=lesson.lessonDetails?.memoryVerse;
 if(memory?.translation!=='BSB'||!trim(memory.text)||
    memory.bsbSource?.sourceUrl!=='https://bereanbible.com/bsb.txt'||
    memory.bsbSource?.publicDomainTerms!=='https://berean.bible/terms.htm')
  throw Error('Select and verify the original BSB Scripture excerpt before approval.');
 const next=clone(lesson);
 next.publication={...next.publication,status:'approved',approved:true,
  teacherSignoff:{reviewer:trim(reviewer),date,notes:'Approved with verified BSB verse through Curriculum Review Studio'},
  scriptureRights:{
   status:'cleared',
   basis:'Berean Standard Bible (BSB), dedicated to the public domain on April 30, 2023. Official terms: https://berean.bible/terms.htm. Scripture text confirmed against https://bereanbible.com/bsb.txt.',
   reviewedBy:trim(reviewer),reviewedOn:date,
  },
  resolvedReviewFlagIds:(next.reviewFlags??[]).filter((f:any)=>[
   'teacher-approval','sensitivity','source-wording',
  ].includes(f.type)).map((f:any)=>f.id),
 };
 return next;
}
