import {useEffect,useMemo,useState} from 'react';
import type {ChangeEvent} from 'react';
import {parseBsbText,getBsbPassage,wordSpans,clipToWords,markSelectedWords,type BsbIndex,type Passage} from './bsb.ts';
import {applyBsbVerse,chooseSolveCodePhrase,createApprovedLesson,editAt,listReviewTasks,normalizeLegacySmallDrawingScenes,originalMemoryVerseTranslation,solveCodeChoices,useMatchingStoryOrderCaptions,type Lesson,type ReviewTask} from './model.ts';
import {validateModule,MODULES} from '../modules.ts';
import {MatchingPrintPreview} from '../MediumPrintPreview.tsx';
import {addMatchingPair,editMatchingPair,matchingPairIssues,moveMatchingPair,removeMatchingPair} from './matchingWords.ts';
import ConnectPhraseReviewEditor from './ConnectPhraseReviewEditor.tsx';
import WordSearchReviewEditor from './WordSearchReviewEditor.tsx';
import CrosswordReviewEditor from './CrosswordReviewEditor.tsx';
import StoryOrderReviewEditor from './StoryOrderReviewEditor.tsx';
import SortStoryReviewEditor from './SortStoryReviewEditor.tsx';
import FactChoiceReviewEditor from './FactChoiceReviewEditor.tsx';
import WhoAmIReviewEditor from './WhoAmIReviewEditor.tsx';
import UnscrambleReviewEditor from './UnscrambleReviewEditor.tsx';
import PixelPictureReviewEditor from './PixelPictureReviewEditor.tsx';
import FinishStoryReviewEditor from './FinishStoryReviewEditor.tsx';
import LessonIntegrityReviewEditor from './LessonIntegrityReviewEditor.tsx';
import MultipleChoiceBankReviewEditor from './MultipleChoiceBankReviewEditor.tsx';
import {MODULE_REPAIR_REGISTRY} from './repairRegistry.ts';
import {cryptogramLetters} from '../cryptograms.ts';
import {buildReviewPreflight,PREPARED_ACTIVITY_KEYS,reviewIssueTarget,type ReviewPreflight} from './preflight.ts';
import './review.css';

const SAVE_KEY='worksheet-studio:review-workbench:v1';
function downloadJson(name:string,value:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
type Saved={lesson:Lesson;reviewed:string[];selectedId:string};
function initialSaved():Saved|null {
 try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;
 const parsed=JSON.parse(raw);
 if(parsed?.lesson?.schemaVersion===1&&parsed.lesson.id&&Array.isArray(parsed.reviewed))return parsed;
 }catch{return null;}
 return null;
}
const displayDate=()=>new Date().toISOString().slice(0,10);
type WordBankKind='oddWords'|'checkboxes';
function wordBankText(lesson:Lesson|null,kind:WordBankKind):string{
 const field=kind==='oddWords'?'unrelated':'incorrect';
 const words=lesson?.preparedActivities?.[kind]?.[field];
 return Array.isArray(words)?words.join('\n'):'';
}


