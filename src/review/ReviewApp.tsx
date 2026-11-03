import {useEffect,useMemo,useState} from 'react';
import type {ChangeEvent} from 'react';
import {parseBsbText,getBsbPassage,wordSpans,clipToWords,markSelectedWords,suggestBlankWords,type BsbIndex,type Passage} from './bsb.ts';
import {applyBsbVerse,checkReviewContent,createApprovedLesson,editAt,listReviewTasks,updatedRightsManifest,type Lesson} from './model.ts';
import {validateModule} from '../modules.ts';
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
 const [reviewed,setReviewed]=useState<string[]>(saved?.reviewed??[]);
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
 const [preflight,setPreflight]=useState<string[]|null>(null);
 const [reviewer,setReviewer]=useState('');
 const [signDate,setSignDate]=useState(displayDate);
 const [rightsConfirmed,setRightsConfirmed]=useState(false);
 const [manifest,setManifest]=useState<unknown>(null);
 const [confirmEmptyManifest,setConfirmEmptyManifest]=useState(false);
 const tasks=useMemo(()=>lesson?listReviewTasks(lesson):[],[lesson]);
 const active=tasks.find(t=>t.id===selectedId)??tasks.find(t=>!reviewed.includes(t.id))??tasks[0];
 const complete=tasks.filter(t=>reviewed.includes(t.id)).length;
 const remaining=tasks.length-complete;
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
  setReviewed(value?.lesson?.schemaVersion===1&&Array.isArray(value.reviewed)?value.reviewed:[]);
  setSelectedId(value?.lesson?.schemaVersion===1&&typeof value.selectedId==='string'?value.selectedId:'');
  setReference(data.lessonDetails.memoryVerse.reference);
  setPassage(null);setPreflight(null);setError('');
 }
 async function loadLesson(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  try{acceptLesson(JSON.parse(await file.text()));}
  catch(e){setError('Could not load lesson: '+String((e as Error).message??e));}
  e.target.value='';
 }
 async function loadRedSea(){
  try{
   const url='https://raw.githubusercontent.com/andydoane/worksheet-generator/main/curriculum/review/ot-031-god-parts-the-red-sea.json';
   const response=await fetch(url,{cache:'no-store'});
   if(!response.ok)throw Error('GitHub returned '+response.status);
   acceptLesson(await response.json());
  }catch(e){setError('Could not fetch lesson from GitHub. Use file upload instead. '+String((e as Error).message??e));}
 }
 async function loadBsb(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  try{setIndex(parseBsbText(await file.text()));setBibleError('');}
  catch(e){setBibleError(String((e as Error).message??e));}
  e.target.value='';
 }
 async function loadManifest(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  try{const value=JSON.parse(await file.text());
   if(value?.schemaVersion!==1||!value.lessons||Array.isArray(value.lessons))throw Error('Invalid rights manifest.');
   setManifest(value);setConfirmEmptyManifest(false);setError('');
  }catch(e){setError('Could not load rights manifest: '+String((e as Error).message??e));}
  e.target.value='';
 }
 function change(path:(string|number)[],value:string){
  if(!lesson)return;
  try{
   setLesson(editAt(lesson,path,value));setPreflight(null);
   setReviewed(prev=>prev.filter(x=>x!==active?.id));setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function changeWordList(key:'oddWords'|'checkboxes',field:'unrelated'|'incorrect',value:string){
  if(!lesson)return;
  const next=structuredClone(lesson);
  next.preparedActivities[key][field]=value.split(/\r?\n/u).map(x=>x.trim()).filter(Boolean);
  setLesson(next);setPreflight(null);setReviewed(prev=>prev.filter(x=>x!==active?.id));
 }
 function changeIdea(value:string){
  if(!lesson)return;
  const next=structuredClone(lesson);
  next.lessonDetails.bigIdeas[0].text=value;
  if(next.preparedActivities.bigIdeaCryptogram)next.preparedActivities.bigIdeaCryptogram.phrase=value;
  if(next.preparedActivities.connectBigIdea)next.preparedActivities.connectBigIdea.phrase=value;
  setLesson(next);setPreflight(null);setReviewed(prev=>prev.filter(x=>x!==active?.id));
 }
 function findPassage(){
  if(!index){setError('Load the official BSB text file first.');return;}
  try{
   const next=getBsbPassage(index,reference);
   const tokenCount=wordSpans(next.text).length;
   setPassage(next);setStart(0);setEnd(tokenCount-1);
   setFinish(suggestBlankWords(next.text));
   setUnscramble(suggestBlankWords(next.text));
   setDisplayReference(next.reference);setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function changeBounds(s:number,e:number){
  if(!passage)return;
  const nextText=clipToWords(passage.text,s,e);
  setStart(s);setEnd(e);setFinish(suggestBlankWords(nextText));
  setUnscramble(suggestBlankWords(nextText));
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
   setPreflight(null);setError('');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function approveActive(){
  if(!active)return;
  setReviewed(prev=>prev.includes(active.id)?prev:[...prev,active.id]);
  const next=tasks.find(t=>t.id!==active.id&&!reviewed.includes(t.id));
  if(next)setSelectedId(next.id);
 }
 const verseText=passage?clipToWords(passage.text,start,end):'';
 const verseWords=wordSpans(verseText);
 const versePreview=lesson?.lessonDetails?.memoryVerse;
 const canPublish=lesson&&remaining===0&&preflight!==null&&preflight.length===0&&
  reviewer.trim()&&signDate&&rightsConfirmed&&(manifest!==null||confirmEmptyManifest);
 function downloadApproved(){
  if(!canPublish||!lesson)return;
  try{
   const approved=createApprovedLesson(lesson,reviewer,signDate);
   downloadJson(lesson.id+'.lesson.json',approved);
   setError('Approved lesson downloaded. Download the rights manifest separately, then submit BOTH files in one GitHub PR. Publication will remain blocked until CI passes.');
  }catch(e){setError(String((e as Error).message??e));}
 }
 function downloadRights(){
  if(!canPublish||!lesson)return;
  try{downloadJson('rights-manifest.json',updatedRightsManifest(manifest,lesson.id,reviewer,signDate));}
  catch(e){setError(String((e as Error).message??e));}
 }
 const mcIndex=active?.id.startsWith('mc:')?lesson?.preparedActivities?.multipleChoice?.findIndex((x:any)=>'mc:'+x.id===active.id):-1;
 const factIndex=active?.id.startsWith('fact:')?lesson?.facts?.findIndex((x:any)=>'fact:'+x.id===active.id):-1;
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
      <div className="review-meter"><div style={{width:(tasks.length?complete/tasks.length*100:0)+'%'}}/></div>
      <small>{complete} of {tasks.length} decisions reviewed</small>
      <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review-session.json',{lesson,reviewed,selectedId})}>Download review session (keeps checkmarks)</button>
      <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review.json',lesson)}>Download working JSON</button>
     </>}
     <small>Progress autosaves in this browser only. To continue on another device, download your review session and import it there to keep edits and checkmarks.</small>
    </section>
    {lesson&&<section className="review-panel">
     <h2>2. Review items</h2>
     <nav className="review-nav" aria-label="Review items">
      {tasks.map(t=><button type="button" key={t.id}
        className={(t.id===active?.id?'selected ':'')+(reviewed.includes(t.id)?'done':'')}
        onClick={()=>{setSelectedId(t.id);setError('');}}>
        <span>{reviewed.includes(t.id)?'✓':'○'}</span><span><small>{t.group}</small>{t.label}</span>
       </button>)}
     </nav>
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
        <label>Question<textarea value={mc.question} onChange={e=>change(['preparedActivities','multipleChoice',mcIndex,'question'],e.target.value)}/></label>
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
        <label>False statement<textarea value={f.statement} onChange={e=>change(['facts',factIndex,'statement'],e.target.value)}/></label>
        <SourceContext lesson={lesson} ids={f.sourceIds??[]}/>
       </div>;
      })()}
      {active.id==='finish-story'&&<div className="review-fields">
       <label>Adapted story paragraph<textarea rows={9} value={lesson.preparedActivities.finishStory.markedParagraph}
        onChange={e=>change(['preparedActivities','finishStory','markedParagraph'],e.target.value)}/></label>
       <p className="review-source">The square-bracketed original emphasis words must be preserved and remain in chronological order.</p>
       <SourceContext lesson={lesson} ids={lesson.preparedActivities.finishStory.sourceIds??[]}/>
      </div>}
      {active.id==='circle-mistakes'&&<div className="review-fields">
       <label>Deliberately incorrect paragraph<textarea rows={7} value={lesson.preparedActivities.circleMistakes.paragraph}
        onChange={e=>change(['preparedActivities','circleMistakes','paragraph'],e.target.value)}/></label>
       {lesson.preparedActivities.circleMistakes.mistakes.map((m:any,i:number)=>
        <div className="review-pair" key={i}>
         <label>Incorrect phrase {i+1}<input value={m.incorrect} onChange={e=>change(['preparedActivities','circleMistakes','mistakes',i,'incorrect'],e.target.value)}/></label>
         <label>Correction<input value={m.correction} onChange={e=>change(['preparedActivities','circleMistakes','mistakes',i,'correction'],e.target.value)}/></label>
        </div>)}
       <p className="review-source">Every incorrect phrase must actually appear in the paragraph.</p>
      </div>}
      {active.id==='odd-words'&&<div className="review-fields">
       <label>Suggested unrelated words — one per line<textarea rows={7} value={lesson.preparedActivities.oddWords.unrelated.join('\n')}
        onChange={e=>changeWordList('oddWords','unrelated',e.target.value)}/></label>
       <p>Original related words: {lesson.preparedActivities.oddWords.related.join(', ')}</p>
      </div>}
      {active.id==='checkboxes'&&<div className="review-fields">
       <label>Suggested incorrect choices — one per line<textarea rows={7} value={lesson.preparedActivities.checkboxes.incorrect.join('\n')}
        onChange={e=>changeWordList('checkboxes','incorrect',e.target.value)}/></label>
       <p>Correct choices: {lesson.preparedActivities.checkboxes.correct.join(', ')}</p>
      </div>}
      {active.id==='sensitivity'&&<div className="review-note">
       <h3>Age suitability</h3>
       <p>The curriculum discusses the destruction of the Egyptian army. Please decide whether the prepared story, sorting and drawing prompts use age-appropriate wording for your classes. You can adjust the relevant content in the working JSON before marking this reviewed.</p>
      </div>}
      {active.id==='important-idea'&&<div className="review-fields">
       <label>Important Idea (synchronized across Big Idea puzzles)
        <input value={lesson.lessonDetails.bigIdeas?.[0]?.text??''} onChange={e=>changeIdea(e.target.value)}/></label>
       <p className="review-source">The source page-5 graphic uses “The Lord God is a mighty savior.” The later prose has different capitalization and punctuation.</p>
      </div>}
      {active.id==='bsb-verse'&&<div className="review-fields">
       <div className="review-note">
        <h3>Berean Standard Bible — public domain</h3>
        <p>Original curriculum uses {lesson.lessonDetails.memoryVerse.translation}. Your approved worksheet will use the exact BSB text you choose. Select an entire verse or a passage spanning verses, then choose the first and last words of the excerpt.</p>
        <a href="https://berean.bible/terms.htm" target="_blank" rel="noreferrer">Official BSB public-domain terms</a>
       </div>
       {index?<p className="review-success">BSB loaded: {index.books.length} books, {index.count.toLocaleString()} numbered verse records.</p>:<>
        <p className="review-warning">The Bible text is not loaded. {bibleError}</p>
        <label className="review-upload">Import official bsb.txt <input type="file" accept=".txt,text/plain" onChange={loadBsb}/></label>
        <a href="https://berean.bible/downloads.htm" target="_blank" rel="noreferrer">Get the official text file</a>
       </>}
       <div className="review-pair">
        <label>Look up passage (e.g. Exodus 15:11-12)
         <input value={reference} onChange={e=>setReference(e.target.value)}/></label>
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
        <p className="review-source">Select words to become blanks in each activity. Use 2–8 for Finish the Verse and 4–8 for Unscramble the Verse; each answer must contain at most nine letters.</p>
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
        <button type="button" onClick={useBsb}>Apply BSB to all verse activities</button>
       </>}
       <div className="review-verse"><small>Currently stored in the curriculum</small>
        <p>{versePreview.reference} ({versePreview.translation})</p><p>{versePreview.text}</p>
       </div>
       <p className="review-source">After applying the BSB excerpt, review it here and then mark this section reviewed. No ESV wording will be retained in the exported prepared verse fields.</p>
      </div>}
      <div className="review-actions">
       <button type="button" className="review-approve" onClick={approveActive}>{reviewed.includes(active.id)?'Reviewed — next':'Mark reviewed & continue'}</button>
       <button type="button" className="review-secondary" onClick={()=>setReviewed(x=>x.filter(id=>id!==active.id))}>Needs more work</button>
      </div>
     </section>}
     <section className="review-panel">
      <h2>3. Validate & export</h2>
      <p>{remaining===0?'All review items marked. Run the actual converter preflight before approval.':remaining+' review decisions remain. You can export a working JSON at any time.'}</p>
      <div className="review-actions">
       <button type="button" onClick={()=>{try{setPreflight(checkReviewContent(lesson));setError('');}catch(e){setPreflight([String((e as Error).message??e)]);}}}>Run preflight checks</button>
       <button type="button" className="review-secondary" onClick={()=>downloadJson(lesson.id+'.review.json',lesson)}>Export working JSON</button>
      </div>
      {preflight&&<div className={preflight.length?'review-errors':'review-success'} role="status">
       {preflight.length?<>Preflight found {preflight.length} issue(s):<ul>{preflight.map((s,i)=><li key={i}>{s}</li>)}</ul></>:
        'Preflight passed: all 27 candidates can be converted. GitHub CI still must independently verify the approved file.'}
      </div>}
      <div className="review-signoff">
       <h3>Final publication signoff</h3>
       <p>Only complete this after you've reviewed the items and Bible text. A downloaded file is not published until you submit it through GitHub and CI passes.</p>
       <div className="review-pair">
        <label>Curriculum reviewer name<input value={reviewer} onChange={e=>setReviewer(e.target.value)}/></label>
        <label>Approval date<input type="date" value={signDate} onChange={e=>setSignDate(e.target.value)}/></label>
       </div>
       <label className="review-checkbox"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/>
        I checked the official BSB public-domain terms and confirm the selected Scripture is verbatim from the loaded BSB source.</label>
       <label className="review-upload">Import current rights-manifest.json (preserves other lessons)
        <input type="file" accept=".json,application/json" onChange={loadManifest}/></label>
       <label className="review-checkbox"><input type="checkbox" checked={confirmEmptyManifest}
        onChange={e=>{setConfirmEmptyManifest(e.target.checked);if(e.target.checked)setManifest(null);}}/>
        Alternatively, I confirm this repository's rights manifest currently has no lesson entries.</label>
       <div className="review-actions">
        <button type="button" disabled={!canPublish} onClick={downloadApproved}>Download approved lesson JSON</button>
        <button type="button" disabled={!canPublish} onClick={downloadRights}>Download updated rights manifest</button>
       </div>
       <p className="review-source">Upload the approved lesson to <code>curriculum/approved/{lesson.id}.lesson.json</code>, move the old review-stage file out of <code>curriculum/review/</code>, and replace the rights manifest in the same PR. CI is the final publication gate.</p>
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
