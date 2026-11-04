import PixelPicturePrintPreview from '../PixelPicturePrintPreview.tsx';
import {PIXEL_SHAPES} from '../pixelPictureShapes.ts';
import {choosePixelLetter,choosePixelBlanks} from '../pixelPicture.ts';
import type {Lesson} from './model.ts';
import {
 choosePixelPhrase,editPixelPhrase,editPixelShape,pixelProblems,
 pixelPhraseChoices,PIXEL_MIN_LENGTH,PIXEL_MAX_LENGTH,
} from './wordPuzzleEditors.ts';

export default function PixelPictureReviewEditor({lesson,onChange,onError}:{
 lesson:Lesson;onChange:(next:Lesson)=>void;onError:(message:string)=>void;
}){
 const item=lesson.preparedActivities?.pixelPicture??{};
 const phrase=String(item.phrase??''),shapeId=String(item.shapeId??'star');
 const choices=pixelPhraseChoices(lesson),problems=pixelProblems(lesson);
 const selected=choices.find(x=>x.text===phrase);
 const letter=problems.length===0?choosePixelLetter(phrase,1):undefined;
 const blanks=problems.length===0?choosePixelBlanks(phrase,1).length:0;
 const apply=(fn:()=>Lesson)=>{try{onChange(fn());onError('');}
  catch(e){onError(e instanceof Error?e.message:String(e));}};
 return <div id="review-field-pixel-picture" tabIndex={-1} className="review-fields">
  <div className="review-note">
   <h3>Pixel Picture · phrase and picture</h3>
   <p>Choose a source-linked lesson phrase or write one you want students to complete.
    A valid phrase has {PIXEL_MIN_LENGTH}–{PIXEL_MAX_LENGTH} characters,
    simple punctuation, and at least one repeated letter. The generator chooses
    a repeated letter and turns it into the missing-letter puzzle.</p>
   <p>Select one of the existing 13 × 13 silhouettes. The teacher reviews
    newly written phrases; changing the picture shape does not change the
    phrase's original source attribution.</p>
  </div>
  <label>Choose existing lesson wording
   <select value={selected?.id??''}
    onChange={e=>{if(e.target.value)apply(()=>choosePixelPhrase(lesson,e.target.value));}}>
    <option value="">Choose a valid source-linked phrase…</option>
    {choices.map(choice=><option value={choice.id} key={choice.id}>
     {choice.description} · {choice.text}</option>)}
   </select>
  </label>
  <label>Worksheet phrase
   <textarea rows={4} value={phrase}
    onChange={e=>apply(()=>editPixelPhrase(lesson,e.target.value))}/>
   <small>{phrase.length}/{PIXEL_MAX_LENGTH} characters</small>
  </label>
  <label>Silhouette
   <select value={shapeId}
    onChange={e=>apply(()=>editPixelShape(lesson,e.target.value))}>
    {!PIXEL_SHAPES.some(x=>x.id===shapeId)&&
     <option value={shapeId}>Unknown shape: {shapeId}</option>}
    {PIXEL_SHAPES.map(shape=><option key={shape.id} value={shape.id}>{shape.name}</option>)}
   </select>
  </label>
  <p className="review-source">
   Saved origin: {item.origin??'not recorded'}
   {item.teacherReviewRequired?' · teacher review required':''}
   {(item.sourceIds??[]).length?' · source notes: '+item.sourceIds.join(', '):''}
  </p>
  {letter&&<p className="review-note">
   <strong>Expected worksheet:</strong> {blanks} occurrences of the letter
   <strong> {letter}</strong> are blanked. The selected picture is hidden in a
   13 × 13 letter grid.
  </p>}
  {problems.length>0&&<div className="review-warning" role="status">
   <strong>Pixel Picture needs attention</strong>
   <ul>{problems.map((message,i)=><li key={i}>{message}</li>)}</ul>
  </div>}
  <section className="review-activity-preview">
   <h3>Print-matched Pixel Picture preview</h3>
   {!problems.length?<PixelPicturePrintPreview module={{
    type:'pixel-picture',phrase,shapeId,seed:1,
   }}/>:
   <p className="review-warning">Choose a valid phrase and silhouette to view the printable puzzle.</p>}
  </section>
 </div>;
}