function SourceContext({lesson,ids=[],questionIds=[]}:{lesson:Lesson;ids?:string[];questionIds?:string[]}){
 const notes=(lesson.storyNotes??[]).filter((n:any)=>ids.includes(n.id));
 const questions=(lesson.questions??[]).filter((q:any)=>questionIds.includes(q.id));
 if(!notes.length&&!questions.length)return null;
 return <details className="review-sources"><summary>Compare with my original curriculum ({notes.length+questions.length} source items)</summary>
  {questions.map((q:any)=><blockquote key={q.id}><small>{q.id} · {q.source?.section??'Question'}</small><p>{q.question}</p><p><strong>Answer:</strong> {q.answer}</p></blockquote>)}
  {notes.map((n:any)=><blockquote key={n.id}><small>{n.id} · Story Note {n.order} · page {n.source?.page??'?'}</small><p>{n.originalText}</p></blockquote>)}
 </details>;
}
export default function ReviewApp(){
 const [saved]=useState(initialSaved);
 const [lesson,setLesson]=useState<Lesson|null>(saved?.lesson??null);
 // Keep the raw textarea value (including trailing Enter/newlines) separate
 // from the normalized word array stored in the curriculum JSON.
 const [wordBankDrafts,setWordBankDrafts]=useState(()=>({
  oddWords:wordBankText(saved?.lesson??null,'oddWords'),
  checkboxes:wordBankText(saved?.lesson??null,'checkboxes'),
 }));
 const [reviewed,setReviewed]=useState<string[]>(saved?.reviewed??[]);
 const [bulkReviewAcknowledged,setBulkReviewAcknowledged]=useState(false);
 const [bulkReviewNotice,setBulkReviewNotice]=useState('');
 const [selectedId,setSelectedId]=useState<string>(saved?.selectedId??'');
 const [error,setError]=useState('');
 const [index,setIndex]=useState<BsbIndex|null>(null);
 const [bibleError,setBibleError]=useState('');
 const [reference,setReference]=useState(saved?.lesson?.lessonDetails?.memoryVerse?.reference??'Exodus 15:11');
 const [passage,setPassage]=useState<Passage|null>(null);
 const [start,setStart]=useState(0);
 const [end,setEnd]=useState(0);
 const [finish,setFinish]=useState<number[]>([]);
 const [unscramble,setUnscramble]=useState<number[]>([]);
 const [displayReference,setDisplayReference]=useState('');
 const [preflight,setPreflight]=useState<ReviewPreflight|null>(null);
 const [focusIssueField,setFocusIssueField]=useState<string|null>(null);
 // Preserve the last conflict explanation while editing invalidates preflight.
 const [repairConflictWords,setRepairConflictWords]=useState<string[]>([]);
 const [moduleEditorText,setModuleEditorText]=useState('');
 const [reviewer,setReviewer]=useState('');
 const [signDate,setSignDate]=useState(displayDate);
 const [rightsConfirmed,setRightsConfirmed]=useState(false);
 const tasks=useMemo(()=>lesson?listReviewTasks(lesson):[],[lesson]);
 const diagnosticTasks=useMemo<ReviewTask[]>(()=>{
  if(!preflight)return [];
  const existing=new Set(tasks.map(t=>t.id)),extra=new Set<string>();
  return preflight.issues.flatMap(issue=>{
   if(existing.has(issue.taskId)||extra.has(issue.taskId))return [];
   extra.add(issue.taskId);
   return [{
    id:issue.taskId,group:'Preflight repairs',
    label:issue.label==='Review content'?'Other lesson issue':issue.label,
    detail:'Fix this activity’s prepared lesson data, then run preflight again.',
   }];
  });
 },[preflight,tasks]);
 const active=[...tasks,...diagnosticTasks].find(t=>t.id===selectedId)??
  tasks.find(t=>!t.optional&&!reviewed.includes(t.id))??tasks[0]??diagnosticTasks[0];
 const activeModuleId=active?.id.startsWith('module:')?active.id.slice('module:'.length):
  active?.id==='match-words'?'match-words':
  active?.id==='crossword'?'crossword':
  active?.id==='multiple-choice-bank'?'multiple-choice':
  (['story-order','sort-story','true-false','true-false-maze',
    'who-am-i','unscramble-words','pixel-picture','finish-story'].includes(active?.id??'')
   ?active!.id:null);
 const activePreparedKey=activeModuleId?PREPARED_ACTIVITY_KEYS[activeModuleId as keyof typeof PREPARED_ACTIVITY_KEYS]:undefined;
 useEffect(()=>{
  if(!lesson||!activePreparedKey)return;
  setModuleEditorText(JSON.stringify(lesson.preparedActivities?.[activePreparedKey]??null,null,2));
 },[activePreparedKey,lesson?.id]);
 useEffect(()=>{
  if(!focusIssueField)return;
  const target=document.getElementById(focusIssueField);
  if(target){
   target.scrollIntoView({behavior:'smooth',block:'center'});
   target.focus({preventScroll:true});
  }
  setFocusIssueField(null);
 },[active?.id,focusIssueField]);
 const requiredTasks=tasks.filter(t=>!t.optional);
 const complete=requiredTasks.filter(t=>reviewed.includes(t.id)).length;
 const remaining=requiredTasks.length-complete;
 useEffect(()=>{
  if(!lesson)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({lesson,reviewed,selectedId}));}catch{ /* browser storage unavailable */ }
 },[lesson,reviewed,selectedId]);
 useEffect(()=>{
  let cancelled=false;
  fetch(import.meta.env.BASE_URL+'review/bsb.txt')
   .then(r=>{if(!r.ok)throw Error('The deployed BSB file is unavailable.');return r.text();})
   .then(text=>{if(!cancelled){setIndex(parseBsbText(text));setBibleError('');}})
   .catch(e=>{if(!cancelled)setBibleError(String(e?.message??e));});
  return ()=>{cancelled=true;};
 },[]);
 function acceptLesson(value:any){
  const data=value?.lesson?.schemaVersion===1?value.lesson:value;
  if(data?.schemaVersion!==1||typeof data.id!=='string'||!data.preparedActivities||!data.lessonDetails?.memoryVerse||!Array.isArray(data.reviewFlags))
   throw Error('This is not a supported curriculum schema-v1 lesson or review session.');
  if(lesson&&!window.confirm('Load another lesson? Current edits will be replaced. Export your review session first if you need to keep it.'))return;
  setLesson(data);
  setWordBankDrafts({
   oddWords:wordBankText(data,'oddWords'),
   checkboxes:wordBankText(data,'checkboxes'),
  });
  setReviewed(value?.lesson?.schemaVersion===1&&Array.isArray(value.reviewed)?value.reviewed:[]);
  setBulkReviewAcknowledged(false);setBulkReviewNotice('');
  setSelectedId(value?.lesson?.schemaVersion===1&&typeof value.selectedId==='string'?value.selectedId:'');
  setReference(data.lessonDetails.memoryVerse.reference);
  // Rights confirmation is an explicit decision for THIS lesson and THIS
  // exact chosen BSB excerpt, never inherited from a prior review.
  setRightsConfirmed(false);
  setPassage(null);setPreflight(null);setRepairConflictWords([]);setError('');
 }
 async function loadLesson(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  try{acceptLesson(JSON.parse(await file.text()));}
  catch(e){setError('Could not load lesson: '+String((e as Error).message??e));}
  e.target.value='';
 }
 async function loadRedSea(){
  try{
   // Once a curriculum is approved its review-stage JSON is removed to
   // prevent duplicate IDs. Prefer the signed-off version, but allow
   // loading the original review-stage version before first publication.
   const root='https://raw.githubusercontent.com/andydoane/worksheet-generator/main/curriculum/';
   const paths=[
    'approved/ot-031-god-parts-the-red-sea.lesson.json',
    'review/ot-031-god-parts-the-red-sea.json',
   ];
   let data:unknown=null;
   for(const path of paths){
    const response=await fetch(root+path,{cache:'no-store'});
    if(response.ok){data=await response.json();break;}
   }
   if(!data)throw Error('Neither approved nor review-stage Red Sea JSON could be fetched.');
   acceptLesson(data);
  }catch(e){setError('Could not fetch lesson from GitHub. Use file upload instead. '+String((e as Error).message??e));}
 }
 async function loadBsb(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  try{setIndex(parseBsbText(await file.text()));setBibleError('');}
  catch(e){setBibleError(String((e as Error).message??e));}
  e.target.value='';
 }
 function change(path:(string|number)[],value:string){
  if(!lesson)return;
  try{
   setLesson(editAt(lesson,path,value));setPreflight(null);
   setReviewed(prev=>prev.filter(x=>x!==active?.id));setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function changeWordList(key:WordBankKind,field:'unrelated'|'incorrect',value:string){
  if(!lesson)return;
  // A trailing Enter must stay visible until the teacher types the next word.
  setWordBankDrafts(previous=>({...previous,[key]:value}));
  const next=structuredClone(lesson);
  next.preparedActivities[key][field]=value.split(/\r?\n/u).map(x=>x.trim()).filter(Boolean);
  setLesson(next);setPreflight(null);setReviewed(prev=>prev.filter(x=>x!==active?.id));
 }
 function applyVisualReview(next:Lesson){
  setLesson(next);setPreflight(null);
  setReviewed(previous=>previous.filter(id=>id!==active?.id));
  setError('');
 }
 function applyMultipleChoiceBankReview(next:Lesson){
  setModuleEditorText(JSON.stringify(next.preparedActivities?.multipleChoice??[],null,2));
  setLesson(next);setPreflight(null);setError('');
  setReviewed(previous=>previous.filter(id=>!id.startsWith('mc:')));
 }
 function applyIntegrityReview(next:Lesson){
  setLesson(next);setPreflight(null);setError('');
  // Source-link edits can affect the provenance of multiple activities.
  // Never carry over all previous teacher checkmarks after source repairs.
  if(active?.id==='lesson-sources')setReviewed([]);
  else setReviewed(previous=>previous.filter(id=>id!==active?.id));
  if(active?.id==='lesson-sources')setRightsConfirmed(false);
 }
 function applyStoryFactReview(next:Lesson){
  if(activePreparedKey)
   setModuleEditorText(JSON.stringify(next.preparedActivities?.[activePreparedKey]??null,null,2));
  applyVisualReview(next);
 }
 function applyCrosswordReview(next:Lesson){
  setModuleEditorText(JSON.stringify(next.preparedActivities?.crossword??[],null,2));
  applyVisualReview(next);
 }
 function changeMatching(action:()=>Lesson){
  if(!lesson)return;
  try{
   const next=action();
   setLesson(next);
   setModuleEditorText(JSON.stringify(next.preparedActivities?.matchWords??[],null,2));
   setPreflight(null);
   setReviewed(previous=>previous.filter(id=>id!=='match-words'));
   setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function deleteMatching(index:number){
  if(!lesson)return;
  const pair=lesson.preparedActivities?.matchWords?.[index];
  if(!window.confirm('Remove matching pair '+(index+1)+
   (pair?.left?' ('+pair.left+')':'')+'? You can restore it from an exported review session.'))return;
  changeMatching(()=>removeMatchingPair(lesson,index));
 }
 function updateDrawingCopy(mode:'small'|'large'){
  if(!lesson)return;
  try{
   const next=mode==='small'?normalizeLegacySmallDrawingScenes(lesson):
    useMatchingStoryOrderCaptions(lesson);
   setLesson(next);
   setPreflight(null);
   setReviewed(previous=>previous.filter(id=>id!=='drawing-captions'));
   setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function changeIdea(value:string){
  if(!lesson)return;
  const next=structuredClone(lesson);
  const previous=next.lessonDetails.bigIdeas[0].text;
  next.lessonDetails.bigIdeas[0].text=value;
  // Preserve independently chosen, reviewed alternative phrases. Only a
  // puzzle still using the old canonical text follows the wording edit.
  if(next.preparedActivities.bigIdeaCryptogram?.phrase===previous)
   next.preparedActivities.bigIdeaCryptogram.phrase=value;
  if(next.preparedActivities.connectBigIdea?.phrase===previous)
   next.preparedActivities.connectBigIdea.phrase=value;
  setLesson(next);setPreflight(null);setReviewed(prev=>prev.filter(x=>x!==active?.id));
 }
 function selectCodePhrase(text:string){
  if(!lesson||!text)return;
  try{
   setLesson(chooseSolveCodePhrase(lesson,text));
   setPreflight(null);setReviewed(prev=>prev.filter(id=>id!=='solve-code'));
   setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function addProposedCodePhrase(){
  if(!lesson)return;
  const phrase=String(lesson.preparedActivities?.bigIdeaCryptogram?.phrase??'').trim();
  const errors=validateModule({type:'big-idea-cryptogram',idea:phrase,seed:1});
  if(errors.length){setError(errors.join(' '));return;}
  if(solveCodeChoices(lesson).some(item=>item.text===phrase)){
   selectCodePhrase(phrase);return;
  }
  const next=structuredClone(lesson);
  const existing=new Set((next.keyPhrases??[]).map((item:any)=>item.id));
  let i=1;
  while(existing.has('kp-review-'+i))i++;
  const id='kp-review-'+i;
  // This is a NEW teacher-suggested alternative, never misattributed to the
  // author's source text or silently marked approved.
  next.keyPhrases??=[];
  next.keyPhrases.push({id,text:phrase,origin:'suggested',
   teacherReviewRequired:true});
  const item=next.preparedActivities.bigIdeaCryptogram;
  item.phrase=phrase;item.origin='suggested';item.teacherReviewRequired=true;
  item.sourceIds=[];delete item.source;
  setLesson(next);setPreflight(null);
  setReviewed(prev=>prev.filter(value=>value!=='solve-code'));
  setError('New phrase added as a suggested review candidate. Confirm its meaning and mark Solve the Code reviewed.');
 }
 function applyModuleJson(){
  if(!lesson||!activePreparedKey)return;
  try{
   const nextValue=JSON.parse(moduleEditorText);
   if(!nextValue||typeof nextValue!=='object')
    throw Error('Enter an object or array for this prepared activity.');
   const next=structuredClone(lesson);
   next.preparedActivities[activePreparedKey]=nextValue;
   setLesson(next);setPreflight(null);setError('');
   setReviewed(prev=>prev.filter(id=>id!==active?.id));
  }catch(e){setError('Could not apply activity data: '+String((e as Error).message??e));}
 }
 function findPassage(){
  if(!index){setError('Load the official BSB text file first.');return;}
  try{
   const next=getBsbPassage(index,reference);
   const tokenCount=wordSpans(next.text).length;
   setPassage(next);setStart(0);setEnd(tokenCount-1);
   setFinish([]);setUnscramble([]);
   // The BSB index uses whole numbered verses. Preserve an original 1a/1b
   // curriculum citation for the booklet while the teacher picks the excerpt.
   setDisplayReference(/\d[a-z](?:\s*[-–]|$)/iu.test(reference.trim())
    ?reference.trim():next.reference);
   setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function changeBounds(s:number,e:number){
  if(!passage)return;
  setStart(s);setEnd(e);setFinish([]);
  setUnscramble([]);
  setPreflight(null);
 }
 function toggle(setter:(v:number[]|((x:number[])=>number[]))=>void,which:number){
  setter(prev=>prev.includes(which)?prev.filter(x=>x!==which):[...prev,which].sort((a,b)=>a-b));
 }
 function useBsb(){
  if(!lesson||!passage)return;
  try{
   const next=applyBsbVerse(lesson,passage,start,end,finish,unscramble,displayReference);
   setLesson(next);setReviewed(prev=>prev.filter(x=>x!=='bsb-verse'));
   setRightsConfirmed(false);
   setPreflight(null);setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function markRemainingReviewed(){
  if(!lesson||!bulkReviewAcknowledged||remaining===0)return;
  if(!window.confirm('Confirm that you have personally reviewed the '+remaining+
   ' remaining curriculum items. This marks review checkboxes only; it does NOT approve the lesson, clear Scripture rights, or skip preflight. Continue?'))return;
  setReviewed(previous=>[...new Set([
   ...previous,...requiredTasks.map(task=>task.id),
  ])]);
  setBulkReviewAcknowledged(false);
  setBulkReviewNotice('Review checkmarks updated. Rerun preflight and complete the separate BSB rights confirmation and teacher signoff before publication.');
  setPreflight(null);setRightsConfirmed(false);
 }
 function approveActive(){
  if(!active)return;
  setReviewed(prev=>prev.includes(active.id)?prev:[...prev,active.id]);
  const next=tasks.find(t=>!t.optional&&t.id!==active.id&&!reviewed.includes(t.id));
  if(next)setSelectedId(next.id);
 }
 const verseText=passage?clipToWords(passage.text,start,end):'';
 const verseWords=wordSpans(verseText);
 const versePreview=lesson?.lessonDetails?.memoryVerse;
 const canPublish=lesson&&remaining===0&&preflight!==null&&preflight.issues.length===0&&
  preflight.convertedCount===preflight.totalCount&&
  reviewer.trim()&&signDate&&rightsConfirmed;
 function downloadApproved(){
  if(!canPublish||!lesson)return;
  try{
   const approved=createApprovedLesson(lesson,reviewer,signDate,rightsConfirmed);
   downloadJson(lesson.id+'.lesson.json',approved);
   setError('Approved lesson downloaded with its own teacher signoff and Scripture-rights record. Add this ONE JSON file under curriculum/approved/ in a GitHub PR. Publication remains blocked until CI passes.');
  }catch(e){setError(String((e as Error).message??e));}
 }
 const mcIndex=active?.id.startsWith('mc:')?lesson?.preparedActivities?.multipleChoice?.findIndex((x:any)=>'mc:'+x.id===active.id):-1;
 const factIndex=active?.id.startsWith('fact:')?lesson?.facts?.findIndex((x:any)=>'fact:'+x.id===active.id):-1;
 const matchingPairs=Array.isArray(lesson?.preparedActivities?.matchWords)?
  lesson.preparedActivities.matchWords:[];
 const matchingIssues=matchingPairIssues(matchingPairs);
 const matchingPrintable=matchingIssues.length===0?{
  type:'match-words' as const,
  pairs:matchingPairs.map((pair:any)=>pair.left+','+pair.right).join('\n'),
  seed:1,
 }:null;
 return <main className="review-shell">
  <header className="review-header">
   <div><a href={import.meta.env.BASE_URL} className="review-brand">Worksheet Studio</a><span className="review-tag">Curriculum Review</span></div>
   <p>Unlisted public page · local file editing · no GitHub write access</p>
  </header>
  <section className="review-intro">
   <p className="review-eyebrow">AUTHOR WORKBENCH</p>
   <h1>Approve curriculum without reading the JSON.</h1>
   <p>Load a lesson file, review only the suggested or adapted material, choose an exact Berean Standard Bible excerpt, and download an updated file. Nothing is sent to a server or committed automatically.</p>
  </section>
  <div className="review-grid">
   <aside className="review-sidebar">
    <section className="review-panel">
     <h2>1. Load a lesson</h2>
     <button type="button" className="review-secondary" onClick={loadRedSea}>Load Red Sea lesson from GitHub</button>
     <label className="review-upload">Choose curriculum JSON or saved review session <input type="file" accept=".json,application/json" onChange={loadLesson}/></label>
     {lesson&&<><strong>{lesson.lessonDetails.title}</strong><p>{lesson.id}</p>
      <div className="review-meter"><div style={{width:(requiredTasks.length?complete/requiredTasks.length*100:0)+'%'}}/></div>
      <small>{complete} of {requiredTasks.length} required decisions reviewed</small>
      <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review-session.json',{lesson,reviewed,selectedId})}>Save review session — preserves edits and checkmarks</button>
      <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review.json',lesson)}>Download working JSON</button>
     </>}
     <small>Progress autosaves in this browser only. To continue on another device, download your review session and import it there to keep edits and checkmarks.</small>
    </section>
    {lesson&&<section className="review-panel">
     <h2>2. Review items</h2>
     <nav className="review-nav" aria-label="Review items">
      {tasks.map(t=><button type="button" key={t.id}
        className={(t.id===active?.id?'selected ':'')+(reviewed.includes(t.id)?'done':'')}
        onClick={()=>{setSelectedId(t.id);setRepairConflictWords([]);setError('');}}>
        <span>{t.optional?'↗':reviewed.includes(t.id)?'✓':'○'}</span><span><small>{t.group}</small>{t.label}</span>
       </button>)}
     </nav>
     <details className="review-bulk-check">
      <summary>Already reviewed this lesson? Mark remaining items reviewed</summary>
      <p>This is only for material you have personally checked elsewhere.
       Import a saved <strong>review session</strong> above to restore existing
       checkmarks automatically; a plain curriculum JSON doesn't store them.</p>
      <p><strong>This does not approve the lesson.</strong> Preflight, official BSB
       rights confirmation and final teacher signoff remain separate.</p>
      <label className="review-checkbox">
       <input type="checkbox" checked={bulkReviewAcknowledged}
        onChange={e=>setBulkReviewAcknowledged(e.target.checked)}/>
       I personally reviewed all remaining curriculum items.
      </label>
      <button type="button" className="review-secondary"
       disabled={!bulkReviewAcknowledged||remaining===0}
       onClick={markRemainingReviewed}>
       Mark {remaining} remaining items reviewed
      </button>
      {bulkReviewNotice&&<p role="status" className="review-source">{bulkReviewNotice}</p>}
     </details>
     {diagnosticTasks.length>0&&<div className="review-diagnostic-links">
      <h3>Additional activity repairs</h3>
      <nav className="review-nav" aria-label="Preflight repair sections">
       {diagnosticTasks.map(t=><button type="button" key={t.id}
        className={t.id===active?.id?'selected':''}
        onClick={()=>{setSelectedId(t.id);setRepairConflictWords([]);}}>
        <span>!</span><span>{t.label}</span>
       </button>)}
      </nav>
     </div>}
    </section>}
   </aside>
   <div className="review-content">
    {!lesson?<section className="review-panel review-hero">
      <h2>Start with your curriculum file</h2>
      <p>Download the current review-stage JSON from the repository, then choose it above. The workbench intentionally does not bundle unapproved lessons or your original ESV memory-verse text.</p>
      <a href="https://github.com/andydoane/worksheet-generator/blob/main/curriculum/review/ot-031-god-parts-the-red-sea.json" target="_blank" rel="noreferrer">Open Red Sea review file on GitHub</a>
     </section>:<>
     {active&&<section className="review-panel">
      <div className="review-section-top">
       <div><small>{active.group}</small><h2>{active.label}</h2><p>{active.detail}</p></div>
       {reviewed.includes(active.id)&&<span className="review-approved">Reviewed ✓</span>}
      </div>
      {mcIndex>=0&&(()=>{
       const mc=lesson.preparedActivities.multipleChoice[mcIndex];
       return <div className="review-fields">
        <label>Question<textarea id={'review-mc-'+mc.id} value={mc.question} onChange={e=>change(['preparedActivities','multipleChoice',mcIndex,'question'],e.target.value)}/></label>
        {mc.choices.map((c:any,i:number)=><label key={i}>
         {c.isCorrect?'Correct answer (from source)':'Suggested incorrect answer '+i}
         <input value={c.text} onChange={e=>change(['preparedActivities','multipleChoice',mcIndex,'choices',i,'text'],e.target.value)}/></label>)}
        <SourceContext lesson={lesson} ids={mc.sourceIds??[]} questionIds={mc.sourceQuestionIds??[]}/>
       </div>;
      })()}
      {factIndex>=0&&(()=>{
       const f=lesson.facts[factIndex];
       return <div className="review-fields">
        <p className="review-warning">Intentionally FALSE. Edits are synchronized to Sort the Story and linked True/False activities.</p>
        <label>{f.isTrue?'Statement':'False statement'}<textarea id={'review-fact-'+f.id} value={f.statement} onChange={e=>change(['facts',factIndex,'statement'],e.target.value)}/></label>
        <SourceContext lesson={lesson} ids={f.sourceIds??[]}/>
       </div>;
      })()}
      {active.id==='finish-story'&&<FinishStoryReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='drawing-captions'&&<div id="review-field-drawing" tabIndex={-1} className="review-fields">
       <div className="review-note">
        <h3>Small Draw a Picture</h3>
        <p>Store short scene descriptions that work after “Draw a picture of …” — without an instruction prefix or final punctuation.</p>
        <button type="button" className="review-secondary" onClick={()=>updateDrawingCopy('small')}>
         Convert legacy Small drawing instructions into scene descriptions
        </button>
       </div>
       {(lesson.drawingPrompts??[]).map((item:any,i:number)=><div key={'scene-'+i}>
        <label>Small scene {i+1} · {item.id??'scene'}
         <textarea id={'review-field-drawing-'+i} rows={2} value={item.prompt}
          onChange={e=>change(['drawingPrompts',i,'prompt'],e.target.value)}/></label>
        <SourceContext lesson={lesson} ids={item.sourceIds??[]}/>
       </div>)}
       {lesson.preparedActivities.drawPicture&&
        <label>Default Small Draw a Picture prompt
         <textarea id="review-field-small-drawing" rows={2} value={lesson.preparedActivities.drawPicture.prompt}
          onChange={e=>change(['preparedActivities','drawPicture','prompt'],e.target.value)}/></label>}
       <div className="review-note">
        <h3>Large Draw the Story</h3>
        <p>Use 4–6 complete, capitalized story-event sentences ending in punctuation. Prefer exact approved Story Order sentences, matched by source-note IDs. Do not begin them with “Draw”.</p>
        <button type="button" className="review-secondary" onClick={()=>updateDrawingCopy('large')}>
         Use matching Story Order sentences for the Large captions
        </button>
       </div>
       {(lesson.preparedActivities.drawStory??[]).map((item:any,i:number)=><div key={'caption-'+i}>
        <label>Large drawing caption {i+1}
         <textarea id={'review-field-large-drawing-'+i} rows={2} value={item.prompt}
          onChange={e=>change(['preparedActivities','drawStory',i,'prompt'],e.target.value)}/></label>
        <SourceContext lesson={lesson} ids={item.sourceIds??[]}/>
       </div>)}
      </div>}
      {active.id==='connect-phrase'&&
       <ConnectPhraseReviewEditor lesson={lesson}
        onChange={applyVisualReview} onError={setError}/>}
      {active.id==='word-search'&&
       <WordSearchReviewEditor lesson={lesson} kind="wordSearch"
        conflicts={repairConflictWords} onChange={applyVisualReview} onError={setError}/>}
      {active.id==='medium-word-search'&&
       <WordSearchReviewEditor lesson={lesson} kind="mediumWordSearch"
        onChange={applyVisualReview} onError={setError}/>}
      {active.id==='crossword'&&
       <CrosswordReviewEditor lesson={lesson}
        onChange={applyCrosswordReview} onError={setError}
        advancedJson={moduleEditorText} onAdvancedJsonChange={setModuleEditorText}
        onApplyAdvancedJson={applyModuleJson}/>}
      {active.id==='who-am-i'&&<WhoAmIReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='unscramble-words'&&<UnscrambleReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='pixel-picture'&&<PixelPictureReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='multiple-choice-bank'&&<MultipleChoiceBankReviewEditor
       lesson={lesson} onChange={applyMultipleChoiceBankReview} onError={setError}/>}
      {active.id==='story-order'&&<StoryOrderReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='sort-story'&&<SortStoryReviewEditor
       lesson={lesson} onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='true-false'&&<FactChoiceReviewEditor
       lesson={lesson} kind="trueFalse" onChange={applyStoryFactReview} onError={setError}/>}
      {active.id==='true-false-maze'&&<FactChoiceReviewEditor
       lesson={lesson} kind="trueFalseMaze" onChange={applyStoryFactReview} onError={setError}/>}
      {['story-order','sort-story','true-false','true-false-maze',
        'who-am-i','unscramble-words','pixel-picture','finish-story',
        'multiple-choice-bank'].includes(active.id)&&
       <details className="review-match-advanced">
        <summary>Advanced: edit this activity's JSON only</summary>
        <p>This changes only the selected prepared activity. Original source records
        and canonical facts are separate. Use for unusual structural repairs
        after saving a working JSON backup, then rerun preflight.</p>
        <label>Prepared activity JSON
         <textarea id="review-module-json" rows={12} spellCheck={false}
          value={moduleEditorText} onChange={e=>setModuleEditorText(e.target.value)}/></label>
        <button type="button" className="review-secondary" onClick={applyModuleJson}>
         Apply prepared activity JSON
        </button>
       </details>}
      {active.id==='match-words'&&<div id="review-field-match-words" tabIndex={-1} className="review-fields">
       <div className="review-note">
        <h3>Correct matching pairs · {matchingPairs.length} of 6</h3>
        <p>Keep each word beside its correct match. Each side must contain a unique entry of 22 characters or fewer. The printable worksheet shuffles the right-hand answers automatically.</p>
        <p>Edits to existing wording keep the pair's ID and source links but are marked as suggested text requiring your review.</p>
       </div>
       {!Array.isArray(lesson.preparedActivities?.matchWords)&&
        <p className="review-warning">The stored matching data is not a list. Use the Advanced activity JSON section below to replace it with an array before editing the pairs.</p>}
       {matchingIssues.length>0&&<div className="review-warning" role="status">
        <strong>Fix these matching-pair issues:</strong>
        <ul>{matchingIssues.map((item,i)=><li key={i}>{item.message}</li>)}</ul>
       </div>}
       <div className="review-match-rows">
        {matchingPairs.map((pair:any,i:number)=><div className="review-match-row" key={pair.id??i} role="group" aria-label={'Matching pair '+(i+1)}>
         <div className="review-match-heading">
          <strong>Pair {i+1}</strong>
          <small>{pair.id??'No pair ID'} · {pair.origin==='suggested'?'Suggested / needs teacher review':pair.origin??'Origin not recorded'}</small>
         </div>
         <div className="review-pair">
          <label>Left word or phrase
           <input id={'review-match-'+i+'-left'} value={pair.left??''}
            aria-invalid={matchingIssues.some(issue=>issue.index===i&&issue.field==='left')}
            aria-describedby={matchingIssues.some(issue=>issue.index===i)?'review-match-'+i+'-errors':undefined}
            onChange={e=>changeMatching(()=>editMatchingPair(lesson,i,'left',e.target.value))}/>
           <small>{String(pair.left??'').trim().length}/22 characters</small>
          </label>
          <label>Correct match
           <input id={'review-match-'+i+'-right'} value={pair.right??''}
            aria-invalid={matchingIssues.some(issue=>issue.index===i&&issue.field==='right')}
            aria-describedby={matchingIssues.some(issue=>issue.index===i)?'review-match-'+i+'-errors':undefined}
            onChange={e=>changeMatching(()=>editMatchingPair(lesson,i,'right',e.target.value))}/>
           <small>{String(pair.right??'').trim().length}/22 characters</small>
          </label>
         </div>
         {matchingIssues.some(issue=>issue.index===i)&&
          <ul id={'review-match-'+i+'-errors'} className="review-match-errors">
           {matchingIssues.filter(issue=>issue.index===i).map((issue,j)=>
            <li key={j}>{issue.message}</li>)}
          </ul>}
         <div className="review-match-actions">
          <button type="button" className="review-secondary" disabled={i===0}
           aria-label={'Move pair '+(i+1)+' up'}
           onClick={()=>changeMatching(()=>moveMatchingPair(lesson,i,-1))}>Move up</button>
          <button type="button" className="review-secondary" disabled={i===matchingPairs.length-1}
           aria-label={'Move pair '+(i+1)+' down'}
           onClick={()=>changeMatching(()=>moveMatchingPair(lesson,i,1))}>Move down</button>
          <button type="button" className="review-secondary" disabled={matchingPairs.length<=3}
           aria-label={'Remove pair '+(i+1)}
           onClick={()=>deleteMatching(i)}>Remove pair</button>
         </div>
         <SourceContext lesson={lesson} ids={pair.sourceIds??[]}/>
        </div>)}
       </div>
       <button type="button" className="review-secondary" disabled={matchingPairs.length>=6}
        onClick={()=>changeMatching(()=>addMatchingPair(lesson))}>+ Add matching pair</button>
       <div className="review-match-preview">
        <h3>Print-matched worksheet preview</h3>
        <p>Correct pairs are shown together above for editing; the printable right column is shuffled.</p>
        {matchingPrintable?<MatchingPrintPreview module={matchingPrintable}/>:
         <p className="review-warning">Complete the 3–6 valid pairs to see their printable arrangement.</p>}
       </div>
       <details className="review-match-advanced">
        <summary>Advanced: edit this activity's JSON only</summary>
        <p>Use only when the paired fields cannot express the edit you need. Apply updates here, then rerun preflight.</p>
        <label>Matching pairs JSON
         <textarea id="review-module-json" rows={12} spellCheck={false}
          value={moduleEditorText} onChange={e=>setModuleEditorText(e.target.value)}/></label>
        <button type="button" className="review-secondary" onClick={applyModuleJson}>Apply matching-pair JSON</button>
       </details>
      </div>}
      {active.id==='circle-mistakes'&&<div className="review-fields">
       <label>Deliberately incorrect paragraph<textarea id="review-field-circle-mistakes" rows={7} value={lesson.preparedActivities.circleMistakes.paragraph}
        onChange={e=>change(['preparedActivities','circleMistakes','paragraph'],e.target.value)}/></label>
       {lesson.preparedActivities.circleMistakes.mistakes.map((m:any,i:number)=>
        <div className="review-pair" key={i}>
         <label>Incorrect phrase {i+1}<input value={m.incorrect} onChange={e=>change(['preparedActivities','circleMistakes','mistakes',i,'incorrect'],e.target.value)}/></label>
         <label>Correction<input value={m.correction} onChange={e=>change(['preparedActivities','circleMistakes','mistakes',i,'correction'],e.target.value)}/></label>
        </div>)}
       <p className="review-source">Every incorrect phrase must actually appear in the paragraph.</p>
      </div>}
      {active.id==='odd-words'&&<div className="review-fields">
       <label>Suggested unrelated words — one per line<textarea id="review-field-odd-words" rows={7} value={wordBankDrafts.oddWords}
        onChange={e=>changeWordList('oddWords','unrelated',e.target.value)}/></label>
       <p>Original related words: {lesson.preparedActivities.oddWords.related.join(', ')}</p>
      </div>}
      {active.id==='checkboxes'&&<div className="review-fields">
       <label>Suggested incorrect choices — one per line<textarea id="review-field-checkboxes" rows={7} value={wordBankDrafts.checkboxes}
        onChange={e=>changeWordList('checkboxes','incorrect',e.target.value)}/></label>
       <p>Correct choices: {lesson.preparedActivities.checkboxes.correct.join(', ')}</p>
      </div>}
      {active.id==='sensitivity'&&<div className="review-note">
       <h3>Age suitability</h3>
       <p>The curriculum discusses the destruction of the Egyptian army. Please decide whether the prepared story, sorting and drawing prompts use age-appropriate wording for your classes. You can adjust the relevant content in the working JSON before marking this reviewed.</p>
      </div>}
      {active.id==='solve-code'&&<div className="review-fields">
       <div className="review-note">
        <h3>Solve the Code · Medium cryptogram</h3>
        <p>The original Important Idea is kept exactly as authored. This puzzle can use a shorter reviewed key phrase or Story Order sentence instead.</p>
        <p><strong>Original Important Idea:</strong> {lesson.lessonDetails.bigIdeas?.[0]?.text??'Not recorded'}</p>
       </div>
       {lesson.preparedActivities.bigIdeaCryptogram?<>
        <label>Text used only for Solve the Code
         <textarea id="review-field-solve-code" rows={3}
          value={lesson.preparedActivities.bigIdeaCryptogram.phrase}
          onChange={e=>change(['preparedActivities','bigIdeaCryptogram','phrase'],e.target.value)}/></label>
        <p className={cryptogramLetters(lesson.preparedActivities.bigIdeaCryptogram.phrase).length>18?'review-warning':'review-source'}>
         {lesson.preparedActivities.bigIdeaCryptogram.phrase.length}/62 characters ·
         {cryptogramLetters(lesson.preparedActivities.bigIdeaCryptogram.phrase).length}/18 distinct letters.
         A valid phrase needs no more than 18 different letters.
        </p>
        <label>Use an existing source-backed lesson phrase
         <select value={solveCodeChoices(lesson).some(item=>item.text===lesson.preparedActivities.bigIdeaCryptogram.phrase)
          ?lesson.preparedActivities.bigIdeaCryptogram.phrase:''}
          onChange={e=>selectCodePhrase(e.target.value)}>
          <option value="">Choose another approved phrase…</option>
          {solveCodeChoices(lesson).map((item,i)=>{
           const tooLong=validateModule({type:'big-idea-cryptogram',idea:item.text,seed:1}).length>0;
           return <option key={i} value={item.text} disabled={tooLong}>
            {item.text}{tooLong?' (too long for this puzzle)':''}
           </option>;
          })}
         </select></label>
        <div className="review-note">
         <p>If you write a new shorter phrase above, it is <strong>not</strong> automatically attributed to the original curriculum. After checking the meaning, explicitly add it as a suggested review candidate.</p>
         <button type="button" className="review-secondary" onClick={addProposedCodePhrase}>
          Add this phrase as a teacher-review candidate
         </button>
        </div>
       </>:<p className="review-warning">The lesson does not yet have a prepared Solve the Code entry. Add the missing `preparedActivities.bigIdeaCryptogram` record in the activity-data editor.</p>}
      </div>}
      {active.id==='important-idea'&&<div className="review-fields">
       <label>Original Important Idea (retained as curriculum teaching text)
        <input id="review-field-important-idea" value={lesson.lessonDetails.bigIdeas?.[0]?.text??''} onChange={e=>changeIdea(e.target.value)}/></label>
       <p className="review-source">The source page-5 graphic uses “The Lord God is a mighty savior.” The later prose has different capitalization and punctuation.</p>
      </div>}
      {active.id==='bsb-verse'&&<div className="review-fields">
       <div className="review-note">
        <h3>Berean Standard Bible — public domain</h3>
        <p>Original curriculum uses {originalMemoryVerseTranslation(lesson)}. Your approved worksheet will use the exact BSB text you choose. Select an entire verse or a passage spanning verses, then choose the first and last words of the excerpt.</p>
        <a href="https://berean.bible/terms.htm" target="_blank" rel="noreferrer">Official BSB public-domain terms</a>
       </div>
       {index?<p className="review-success">BSB loaded: {index.books.length} books, {index.count.toLocaleString()} numbered verse records.</p>:<>
        <p className="review-warning">The Bible text is not loaded. {bibleError}</p>
        <label className="review-upload">Import official bsb.txt <input type="file" accept=".txt,text/plain" onChange={loadBsb}/></label>
        <a href="https://berean.bible/downloads.htm" target="_blank" rel="noreferrer">Get the official text file</a>
       </>}
       <div className="review-pair">
        <label>Look up passage (e.g. Psalm 136:1a or Exodus 15:11-12)
         <input id="review-field-bsb" value={reference} onChange={e=>setReference(e.target.value)}/></label>
        <button type="button" onClick={findPassage} disabled={!index}>Look up BSB</button>
       </div>
       {passage&&<>
        <div className="review-verse"><small>Canonical source · {passage.reference}</small><p>{passage.text}</p></div>
        <div className="review-pair">
         <label>Begin at word
          <select value={start} onChange={e=>changeBounds(Number(e.target.value),Math.max(end,Number(e.target.value)))}>
           {wordSpans(passage.text).map((w,i)=><option key={i} value={i}>{i+1}. {w.word}</option>)}
          </select></label>
         <label>End at word
          <select value={end} onChange={e=>changeBounds(Math.min(start,Number(e.target.value)),Number(e.target.value))}>
           {wordSpans(passage.text).map((w,i)=><option key={i} value={i}>{i+1}. {w.word}</option>)}
          </select></label>
        </div>
        <label>Reference printed on the booklet
         <input value={displayReference} maxLength={38} onChange={e=>setDisplayReference(e.target.value)}/></label>
        <div className="review-verse"><small>Exact excerpt to use (punctuation preserved)</small><p>{verseText}</p></div>
        <p className="review-source">No words are selected automatically. Choose 2–8 blanks
         for Finish the Verse and 4–8 for Unscramble the Verse; each answer must
         contain at most nine letters. Changing excerpt boundaries clears both selections.</p>
        {(['finish','unscramble'] as const).map(mode=>{
         const chosen=mode==='finish'?finish:unscramble;
         const setter=mode==='finish'?setFinish:setUnscramble;
         return <div className="review-word-selector" key={mode}>
          <h3>{mode==='finish'?'Finish the Verse':'Unscramble the Verse'} · {chosen.length} blanks</h3>
          <div className="review-token-list">{verseWords.map((w,i)=>{
           const eligible=/^[\p{L}]{1,9}$/u.test(w.word);
           return <button type="button" key={i} className={chosen.includes(i)?'chosen':''}
            aria-pressed={chosen.includes(i)} disabled={!eligible}
            onClick={()=>toggle(setter,i)}>{w.word}</button>;
          })}</div>
          <p className="review-source">{markSelectedWords(verseText,chosen)}</p>
          {validateModule({type:mode==='finish'?'finish-verse':'unscramble-verse',
            reference:displayReference,verse:markSelectedWords(verseText,chosen),seed:1}).map((s,i)=>
             <p className="review-warning" key={i}>{s}</p>)}
         </div>;
        })}
        <button type="button" onClick={useBsb}
         disabled={finish.length<2||finish.length>8||
          unscramble.length<4||unscramble.length>8}>
         Apply BSB to all verse activities
        </button>
       </>}
       <div className="review-verse"><small>Currently stored in the curriculum</small>
        <p>{versePreview.reference} ({versePreview.translation})</p><p>{versePreview.text}</p>
       </div>
       <p className="review-source">After applying the BSB excerpt, review it here and then mark this section reviewed. No ESV wording will be retained in the exported prepared verse fields.</p>
      </div>}
      {activeModuleId&&activePreparedKey&&active.id!=='match-words'&&
       active.id!=='crossword'&&
       !['story-order','sort-story','true-false','true-false-maze',
         'who-am-i','unscramble-words','pixel-picture','finish-story',
         'multiple-choice-bank'].includes(active.id)&&
       <div className="review-fields">
       <div className="review-note">
        <h3>{MODULES.find(item=>item.id===activeModuleId)?.name??activeModuleId} · prepared activity</h3>
        <p>This activity does not yet have a dedicated visual editor. You can edit its isolated prepared-activity JSON below without changing the rest of the lesson. The schema and puzzle generator will check the result when you rerun preflight.</p>
        <p>Curriculum field: <code>preparedActivities.{activePreparedKey}</code></p>
       </div>
       <label>Prepared activity content
        <textarea id="review-module-json" rows={12} spellCheck={false}
         value={moduleEditorText} onChange={e=>setModuleEditorText(e.target.value)}/></label>
       <button type="button" onClick={applyModuleJson}>Apply this activity's changes</button>
      </div>}
      {(['lesson-details','lesson-sources','lesson-readiness','lesson-publication'] as const)
       .filter(area=>area===active.id)
       .map(area=><LessonIntegrityReviewEditor key={area}
        lesson={lesson} mode={area} onChange={applyIntegrityReview} onError={setError}/>)}
      {active.id==='recipe-review'&&<div id="review-field-recipe" tabIndex={-1} className="review-fields">
       <div className="review-note">
        <h3>Numbered preset repairs</h3>
        <p>{Object.keys(MODULE_REPAIR_REGISTRY).length}/27 activity types have
         registered repair destinations: {Object.values(MODULE_REPAIR_REGISTRY)
          .filter(route=>route.editor==='visual').length} activity forms and
         {Object.values(MODULE_REPAIR_REGISTRY).filter(route=>
          route.editor==='scripture').length} shared Scripture routes.</p>
        <p>Each numbered booklet requires content that does not repeat in another region.
         Choose the named activity below, select a different approved fact or
         vocabulary bank, then rerun preflight. The three preset layouts are fixed.</p>
       </div>
       {(preflight?.issues??[]).filter(i=>i.recipeId||i.slot).map((issue,i)=>
        <div key={i} className="review-story-fact-row">
         <strong>{issue.recipeId??'Preset'} · {issue.slot??'Activity region'}</strong>
         <p>{issue.message}</p>
         <button type="button" className="review-secondary" onClick={()=>{
          setSelectedId(issue.taskId);setFocusIssueField(issue.fieldId);
          setRepairConflictWords(issue.conflicts??[]);
         }}>Open {issue.label} repair</button>
        </div>)}
       <p className="review-source">If no specific issue is listed, run preflight again
        to see the currently blocked preset slot.</p>
      </div>}
      {active.id==='review-general'&&<div id="review-general-details" tabIndex={-1} className="review-fields">
       <div className="review-note">
        <h3>Other validation issues</h3>
        <p>These messages have no safe automatic repair. Rather than modify
         curriculum facts or rights records without evidence, choose the affected
         lesson section below and verify the source. All current preflight messages
         remain visible below until a fresh preflight run.</p>
       </div>
       {(preflight?.issues??[]).filter(issue=>issue.taskId==='review-general').map((issue,i)=>
        <p className="review-warning" key={i}>{issue.message}</p>)}
       <div className="review-match-actions">
        {(['lesson-details','lesson-sources','lesson-readiness','lesson-publication','recipe-review'] as const)
         .map(area=><button type="button" className="review-secondary" key={area}
          onClick={()=>{setSelectedId(area);setFocusIssueField('review-field-'+area);}}>
          {area.replaceAll('-',' ')}
         </button>)}
       </div>
       <p className="review-source">For corrupt structural content, use the source
        section's scoped advanced editor and export a working JSON backup before changes.
        The generator and curriculum CI will independently validate all final content.</p>
      </div>}
      <div className="review-actions">
       {!active.optional&&<button type="button" className="review-approve" onClick={approveActive}>{reviewed.includes(active.id)?'Reviewed — next':'Mark reviewed & continue'}</button>}
       {!active.optional&&<button type="button" className="review-secondary" onClick={()=>setReviewed(x=>x.filter(id=>id!==active.id))}>Needs more work</button>}
      </div>
     </section>}
     <section className="review-panel">
      <h2>3. Validate & export</h2>
      <p>{remaining===0?'All review items marked. Run the actual converter preflight before approval.':remaining+' review decisions remain. You can export a working JSON at any time.'}</p>
      <div className="review-actions">
       <button type="button" onClick={()=>{
         try{setPreflight(buildReviewPreflight(lesson));setError('');}
         catch(e){setPreflight({convertedCount:0,totalCount:27,
          issues:[reviewIssueTarget(String((e as Error).message??e))]});}
        }}>Run preflight checks</button>
       <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review.json',lesson)}>Export working JSON</button>
      </div>
      {preflight&&<div className={preflight.issues.length||preflight.convertedCount!==preflight.totalCount?'review-errors':'review-success'} role="status">
       <p><strong>{preflight.convertedCount}/{preflight.totalCount} activity types converted.</strong>
        {preflight.issues.length?' Select an issue below to edit the relevant activity.':
         preflight.convertedCount!==preflight.totalCount?' Conversion coverage is incomplete; inspect the prepared activity data.':
         ' Preflight passed: all 27 activities and three numbered presets are buildable. GitHub CI still independently validates schema, publication rights and the approved file.'}</p>
       {preflight.issues.length>0&&<ul className="review-issue-list">
        {preflight.issues.map((issue,i)=><li key={issue.id+'-'+i}>
         <button type="button" className="review-issue-link"
          onClick={()=>{
           setSelectedId(issue.taskId);setFocusIssueField(issue.fieldId);
           setRepairConflictWords(issue.conflicts??[...issue.message.matchAll(/vocab:([a-z-]+)/giu)]
            .map(match=>'vocab:'+match[1]));
           setError('');
          }}>
          <strong>{issue.label}</strong>
          <span>{issue.message}</span>
          <small>Edit this issue →</small>
         </button>
        </li>)}
       </ul>}
      </div>}
      <div id="review-field-publication-signoff" className="review-signoff">
       <h3>Final publication signoff</h3>
       <p>Only complete this after you've reviewed the items and Bible text. A downloaded file is not published until you submit it through GitHub and CI passes.</p>
       <div className="review-pair">
        <label>Curriculum reviewer name<input value={reviewer} onChange={e=>setReviewer(e.target.value)}/></label>
        <label>Approval date<input type="date" value={signDate} onChange={e=>setSignDate(e.target.value)}/></label>
       </div>
       <label className="review-checkbox"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/>
        I checked the official BSB public-domain terms and confirm the selected Scripture is verbatim from the loaded BSB source.</label>
       <p className="review-source">This confirmation is recorded in the approved lesson JSON. The generator discovers all individually approved files in curriculum/approved automatically. No shared rights manifest needs uploading or updating.</p>
        <div className="review-actions">
        <button type="button" disabled={!canPublish} onClick={downloadApproved}>Download approved lesson JSON</button>
               </div>
       <p className="review-source">Add the downloaded lesson to <code>curriculum/approved/{lesson.id}.lesson.json</code>, and a pending review-stage copy may remain in <code>curriculum/review/</code>. Only approved files enter the public catalog; CI validates both stages separately. No other curriculum files need to change. CI validates the lesson, approval, Scripture rights and printable presets before publication.</p>
      </div>
     </section>
    </>}
    {error&&<div className="review-errors" role="alert">{error}</div>}
   </div>
  </div>
  <footer className="review-footer">
   The review URL is unlisted, not access-controlled. This tool never writes to GitHub; uploaded lesson files stay in your browser.
  </footer>
 </main>;
}
