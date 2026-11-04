import {useId,useState} from 'react';
import type {PublicLessonEntry} from './publishedLessonCatalog.ts';
import {
 availableStoryBooks,filterPublicStories,groupPublicStories,
 storyReference,type StoryTestamentFilter,
} from './storyLibrary.ts';

type Props={
 stories:readonly PublicLessonEntry[];
 onSelect:(entry:PublicLessonEntry)=>void;
 currentId?:string|null;
 /** Compact scroll area inside Change Story; the welcome page gets more room. */
 variant?:'welcome'|'switch';
};

/** One accessible picker for the welcome screen and Change Story, with
 * browser-side filtering (no network calls or hidden publication state).
 */
export default function StoryPicker({
 stories,onSelect,currentId,variant='welcome',
}:Props){
 const [query,setQuery]=useState('');
 const [testament,setTestament]=useState<StoryTestamentFilter>('all');
 const [book,setBook]=useState('all');
 const id=useId();
 const books=availableStoryBooks(stories,testament);
 const filtered=filterPublicStories(stories,{query,testament,book});
 const groups=groupPublicStories(filtered);
 return <section className={'story-picker story-picker-'+variant}
  aria-label="Find an approved Bible story">
  <div className="story-picker-filters">
   <label className="story-picker-search" htmlFor={id+'-search'}>
    Find a story
    <input id={id+'-search'} type="search" value={query}
     placeholder="Title, book, or Scripture reference"
     autoComplete="off" onChange={e=>setQuery(e.target.value)}/>
   </label>
   <label htmlFor={id+'-testament'}>
    Testament
    <select id={id+'-testament'} value={testament}
     onChange={e=>{
      setTestament(e.target.value as StoryTestamentFilter);
      setBook('all');
     }}>
     <option value="all">All</option>
     <option value="ot">Old Testament</option>
     <option value="nt">New Testament</option>
    </select>
   </label>
   <label htmlFor={id+'-book'}>
    Bible book
    <select id={id+'-book'} value={book}
     onChange={e=>setBook(e.target.value)}>
     <option value="all">All books</option>
     {books.map(item=><option key={item} value={item}>{item}</option>)}
    </select>
   </label>
  </div>
  <div className="story-picker-count" role="status" aria-live="polite">
   {filtered.length} of {stories.length} approved {stories.length===1?'story':'stories'}
   {query.trim()||testament!=='all'||book!=='all'?' match these filters':''}
  </div>
  {filtered.length===0
   ?<div className="story-picker-empty">
     No matching Bible stories. Try another title, Scripture reference, or filter.
     <button type="button" onClick={()=>{
      setQuery('');setTestament('all');setBook('all');
     }}>Clear filters</button>
    </div>
   :<div className="story-picker-results" role="group" aria-label="Matching Bible stories">
     {groups.map(group=><section key={group.book} className="story-picker-group"
      aria-label={group.book+' stories'}>
      <h3>{group.book} <span>{group.stories.length}</span></h3>
      <div className="story-picker-rows">
       {group.stories.map(entry=><button type="button" key={entry.lesson.id}
        className={'story-picker-row'+
         (currentId===entry.lesson.id?' current':'')}
        onClick={()=>onSelect(entry)}>
        <span className="story-picker-row-text">
         <strong>{entry.lesson.lessonDetails.title}</strong>
         <small>{storyReference(entry)||'Scripture reference not specified'}</small>
        </span>
        {currentId===entry.lesson.id
         ?<span className="story-picker-current">Current</span>
         :<span className="story-picker-chevron" aria-hidden="true">›</span>}
       </button>)}
      </div>
     </section>)}
    </div>}
 </section>;
}
