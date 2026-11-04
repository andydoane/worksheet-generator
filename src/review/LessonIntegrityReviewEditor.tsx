import {useState} from 'react';
import type {Lesson} from './model.ts';
import {
 lessonIntegrityIssues,repairSourceReference,restoreStoryNoteNumbers,
 editLessonDetails,rebuildReadinessInventory,type IntegrityArea,
} from './lessonIntegrity.ts';

const GROUPS={
 'lesson-details':{title:'Lesson title and Scripture references',
  explanation:'Correct these descriptive lesson fields, keeping the title and Bible references faithful to the original curriculum.'},
 'lesson-sources':{title:'Original source records and citations',
  explanation:'Review original Story Notes, questions, facts and document filenames. Fix only references you can verify against the original curriculum.'},
 'lesson-readiness':{title:'Activity readiness inventory',
  explanation:'Each of the 27 modules needs one readiness record. Rebuilding this index corrects metadata only; it never marks missing activity content READY.'},
 'lesson-publication':{title:'Teacher signoff and Scripture rights',
  explanation:'Publication approval is a separate, explicit teacher decision. A valid puzzle alone never clears Scripture rights or grants publication approval.'},
} as const;
const editableKeys=['sourceFiles','storyNotes','questions','facts','moduleReadiness'] as const;
export default function LessonIntegrityReviewEditor({lesson,mode,onChange,onError}:{
 lesson:Lesson;mode:IntegrityArea;
 onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const [filename,setFilename]=useState('');
 const [fileFormat,setFileFormat]=useState<'odt'|'odp'|'pdf'|'docx'|'pptx'>('odt');
 const [advancedKey,setAdvancedKey]=useState<(typeof editableKeys)[number]>('storyNotes');
 const [advancedText,setAdvancedText]=useState(()=>
  JSON.stringify(lesson.storyNotes??[],null,2));
 const issues=lessonIntegrityIssues(lesson).filter(item=>item.area===mode);
 const apply=(fn:()=>Lesson)=>{
  try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}
 };
 const allIds=[...(lesson.storyNotes??[]),...(lesson.questions??[]),
  ...(lesson.facts??[])].map((x:any)=>x.id).filter(Boolean);
 const questionIds=(lesson.questions??[]).map((x:any)=>x.id);
 const sourceNames=(lesson.sourceFiles??[]).map((x:any)=>x.filename);
 const noteNumberError=issues.some(x=>x.path.includes('storyNotes[')&&
  x.path.endsWith('.order'));
 return <div id={'review-field-'+mode} className="review-fields" tabIndex={-1}>
  <div className="review-note">
   <h3>{GROUPS[mode].title}</h3><p>{GROUPS[mode].explanation}</p>
   {issues.length===0?<p className="review-source">No issues detected in this section by the source/readiness audit.</p>:
    <p className="review-warning" role="status">{issues.length} issue(s) to review. Corrections are never automatically approved.</p>}
  </div>
  {mode==='lesson-details'&&<div className="review-story-fact-rows">
   <label>Lesson title
    <input value={lesson.lessonDetails?.title??''}
     onChange={e=>apply(()=>editLessonDetails(lesson,'title',e.target.value))}/>
   </label>
   <label>Scripture reference printed on the booklet
    <input value={lesson.lessonDetails?.scriptureDisplay??''}
     onChange={e=>apply(()=>editLessonDetails(lesson,'scriptureDisplay',e.target.value))}/>
   </label>
   <label>Original Scripture passage list (one reference per line)
    <textarea rows={3} value={(lesson.lessonDetails?.scripturePassages??[]).join('\n')}
     onChange={e=>apply(()=>editLessonDetails(lesson,'scripturePassages',e.target.value))}/>
   </label>
   <p className="review-source">Memory verse and verbatim BSB wording are handled separately in the Scripture editor.</p>
  </div>}
  {mode==='lesson-sources'&&<>
   <p className="review-source">{lesson.storyNotes?.length??0} Story Notes ·
    {lesson.questions?.length??0} original questions ·
    {lesson.facts?.length??0} facts ·
    {sourceNames.length} source document(s)</p>
   {noteNumberError&&<button type="button" className="review-secondary"
    onClick={()=>apply(()=>restoreStoryNoteNumbers(lesson))}>
    Restore Story Note order numbers (preserves words)
   </button>}
   <details className="review-sources">
    <summary>Review original source records (no content changed)</summary>
    {(lesson.storyNotes??[]).map((note:any,i:number)=><blockquote key={i}>
     <small>{note.id} · story position {note.order} · source page {note.source?.page??'?'}</small>
     <p>{note.originalText}</p>
    </blockquote>)}
   </details>
   <div className="review-note">
    <h3>Source documents</h3>
    <p>{sourceNames.join(' · ')||'No original documents listed.'}</p>
    <p>Only add a document you actually used during conversion. This does not upload its contents.</p>
    <div className="review-pair">
     <label>Exact original filename
      <input value={filename} onChange={e=>setFilename(e.target.value)}
       placeholder="Original curriculum.odt"/>
     </label>
     <label>Document type
      <select value={fileFormat} onChange={e=>setFileFormat(e.target.value as typeof fileFormat)}>
       {['odt','odp','pdf','docx','pptx'].map(format=>
        <option key={format} value={format}>{format.toUpperCase()}</option>)}
      </select>
     </label>
    </div>
    <button type="button" className="review-secondary" disabled={!filename.trim()}
     onClick={()=>{
      apply(()=>{
       const next=structuredClone(lesson);
       const name=filename.trim();
       if(next.sourceFiles?.some((x:any)=>x.filename===name))
        throw Error('That document is already listed.');
       next.sourceFiles??=[];next.sourceFiles.push({filename:name,format:fileFormat});
       return next;
      });
      setFilename('');
     }}>Add verified source document</button>
   </div>
  </>}
  {mode==='lesson-readiness'&&<>
   <div className="review-note">
    <p>{(lesson.moduleReadiness??[]).length}/27 readiness records. 
     A repaired record has to be checked by you before approving; missing prepared activity data stays marked as needing authoring.</p>
    <button type="button" className="review-secondary"
     onClick={()=>{
      if(window.confirm('Rebuild the 27-item readiness index? This preserves the first existing entry per module, retains notes and never marks missing content READY. Check the results afterward.'))
       apply(()=>rebuildReadinessInventory(lesson));
     }}>Rebuild readiness index conservatively</button>
   </div>
   <details className="review-sources">
    <summary>Inspect the 27 readiness records</summary>
    {(lesson.moduleReadiness??[]).map((item:any,i:number)=><p key={i} className="review-source">
     {item.moduleId} · {item.status} · preparedActivities.{item.preparedActivityKey}
    </p>)}
   </details>
  </>}
  {mode==='lesson-publication'&&<div className="review-note">
   <p><strong>Current file:</strong> {lesson.publication?.approved?'Approved':'Review draft'}</p>
   <p><strong>Recorded reviewer:</strong> {lesson.publication?.teacherSignoff?.reviewer??'Not yet signed'}.</p>
   <p><strong>Scripture rights:</strong> {lesson.publication?.scriptureRights?.status??'Not cleared in this lesson'}.</p>
   <p>Use the Berean Standard Bible editor above for a faithful excerpt, then complete
    the named teacher signoff, date and explicit BSB rights checkbox in the final
    publication section below. Download a new approved JSON; do not overwrite old
    approval metadata merely to suppress an error.</p>
   <button type="button" className="review-secondary" onClick={()=>
    document.getElementById('review-field-publication-signoff')?.scrollIntoView({behavior:'smooth',block:'center'})}>
    Go to final publication signoff
   </button>
  </div>}
  {issues.length>0&&<div className="review-story-fact-rows">
   {issues.map((entry,i)=>{
    const options=entry.choiceType==='filename'?sourceNames:
     entry.choiceType==='questionId'?questionIds:allIds;
    return <div className="review-story-fact-row" key={entry.path+':'+i}>
     <strong>{entry.path}</strong>
     <p className="review-warning">{entry.message}</p>
     {entry.repairPath&&entry.choiceType&&
      <label>Replace with the verified original source
       <select value="" onChange={e=>{
        if(e.target.value)apply(()=>repairSourceReference(lesson,entry,e.target.value));
       }}>
        <option value="">Choose a correct existing record…</option>
        {[...new Set(options)].map(id=><option value={id} key={id}>{id}</option>)}
       </select>
      </label>}
     {!entry.repairPath&&mode==='lesson-sources'&&
      <p className="review-source">Compare with the original source. For duplicate IDs or missing original text, use the scoped source-record editor below only after identifying the correct record.</p>}
    </div>;
   })}
  </div>}
  {mode==='lesson-sources'||mode==='lesson-readiness'?<details className="review-match-advanced">
   <summary>Advanced: inspect or repair one source/readiness collection</summary>
   <p>For structural problems only: choose one collection. Changing original source text,
    authorship or IDs can break many links, so verify the original document first.</p>
   <label>Collection
    <select value={advancedKey} onChange={e=>{const key=e.target.value as typeof advancedKey;
     setAdvancedKey(key);setAdvancedText(JSON.stringify(lesson[key]??[],null,2));}}>
     {editableKeys.map(key=><option key={key} value={key}>{key}</option>)}
    </select>
   </label>
   <label>Scoped JSON content
    <textarea rows={11} spellCheck={false}
     value={advancedText} onChange={e=>setAdvancedText(e.target.value)}
     placeholder={'Open this section to load '+advancedKey+' content'}/>
   </label>
   <button type="button" className="review-secondary" onClick={()=>{
    if(!window.confirm('Apply this verified source collection? The existing collection will be replaced.'))
     return;
    apply(()=>{
     const parsed=JSON.parse(advancedText);
     if(!Array.isArray(parsed))throw Error('The selected collection must be a JSON array.');
     const next=structuredClone(lesson);next[advancedKey]=parsed;return next;
    });
   }} disabled={!advancedText.trim()}>Apply this verified collection</button>
  </details>:null}
 </div>;
}
