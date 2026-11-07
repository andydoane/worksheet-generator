import StoryVersePreview from '../StoryVersePreview.tsx';
import type {Lesson} from './model.ts';
import {editStoryEvent,storyEvents,storyOrderIssues} from './storyFactEditor.ts';

export default function StoryOrderReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const events=storyEvents(lesson),issues=storyOrderIssues(lesson);
 const apply=(index:number,text:string)=>{
  try{onChange(editStoryEvent(lesson,index,text));onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const canPrintPreview=issues.length===0;
 return <div id="review-field-story-order" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Story Order · {events.length} chronological events</h3>
   <p>Review the sentences from this lesson and edit any that need improvement.
    Keep them in the order the events happened. The student worksheet shuffles them
    when printed; no original Story Note citations are needed.</p>
  </div>
  {issues.some(item=>item.index===undefined)&&<div className="review-warning" role="status">
   <strong>Story Order needs attention</strong>
   <ul>{issues.filter(item=>item.index===undefined).map((item,i)=>
    <li key={i}>{item.message}</li>)}</ul>
  </div>}
  <div className="review-story-fact-rows">
   {events.map((event,i)=>{
    const rowIssues=issues.filter(issue=>issue.index===i);
    return <div key={i} className="review-story-fact-row" role="group"
     aria-label={'Chronological event '+(i+1)}>
     <label>Event {i+1}
      <textarea rows={2} id={'review-story-event-'+i} value={event.text??''}
       aria-invalid={rowIssues.length>0}
       onChange={e=>apply(i,e.target.value)}/>
      <small>{String(event.text??'').length}/115 characters</small>
     </label>
     {rowIssues.length>0&&<ul className="review-match-errors">
      {rowIssues.map((item,j)=><li key={j}>{item.message}</li>)}
     </ul>}
    </div>;
   })}
  </div>
  <section className="review-activity-preview">
   <h3>Story Order — Chronological Review Preview</h3>
   {canPrintPreview?<StoryVersePreview storyOrderChronological module={{
    type:'story-order',events:events.map(e=>e.text).join('\n'),seed:1,
   }}/>:
   <>
    <p className="review-source">These sentences appear in their current order.
     Fix the issues above to enable the printable preview.</p>
    <ol className="review-story-order-overview">
     {events.map((event,i)=><li key={i}>{event.text||'(Empty event)'}</li>)}
    </ol>
   </>}
  </section>
 </div>;
}
