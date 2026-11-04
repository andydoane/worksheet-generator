import {useMemo} from 'react';
import WordSearchPrintPreview from '../WordSearchPrintPreview.tsx';
import MediumWordSearchPrintPreview from '../MediumWordSearchPrintPreview.tsx';
import type {Lesson} from './model.ts';
import {
 addSearchWord,chooseSourceSearchWord,moveSearchWord,removeSearchWord,
 searchIssues,searchWords,setSearchWord,sourceVocabulary,
 type SearchKind,
} from './wordSearchEditor.ts';

export default function WordSearchReviewEditor({lesson,kind,conflicts=[],onChange,onError}:{
 lesson:Lesson;kind:SearchKind;conflicts?:string[];
 onChange:(lesson:Lesson)=>void;onError:(message:string)=>void;
}){
 const words=searchWords(lesson,kind),medium=kind==='mediumWordSearch';
 const limit=medium?6:12,minimum=medium?1:4;
 const issues=useMemo(()=>searchIssues(words,kind),[words,kind]);
 const source=useMemo(()=>sourceVocabulary(lesson,kind),[lesson,kind]);
 const apply=(action:()=>Lesson)=>{
  try{onChange(action());onError('');}
  catch(error){onError(error instanceof Error?error.message:String(error));}
 };
 const module=medium?
  {type:'medium-word-search' as const,words:words.join('\n'),seed:1}:
  {type:'word-search' as const,words:words.join('\n'),seed:1};
 const odd=[...(lesson.preparedActivities?.oddWords?.related??[]),
  ...(lesson.preparedActivities?.oddWords?.unrelated??[])];
 return <div id={'review-field-'+(medium?'medium-word-search':'word-search')}
  tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>{medium?'Medium Word Search':'Large Word Search'} · {words.length}/{limit} words</h3>
   <p>Use {minimum}–{limit} distinct, classroom-appropriate words; each may contain
    {medium?' 2–9':' 2–12'} letters after removing spaces. Edit directly or choose existing curriculum vocabulary. A worksheet only uses approved content after teacher signoff.</p>
   <p>Edits preserve the original lesson vocabulary bank and mark this puzzle's new wording for teacher review.</p>
  </div>
  {conflicts.length>0&&<div className="review-warning" role="status">
   <strong>Preset vocabulary conflict</strong>
   <p>The generator found repeated printed words after considering alternatives. It will try different word banks and smaller valid searches automatically. If no combination fits, review the terms below.</p>
   <p>Reported duplicates: <strong>{conflicts.map(s=>s.replace(/^vocab:/u,'').toUpperCase()).join(', ')}</strong></p>
   {odd.length>0&&<p>What Doesn't Belong? currently includes: {odd.join(', ')}.
    Avoid repeating these unless the generator can choose a different approved combination.</p>}
  </div>}
  {issues.length>0&&<div className="review-warning" role="status">
   <strong>Word-search issues</strong>
   <ul>{issues.map((problem,i)=><li key={i}>{problem.message}</li>)}</ul>
  </div>}
  <div className="review-search-rows">
   {words.map((word,i)=><div className="review-search-row" key={i}
    role="group" aria-label={'Word Search entry '+(i+1)}>
    <label>Word {i+1}
     <input value={word} aria-invalid={issues.some(issue=>issue.index===i)}
      onChange={e=>apply(()=>setSearchWord(lesson,kind,i,e.target.value))}/>
     <small>{word.replace(/\s/gu,'').length}/{medium?9:12} letters</small>
    </label>
    <label>Replace with vocabulary already in the lesson
     <select value="" onChange={e=>{
      if(e.target.value)apply(()=>chooseSourceSearchWord(lesson,kind,i,e.target.value));
     }}>
      <option value="">Choose a source-linked word…</option>
      {source.map(item=><option key={item.term} value={item.term}
       disabled={words.some((existing,j)=>j!==i&&
        existing.replace(/\s+/gu,'').toUpperCase()===item.term.replace(/\s+/gu,''))}>
       {item.term}</option>)}
     </select>
    </label>
    {issues.filter(issue=>issue.index===i).map((issue,j)=>
     <p className="review-warning" key={j}>{issue.message}</p>)}
    <div className="review-search-actions">
     <button type="button" className="review-secondary" disabled={i===0}
      aria-label={'Move word '+(i+1)+' up'}
      onClick={()=>apply(()=>moveSearchWord(lesson,kind,i,-1))}>Up</button>
     <button type="button" className="review-secondary" disabled={i===words.length-1}
      aria-label={'Move word '+(i+1)+' down'}
      onClick={()=>apply(()=>moveSearchWord(lesson,kind,i,1))}>Down</button>
     <button type="button" className="review-secondary" aria-label={'Remove word '+(i+1)}
      onClick={()=>apply(()=>removeSearchWord(lesson,kind,i))}>Remove</button>
    </div>
   </div>)}
  </div>
  <button type="button" className="review-secondary" disabled={words.length>=limit}
   onClick={()=>apply(()=>addSearchWord(lesson,kind))}>+ Add word</button>
  <section className="review-activity-preview">
   <h3>Print-matched word-search preview</h3>
   {issues.length===0?(medium?
    <MediumWordSearchPrintPreview module={{type:'medium-word-search',words:module.words,seed:1}}/>:
    <WordSearchPrintPreview module={{type:'word-search',words:module.words,seed:1}}/>):
    <p className="review-warning">Fix the word list before generating its printable grid.</p>}
  </section>
  <p className="review-source">After adjusting the vocabulary, rerun preflight. Every numbered preset must still build without repeating printed material.</p>
 </div>;
}
