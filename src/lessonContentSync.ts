import type {StoredDraft} from './draftMigration.ts';
import {BIG_IDEA_MAX_CHARACTERS,MEMORY_VERSE_MAX_CHARACTERS} from './lessonContentLimits.ts';
import type {ActivityModule,ModuleAssignments,ModuleId} from './modules.ts';
import {validateModule} from './modules.ts';
import {linkedContentKind,readActivityContentLinks,type ActivityContentLinks,
 type LessonContentKind} from './lessonContentLinks.ts';
import {sameActivityContent} from './curriculumEditor.ts';
import {parseVerse} from './storyVerseModules.ts';
import {markSelectedWords,wordSpans} from './review/bsb.ts';
import {generateCryptogram} from './cryptograms.ts';
import {planVerseCryptogram} from './verseCryptogramLayout.ts';
import {planBigIdeaCryptogram} from './bigIdeaCryptogramLayout.ts';
import {planFinishVerse} from './finishVerseLayout.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from './verseReconstructionLayout.ts';
import {planConnectVerse} from './connectVerseLayout.ts';
import {planConnectBigIdea} from './connectBigIdeaLayout.ts';
import type {MeasureText} from './mediumParityLayout.ts';

export type LessonContentChange=
 |{kind:'bigIdea';text:string}
 |{kind:'memoryVerse';reference:string;text:string;translation?:string|null};
export type CustomizedContentPolicy='block'|'replace'|'keep';
export type LinkedModuleConflict={slot:string;moduleType:ModuleId;message:string};
export type LinkedModuleIssue={slot?:string;moduleType?:ModuleId;message:string};

/** Widths must match the fonts embedded in the actual PDF. The editor obtains
 * them from mediumWidths(): title, finishBody, puzzlePdf, bank and boldPdf.
 * Callers must wait for these before allowing any printable change to commit.
 */
export type LessonContentPrintMetrics={
 title:MeasureText;body:MeasureText;puzzle:MeasureText;bank:MeasureText;
 subtitle:MeasureText;bankInkCenter?:(text:string,size:number)=>number;
};
export type LessonContentPlan={
 kind:LessonContentKind;
 /** All targeted activity slots. Unlinked story-event puzzles are excluded. */
 linkedSlots:string[];
 updatedSlots:string[];
 preservedSlots:string[];
 conflicts:LinkedModuleConflict[];
 issues:LinkedModuleIssue[];
 /** Only exists if all required validation, fitting and conflicts succeed. */
 updatedDraft?:StoredDraft;
};
export type PlanContentOptions={
 customized?:CustomizedContentPolicy;
 /** Missing measurements fail closed for modules with a measured print scene. */
 print?:LessonContentPrintMetrics;
};

function sourceVerse(module:ActivityModule):string|null{
 if(module.type==='finish-verse'||module.type==='unscramble-verse'){
  const parsed=parseVerse(module.verse);
  return parsed.malformed?null:module.verse.replace(/\[([^\[\]]*)\]/gu,'$1');
 }
 if(linkedContentKind(module)==='memoryVerse'&&'verse' in module)
  return module.verse;
 return null;
}

/** Match *exact* text, not merely a module's type. Approved alternative story
 * phrases stay independent of the Big Idea unless they really use its text.
 */
export function contentLinkForModule(
 module:ActivityModule,
 source:Pick<StoredDraft,'bigIdea'|'verseReference'|'verseText'>,
):LessonContentKind|null{
 const kind=linkedContentKind(module);
 if(kind==='bigIdea'&&'idea' in module)
  return source.bigIdea.trim()&&module.idea===source.bigIdea?'bigIdea':null;
 if(kind==='memoryVerse'&&'verse' in module){
  const sameText=sourceVerse(module)===source.verseText;
  const sameReference=!('reference' in module)||module.reference===source.verseReference;
  return source.verseText.trim()&&sameText&&sameReference?'memoryVerse':null;
 }
 return null;
}

/** New presets write links explicitly. Legacy drafts infer links only from
 * exact content or a matching original activity snapshot. A historical
 * manually chosen phrase that differs from the main idea is never linked.
 */
export function inferActivityContentLinks(
 draft:Pick<StoredDraft,'modules'|'activityDefaults'|'activityContentLinks'|
  'bigIdea'|'verseReference'|'verseText'>,
):ActivityContentLinks{
 const links=readActivityContentLinks(draft.activityContentLinks,draft.modules);
 for(const [slot,module] of Object.entries(draft.modules)){
  if(links[slot])continue;
  const direct=contentLinkForModule(module,draft);
  const baseline=draft.activityDefaults?.[slot];
  const historical=baseline?.type===module.type?contentLinkForModule(baseline,draft):null;
  if(direct||historical)links[slot]=direct??historical!;
 }
 return links;
}

