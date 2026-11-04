import {useState} from 'react';
import StoryVersePreview from '../StoryVersePreview.tsx';
import type {Lesson} from './model.ts';
import {
 addStoryEventFromNote,editStoryEvent,moveStoryEvent,
 removeStoryEvent,replaceStoryEventFromNote,storyEvents,storyOrderIssues,
} from './storyFactEditor.ts';

export default function StoryOrderReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const events=storyEvents(lesson),issues=storyOrderIssues(lesson);
 const notes=Array.isArray(lesson.storyNotes)?lesson.storyNotes:[];
 const [newNote,setNewNote]=useState('');
 const apply=(fn:()=>Lesson)=>{
  try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const canPreview=issues.length===0;
 return <div id="review-field-story-order" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Story Order · {events.length}/8 chronological events</h3>
   <p>Keep the events in the order they actually happened. The worksheet shuffles them when printed, but the curriculum preserves the correct chronology and original Story Note references.</p>
   <p>Editing wording preserves its original Story Note links and marks the event for teacher review. Choosing a new source note replaces the wording and source link together.</p>
  </div>
  {issues.length>0&&<div className="review-warning" role="status">
   <strong>Story Order needs attention</strong>
   <ul>{issues.filter(item=>item.index===undefined).map((item,i)=><li key={i}>{item.message}</li>)}</ul>
  </div>}
  <div className="review-story-fact-rows">
   {events.map((event,i)=>{
    const rowIssues=issues.filter(issue=>issue.index===i);
    const sources=(event.sourceIds??[]).map(id=>notes.find((note:any)=>note.id===id)).filter(Boolean);
    return <div key={i} className="review-story-fact-row" role="group" aria-label={'Chronological event '+(i+1)}>
     <div className="review-match-heading">
      <strong>Event {i+1} · chronological position</strong>
      <small>{event.origin==='suggested'?'Suggested · teacher review required':event.origin??'Origin not recorded'}</small>
     </div>
     <label>What happened?
      <textarea rows={2} id={'review-story-event-'+i} value={event.text??''}
       aria-invalid={rowIssues.some(issue=>issue.message.includes('sentence'))}
       onChange={e=>apply(()=>editStoryEvent(lesson,i,e.target.value))}/>
      <small>{String(event.text??'').length}/115 characters</small>
     </label>
     <label>Use a different original Story Note (replaces the event wording)
      <select value="" onChange={e=>{
       if(e.target.value)apply(()=>replaceStoryEventFromNote(lesson,i,e.target.value));
      }}>
       <option value="">Choose a Story Note…</option>
       {notes.map((note:any)=><option key={note.id} value={note.id}>
        {note.id} · {String(note.originalText??'').slice(0,80)}
       </option>)}
      </select>
     </label>
     {rowIssues.length>0&&<ul className="review-match-errors">
      {rowIssues.map((item,j)=><li key={j}>{item.message}</li>)}
     </ul>}
     {sources.length>0&&<details className="review-sources">
      <summary>Original Story Note ({sources.length})</summary>
      {sources.map((note:any)=><blockquote key={note.id}>
       <small>{note.id} · original lesson order {note.order}</small>
       <p>{note.originalText}</p>
      </blockquote>)}
     </details>}
     <div className="review-match-actions">
      <button type="button" className="review-secondary" disabled={i===0}
       aria-label={'Move event '+(i+1)+' earlier'}
       onClick={()=>apply(()=>moveStoryEvent(lesson,i,-1))}>Earlier</button>
      <button type="button" className="review-secondary" disabled={i===events.length-1}
       aria-label={'Move event '+(i+1)+' later'}
       onClick={()=>apply(()=>moveStoryEvent(lesson,i,1))}>Later</button>
      <button type="button" className="review-secondary" disabled={events.length<=5}
       aria-label={'Remove event '+(i+1)}
       onClick={()=>{
        if(window.confirm('Remove chronological event '+(i+1)+'?'))
         apply(()=>removeStoryEvent(lesson,i));
       }}>Remove event</button>
     </div>
    </div>;
   })}
  </div>
  <div className="review-story-add">
   <label>Add an event from an original Story Note
    <select value={newNote} disabled={events.length>=8} onChange={e=>setNewNote(e.target.value)}>
     <option value="">Select a source note…</option>
     {notes.map((note:any)=><option key={note.id} value={note.id}>
      {note.id} · {String(note.originalText??'').slice(0,80)}</option>)}
    </select>
   </label>
   <button type="button" className="review-secondary" disabled={events.length>=8||!newNote}
    onClick={()=>{apply(()=>addStoryEventFromNote(lesson,newNote));setNewNote('');}}>
    + Add sourced event
   </button>
  </div>
  <section className="review-activity-preview">
   <h3>Story Order worksheet preview</h3>
   {canPreview?<StoryVersePreview module={{
    type:'story-order',events:events.map(e=>e.text).join('\n'),seed:1,
   }}/>:
   <p className="review-warning">Finish the source-linked chronological events to preview the shuffled worksheet.</p>}
  </section>
 </div>;
}
