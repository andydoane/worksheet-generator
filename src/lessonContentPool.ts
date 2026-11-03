import {
 convertLessonActivities,type ConvertedActivity,type LessonActivityData,
 type LessonConversionResult,
} from './lessonActivityConverter.ts';
import {validateModule,type ActivityModule,type ModuleId} from './modules.ts';
import {generateWordSearch} from './puzzleEngines.ts';

/**
 * Reusable, individually approved content choices. A claim denotes the exact
 * teaching item actually printed (fact, prompt, question, vocabulary word or
 * phrase). Shared Story Note provenance alone is NOT a duplicate: a drawing
 * of the crossing and a question about the crossing are different exercises.
 */
export type LessonContentChoice=ConvertedActivity&{claims:string[]};
export type LessonContentPool=Omit<LessonConversionResult,'candidates'>&{
 candidates:LessonContentChoice[];
};
const normalized=(s:string)=>s.trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
const claim=(kind:string,text:string)=>kind+':'+normalized(text);
const distinct=<T,>(values:T[]):T[]=>[...new Set(values)];
const textList=(s:string)=>s.split(/\r?\n/u).map(x=>x.trim()).filter(Boolean);

type LessonWithOptions=LessonActivityData&{
 drawingPrompts?:{id?:string;prompt:string;origin?:string;sourceIds?:string[];teacherReviewRequired?:boolean}[];
 characters?:{id:string;name:string;origin?:string;sourceIds?:string[];
  clues?:{text:string;origin?:string;teacherReviewRequired?:boolean}[]}[];
 keyPhrases?:{id:string;text:string;origin?:string;sourceIds?:string[]}[];
 vocabulary?:{entries?:{term:string;sourceIds?:string[];origin?:string;scope?:string}[]};
};

export function contentClaimsForModule(
 module:ActivityModule,lesson:LessonActivityData,
):string[]{
 const p=lesson.preparedActivities;
 const facts=lesson.facts??[];
 const f=(text:string)=>facts.find(x=>normalized(x.statement)===normalized(text));
 switch(module.type){
  case 'multiple-choice':return [claim('question',module.question)];
  case 'true-false':
  case 'true-false-maze': {
   const fact=f(module.statement);
   return [fact?'fact:'+fact.id:claim('fact-text',module.statement)];
  }
  case 'sort-story':return distinct(textList(module.statements).map(line=>{
   // "Sort the Story" prints the statement, with a trailing true/false flag.
   const text=line.replace(/\s+(true|false)$/iu,'');
   const fact=f(text);
   return fact?'fact:'+fact.id:claim('fact-text',text);
  }));
  case 'draw-picture':return [claim('drawing',module.prompt)];
  case 'draw-story':return distinct(textList(module.prompts).map(t=>claim('drawing',t)));
  case 'unscramble-words':return distinct([module.first,module.second]
    .map(text=>claim('vocab',text)));
  case 'odd-words':
  case 'checkboxes':return distinct([...textList(module.correct),...textList(module.incorrect)]
    .map(text=>claim('vocab',text)));
  case 'word-search':
  case 'medium-word-search':return distinct(textList(module.words).map(text=>claim('vocab',text)));
  case 'who-am-i':return [claim('clue',module.clue)];
  case 'big-idea-cryptogram':
  case 'connect-big-idea':return [claim('phrase',module.idea)];
  case 'match-words':return distinct(textList(module.pairs).map(line=>
   claim('pair',line)));
  default:return [];
 }
}

/** Candidate variants are drawn ONLY from reviewed data within the supplied
 * approved lesson. All additions go through the existing module validator.
 */
