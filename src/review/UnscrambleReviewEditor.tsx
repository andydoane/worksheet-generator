import {useState} from 'react';
import SmallModulePreview from '../SmallModulePreview.tsx';
import type {Lesson} from './model.ts';
import {
 chooseUnscramble,chooseUnscrambleAlternative,editUnscramble,repairUnscrambleAnswers,
 resetMalformedUnscramble,unscrambleAlternatives,unscrambleChoices,unscrambleProblems,unscrambleWords,
} from './wordPuzzleEditors.ts';

export default function UnscrambleReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const answers=unscrambleWords(lesson),problems=unscrambleProblems(lesson);
 const choices=unscrambleChoices(lesson),alternatives=unscrambleAlternatives(lesson);
 const item=lesson.preparedActivities?.unscrambleWords??{};
 const [keepFirst,setKeepFirst]=useState(0);
 const [keepSecond,setKeepSecond]=useState(1);
 const malformed=item.answers!==undefined&&!Array.isArray(item.answers);
 const tooMany=answers.length>2;
 const incomplete=!malformed&&!tooMany&&answers.length<2;
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 const keepTwo=()=>{
  if(keepFirst===keepSecond)return;
  if(!window.confirm('Keep the two selected answers and remove the other saved answers? Export a review-session backup first if you want to preserve the entire original list.'))return;
  apply(()=>repairUnscrambleAnswers(lesson,[keepFirst,keepSecond]));
 };
 return <div id="review-field-unscramble-words" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Unscramble the Words · two answers</h3>
   <p>Enter your own answers or select two different lesson vocabulary words.
    Each answer uses 3–10 letters in one or two words and must be possible to scramble.
    Custom wording is marked suggested and requires teacher review.</p>
   <p>Review Studio selects two valid answers by default when the saved list
    contains extra candidates. You can replace either answer at any time. Extra
    saved words remain available as alternatives rather than being discarded.</p>
  </div>
  {malformed&&<div className="review-warning" role="status">
   <strong>Invalid stored answer format</strong>
   <p>The answers field is not a list. Download a review-session backup before
    replacing it, or inspect the original value under Advanced JSON.</p>
   <button type="button" className="review-secondary" onClick={()=>{
    if(window.confirm('Replace the malformed answer field with two empty editable answers?'))
     apply(()=>resetMalformedUnscramble(lesson));
   }}>Reset to two blank answers</button>
  </div>}
  {tooMany&&<div className="review-warning" role="status">
   <strong>{answers.length} answers saved, but the worksheet accepts exactly two.</strong>
   <p>Select precisely which two to retain. The other entries are preserved in
    your current lesson until you confirm the change.</p>
   <div className="review-pair">
    {([keepFirst,keepSecond] as const).map((value,index)=>
     <label key={index}>Keep answer {index+1}
      <select value={value} onChange={e=>index===0?
       setKeepFirst(Number(e.target.value)):setKeepSecond(Number(e.target.value))}>
       {answers.map((answer:any,i:number)=>
        <option key={i} value={i}>{i+1}. {String(answer??'')}</option>)}
      </select>
     </label>)}
   </div>
   <button type="button" className="review-secondary" disabled={keepFirst===keepSecond}
    onClick={keepTwo}>Keep these two answers</button>
  </div>}
  {incomplete&&<div className="review-note">
   <strong>Only {answers.length} of 2 answers saved.</strong>
   <p>Type into either answer field below to repair the short list automatically,
    or create the missing fields first.</p>
   <button type="button" className="review-secondary"
    onClick={()=>apply(()=>repairUnscrambleAnswers(lesson))}>
    Create two editable answer fields
   </button>
  </div>}
  {alternatives.length>0&&!malformed&&!tooMany&&<p className="review-source">
   Two answers are selected for this worksheet. {alternatives.length} additional saved
   {alternatives.length===1?' answer is':' answers are'} available below.
   Review the selected words before marking this activity complete.</p>}
  {!malformed&&!tooMany&&<div className="review-story-fact-rows">
   {[0,1].map(index=><div className="review-story-fact-row" key={index}>
    <strong>Answer {index+1}</strong>
    <label>Custom word or phrase
     <input value={answers[index]??''} aria-label={'Unscramble answer '+(index+1)}
      onChange={e=>apply(()=>editUnscramble(lesson,index,e.target.value))}/>
     <small>{String(answers[index]??'').replace(/\s+/gu,'').length}/10 letters</small>
    </label>
    <label>Or choose an existing lesson vocabulary word
     <select value={choices.find(x=>x.term===String(answers[index]??'').trim().toUpperCase())?.term??''}
      onChange={e=>{if(e.target.value)apply(()=>chooseUnscramble(lesson,index,e.target.value));}}>
      <option value="">Choose lesson vocabulary…</option>
      {choices.map(option=><option key={option.term} value={option.term}
       disabled={String(answers[1-index]??'').toUpperCase().trim()===option.term}>
       {option.term}</option>)}
     </select>
    </label>
    {alternatives.length>0&&<label>Or select another originally saved answer
     <select value="" onChange={e=>{
      if(e.target.value)apply(()=>chooseUnscrambleAlternative(lesson,index,e.target.value));
     }}>
      <option value="">Choose a saved alternative…</option>
      {alternatives.map(term=><option key={term} value={term}
       disabled={String(answers[1-index]??'').trim().toUpperCase()===term.trim().toUpperCase()}>
       {term}</option>)}
     </select>
    </label>}
    {choices.some(x=>x.term===String(answers[index]??'').trim().toUpperCase())&&
     <button type="button" className="review-secondary"
      onClick={()=>apply(()=>chooseUnscramble(
       lesson,index,String(answers[index]??'').trim().toUpperCase()))}>
      Use exact vocabulary term and refresh its source notes
     </button>}
   </div>)}
  </div>}
  <p className="review-source">Saved origin: {item.origin??'not recorded'}
   {item.teacherReviewRequired?' · teacher review required':''}
   {(item.sourceIds??[]).length?' · linked Story Notes: '+item.sourceIds.join(', '):''}</p>
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Check both answers</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  <section className="review-activity-preview">
   <h3>Print-matched Unscramble preview</h3>
   {!problems.length?<SmallModulePreview module={{
    type:'unscramble-words',first:answers[0],second:answers[1],seed:1,
   }}/>:
   <p className="review-warning">Enter two valid, distinct answers to preview the printable worksheet.</p>}
  </section>
 </div>;
}
