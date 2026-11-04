import {useMemo} from 'react';
import SpecialtyPreview from '../SpecialtyPreview.tsx';
import type {Lesson} from './model.ts';
import {
 addCrosswordPair,crosswordIssues,crosswordModule,crosswordVocabulary,
 editCrosswordPair,moveCrosswordPair,removeCrosswordPair,
 replaceCrosswordAnswerWithVocabulary,type CrosswordIssue,
} from './crosswordEditor.ts';

export default function CrosswordReviewEditor({lesson,onChange,onError,
 advancedJson,onAdvancedJsonChange,onApplyAdvancedJson}:{
 lesson:Lesson;
 onChange:(lesson:Lesson)=>void;
 onError:(message:string)=>void;
 advancedJson:string;
 onAdvancedJsonChange:(value:string)=>void;
 onApplyAdvancedJson:()=>void;
}){
 const saved=lesson.preparedActivities?.crossword;
 const malformed=saved!==undefined&&!Array.isArray(saved);
 const entries=Array.isArray(saved)?saved:[];
 const issues=useMemo(()=>crosswordIssues(entries),[entries]);
 const rowIssues=(index:number)=>issues.filter(issue=>issue.index===index);
 const vocabulary=useMemo(()=>crosswordVocabulary(lesson),[lesson]);
 const valid=issues.length===0&&!malformed;
 const apply=(action:()=>Lesson)=>{
  try{onChange(action());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const remove=(index:number)=>{
  if(!window.confirm('Remove crossword entry '+(index+1)+
   ' and its saved source references?'))return;
  apply(()=>removeCrosswordPair(lesson,index));
 };
 return <div id="review-field-crossword" className="review-fields" tabIndex={-1}>
  <div className="review-note">
   <h3>Crossword · {entries.length} of 6–10 answer/clue pairs</h3>
   <p>Each answer should have 3–12 A–Z letters (spaces may separate words). Each clue needs 1–85 characters; answers must be different and neither field can contain a comma.</p>
   <p>Valid answers must <strong>interlock in one connected crossword</strong>. This editor tests the same puzzle generator and print layout used by exported worksheets. If the words cannot connect, try a lesson vocabulary word with more letters in common and write an accurate new clue.</p>
   <p>Rewritten answers or clues retain their source-note links for context but become <strong>suggested and teacher-review-required</strong>. Selecting new vocabulary clears the old clue and replaces outdated source links.</p>
  </div>
  {malformed&&<p className="review-warning" role="alert">The stored crossword data is not an array. Expand Advanced JSON below to replace it with a list of answer/clue entries before continuing.</p>}
  {issues.length>0&&<div className="review-warning" role="status">
   <strong>Crossword needs attention</strong>
   <ul>{issues.filter(issue=>issue.index===undefined).map((issue,i)=>
    <li key={i}>{issue.message}</li>)}</ul>
   {issues.every(issue=>issue.index!==undefined)&&
    <p>Fix the highlighted entries below. The preview appears when the full grid can be generated.</p>}
  </div>}
  <div className="review-crossword-rows">
   {entries.map((entry:any,i:number)=><div key={i} className="review-crossword-row"
    role="group" aria-label={'Crossword entry '+(i+1)}>
    <div className="review-match-heading">
     <strong>Entry {i+1}</strong>
     <small>{entry.origin==='suggested'?'Suggested · requires teacher review':
      entry.origin??'Origin not recorded'}</small>
    </div>
    <div className="review-pair">
     <label>Answer
      <input id={'review-crossword-'+i+'-answer'} value={entry.answer??''}
       aria-invalid={rowIssues(i).some(issue=>issue.field==='answer')}
       aria-describedby={rowIssues(i).length?'review-crossword-'+i+'-errors':undefined}
       onChange={event=>apply(()=>editCrosswordPair(lesson,i,'answer',event.target.value))}/>
      <small>{String(entry.answer??'').replace(/\s+/gu,'').length}/12 letters</small>
     </label>
     <label>Clue
      <input id={'review-crossword-'+i+'-clue'} value={entry.clue??''}
       aria-invalid={rowIssues(i).some(issue=>issue.field==='clue')}
       aria-describedby={rowIssues(i).length?'review-crossword-'+i+'-errors':undefined}
       onChange={event=>apply(()=>editCrosswordPair(lesson,i,'clue',event.target.value))}/>
      <small>{String(entry.clue??'').length}/85 characters</small>
     </label>
    </div>
    <label className="review-crossword-vocab-label">Try existing lesson vocabulary
     <select value="" onChange={event=>{
      if(event.target.value)apply(()=>
       replaceCrosswordAnswerWithVocabulary(lesson,i,event.target.value));
     }}>
      <option value="">Choose a source-linked replacement…</option>
      {vocabulary.map(option=><option key={option.term} value={option.term}
       disabled={entries.some((item:any,j:number)=>j!==i&&
        String(item.answer??'').toUpperCase().replace(/\s+/gu,'')===
         option.term.replace(/\s+/gu,''))}>
       {option.term}</option>)}
     </select>
    </label>
    {rowIssues(i).length>0&&<ul className="review-match-errors"
     id={'review-crossword-'+i+'-errors'}>
     {rowIssues(i).map((issue,j)=><li key={j}>{issue.message}</li>)}
    </ul>}
    {Array.isArray(entry.sourceIds)&&entry.sourceIds.length>0&&<details className="review-sources">
     <summary>Story Note sources ({entry.sourceIds.length})</summary>
     {entry.sourceIds.map((id:string,j:number)=>{
      const source=lesson.storyNotes?.find((note:any)=>note.id===id);
      return <blockquote key={j}><small>{id}</small>
       <p>{source?.originalText??'Source reference retained; original Story Note not found.'}</p>
      </blockquote>;
     })}
    </details>}
    <div className="review-match-actions">
     <button type="button" className="review-secondary" disabled={i===0}
      aria-label={'Move crossword entry '+(i+1)+' up'}
      onClick={()=>apply(()=>moveCrosswordPair(lesson,i,-1))}>Move up</button>
     <button type="button" className="review-secondary" disabled={i===entries.length-1}
      aria-label={'Move crossword entry '+(i+1)+' down'}
      onClick={()=>apply(()=>moveCrosswordPair(lesson,i,1))}>Move down</button>
     <button type="button" className="review-secondary" disabled={entries.length<=6}
      aria-label={'Remove crossword entry '+(i+1)} onClick={()=>remove(i)}>Remove entry</button>
    </div>
   </div>)}
  </div>
  <button type="button" className="review-secondary" disabled={malformed||entries.length>=10}
   onClick={()=>apply(()=>addCrosswordPair(lesson))}>+ Add answer and clue</button>
  <section className="review-activity-preview">
   <h3>Print-matched crossword preview</h3>
   {valid?<SpecialtyPreview module={crosswordModule(entries)}/>:
    <p className="review-warning">Complete 6–10 valid pairs that form a connected crossword to view the printable grid and clues.</p>}
  </section>
  <details className="review-match-advanced">
   <summary>Advanced: edit this activity's JSON only</summary>
   <p>Use for unusual structural repairs. Editing the JSON affects only
    <code> preparedActivities.crossword</code>. Preserve source records and rerun preflight afterward.</p>
   <label>Crossword entries JSON
    <textarea id="review-module-json" rows={12} spellCheck={false}
     value={advancedJson} onChange={e=>onAdvancedJsonChange(e.target.value)}/></label>
   <button type="button" className="review-secondary" onClick={onApplyAdvancedJson}>
    Apply crossword JSON
   </button>
  </details>
 </div>;
}
