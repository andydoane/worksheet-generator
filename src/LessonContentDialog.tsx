import {useEffect,useMemo,useRef,useState} from 'react';
import BsbPassagePicker from './BsbPassagePicker.tsx';
import {BIG_IDEA_MAX_CHARACTERS,MEMORY_VERSE_MAX_CHARACTERS} from './lessonContentLimits.ts';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {
 planLessonContentChange,applyLessonContentChange,
 type LessonContentChange,type LessonContentPrintMetrics,
 type CustomizedContentPolicy,
} from './lessonContentSync.ts';
import type {LessonContentKind} from './lessonContentLinks.ts';
import type {StoredDraft} from './draftMigration.ts';
import {
 presetOriginalChange,activitySlotLabel,changePlanMessages,
} from './lessonContentDialogModel.ts';
import './lessonContentDialog.css';

type Props={
 kind:LessonContentKind;
 draft:StoredDraft;
 restoreOriginal?:boolean;
 onApply:(next:StoredDraft)=>void;
 onClose:()=>void;
};

/** The native modal protects keyboard focus and prevents unrelated worksheet
 * edits while the teacher reviews a proposed atomic content change.
 */
export default function LessonContentDialog({
 kind,draft,restoreOriginal=false,onApply,onClose,
}:Props){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const original=presetOriginalChange(draft,kind);
 const starting=restoreOriginal?original:null;
 const [bigIdea,setBigIdea]=useState(
  starting?.kind==='bigIdea'?starting.text:draft.bigIdea);
 const [source,setSource]=useState<'bsb'|'custom'>(
  draft.verseTranslation==='BSB'||!draft.verseText.trim()?'bsb':'custom');
 const [reference,setReference]=useState(
  starting?.kind==='memoryVerse'?starting.reference:draft.verseReference);
 const [verseText,setVerseText]=useState(
  starting?.kind==='memoryVerse'?starting.text:draft.verseText);
 const [translation,setTranslation]=useState(
  starting?.kind==='memoryVerse'?starting.translation??'':
   draft.verseTranslation==='BSB'?'':draft.verseTranslation??'');
 const [proposed,setProposed]=useState<LessonContentChange|null>(starting);
 const [reviewing,setReviewing]=useState(!!starting);
 const [policy,setPolicy]=useState<CustomizedContentPolicy>('block');
 const [metrics,setMetrics]=useState<LessonContentPrintMetrics|null>(null);
 const [fontError,setFontError]=useState('');

 useEffect(()=>{
  const node=dialogRef.current;
  if(node&&!node.open)node.showModal();
  return ()=>{if(node?.open)node.close();};
 },[]);
 useEffect(()=>{
  let current=true;
  void mediumWidths().then(widths=>{
   if(current)setMetrics({
    title:widths.title,body:widths.finishBody,puzzle:widths.puzzlePdf,
    bank:widths.bank,subtitle:widths.boldPdf,bankInkCenter:widths.bankInkCenter,
   });
  }).catch(()=>{
   if(current)setFontError('Print fonts could not be loaded. The affected activities cannot be verified until they load.');
  });
  return ()=>{current=false;};
 },[]);

 const isVerse=kind==='memoryVerse';
 const heading=isVerse?'Change Memory Verse':'Change Big Idea';
 const plan=useMemo(()=>proposed?planLessonContentChange(draft,proposed,{
  customized:policy,print:metrics??undefined,
 }):null,[draft,proposed,policy,metrics]);
 const issues=plan?changePlanMessages(draft,plan):[];
 const valid=reviewing&&!!plan?.updatedDraft;
 function review(next:LessonContentChange){
  setPolicy('block');
  if(next.kind==='memoryVerse'){
   setReference(next.reference);
   setVerseText(next.text);
  }
  setProposed(next);
  setReviewing(true);
 }
 function reviewTyped(){
  if(kind==='bigIdea')review({kind,text:bigIdea});
  else review({kind:'memoryVerse',reference,text:verseText,
   translation:translation.trim()||null});
 }
 function validateBsb(selection:{reference:string;text:string}):string[]{
  if(!metrics)return ['Checking PDF font measurements before permitting a verse change.'];
  const validation=planLessonContentChange(draft,{
   kind:'memoryVerse',reference:selection.reference,text:selection.text,translation:'BSB',
  },{print:metrics,customized:'block'});
  return changePlanMessages(draft,validation);
 }
 function commit(){
  if(!valid||!plan)return;
  onApply(applyLessonContentChange(plan));
 }
 const action=restoreOriginal?'Restore original':'Apply changes';

 return <dialog className="lesson-content-dialog" ref={dialogRef}
  aria-labelledby="lesson-content-dialog-title"
  onCancel={event=>{event.preventDefault();onClose();}}>
  <div className="lesson-content-dialog-head">
   <div>
    <span className="lesson-content-kicker">WORKSHEET LESSON CONTENT</span>
    <h2 id="lesson-content-dialog-title">{heading}</h2>
    <p>Updates are saved only in this worksheet. Your approved lesson and other story activities remain unchanged.</p>
   </div>
   <button type="button" className="lesson-dialog-close" aria-label="Cancel and close" onClick={onClose}>✕</button>
  </div>

  <div className="lesson-content-dialog-body">
   {!reviewing&&<>
    {kind==='bigIdea'?<div className="lesson-dialog-field">
     <label htmlFor="lesson-edit-big-idea">Big Idea</label>
     <textarea id="lesson-edit-big-idea" rows={3} maxLength={BIG_IDEA_MAX_CHARACTERS} value={bigIdea}
      placeholder="What is the main idea the children should remember?"
      onChange={e=>setBigIdea(e.target.value)}/>
     <small>{bigIdea.trim().length} / {BIG_IDEA_MAX_CHARACTERS} characters (Solve the Code limit). Letter variety and print fitting are also checked.</small>
    </div>:<>
     <div className="lesson-verse-source" role="group" aria-label="Where to get your memory verse">
      <button type="button" className={source==='bsb'?'selected':''}
       aria-pressed={source==='bsb'} onClick={()=>setSource('bsb')}>Choose from the BSB</button>
      <button type="button" className={source==='custom'?'selected':''}
       aria-pressed={source==='custom'} onClick={()=>setSource('custom')}>Type my own verse</button>
     </div>
     {source==='bsb'?<BsbPassagePicker
      initialReference={reference||'Exodus 15:11'}
      onCancel={onClose}
      maxCharacters={MEMORY_VERSE_MAX_CHARACTERS}
      validateSelection={validateBsb}
      onApply={selection=>review({kind:'memoryVerse',reference:selection.reference,
       text:selection.text,translation:'BSB'})}
     />:<div className="lesson-dialog-manual">
      <div className="lesson-dialog-field">
       <label htmlFor="lesson-edit-verse-reference">Memory Verse reference</label>
       <input id="lesson-edit-verse-reference" value={reference} maxLength={120}
        placeholder="e.g. John 3:16" onChange={e=>{
         setReference(e.target.value);
         if(translation==='BSB')setTranslation('');
        }}/>
      </div>
      <div className="lesson-dialog-field">
       <label htmlFor="lesson-edit-verse-text">Memory Verse text</label>
       <textarea id="lesson-edit-verse-text" rows={5} maxLength={MEMORY_VERSE_MAX_CHARACTERS}
        placeholder="Enter or paste the exact verse text."
        value={verseText} onChange={e=>{
         setVerseText(e.target.value);
         if(translation==='BSB')setTranslation('');
        }}/>
       <small>{verseText.trim().length} / {MEMORY_VERSE_MAX_CHARACTERS} characters (Verse Cryptogram limit). Word counts, brackets, and print fitting are also checked.</small>
      </div>
      <div className="lesson-dialog-field">
       <label htmlFor="lesson-edit-verse-translation">Translation or source (optional)</label>
       <input id="lesson-edit-verse-translation" maxLength={80}
        placeholder="e.g. KJV, your own wording"
        value={translation} onChange={e=>setTranslation(e.target.value)}/>
       <small>Only text chosen directly from our BSB picker is automatically marked BSB. Check permissions when distributing text from other translations.</small>
      </div>
     </div>}
    </>}
    {(kind==='bigIdea'||source==='custom')&&<div className="lesson-dialog-actions">
     <button type="button" onClick={onClose}>Cancel</button>
     <button type="button" className="lesson-dialog-primary" onClick={reviewTyped}>
      Review affected activities</button>
    </div>}
   </>}

   {reviewing&&proposed&&plan&&<div className="lesson-dialog-review">
    <section className="lesson-dialog-selection" aria-label="Proposed lesson content">
     <strong>{kind==='bigIdea'?'Proposed Big Idea':'Proposed Memory Verse'}</strong>
     {proposed.kind==='memoryVerse'&&<span className="lesson-dialog-reference">
      {proposed.reference} · {proposed.translation||'Custom/unspecified translation'}</span>}
     <p>{proposed.text}</p>
     <small>{proposed.text.trim().length} characters</small>
    </section>
    <section className="lesson-dialog-impact" aria-label="Affected worksheet activities">
     <h3>Affected activities ({plan.linkedSlots.length})</h3>
     {plan.linkedSlots.length===0?
      <p>No current activities are linked to this {isVerse?'Memory Verse':'Big Idea'}.
       Only the lesson details will change.</p>:
      <ul>{plan.linkedSlots.map(slot=><li key={slot}>
       <span>{activitySlotLabel(draft,slot)}</span>
       <small>{plan.preservedSlots.includes(slot)?'Keep original activity text':
        plan.conflicts.some(item=>item.slot===slot)&&policy==='block'?
         'Needs your decision':plan.issues.some(item=>item.slot===slot)?
          'Does not fit':'Update with new text'}</small>
      </li>)}</ul>}
    </section>
    {plan.conflicts.length>0&&<fieldset className="lesson-dialog-conflicts">
     <legend>These activities contain individual edits</legend>
     <p>{plan.conflicts.map(c=>activitySlotLabel(draft,c.slot)).join(', ')}.</p>
     <label><input type="radio" name="lesson-custom-policy" value="block"
      checked={policy==='block'} onChange={()=>setPolicy('block')}/>
      Do not change until I decide</label>
     <label><input type="radio" name="lesson-custom-policy" value="keep"
      checked={policy==='keep'} onChange={()=>setPolicy('keep')}/>
      Keep my edits and disconnect these activities from the shared lesson text</label>
     <label><input type="radio" name="lesson-custom-policy" value="replace"
      checked={policy==='replace'} onChange={()=>setPolicy('replace')}/>
      Replace my individual edits with the new {isVerse?'verse':'Big Idea'}</label>
    </fieldset>}
    {issues.length>0&&<div className="lesson-dialog-errors" role="alert">
     <strong>This text cannot be applied yet:</strong>
     <ul>{issues.map((message,i)=><li key={i}>{message}</li>)}</ul>
     <p>Choose a shorter passage or adjust your wording, then review again.
      No activities have been changed.</p>
    </div>}
    {!issues.length&&policy==='block'&&plan.conflicts.length>0&&
     <p className="lesson-dialog-warning" role="status">
      Choose how to handle the edited activities before applying.</p>}
    {valid&&<p className="lesson-dialog-ready" role="status">
     Ready: {plan.updatedSlots.length} {plan.updatedSlots.length===1?'activity':'activities'}
     {' '}will update{plan.preservedSlots.length?
      ', '+plan.preservedSlots.length+' edited activities will remain independent':''}.
     The change is checked against each linked activity's rules and printable layout.
    </p>}
    <div className="lesson-dialog-actions">
     <button type="button" onClick={onClose}>Cancel</button>
     <button type="button" onClick={()=>setReviewing(false)}>Edit selection</button>
     <button type="button" className="lesson-dialog-primary" disabled={!valid}
      onClick={commit}>{action}</button>
    </div>
   </div>}
   {fontError&&<p className="lesson-dialog-warning" role="alert">{fontError}</p>}
  </div>
 </dialog>;
}
