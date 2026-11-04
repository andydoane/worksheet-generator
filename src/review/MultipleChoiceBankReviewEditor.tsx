import {useState} from 'react';
import SmallModulePreview from '../SmallModulePreview.tsx';
import type {Lesson} from './model.ts';
import {
 chooseOriginalQuestion,editMultipleChoice,multipleChoiceIssues,
 multipleChoiceRows,removeMultipleChoice,
} from './multipleChoiceEditor.ts';

export default function MultipleChoiceBankReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const [sourceId,setSourceId]=useState('');
 const rows=multipleChoiceRows(lesson),issues=multipleChoiceIssues(lesson);
 const sources=(lesson.questions??[]).filter((x:any)=>
  String(x.question??'').trim()&&String(x.answer??'').trim());
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 const invalidStructure=lesson.preparedActivities?.multipleChoice!==undefined&&
  !Array.isArray(lesson.preparedActivities.multipleChoice);
 return <div id="review-field-multiple-choice-bank" className="review-fields" tabIndex={-1}>
  <div className="review-note">
   <h3>Multiple Choice · {rows.length} prepared question(s)</h3>
   <p>Presets 1 and 2 each need a Multiple Choice question. Source question text and
    its correct answer stay together when you select from the original curriculum.
    You supply two different, plausible incorrect answers. Any wording change
    requires teacher review and does not change the original question records.</p>
  </div>
  {invalidStructure&&<p className="review-warning">
   The Multiple Choice collection is malformed. Open the scoped Advanced JSON
   repair below to restore an array before adding questions.</p>}
  <div className="review-story-add">
   <label>Start from an original curriculum question
    <select value={sourceId} disabled={invalidStructure} onChange={e=>setSourceId(e.target.value)}>
     <option value="">Choose an original question…</option>
     {sources.map((source:any)=><option key={source.id} value={source.id}>
      {source.id} · {source.question}</option>)}
    </select>
   </label>
   <button type="button" className="review-secondary"
    disabled={!sourceId||invalidStructure} onClick={()=>{
     apply(()=>chooseOriginalQuestion(lesson,sourceId));setSourceId('');
    }}>+ Add sourced question</button>
  </div>
  {issues.filter(issue=>issue.index===undefined).map((issue,i)=>
   <p key={i} className="review-warning">{issue.message}</p>)}
  <div className="review-story-fact-rows">
   {rows.map((row:any,index:number)=>{
    const errors=issues.filter(issue=>issue.index===index);
    const correct=row.choices?.find((choice:any)=>choice.isCorrect===true);
    const wrong=row.choices?.filter((choice:any)=>!choice.isCorrect)??[];
    const writable=Array.isArray(row.choices)&&row.choices.length===3&&
     !!correct&&wrong.length===2;
    const preview=writable&&errors.length===0;
    return <section className="review-story-fact-row" key={row.id??index}>
     <div className="review-match-heading"><strong>{index+1}. {row.id}</strong>
      <small>{row.teacherReviewRequired?'Teacher review required':
       'Source-linked question'}</small>
     </div>
     <label>Question shown on worksheet
      <textarea rows={2} value={row.question??''} disabled={!writable}
       onChange={e=>apply(()=>editMultipleChoice(lesson,index,'question',e.target.value))}/>
     </label>
     <div className="review-pair">
      <label>Correct answer
       <input value={row.correctAnswer??''} disabled={!writable}
        onChange={e=>apply(()=>editMultipleChoice(lesson,index,'correctAnswer',e.target.value))}/>
      </label>
      <label>Incorrect answer A
       <input value={wrong[0]?.text??''} disabled={!writable}
        onChange={e=>apply(()=>editMultipleChoice(lesson,index,'wrong1',e.target.value))}/>
      </label>
      <label>Incorrect answer B
       <input value={wrong[1]?.text??''} disabled={!writable}
        onChange={e=>apply(()=>editMultipleChoice(lesson,index,'wrong2',e.target.value))}/>
      </label>
     </div>
     <p className="review-source">Source questions:
      {(row.sourceQuestionIds??[]).join(', ')||'Teacher-authored'}
      {(row.sourceIds??[]).length?' · Story Notes: '+row.sourceIds.join(', '):''}
     </p>
     {errors.map((item,i)=><p key={i} className="review-warning">{item.message}</p>)}
     <div className="review-match-actions">
      <button type="button" className="review-secondary"
       onClick={()=>{
        if(window.confirm('Remove this prepared Multiple Choice question? The original curriculum source question will remain.'))
         apply(()=>removeMultipleChoice(lesson,index));
       }}>Remove prepared question</button>
     </div>
     {preview&&<details className="review-sources">
      <summary>Print-matched question preview</summary>
      <SmallModulePreview module={{type:'multiple-choice',question:row.question,
       correct:row.correctAnswer,wrong1:wrong[0].text,wrong2:wrong[1].text,seed:1}}/>
     </details>}
    </section>;
   })}
  </div>
 </div>;
}
