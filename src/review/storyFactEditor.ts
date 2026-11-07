import {editAt,type Lesson} from './model.ts';
import {validateModule} from '../modules.ts';

export type FactUse='sortStory'|'trueFalse'|'trueFalseMaze';
export type SelectedFact={
 factId:string;statement:string;isTrue:boolean;sourceIds?:string[];
 origin?:string;teacherReviewRequired?:boolean;source?:unknown;
 [key:string]:unknown;
};
export type FactIssue={index?:number;message:string};
export type StoryEvent={
 order:number;text:string;sourceIds?:string[];origin?:string;
 teacherReviewRequired?:boolean;source?:unknown;[key:string]:unknown;
};
const clone=<T,>(x:T):T=>structuredClone(x);
const maxFactChars=(kind:FactUse)=>kind==='trueFalse'?80:kind==='trueFalseMaze'?65:115;
const sortedEvents=(lesson:Lesson):StoryEvent[]=>{
 const records=lesson.preparedActivities?.storyOrder;
 if(records===undefined)return [];
 if(!Array.isArray(records))return [];
 return [...records].sort((a,b)=>Number(a.order)-Number(b.order));
};
export const storyEvents=(lesson:Lesson):StoryEvent[]=>sortedEvents(lesson);
const factsOf=(lesson:Lesson)=>Array.isArray(lesson.facts)?lesson.facts:[];
const factOf=(lesson:Lesson,id:string)=>factsOf(lesson).find((f:any)=>f.id===id);
const storyNotes=(lesson:Lesson)=>Array.isArray(lesson.storyNotes)?lesson.storyNotes:[];
const storyRecord=(lesson:Lesson):{next:Lesson;events:StoryEvent[]}=>{
 const next=clone(lesson);
 next.preparedActivities??={};
 if(next.preparedActivities.storyOrder===undefined)next.preparedActivities.storyOrder=[];
 if(!Array.isArray(next.preparedActivities.storyOrder))
  throw Error('Story Order is not an array. Use Advanced JSON for structural repairs.');
 next.preparedActivities.storyOrder.sort((a:StoryEvent,b:StoryEvent)=>a.order-b.order);
 return {next,events:next.preparedActivities.storyOrder};
};
const renumber=(events:StoryEvent[])=>events.forEach((item,i)=>{item.order=i+1;});

/** Validate printable Story Order content and chronology. Optional legacy
 * Story Note references are not part of the content-first approval contract.
 * Only the student worksheet shuffles the teacher-authored sequence.
 */
export function storyOrderIssues(lesson:Lesson):FactIssue[]{
 const events=storyEvents(lesson),issues:FactIssue[]=[];
 if(lesson.preparedActivities?.storyOrder!==undefined&&
  !Array.isArray(lesson.preparedActivities.storyOrder))
  issues.push({message:'Stored Story Order is not an array. Use Advanced JSON for this structural issue.'});
 if(events.length<5||events.length>8)
  issues.push({message:'Story Order needs 5–8 chronological events (currently '+events.length+').'});
 for(const [index,event] of events.entries()){
  if(event.order!==index+1)
   issues.push({index,message:'Event '+(index+1)+' needs sequential order '+(index+1)+'.'});
  if(!String(event.text??'').trim()||String(event.text).trim().length>115)
   issues.push({index,message:'Event '+(index+1)+' needs a sentence of 1–115 characters.'});
 }
 if(!issues.length)
  issues.push(...validateModule({type:'story-order',events:events.map(e=>e.text).join('\n'),seed:1})
   .map(message=>({message})));
 return issues;
}
export function editStoryEvent(lesson:Lesson,index:number,text:string):Lesson{
 const {next,events}=storyRecord(lesson);
 if(!events[index])throw Error('Story Order event no longer exists.');
 if(events[index].text===text)return next;
 // Preserve existing Draw the Story source-linked caption synchronization.
 const updated=editAt(next,['preparedActivities','storyOrder',index,'text'],text);
 updated.preparedActivities.storyOrder[index].origin='suggested';
 updated.preparedActivities.storyOrder[index].teacherReviewRequired=true;
 // Mark only captions actually synchronized by editAt as needing review.
 for(const [i,caption] of (updated.preparedActivities.drawStory??[]).entries()){
  if(caption.prompt!==(next.preparedActivities.drawStory??[])[i]?.prompt){
   caption.origin='suggested';
   caption.teacherReviewRequired=true;
  }
 }
 return updated;
}
/** Fix imported nonsequential numbering without changing event text,
 * source IDs or the author's existing visual row order.
 */
