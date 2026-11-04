import SmallModulePreview from '../SmallModulePreview.tsx';
import type {Lesson} from './model.ts';
import {
 chooseUnscramble,editUnscramble,unscrambleChoices,unscrambleProblems,unscrambleWords,
} from './wordPuzzleEditors.ts';

export default function UnscrambleReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const answers=unscrambleWords(lesson),problems=unscrambleProblems(lesson);
 const choices=unscrambleChoices(lesson),item=lesson.preparedActivities?.unscrambleWords??{};
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <div id="review-field-unscramble-words" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Unscramble the Words · two answers</h3>
   <p>Choose two different lesson vocabulary answers. Each must contain 3–10 letters
    (one or two words, ignoring the space), and each word must use at least two
    different letters so it can be scrambled. You can also write a new answer and
    review its meaning before approving.</p>
   <p>The generator actually scrambles each answer when printing. Suggested
    wording is flagged for teacher review; no original lesson vocabulary is modified.</p>
  </div>
  <div className="review-story-fact-rows">
   {[0,1].map(index=><div className="review-story-fact-row" key={index}>
    <strong>Answer {index+1}</strong>
    <label>Word or phrase
     <input value={answers[index]??''} aria-label={'Unscramble answer '+(index+1)}
      onChange={e=>apply(()=>editUnscramble(lesson,index,e.target.value))}/>
     <small>{String(answers[index]??'').replace(/\s+/gu,'').length}/10 letters</small>
    </label>
    <label>Use an existing lesson vocabulary word
     <select value={choices.find(x=>x.term===(answers[index]??'').trim().toUpperCase())?.term??''}
      onChange={e=>{if(e.target.value)apply(()=>chooseUnscramble(lesson,index,e.target.value));}}>
      <option value="">Choose approved lesson vocabulary…</option>
      {choices.map(option=><option key={option.term} value={option.term}
       disabled={answers[1-index]?.toUpperCase().trim()===option.term}>
       {option.term}</option>)}
     </select>
    </label>
   </div>)}
  </div>
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
