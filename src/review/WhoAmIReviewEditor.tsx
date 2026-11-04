import SmallModulePreview from '../SmallModulePreview.tsx';
import type {Lesson} from './model.ts';
import {chooseWhoAmI,editWhoAmI,whoAmIChoices,whoAmIProblems} from './wordPuzzleEditors.ts';

export default function WhoAmIReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const item=lesson.preparedActivities?.whoAmI??{};
 const choices=whoAmIChoices(lesson),problems=whoAmIProblems(lesson);
 const source=choices.find(choice=>choice.text===item.clue&&choice.description===item.answer);
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <div id="review-field-who-am-i" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Who Am I? · character clue</h3>
   <p>Choose a character and its reviewed clue from the lesson, or write your own.
    Selecting a character copies the <strong>correct answer and clue together</strong>.
    New teacher-written text is marked suggested and requires your review.</p>
  </div>
  <label>Use an existing character clue
   <select value={source?.id??''} onChange={e=>{
    if(e.target.value)apply(()=>chooseWhoAmI(lesson,e.target.value));
   }}>
    <option value="">Choose a source-linked character and clue…</option>
    {choices.map(choice=><option value={choice.id} key={choice.id}>
     {choice.description} · {choice.text}
    </option>)}
   </select>
  </label>
  <div className="review-pair">
   <label>Correct answer
    <input value={item.answer??''} aria-label="Who Am I answer"
     onChange={e=>apply(()=>editWhoAmI(lesson,'answer',e.target.value))}/>
    <small>1–14 letters; spaces and hyphens allowed.</small>
   </label>
   <label>Clue shown on worksheet
    <textarea rows={3} value={item.clue??''}
     aria-label="Who Am I clue" onChange={e=>apply(()=>editWhoAmI(lesson,'clue',e.target.value))}/>
    <small>{String(item.clue??'').length}/120 characters</small>
   </label>
  </div>
  <p className="review-source">Saved origin: {item.origin??'not recorded'}
   {item.teacherReviewRequired?' · teacher review required':''}
   {(item.sourceIds??[]).length>0?' · original Story Notes: '+item.sourceIds.join(', '):''}
  </p>
  {(item.sourceIds??[]).length>0&&<details className="review-sources">
   <summary>Compare with original Story Notes</summary>
   {item.sourceIds.map((id:string)=>{
    const note=lesson.storyNotes?.find((n:any)=>n.id===id);
    return <blockquote key={id}><small>{id}</small><p>{note?.originalText??'Original note unavailable'}</p></blockquote>;
   })}
  </details>}
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Who Am I? needs attention</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  <section className="review-activity-preview">
   <h3>Print-matched Who Am I? preview</h3>
   {!problems.length?<SmallModulePreview module={{
    type:'who-am-i',answer:item.answer,clue:item.clue,
   }}/>:
   <p className="review-warning">Complete a valid character and clue to preview the printable worksheet.</p>}
  </section>
 </div>;
}