/** Seed-only regeneration is not a content edit: keep the chosen cipher key,
 * shuffle and scatter positions while changing the shared phrase.
 * Edits to text, bracketed blanks or reference remain protected.
 */
function customizedModule(draft:StoredDraft,slot:string,kind:LessonContentKind):boolean{
 const current=draft.modules[slot],baseline=draft.activityDefaults?.[slot];
 if(!current||linkedContentKind(current)!==kind)return true;
 if(!baseline)return contentLinkForModule(current,draft)!==kind;
 if(baseline.type!==current.type)return true;
 const withoutSeed=(value:ActivityModule):Record<string,unknown>=>{
  const clone={...value} as Record<string,unknown>;
  delete clone.seed;
  return clone;
 };
 return !sameActivityContent(withoutSeed(current),withoutSeed(baseline));
}

/** Choose the same number of missing words where feasible, spread across the
 * replacement verse. No punctuation is invented or removed from source text.
 * A verse without enough eligible words is rejected instead of producing a
 * broken word bank or scrambled puzzle.
 */
function markedReplacement(module:Extract<ActivityModule,
 {type:'finish-verse'|'unscramble-verse'}>,verse:string):string{
 const original=sourceVerse(module);
 if(original===verse)return module.verse;
 const minimum=module.type==='finish-verse'?2:4;
 const currentCount=parseVerse(module.verse).answers.length;
 const desired=Math.max(minimum,Math.min(8,currentCount||minimum));
 const words=wordSpans(verse);
 const eligible=words.flatMap((item,i)=>/^[A-Za-z]{3,9}$/u.test(item.word)?[i]:[]);
 if(eligible.length<minimum)throw Error(
  'This activity needs at least '+minimum+' distinct 3–9-letter words to hide. Choose a longer verse or excerpt.');
 const count=Math.min(desired,eligible.length);
 const positions=Array.from({length:count},(_,i)=>
  eligible[Math.floor((i+.5)*eligible.length/count)]);
 return markSelectedWords(verse,positions);
}

function replacedModule(module:ActivityModule,change:LessonContentChange):ActivityModule{
 if(change.kind==='bigIdea'){
  if(module.type==='big-idea-cryptogram'||module.type==='connect-big-idea')
   return {...module,idea:change.text.trim()};
  throw Error('A non-Big-Idea activity was incorrectly linked.');
 }
 const verse=change.text.trim(),reference=change.reference.trim();
 switch(module.type){
  case 'first-letters':
  case 'verse-cryptogram':
  case 'upside-down-verse':
  case 'spiral-verse':
   return {...module,verse,reference};
  case 'connect-verse':
   return {...module,verse};
  case 'finish-verse':
  case 'unscramble-verse':
   return {...module,verse:markedReplacement(module,verse),reference};
  default:throw Error('A non-verse activity was incorrectly linked.');
 }
}

function requiresPrintMeasurements(module:ActivityModule):boolean{
 switch(module.type){
  case 'verse-cryptogram':
  case 'big-idea-cryptogram':
  case 'finish-verse':
  case 'unscramble-verse':
  case 'upside-down-verse':
  case 'connect-verse':
  case 'connect-big-idea':return true;
  default:return false;
 }
}

/** PDF-measured print plans, not a guessed universal character limit.
 * Validator constraints remain authoritative for the First Letters and
 * Spiral Verse modules that use their own fixed-format output.
 */
function fitsPrint(module:ActivityModule,m:LessonContentPrintMetrics):boolean{
 switch(module.type){
  case 'verse-cryptogram':
   return !!planVerseCryptogram(generateCryptogram(module),m.body);
  case 'big-idea-cryptogram':
   return !!planBigIdeaCryptogram(generateCryptogram(module),m.body);
  case 'finish-verse':
   return !!planFinishVerse(module,{
    title:m.title,body:m.body,bank:m.bank,bankInkCenter:m.bankInkCenter,
   });
  case 'unscramble-verse':
   return !!planUnscrambleVerse(module,{title:m.title,body:m.body,puzzle:m.puzzle});
  case 'upside-down-verse':
   return !!planUpsideDownVerse(module,{title:m.title,body:m.body,puzzle:m.puzzle});
  case 'connect-verse':
   return !!planConnectVerse(module,{puzzle:m.puzzle,verse:m.body,subtitle:m.subtitle});
  case 'connect-big-idea':
   return !!planConnectBigIdea(module,{puzzle:m.puzzle,bank:m.body,subtitle:m.subtitle});
  default:return true;
 }
}