export function normalizeStoryEventNumbers(lesson:Lesson):Lesson{
 const {next,events}=storyRecord(lesson);
 for(const [index,event] of events.entries()){
  if(event.order!==index+1)event.teacherReviewRequired=true;
 }
 renumber(events);
 return next;
}
export function moveStoryEvent(lesson:Lesson,index:number,direction:-1|1):Lesson{
 const {next,events}=storyRecord(lesson),target=index+direction;
 if(index<0||index>=events.length||target<0||target>=events.length)
  throw Error('Cannot move this story event beyond the first or last row.');
 [events[index],events[target]]=[events[target],events[index]];
 // Chronology is an editorial decision even when the wording is unchanged.
 events[index].teacherReviewRequired=true;
 events[target].teacherReviewRequired=true;
 renumber(events);
 return next;
}
export function removeStoryEvent(lesson:Lesson,index:number):Lesson{
 const {next,events}=storyRecord(lesson);
 if(events.length<=5)throw Error('Story Order must retain at least five events.');
 if(index<0||index>=events.length)throw Error('Story Order event no longer exists.');
 events.splice(index,1);renumber(events);
 return next;
}
export function addStoryEventFromNote(lesson:Lesson,noteId:string):Lesson{
 const note=storyNotes(lesson).find((item:any)=>item.id===noteId);
 if(!note)throw Error('Choose an existing original Story Note.');
 const {next,events}=storyRecord(lesson);
 if(events.length>=8)throw Error('Story Order has a maximum of eight events.');
 events.push({order:events.length+1,text:String(note.originalText??''),
  sourceIds:[note.id],origin:'suggested',teacherReviewRequired:true});
 return next;
}
export function replaceStoryEventFromNote(lesson:Lesson,index:number,noteId:string):Lesson{
 const note=storyNotes(lesson).find((item:any)=>item.id===noteId);
 if(!note)throw Error('Choose an original Story Note.');
 const {next,events}=storyRecord(lesson);
 if(!events[index])throw Error('Story Order event no longer exists.');
 // The new sentence comes from a different source: never retain stale links.
 const event=events[index];
 // This is a *different* source note. Do not propagate the new wording into
 // drawing captions with references to the previous source.
 event.text=String(note.originalText??'');
 event.sourceIds=[note.id];
 event.origin='suggested';
 event.teacherReviewRequired=true;
 delete event.source;
 return next;
}

/** Canonical facts are the authoritative truth/wording records. All three
 * prepared modules are snapshots: changing selection must copy the original
 * fact ID, statement, truth value and provenance atomically.
 */
export function factBank(lesson:Lesson,kind:FactUse):SelectedFact[]|SelectedFact|undefined{
 const value=lesson.preparedActivities?.[kind];
 if(kind==='sortStory'){
  if(value===undefined)return [];
  return Array.isArray(value)?value:[];
 }
 return value;
}
export function sortSelections(lesson:Lesson):SelectedFact[]{
 return factBank(lesson,'sortStory') as SelectedFact[];
}
export function selectedFact(lesson:Lesson,kind:'trueFalse'|'trueFalseMaze'):SelectedFact|undefined{
 return factBank(lesson,kind) as SelectedFact|undefined;
}
export function factUsage(lesson:Lesson):Map<string,string[]>{
 const used=new Map<string,string[]>();
 const mark=(id:string|undefined,label:string)=>{
  if(!id)return;
  used.set(id,[...(used.get(id)??[]),label]);
 };
 for(const [index,item] of sortSelections(lesson).entries())mark(item?.factId,'Sort the Story #'+(index+1));
 for(const key of ['trueFalse','trueFalseMaze'] as const)
  mark(selectedFact(lesson,key)?.factId,key==='trueFalse'?'True/False':'True/False Maze');
 return used;
}
export const eligibleFacts=(lesson:Lesson,kind:FactUse)=>{
 const max=maxFactChars(kind);
 return factsOf(lesson).filter((f:any)=>String(f.statement??'').trim()&&
  String(f.statement).trim().length<=max);
};
const recordFromFact=(fact:any):SelectedFact=>{
 const out:SelectedFact={
  factId:fact.id,statement:fact.statement,isTrue:fact.isTrue,
  origin:fact.origin??'adapted',sourceIds:[...(fact.sourceIds??[])],
  teacherReviewRequired:fact.teacherReviewRequired===true||fact.origin==='suggested',
 };
 if(fact.source)out.source=clone(fact.source);
 return out;
};
/** Replace only one prepared selection; canonical lesson facts never change.
 * An old duplicate can be reselected to resync stale copied text, but newly
 * choosing a different ID may not introduce duplicate activity selections.
 */
