import {useState} from 'react';
import SortStoryPrintPreview from '../SortStoryPrintPreview.tsx';
import type {Lesson} from './model.ts';
import {
 eligibleFacts,factBank,factSelectionIssues,factUsage,
 moveSortFact,removeSortFact,selectFact,sortSelections,suggestUnusedFact,
} from './storyFactEditor.ts';

export default function SortStoryReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const entries=sortSelections(lesson),issues=factSelectionIssues(lesson,'sortStory');
 const available=eligibleFacts(lesson,'sortStory'),usage=factUsage(lesson);
 const [addingId,setAddingId]=useState('');
 const apply=(fn:()=>Lesson)=>{
  try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const previewValid=issues.length===0;
 const invalidStored=lesson.preparedActivities?.sortStory!==undefined&&
  !Array.isArray(lesson.preparedActivities.sortStory);
 return <div id="review-field-sort-story" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Sort the Story · {entries.length}/8 facts</h3>
   <p>Select 4–8 canonical facts, including at least one TRUE and one FALSE. The fact's original statement, correct answer and source references are kept together. You cannot accidentally change the answer by editing a copied statement.</p>
   <p>Different activities in Preset 3 should use different facts. The generator can sometimes find alternatives, but this editor lets you choose them intentionally.</p>
  </div>
  {invalidStored&&<p className="review-warning">The saved facts are not an array. Use the Advanced JSON section below for a structural repair.</p>}
  {issues.length>0&&<div className="review-warning" role="status">
   <strong>Sort the Story needs attention</strong>
   <ul>{issues.filter(item=>item.index===undefined).map((item,i)=><li key={i}>{item.message}</li>)}</ul>
  </div>}
  <div className="review-story-fact-rows">
   {entries.map((item,i)=>{
    const fact=lesson.facts?.find((fact:any)=>fact.id===item.factId);
    const localIssues=issues.filter(issue=>issue.index===i);
    const otherUses=(usage.get(item.factId)??[]).filter(label=>label!=='Sort the Story #'+(i+1));
    const alternative=suggestUnusedFact(lesson,'sortStory',i);
    return <div className="review-story-fact-row" key={i} role="group"
     aria-label={'Sort the Story fact '+(i+1)}>
     <div className="review-match-heading">
      <strong>Fact {i+1}</strong>
      <small>{fact?.isTrue===true?'TRUE':fact?.isTrue===false?'FALSE':'Unknown truth'}</small>
     </div>
     <label>Canonical fact
      <select id={'review-sort-fact-'+i} value={item.factId??''}
       onChange={e=>{
        if(e.target.value)apply(()=>selectFact(lesson,'sortStory',e.target.value,i));
       }}>
       {!available.some((option:any)=>option.id===item.factId)&&
        <option value={item.factId??''}>{item.factId?'Unusable / unknown: '+item.factId:'Choose a fact…'}</option>}
       {available.map((option:any)=>{
        const other=(usage.get(option.id)??[]).filter(label=>label!=='Sort the Story #'+(i+1));
        return <option key={option.id} value={option.id} disabled={other.length>0}>
         {option.isTrue?'TRUE':'FALSE'} · {option.id} · {option.statement}
        </option>;
       })}
      </select>
     </label>
     <p className="review-fact-statement">{fact?.statement??item.statement??'No canonical fact found.'}</p>
     <p className="review-source">Origin: {fact?.origin??'unknown'} · {fact?.sourceIds?.join(', ')??'no source'}
      {fact?.teacherReviewRequired?' · teacher review required':''}</p>
     {otherUses.length>0&&<p className="review-warning">
      Also selected for: {otherUses.join(', ')}. Choose a distinct fact to avoid booklet repetition.
     </p>}
     {localIssues.length>0&&<ul className="review-match-errors">
      {localIssues.map((issue,j)=><li key={j}>{issue.message}</li>)}
     </ul>}
     {fact?.sourceIds?.length>0&&<details className="review-sources">
      <summary>Original Story Note sources</summary>
      {fact.sourceIds.map((id:string)=>{
       const note=lesson.storyNotes?.find((n:any)=>n.id===id);
       return <blockquote key={id}><small>{id}</small><p>{note?.originalText??'Source note missing'}</p></blockquote>;
      })}
     </details>}
     <div className="review-match-actions">
      <button type="button" className="review-secondary" disabled={!alternative}
       onClick={()=>alternative&&apply(()=>selectFact(lesson,'sortStory',alternative,i))}>
       Choose unused fact
      </button>
      <button type="button" className="review-secondary" disabled={i===0}
       onClick={()=>apply(()=>moveSortFact(lesson,i,-1))}>Move up</button>
      <button type="button" className="review-secondary" disabled={i===entries.length-1}
       onClick={()=>apply(()=>moveSortFact(lesson,i,1))}>Move down</button>
      <button type="button" className="review-secondary" disabled={entries.length<=4}
       onClick={()=>{
        if(window.confirm('Remove Sort the Story fact '+(i+1)+'?'))
         apply(()=>removeSortFact(lesson,i));
       }}>Remove</button>
     </div>
    </div>;
   })}
  </div>
  <div className="review-story-add">
   <label>Add another canonical fact
    <select value={addingId} disabled={entries.length>=8} onChange={e=>setAddingId(e.target.value)}>
     <option value="">Choose an unused fact…</option>
     {available.map((fact:any)=><option key={fact.id} value={fact.id}
      disabled={usage.has(fact.id)}>
      {fact.isTrue?'TRUE':'FALSE'} · {fact.id} · {fact.statement}
     </option>)}
    </select>
   </label>
   <button type="button" className="review-secondary" disabled={entries.length>=8||!addingId}
    onClick={()=>{apply(()=>selectFact(lesson,'sortStory',addingId));setAddingId('');}}>
    + Add selected fact
   </button>
  </div>
  {eligibleFacts(lesson,'sortStory').filter((f:any)=>!usage.has(f.id)).length===0&&
   <p className="review-source">No further unused canonical facts are available. Review the existing lesson facts before adding more material; this editor does not invent facts.</p>}
  <section className="review-activity-preview">
   <h3>Print-matched Sort the Story preview</h3>
   {previewValid?<SortStoryPrintPreview module={{
    type:'sort-story',statements:entries.map(item=>
     item.statement+' '+String(item.isTrue)).join('\n'),seed:1,
   }}/>:
   <p className="review-warning">Select valid canonical TRUE and FALSE facts to preview the printable activity.</p>}
  </section>
 </div>;
}
