import {useMemo} from 'react';
import ConnectBigIdeaPrintPreview from '../ConnectBigIdeaPrintPreview.tsx';
import type {Lesson} from './model.ts';
import {
 addSuggestedConnectPhrase,chooseConnectPhrase,connectPhraseChoices,
 connectPhraseProblems,connectPhraseWordCount,writeConnectPhrase,
} from './connectPhrase.ts';

export default function ConnectPhraseReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(lesson:Lesson)=>void;onError:(message:string)=>void;
}){
 const text=String(lesson.preparedActivities?.connectBigIdea?.phrase??'');
 const choices=connectPhraseChoices(lesson);
 const problems=useMemo(()=>connectPhraseProblems(text),[text]);
 const existing=choices.find(item=>item.text===text);
 const saved=lesson.preparedActivities?.connectBigIdea;
 const needsSourceSelection=!!existing&&(
  saved?.origin!==(existing.origin??'adapted')||
  (saved?.teacherReviewRequired===true)!==(existing.teacherReviewRequired===true)||
  JSON.stringify(saved?.sourceIds??[])!==JSON.stringify(existing.sourceIds??[]));
 const sourceSection=existing?.source&&typeof existing.source==='object'&&
  'section' in existing.source&&typeof existing.source.section==='string'
   ?existing.source.section:'';
 const apply=(action:()=>Lesson)=>{
  try{onChange(action());onError('');}
  catch(error){onError(error instanceof Error?error.message:String(error));}
 };
 return <div id="review-field-connect-phrase" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Connect the Phrase · lesson phrases</h3>
   <p>Choose an original teaching phrase, an existing key phrase (including flagged suggestions), or a Story Order sentence. Changing this puzzle does not change the lesson's original Important Idea or the separate Solve the Code puzzle.</p>
   <p><strong>Original Important Idea:</strong> {lesson.lessonDetails?.bigIdeas?.[0]?.text??'Not recorded'}</p>
  </div>
  <label>Use existing lesson wording
   <select value={existing?.text??''} onChange={e=>{
    if(e.target.value)apply(()=>chooseConnectPhrase(lesson,e.target.value));
   }}>
    <option value="">Choose an existing phrase…</option>
    {choices.map((entry,i)=>{
     const invalid=connectPhraseProblems(entry.text).length>0;
     return <option key={i} value={entry.text} disabled={invalid}>
      {entry.text}{invalid?' (too long for this activity)':''}
     </option>;
    })}
   </select>
  </label>
  <label>Phrase used on the worksheet
   <textarea rows={3} value={text} onChange={e=>apply(()=>writeConnectPhrase(lesson,e.target.value))}/>
  </label>
  <p className={problems.length?'review-warning':'review-source'}>
   {text.length}/125 characters · {connectPhraseWordCount(text)}/20 words · no more than 12 letters per word.
  </p>
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Fix these phrase issues:</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  {!existing&&text.trim()&&<div className="review-note">
   <p>These words do not currently match a curriculum phrase. Validate their meaning, then explicitly add them as a <strong>suggested, teacher-review-required</strong> phrase. No original lesson wording will be changed.</p>
   <button type="button" className="review-secondary" disabled={problems.length>0}
    onClick={()=>apply(()=>addSuggestedConnectPhrase(lesson))}>
    Add as suggested review phrase
   </button>
  </div>}
  {existing&&<div className="review-note">
   <p><strong>Saved activity provenance:</strong> {saved?.origin??'not recorded'}
    {saved?.teacherReviewRequired?' · teacher review required':''}</p>
   <p><strong>Matching lesson phrase:</strong> {existing.origin??'adapted'}
    {sourceSection?' · '+sourceSection:''}
    {existing.sourceIds?.length?' · source notes: '+existing.sourceIds.join(', '):''}
    {existing.teacherReviewRequired?' · teacher review required':''}</p>
   {needsSourceSelection&&
    <button type="button" className="review-secondary"
     disabled={problems.length>0}
     onClick={()=>apply(()=>chooseConnectPhrase(lesson,existing.text))}>
     Use this exact lesson phrase and its recorded source
    </button>}
  </div>}
  <section className="review-activity-preview">
   <h3>Printable activity preview</h3>
   {problems.length===0?
    <ConnectBigIdeaPrintPreview module={{type:'connect-big-idea',idea:text,seed:1}}/>:
    <p className="review-warning">Complete a valid phrase to see the print-matched puzzle.</p>}
  </section>
  <p className="review-source">After saving a source-linked or suggested phrase, rerun preflight to verify all three presets.</p>
 </div>;
}
