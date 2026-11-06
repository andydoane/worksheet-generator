import {useEffect,useState} from 'react';
import TrueFalsePrintPreview from '../TrueFalsePrintPreview.tsx';
import PuzzlePreview from '../PuzzlePreview.tsx';
import type {Lesson} from './model.ts';
import {
 createAdaptedFact,eligibleFacts,factSelectionIssues,factUsage,
 movableSortFacts,moveSortFactToChoice,selectFact,selectedFact,suggestUnusedFact,
} from './storyFactEditor.ts';

export default function FactChoiceReviewEditor({lesson,kind,onChange,onError}:{
 lesson:Lesson;kind:'trueFalse'|'trueFalseMaze';
 onChange:(next:Lesson,changedSort?:boolean)=>void;onError:(message:string)=>void;
}){
 const selected=selectedFact(lesson,kind);
 const canonical=lesson.facts?.find((fact:any)=>fact.id===selected?.factId);
 const issues=factSelectionIssues(lesson,kind);
 const usage=factUsage(lesson);
 const options=eligibleFacts(lesson,kind);
 const otherUses=(usage.get(selected?.factId??'')??[]).filter(label=>
  label!==(kind==='trueFalse'?'True/False':'True/False Maze'));
 const alternative=suggestUnusedFact(lesson,kind);
 const isMaze=kind==='trueFalseMaze';
 const title=isMaze?'True/False Maze':'True/False';
 const limit=isMaze?65:80;
 const [sourceId,setSourceId]=useState(selected?.factId??'');
 const [draft,setDraft]=useState(selected?.statement??'');
 const [moveId,setMoveId]=useState('');
 useEffect(()=>{
  setSourceId(selected?.factId??'');
  setDraft(selected?.statement??'');
  setMoveId('');
 },[kind,selected?.factId]);
 const source=lesson.facts?.find((fact:any)=>fact.id===sourceId);
 const movable=movableSortFacts(lesson,kind);
 const apply=(id:string)=>{
  try{onChange(selectFact(lesson,kind,id));onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const saveAdaptation=()=>{
  if(!source)return;
  if(!window.confirm(
   'Create a NEW canonical fact adapted from '+source.id+' and use it for '+title+'?\n\n'+
   'Confirm that the shortened statement is true or false exactly as the source fact says. '+
   'The original statement and truth value will remain unchanged. '+
   'The new adaptation will require your review before publication.'
  ))return;
  try{onChange(createAdaptedFact(lesson,kind,source.id,draft));onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const moveFromSort=()=>{
  if(!moveId)return;
  if(!window.confirm('Move '+moveId+' from Sort the Story to '+title+'?\n\n'+
    'The Sort the Story activity will lose this row and require renewed review.'))return;
  try{onChange(moveSortFactToChoice(lesson,kind,moveId),true);onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 return <div id={'review-field-'+(isMaze?'true-false-maze':'true-false')}
  tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>{title} · choose a canonical fact</h3>
   <p>Every prepared statement and correct answer must match its selected canonical fact. The original fact is never edited by this activity.</p>
   <p>Choose an unused fact, move a fitting fact from Sort the Story, or create a shorter teacher-reviewed adaptation linked to a source fact. {title} permits up to {limit} characters.</p>
  </div>
  <label>Selected canonical fact
   <select value={selected?.factId??''} onChange={e=>{if(e.target.value)apply(e.target.value);}}>
    {!selected?.factId&&<option value="">Choose a canonical fact…</option>}
    {selected?.factId&&!options.some((f:any)=>f.id===selected.factId)&&
     <option value={selected.factId}>{canonical?
      'Too long ('+String(canonical.statement).trim().length+'/'+limit+'): '+selected.factId:
      'Canonical fact not found: '+selected.factId}</option>}
    {options.map((fact:any)=>{
     const other=(usage.get(fact.id)??[]).filter(label=>
      label!==(isMaze?'True/False Maze':'True/False'));
     return <option key={fact.id} value={fact.id} disabled={other.length>0}>
      {fact.isTrue?'TRUE':'FALSE'} · {fact.id} · {fact.statement}
      {other.length?' (used: '+other.join(', ')+')':''}
     </option>;
    })}
   </select>
  </label>
  {selected&&<div className="review-fact-detail">
   <div className="review-match-heading">
    <strong>{canonical?.isTrue===true?'Correct answer: TRUE':
     canonical?.isTrue===false?'Correct answer: FALSE':'Canonical fact missing'}</strong>
    <small>{canonical?.id??selected.factId??'No fact linked'}</small>
   </div>
   <p className="review-fact-statement">{canonical?.statement??selected.statement}</p>
   <p className="review-source">Origin: {canonical?.origin??'unknown'} ·
    {canonical?.sourceIds?.length?canonical.sourceIds.join(', '):
     canonical?.source?.filename?
      canonical.source.filename+' · page '+(canonical.source.page??'?'):
      'no recorded citation'}
    {canonical?.teacherReviewRequired?' · teacher review required':''}</p>
   {otherUses.length>0&&<p className="review-warning" role="status">
    Also selected for: {otherUses.join(', ')}. Choose a distinct fact to avoid repeated printed content.
   </p>}
   {canonical?.sourceIds?.length>0&&<details className="review-sources">
    <summary>Compare with original Story Notes</summary>
    {canonical.sourceIds.map((id:string)=>{
     const note=lesson.storyNotes?.find((n:any)=>n.id===id);
     return <blockquote key={id}><small>{id}</small><p>{note?.originalText??'Source note missing'}</p></blockquote>;
    })}
   </details>}
  </div>}
  {issues.length>0&&<div className="review-warning" role="status">
   <strong>Fix the selection</strong>
   <ul>{issues.map((issue,i)=><li key={i}>{issue.message}</li>)}</ul>
  </div>}
  <div className="review-match-actions">
   <button type="button" className="review-secondary" disabled={!alternative}
    onClick={()=>alternative&&apply(alternative)}>Choose another unused fact</button>
   {canonical&&issues.some(issue=>issue.message.includes('differs from canonical'))&&
    canonical.statement.trim().length<=limit&&
    <button type="button" className="review-secondary"
     onClick={()=>apply(canonical.id)}>Restore exact canonical wording and answer</button>}
  </div>
  <div className="review-note review-fact-repair">
   <h3>Create a shorter, source-linked fact</h3>
   <p>Use this when the original canonical statement is too long, already used, or your prepared statement has no fact ID. You supply and approve the truthful wording; the editor does not invent or verify new facts.</p>
   <label>Original canonical fact to adapt
    <select value={sourceId} onChange={e=>{
     const id=e.target.value,record=lesson.facts?.find((f:any)=>f.id===id);
     setDraft(sourceId===''&&selected?.statement?.trim()?
      selected.statement:String(record?.statement??''));
     setSourceId(id);
    }}>
     <option value="">Choose the original fact…</option>
     {(lesson.facts??[]).map((fact:any)=><option key={fact.id} value={fact.id}>
      {fact.isTrue?'TRUE':'FALSE'} · {fact.id} · {fact.statement}
     </option>)}
    </select>
   </label>
   {source&&<p className="review-source">
    Source: {source.id} · {source.isTrue?'TRUE':'FALSE'} ·
    {source.source?.filename?
     ' '+source.source.filename+' · page '+(source.source.page??'?'):
     (source.sourceIds?.length?' '+source.sourceIds.join(', '):' no recorded citation')}
   </p>}
   <label>Shorter statement (you confirm that the truth value stays the same)
    <textarea value={draft} onChange={e=>setDraft(e.target.value)}
     rows={3} maxLength={limit+40}/>
   </label>
   <p className="review-source">{draft.trim().length}/{limit} characters ·
    Correct answer remains {source?.isTrue?'TRUE':source?.isTrue===false?'FALSE':'unknown'}.
    A new fact ID is created and teacher review is required.</p>
   <button type="button" className="review-secondary"
    disabled={!source||!draft.trim()||draft.trim().length>limit}
    onClick={saveAdaptation}>Save as new adapted fact and select</button>
  </div>
  {movable.length>0&&<div className="review-note review-fact-repair">
   <h3>Or move a fact from Sort the Story</h3>
   <p>Only facts that fit {limit} characters and leave Sort the Story with at least four facts and both TRUE/FALSE answers are available.</p>
   <label>Eligible Sort the Story fact
    <select value={moveId} onChange={e=>setMoveId(e.target.value)}>
     <option value="">Choose a fact to move…</option>
     {movable.map((f:any)=><option key={f.id} value={f.id}>
      {f.isTrue?'TRUE':'FALSE'} · {f.id} · {f.statement}
     </option>)}
    </select>
   </label>
   <button type="button" className="review-secondary" disabled={!moveId}
    onClick={moveFromSort}>Move this fact here</button>
  </div>}
  {!alternative&&movable.length===0&&<p className="review-source">
   No unused canonical fact currently fits. Create a shorter, teacher-reviewed adaptation above, or adjust the fact pool. The editor does not invent a statement.
  </p>}
  <section className="review-activity-preview">
   <h3>{title} print preview</h3>
   {issues.length===0&&canonical?(isMaze?
    <PuzzlePreview module={{type:'true-false-maze',statement:selected!.statement,
     answer:canonical.isTrue,seed:1}}/>:
    <TrueFalsePrintPreview module={{type:'true-false',statement:selected!.statement}}/>):
    <p className="review-warning">Select a valid fact to preview this activity.</p>}
  </section>
 </div>;
}
