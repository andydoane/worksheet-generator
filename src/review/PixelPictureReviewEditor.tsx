import {useState} from 'react';
import PixelPicturePrintPreview from '../PixelPicturePrintPreview.tsx';
import {PIXEL_SHAPES} from '../pixelPictureShapes.ts';
import {choosePixelBlanks,choosePixelLetter,choosePixelShapeId} from '../pixelPicture.ts';
import type {Lesson} from './model.ts';
import {
 choosePixelPhrase,editPixelPhrase,pixelProblems,pixelPhraseChoices,
 PIXEL_MIN_LENGTH,PIXEL_MAX_LENGTH,
} from './wordPuzzleEditors.ts';

export default function PixelPictureReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const [previewSeed,setPreviewSeed]=useState(1);
 const item=lesson.preparedActivities?.pixelPicture??{};
 const phrase=String(item.phrase??'');
 const shapeId=choosePixelShapeId(previewSeed,phrase);
 const shapeName=PIXEL_SHAPES.find(shape=>shape.id===shapeId)?.name??shapeId;
 const choices=pixelPhraseChoices(lesson),problems=pixelProblems(lesson);
 const selected=choices.find(x=>x.text===phrase);
 const needsSourceRestore=!!selected&&(
  item.origin!==(selected.origin??'adapted')||
  JSON.stringify(item.sourceIds??[])!==JSON.stringify(selected.sourceIds)||
  (item.teacherReviewRequired===true)!==selected.teacherReviewRequired);
 const letter=problems.length===0?choosePixelLetter(phrase,previewSeed):undefined;
 const blanks=problems.length===0?choosePixelBlanks(phrase,previewSeed).length:0;
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <div id="review-field-pixel-picture" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Pixel Picture · phrase only</h3>
   <p>Choose a source-linked lesson phrase or write one you want students to complete.
    A valid phrase has {PIXEL_MIN_LENGTH}–{PIXEL_MAX_LENGTH} characters,
    simple punctuation, and at least one repeated letter. The generator chooses
    the missing letter and the picture when the worksheet is generated.</p>
   <p><strong>You do not choose or save a silhouette in the curriculum.</strong>
    Each generation seed chooses one of the 13 × 13 silhouettes.
    The same generated worksheet keeps its picture during preview and PDF export;
    pressing Regenerate in the main generator can choose a different one.
    A legacy saved <code>shapeId</code> is ignored.</p>
  </div>
  <label>Choose existing lesson wording
   <select value={selected?.id??''}
    onChange={e=>{if(e.target.value)apply(()=>choosePixelPhrase(lesson,e.target.value));}}>
    <option value="">Choose a valid source-linked phrase…</option>
    {choices.map(choice=><option value={choice.id} key={choice.id}>
     {choice.description} · {choice.text}</option>)}
   </select>
  </label>
  {needsSourceRestore&&<button type="button" className="review-secondary"
   onClick={()=>selected&&apply(()=>choosePixelPhrase(lesson,selected.id))}>
   Use matching lesson phrase and restore its source
  </button>}
  <label>Worksheet phrase
   <textarea rows={4} value={phrase}
    onChange={e=>apply(()=>editPixelPhrase(lesson,e.target.value))}/>
   <small>{phrase.length}/{PIXEL_MAX_LENGTH} characters</small>
  </label>
  <p className="review-source">
   Saved origin: {item.origin??'not recorded'}
   {item.teacherReviewRequired?' · teacher review required':''}
   {(item.sourceIds??[]).length?' · source notes: '+item.sourceIds.join(', '):''}
  </p>
  {letter&&<p className="review-note">
   <strong>Sample worksheet:</strong> {blanks} occurrences of the letter
   <strong> {letter}</strong> are blanked. The generator selected
   <strong> {shapeName}</strong> for this sample seed.
  </p>}
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Pixel Picture needs attention</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  <section className="review-activity-preview">
   <h3>Print-matched Pixel Picture preview</h3>
   <button type="button" className="review-secondary" disabled={problems.length>0}
    onClick={()=>setPreviewSeed(value=>value+1)}>
    Preview another generated silhouette
   </button>
   {!problems.length?<PixelPicturePrintPreview module={{
    type:'pixel-picture',phrase,shapeId,seed:previewSeed,
   }}/>:
   <p className="review-warning">Choose a valid phrase to view the printable puzzle.</p>}
  </section>
 </div>;
}
