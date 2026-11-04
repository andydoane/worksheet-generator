import TrueFalsePrintPreview from '../TrueFalsePrintPreview.tsx';
import PuzzlePreview from '../PuzzlePreview.tsx';
import type {Lesson} from './model.ts';
import {
 eligibleFacts,factSelectionIssues,factUsage,selectFact,selectedFact,
 suggestUnusedFact,type FactUse,
} from './storyFactEditor.ts';

export default function FactChoiceReviewEditor({lesson,kind,onChange,onError}:{
 lesson:Lesson;kind:'trueFalse'|'trueFalseMaze';
 onChange:(next:Lesson)=>void;onError:(message:string)=>void;
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
 const apply=(id:string)=>{
  try{onChange(selectFact(lesson,kind,id));onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 return <div id={'review-field-'+(isMaze?'true-false-maze':'true-false')}
  tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>{title} · choose a canonical fact</h3>
   <p>The wording and correct TRUE/FALSE answer come directly from an existing fact in the lesson. This editor changes the prepared selection only; it does not rewrite canonical facts, change the truth value, or invent a new statement.</p>
   <p>Choose a different unused fact if it overlaps Sort the Story or the other True/False activity. {title} supports a statement of up to {limit} characters.</p>
  </div>
  <label>Selected canonical fact
   <select value={selected?.factId??''} onChange={e=>{if(e.target.value)apply(e.target.value);}}>
    {!selected?.factId&&<option value="">Choose a canonical fact…</option>}
    {selected?.factId&&!options.some((f:any)=>f.id===selected.factId)&&
     <option value={selected.factId}>Unusable / unknown: {selected.factId}</option>}
    {options.map((fact:any)=>{
     const other=(usage.get(fact.id)??[]).filter(label=>
      label!==(isMaze?'True/False Maze':'True/False'));
     return <option key={fact.id} value={fact.id} disabled={other.length>0}>
      {fact.isTrue?'TRUE':'FALSE'} · {fact.id} · {fact.statement}
     </option>;
    })}
   </select>
  </label>
  {selected&&<div className="review-fact-detail">
   <div className="review-match-heading">
    <strong>{canonical?.isTrue===true?'Correct answer: TRUE':
     canonical?.isTrue===false?'Correct answer: FALSE':'Canonical fact missing'}</strong>
    <small>{canonical?.id??selected.factId}</small>
   </div>
   <p className="review-fact-statement">{canonical?.statement??selected.statement}</p>
   <p className="review-source">Origin: {canonical?.origin??'unknown'} ·
    {canonical?.sourceIds?.join(', ')??' no sources'}
    {canonical?.teacherReviewRequired?' · teacher review required':''}</p>
   {otherUses.length>0&&<p className="review-warning" role="status">
    Also selected for: {otherUses.join(', ')}. Choose an unused fact to prevent repeated printed content.
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
    <button type="button" className="review-secondary"
     onClick={()=>apply(canonical.id)}>Restore exact canonical wording and answer</button>}
  </div>
  {!alternative&&<p className="review-source">
   No unused canonical fact fits this activity. Review the lesson's fact pool to add or approve additional material; the generator cannot invent a substitute.
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