export function selectFact(lesson:Lesson,kind:FactUse,factId:string,index?:number):Lesson{
 const fact=factOf(lesson,factId);
 if(!fact)throw Error('Select an existing canonical fact, not invented wording.');
 if(!eligibleFacts(lesson,kind).some((item:any)=>item.id===factId))
  throw Error('The fact is too long for this module.');
 const next=clone(lesson);
 next.preparedActivities??={};
 const selections=next.preparedActivities;
 if(kind==='sortStory'){
  if(selections.sortStory===undefined)selections.sortStory=[];
  if(!Array.isArray(selections.sortStory))throw Error('Sort the Story data must be an array.');
  const items:SelectedFact[]=selections.sortStory;
  if(index===undefined&&items.length>=8)throw Error('Sort the Story has a maximum of eight facts.');
  if(index!==undefined&&(index<0||index>=items.length))
   throw Error('This Sort the Story row no longer exists.');
  const current=index===undefined?undefined:items[index]?.factId;
  if(items.some((item,i)=>i!==index&&item.factId===factId))
   throw Error('That fact is already selected in Sort the Story.');
  if(current!==factId&&(['trueFalse','trueFalseMaze'] as const)
   .some(key=>selections[key]?.factId===factId))
   throw Error('That fact is already selected for a True/False activity.');
  if(index===undefined)items.push(recordFromFact(fact));
  else items[index]=recordFromFact(fact);
 }else{
  const current=selections[kind]?.factId;
  const other=kind==='trueFalse'?'trueFalseMaze':'trueFalse';
  if(current!==factId&&(selections[other]?.factId===factId||
   (selections.sortStory??[]).some((item:SelectedFact)=>item.factId===factId)))
   throw Error('That fact is already selected elsewhere in this booklet.');
  selections[kind]=recordFromFact(fact);
 }
 return next;
}

/** A fact may be moved, not copied, from Sort the Story if its old puzzle
 * remains 4–8 facts with at least one TRUE and one FALSE.
 */
export function movableSortFacts(lesson:Lesson,kind:'trueFalse'|'trueFalseMaze'){
 const choices=eligibleFacts(lesson,kind);
 const rows=sortSelections(lesson);
 const other=kind==='trueFalse'?'trueFalseMaze':'trueFalse';
 const otherId=selectedFact(lesson,other)?.factId;
 return choices.filter((fact:any)=>{
  if(fact.id===otherId)return false;
  const index=rows.findIndex(row=>row.factId===fact.id);
  if(index<0||rows.length<=4)return false;
  const remaining=rows.filter((_,i)=>i!==index);
  return remaining.some(row=>row.isTrue===true)&&
   remaining.some(row=>row.isTrue===false);
 });
}
export function moveSortFactToChoice(
 lesson:Lesson,kind:'trueFalse'|'trueFalseMaze',factId:string,
):Lesson{
 if(!movableSortFacts(lesson,kind).some((f:any)=>f.id===factId))
  throw Error('Moving this fact would leave Sort the Story invalid or reuse another activity’s selection.');
 const next=clone(lesson);
 next.preparedActivities.sortStory=sortSelections(next).filter(item=>item.factId!==factId);
 return selectFact(next,kind,factId);
}

/** Create a *new* canonical, teacher-review-required adaptation. Never
 * overwrite the source fact, change its truth, or invent a citation. The
 * original fact ID is retained as an explicit editorial lineage link.
 */