/** Pure, atomic preview. No existing draft, approved source, or puzzle is
 * mutated. The future Lesson Details dialog must confirm this plan before
 * committing updatedDraft to React state.
 *
 * block (default): show all edited-activity conflicts and commit nothing.
 * replace: explicitly discard edited linked content (retain shuffle seeds).
 * keep: explicitly detach edited activities, leaving their own text intact.
 */
export function planLessonContentChange(
 draft:StoredDraft,change:LessonContentChange,
 options:PlanContentOptions={},
):LessonContentPlan{
 const kind=change.kind,issues:LinkedModuleIssue[]=[];
 const conflicts:LinkedModuleConflict[]=[];
 const linkedSlots:string[]=[],updatedSlots:string[]=[],preservedSlots:string[]=[];
 const text=change.text.trim();
 if(!text)issues.push({message:kind==='bigIdea'
  ?'Enter a Big Idea before applying.' :'Enter a Memory Verse before applying.'});
 if(kind==='bigIdea'&&text.length>BIG_IDEA_MAX_CHARACTERS)
  issues.push({message:'Keep the Big Idea at '+BIG_IDEA_MAX_CHARACTERS+' characters or fewer.'});
 if(change.kind==='memoryVerse'){
  if(!change.reference.trim()||change.reference.trim().length>120)
   issues.push({message:'Enter a Memory Verse reference of 1–120 characters.'});
  if(text.length>MEMORY_VERSE_MAX_CHARACTERS)
   issues.push({message:'Keep the Memory Verse at '+MEMORY_VERSE_MAX_CHARACTERS+' characters or fewer.'});
  if(change.translation!==undefined&&change.translation!==null&&change.translation.trim().length>80)
   issues.push({message:'Keep the translation label at 80 characters or fewer.'});
 }
 const links=inferActivityContentLinks(draft);
 const modules:ModuleAssignments={...draft.modules};
 const defaults:ModuleAssignments={...draft.activityDefaults};
 const nextLinks:ActivityContentLinks={...links};
 const policy=options.customized??'block';
 for(const slot of Object.keys(links).sort()){
  if(links[slot]!==kind)continue;
  const module=draft.modules[slot];
  if(!module)continue;
  linkedSlots.push(slot);
  if(customizedModule(draft,slot,kind)){
   conflicts.push({slot,moduleType:module.type,
    message:'This activity was edited separately from the lesson. Replace its edits or keep it independent.'});
   if(policy==='keep'){
    nextLinks[slot]='independent';
    preservedSlots.push(slot);
   }
   if(policy!=='replace')continue;
  }
  try{
   const updated=replacedModule(module,change);
   const errors=validateModule(updated);
   if(errors.length){
    issues.push(...errors.map(message=>({slot,moduleType:module.type,message})));
    continue;
   }
   if(requiresPrintMeasurements(updated)){
    if(!options.print){
     issues.push({slot,moduleType:module.type,
      message:'Print font measurements are needed before this activity can be safely updated.'});
     continue;
    }
    if(!fitsPrint(updated,options.print)){
     issues.push({slot,moduleType:module.type,
      message:'The selected text does not fit this activity’s printable area. Choose a shorter verse or phrase.'});
     continue;
    }
   }
   modules[slot]=updated;
   defaults[slot]=structuredClone(updated);
   updatedSlots.push(slot);
  }catch(error){
   issues.push({slot,moduleType:module.type,
    message:error instanceof Error?error.message:'Could not regenerate the activity.'});
  }
 }
 const blockingConflicts=policy==='block'&&conflicts.length>0;
 if(issues.length||blockingConflicts)return {
  kind,linkedSlots,updatedSlots:[],preservedSlots:[],conflicts,issues,
 };
 const updatedDraft:StoredDraft={...draft,modules};
 // Do not leave optional keys set to undefined. localStorage JSON omits them,
 // and Build My Own drafts should round-trip without changing their shape.
 if(Object.keys(defaults).length)updatedDraft.activityDefaults=defaults;
 else delete updatedDraft.activityDefaults;
 if(Object.keys(nextLinks).length)updatedDraft.activityContentLinks=nextLinks;
 else delete updatedDraft.activityContentLinks;
 if(change.kind==='bigIdea')updatedDraft.bigIdea=text;
 else{
  updatedDraft.verseReference=change.reference.trim();
  updatedDraft.verseText=text;
  if(change.translation===null)delete updatedDraft.verseTranslation;
  else if(change.translation!==undefined)
   updatedDraft.verseTranslation=change.translation.trim()||undefined;
 }
 return {kind,linkedSlots,updatedSlots,preservedSlots,conflicts,issues,updatedDraft};
}

export function applyLessonContentChange(plan:LessonContentPlan):StoredDraft{
 if(!plan.updatedDraft)throw Error('Resolve all activity conflicts and print-fitting errors before applying lesson content.');
 return plan.updatedDraft;
}
