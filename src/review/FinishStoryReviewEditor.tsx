import ModulePreview from '../ModulePreview.tsx';
import {storyBank} from '../modules.ts';
import type {Lesson} from './model.ts';
import {editFinishStory,finishStoryProblems} from './wordPuzzleEditors.ts';

export default function FinishStoryReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const item=lesson.preparedActivities?.finishStory??{};
 const story=String(item.markedParagraph??'');
 const problems=finishStoryProblems(lesson);
 const module={type:'finish-story' as const,story,seed:1};
 const bank=storyBank(module);
 const apply=(value:string)=>{try{onChange(editFinishStory(lesson,value));onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <div id="review-field-finish-story" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Finish the Story · teacher-authored worksheet paragraph</h3>
   <p><strong>You may freely revise the story and the missing words.</strong>
    The worksheet no longer requires the original Story Notes' emphasized
    words in any particular order. Write a clear, accurate version for your
    students, then explicitly mark this activity reviewed before publication.</p>
   <p>Use 6–12 <code>[bracketed]</code> missing words, each a single word
    up to 16 letters, and keep the complete paragraph under 1,100 characters.
    Existing source notes remain available for reference, but they do not
    restrict which words you choose.</p>
  </div>
  <label>Story students will complete
   <textarea rows={10} value={story} spellCheck
    onChange={e=>apply(e.target.value)}/>
   <small>{story.length}/1,100 characters · {bank.length}/6–12 missing words</small>
  </label>
  <p className="review-source">Current word bank:
   {bank.length?' '+bank.join(' · '):' No bracketed words yet.'}
  </p>
  <p className="review-source">Saved origin: {item.origin??'not recorded'}
   {item.teacherReviewRequired?' · teacher review required':''}
  </p>
  {(item.sourceIds??[]).length>0&&<details className="review-sources">
   <summary>Compare with original Story Notes (optional reference)</summary>
   {item.sourceIds.map((id:string)=>{
    const note=lesson.storyNotes?.find((n:any)=>n.id===id);
    return <blockquote key={id}><small>{id}</small>
     <p>{note?.originalText??'Original note unavailable'}</p></blockquote>;
   })}
  </details>}
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Finish the Story needs attention</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  <section className="review-activity-preview">
   <h3>Print-matched Finish the Story preview</h3>
   {!problems.length?<ModulePreview module={module}/>:
    <p className="review-warning">Meet the paragraph, bracket, and blank-count rules to preview the printable worksheet.</p>}
  </section>
 </div>;
}