export function createAdaptedFact(
 lesson:Lesson,kind:'trueFalse'|'trueFalseMaze',
 sourceFactId:string,statement:string,
):Lesson{
 const source=factOf(lesson,sourceFactId);
 if(!source)throw Error('Select a real canonical fact as the source of the adaptation.');
 if(typeof source.isTrue!=='boolean')throw Error('The source fact must have a verified TRUE/FALSE answer.');
 const text=statement.trim(),limit=maxFactChars(kind);
 if(!text||text.length>limit)
  throw Error('Enter a shorter statement of 1–'+limit+' characters.');
 if(text===String(source.statement).trim())
  throw Error('This is the original wording. Select or move the existing fact instead.');
 if(factsOf(lesson).some((f:any)=>
  String(f.statement).trim().toLocaleLowerCase('en')===text.toLocaleLowerCase('en')))
  throw Error('That exact statement is already in the canonical fact pool.');
 const module:Parameters<typeof validateModule>[0]=kind==='trueFalse'
  ?{type:'true-false',statement:text}
  :{type:'true-false-maze',statement:text,answer:source.isTrue,seed:1};
 const problems=validateModule(module);
 if(problems.length)throw Error('Shortened statement cannot print: '+problems.join(' '));
 const next=clone(lesson);
 if(!Array.isArray(next.facts))next.facts=[];
 let n=1,id='';
 do{id='tf-review-'+String(n++).padStart(2,'0');}
 while(next.facts.some((f:any)=>f.id===id));
 const adapted:any={id,statement:text,isTrue:source.isTrue,
  origin:source.origin==='suggested'?'suggested':'adapted',
  teacherReviewRequired:true,adaptedFromFactId:sourceFactId};
 if(Array.isArray(source.sourceIds))adapted.sourceIds=[...source.sourceIds];
 if(source.source)adapted.source=clone(source.source);
 next.facts.push(adapted);
 next.preparedActivities??={};
 next.preparedActivities[kind]=recordFromFact(adapted);
 return next;
}

export function removeSortFact(lesson:Lesson,index:number):Lesson{
 const next=clone(lesson),items=sortSelections(next);
 if(items.length<=4)throw Error('Sort the Story needs at least four facts.');
 if(index<0||index>=items.length)throw Error('This Sort the Story row no longer exists.');
 items.splice(index,1);
 return next;
}
export function moveSortFact(lesson:Lesson,index:number,direction:-1|1):Lesson{
 const next=clone(lesson),items=sortSelections(next),target=index+direction;
 if(index<0||index>=items.length||target<0||target>=items.length)
  throw Error('Cannot move this fact beyond the first or last row.');
 [items[index],items[target]]=[items[target],items[index]];
 return next;
}
export function suggestUnusedFact(lesson:Lesson,kind:FactUse,index?:number):string|undefined{
 const rows=kind==='sortStory'?sortSelections(lesson):[];
 const current=kind==='sortStory'?rows[index??-1]?.factId:
  selectedFact(lesson,kind as 'trueFalse'|'trueFalseMaze')?.factId;
 const used=factUsage(lesson);
 const candidates=eligibleFacts(lesson,kind).filter((fact:any)=>
  fact.id!==current&&!used.has(fact.id));
 if(kind==='sortStory'){
  const others=rows.filter((_,i)=>i!==index),trues=others.filter(x=>x.isTrue).length;
  const falses=others.length-trues;
  candidates.sort((a:any,b:any)=>{
   const desired=trues<=falses;
   return Number(b.isTrue===desired)-Number(a.isTrue===desired);
  });
 }
 return candidates[0]?.id;
}
export function factSelectionIssues(lesson:Lesson,kind:FactUse):FactIssue[]{
 const items=kind==='sortStory'?sortSelections(lesson):
  [selectedFact(lesson,kind as 'trueFalse'|'trueFalseMaze')];
 const issues:FactIssue[]=[];
 if(kind==='sortStory'&&lesson.preparedActivities?.sortStory!==undefined&&
  !Array.isArray(lesson.preparedActivities.sortStory))
  issues.push({message:'Stored Sort the Story data is not an array. Use Advanced JSON for this structural issue.'});
 if(kind==='sortStory'&&(items.length<4||items.length>8))
  issues.push({message:'Sort the Story needs 4–8 canonical facts (currently '+items.length+').'});
 const seen=new Set<string>();
 for(const [index,item] of items.entries()){
  if(!item||!item.factId){issues.push({index,message:'Select a canonical fact.'});continue;}
  const canonical=factOf(lesson,item.factId);
  if(!canonical){issues.push({index,message:'Unknown canonical fact '+item.factId+'.'});continue;}
  if(item.statement!==canonical.statement||item.isTrue!==canonical.isTrue)
   issues.push({index,message:'Selection '+(index+1)+' differs from canonical fact '+item.factId+
    '. Re-select it to restore the correct words and answer.'});
  if(String(canonical.statement).trim().length>maxFactChars(kind))
   issues.push({index,message:'Fact '+item.factId+' exceeds this activity’s '+maxFactChars(kind)+'-character limit.'});
  if(seen.has(item.factId))issues.push({index,message:'Fact '+item.factId+' is selected more than once.'});
  seen.add(item.factId);
 }
 if(kind==='sortStory'&&items.length&&
  (!items.some(item=>item?.isTrue===true)||!items.some(item=>item?.isTrue===false)))
  issues.push({message:'Sort the Story needs at least one TRUE fact and one FALSE fact.'});
 return issues;
}