export function lessonContentPool(lesson:LessonActivityData,seed=1):LessonContentPool{
 const base=convertLessonActivities(lesson,{seed});
 const result:LessonContentPool={...base,candidates:base.candidates.map(c=>({
  ...c,claims:contentClaimsForModule(c.module,lesson),
 }))};
 if(!base.publicApproved)return result;
 const data=lesson as LessonWithOptions;
 const seen=new Set(result.candidates.map(c=>c.moduleId+'|'+JSON.stringify(c.module)));
 function add(type:ModuleId,id:string,module:ActivityModule,origin:string|undefined,
   sourceIds:string[]=[],review=false){
  if(!result.candidates.some(c=>c.moduleId===type))return; // never invent a module type absent in the authored lesson
  if(validateModule(module).length)return;
  if(type==='word-search'||type==='medium-word-search'){
   try{generateWordSearch(module as Extract<ActivityModule,{type:'word-search'|'medium-word-search'}>);}
   catch{return;}
  }
  const key=type+'|'+JSON.stringify(module);
  if(seen.has(key))return;
  seen.add(key);
  result.candidates.push({
   moduleId:type,contentId:id,module:structuredClone(module),
   sourceIds:[...sourceIds],origin:origin==='source'?'source':origin==='suggested'?'suggested':'adapted',
   teacherReviewRequired:review,claims:contentClaimsForModule(module,lesson),
  });
 }

 // Canonical facts are approved independently. Use the same fact identities
 // across small True/False and Medium True/False Maze so they never collide.
 for(const fact of lesson.facts??[]){
  add('true-false','fact:'+fact.id,{
   type:'true-false',statement:fact.statement,
  },fact.origin,fact.sourceIds,fact.teacherReviewRequired);
  add('true-false-maze','fact:'+fact.id,{
   type:'true-false-maze',statement:fact.statement,answer:fact.isTrue,seed,
  },fact.origin,fact.sourceIds,fact.teacherReviewRequired);
 }

 // Seven approved single-page scenes, as well as the existing authored
 // drawPicture prompt and the six frame prompts from Draw the Story.
 const drawings=[
  ...(data.drawingPrompts??[]),
  ...(data.preparedActivities.drawStory??[]).map((d,i)=>({...d,id:'story-frame-'+i})),
 ];
 const uniqueDrawing=new Set<string>();
 for(const picture of drawings){
  if(!picture.prompt||uniqueDrawing.has(normalized(picture.prompt)))continue;
  uniqueDrawing.add(normalized(picture.prompt));
  add('draw-picture','scene:'+picture.id,{type:'draw-picture',prompt:picture.prompt},
   picture.origin,picture.sourceIds,picture.teacherReviewRequired);
 }

 // All authored character clues can be used as separate small Who Am I tasks.
 for(const character of data.characters??[]){
  for(const [i,clue] of (character.clues??[]).entries()){
   add('who-am-i','character:'+character.id+':'+i,
    {type:'who-am-i',clue:clue.text,answer:character.name},
    clue.origin??character.origin,character.sourceIds,clue.teacherReviewRequired);
  }
 }

 // Distinct combinations of already reviewed story/nonstory word banks.
 // No new distractors are invented; the curriculum author approved these.
 const wordSources=[
  {type:'odd-words' as const,source:data.preparedActivities.oddWords},
  {type:'checkboxes' as const,source:data.preparedActivities.checkboxes},
 ];
 for(const group of wordSources){
  const list=group.source;
  if(!list)continue;
  const correct='related' in list?list.related:list.correct;
  const incorrect='unrelated' in list?list.unrelated:list.incorrect;
  const approvedRelated=distinct([
   ...correct,...(data.vocabulary?.entries??[])
    .filter(x=>x.scope!=='application').map(x=>x.term),
  ]).filter(x=>x.length<=12&&/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/u.test(x));
  for(let i=0;i<Math.min(approvedRelated.length,16);i++){
   if(incorrect.length<2)break;
   const related=Array.from({length:group.type==='odd-words'?4:3},
    (_,j)=>approvedRelated[(i+j)%approvedRelated.length]);
   const unrelated=[incorrect[i%incorrect.length],incorrect[(i+1)%incorrect.length]];
   const module={type:group.type,correct:related.join('\n'),
    incorrect:unrelated.join('\n'),seed};
   add(group.type,'reviewed-word-bank:'+i,module,'adapted');
  }
 }
 // The six original matching pairs can form two different small matching
 // exercises, instead of always repeating the whole matching set.
 const match=data.preparedActivities.matchWords??[];
 if(match.length>=6){
  for(let offset=0;offset<match.length;offset+=3){
   const part=match.slice(offset,offset+3);
   if(part.length<3)continue;
   add('match-words','pairs:'+offset,{
    type:'match-words',pairs:part.map(p=>p.left+','+p.right).join('\n'),seed,
   },'adapted',part.flatMap(p=>p.sourceIds??[]));
  }
 }

 // Different two-word scramble sets, from approved lesson vocabulary only.
 // Avoid application-only vocabulary for the story review activities.
 const vocab=distinct((data.vocabulary?.entries??[])
  .filter(v=>v.scope!=='application'&&v.term)
  .map(v=>v.term.toUpperCase()))
  .filter(v=>/^[A-Z]{3,10}$/u.test(v)&&new Set(v).size>=2);
 for(let i=0;i<Math.min(vocab.length,24);i++){
  const one=vocab[i],two=vocab[(i+Math.floor(vocab.length/2))%vocab.length];
  if(one===two)continue;
  add('unscramble-words','vocab-pair:'+normalized(one)+'+'+normalized(two),
   {type:'unscramble-words',first:one,second:two,seed},
   'adapted');
 }

 // Alternate story word searches built only from source-backed vocabulary.
 // Limit to a fixed, small set so booklet generation remains quick and stable.
 for(const type of ['medium-word-search','word-search'] as const){
  const count=type==='medium-word-search'?6:10;
  for(let offset=0;offset<Math.min(vocab.length,18);offset++){
   const words=Array.from({length:count},(_,i)=>vocab[(offset+i)%vocab.length]);
   if(words.some(x=>!x)||new Set(words).size!==words.length)continue;
   add(type,'word-bank:'+offset,{type,words:words.join('\n'),seed},'adapted');
  }
 }

 // The authored Important Idea is the default; approved story-event sentences
 // and key phrases are alternatives for both medium "phrase" puzzle types.
 // Exact phrase claims prevent Solve the Code / Connect the Phrase duplicates.
 const phrases=[
  ...(data.keyPhrases??[]).map(x=>({id:'phrase:'+x.id,text:x.text,origin:x.origin,sourceIds:x.sourceIds})),
  ...(data.preparedActivities.storyOrder??[]).map(x=>({
   id:'story-event:'+x.order,text:x.text,origin:x.origin,sourceIds:x.sourceIds,
  })),
 ];
 const uniquePhrases=new Set<string>();
 for(const item of phrases){
  if(!item.text||uniquePhrases.has(normalized(item.text)))continue;
  uniquePhrases.add(normalized(item.text));
  for(const type of ['big-idea-cryptogram','connect-big-idea'] as const){
   add(type,item.id,{type,idea:item.text,seed},item.origin,item.sourceIds);
  }
 }
 return result;
}

/** A conflict is the use of the SAME printed lesson item, regardless of the
 * module type or its seed. Different questions about one Story Note do not
 * conflict unless the actual question, fact or prompt is identical.
 */
export function choiceOverlap(choice:LessonContentChoice,used:ReadonlySet<string>):string[]{
 return choice.claims.filter(id=>used.has(id));
}
export function chooseUnusedLessonContent(
 choices:readonly LessonContentChoice[],used:ReadonlySet<string>,
):{candidate:LessonContentChoice;reused:string[]}|undefined{
 if(!choices.length)return undefined;
 const scored=choices.map((candidate,i)=>({candidate,i,reused:choiceOverlap(candidate,used)}));
 // Compact word/pair banks leave unused approved material for another
 // instance later in the same booklet. For every other module retain the
 // authored/primary order when equally nonconflicting.
 const splitFriendly=['odd-words','checkboxes','match-words']
  .includes(choices[0].moduleId);
 scored.sort((a,b)=>a.reused.length-b.reused.length||
  (splitFriendly?a.candidate.claims.length-b.candidate.claims.length:0)||
  a.i-b.i);
 const best=scored[0];
 return {candidate:best.candidate,reused:best.reused};
}
