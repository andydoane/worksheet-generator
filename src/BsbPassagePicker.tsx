import {useEffect,useMemo,useState} from 'react';
import {getBsbPassage,wordSpans,clipToWords,type BsbIndex} from './review/bsb.ts';
import {
 bsbChapters,bsbVerses,loadBsbIndex,BSB_TERMS_URL,type BsbSelection,
} from './bsbLibrary.ts';
import './bsbPicker.css';

export type BsbPassagePickerProps={
 initialReference?:string;
 onApply:(selection:BsbSelection)=>void;
 onCancel?:()=>void;
 /** Optional first-line guard; the next PR supplies per-module validation as well. */
 maxCharacters?:number;
 validateSelection?:(selection:BsbSelection)=>string[];
};

/** Reusable for a teacher's Change Verse dialog. Does not mutate any worksheet itself.
 * The caller validates every dependent module before committing its choice.
 */
export default function BsbPassagePicker({
 initialReference='Exodus 15:11',onApply,onCancel,maxCharacters,validateSelection,
}:BsbPassagePickerProps){
 const [index,setIndex]=useState<BsbIndex|null>(null);
 const [loadError,setLoadError]=useState('');
 const [reference,setReference]=useState(initialReference);
 const [isExcerpt,setIsExcerpt]=useState(false);
 const [firstWord,setFirstWord]=useState(0);
 const [lastWord,setLastWord]=useState(0);

 useEffect(()=>{
  let mounted=true;
  loadBsbIndex(import.meta.env.BASE_URL).then(data=>{
   if(mounted){setIndex(data);setLoadError('');}
  }).catch(error=>{
   if(mounted)setLoadError(error instanceof Error?error.message:String(error));
  });
  return ()=>{mounted=false;};
 },[]);

 const referenceParts=reference.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/u);
 const book=index?.books.includes(referenceParts?.[1]??'')
  ?referenceParts![1]:(index?.books[0]??'');
 const chapters=useMemo(()=>index?bsbChapters(index,book):[],[index,book]);
 const chapter=referenceParts&&book===referenceParts[1]&&
  chapters.includes(Number(referenceParts[2]))?Number(referenceParts[2]):(chapters[0]??1);
 const verses=useMemo(()=>index?bsbVerses(index,book,chapter):[],[index,book,chapter]);
 const firstVerse=referenceParts&&book===referenceParts[1]&&
  chapter===Number(referenceParts[2])&&verses.includes(Number(referenceParts[3]))
  ?Number(referenceParts[3]):(verses[0]??1);
 const lastVerse=referenceParts?.[4]&&verses.includes(Number(referenceParts[4]))
  ?Number(referenceParts[4]):firstVerse;

 function choose(nextBook:string,nextChapter:number,nextFirst:number,nextLast=nextFirst){
  setReference(nextBook+' '+nextChapter+':'+nextFirst+
   (nextLast>nextFirst?'-'+nextLast:''));
 }
 const lookup=useMemo(()=>{
  if(!index)return {passage:null,error:''};
  try{return {passage:getBsbPassage(index,reference),error:''};}
  catch(error){return {passage:null,error:error instanceof Error?error.message:String(error)};}
 },[index,reference]);
 const passage=lookup.passage;
 const words=useMemo(()=>wordSpans(passage?.text??''),[passage?.text]);
 const excerptStart=Math.min(firstWord,Math.max(0,words.length-1));
 const excerptEnd=Math.max(excerptStart,Math.min(lastWord,Math.max(0,words.length-1)));

 useEffect(()=>{setIsExcerpt(false);setFirstWord(0);setLastWord(0);},[reference]);

 const selection=useMemo<BsbSelection|null>(()=>{
  if(!passage)return null;
  if(!isExcerpt)return {...passage,translation:'BSB',isExcerpt:false};
  if(!words.length)return null;
  return {...passage,text:clipToWords(passage.text,excerptStart,excerptEnd),
   translation:'BSB',isExcerpt:true};
 },[passage,isExcerpt,words.length,excerptStart,excerptEnd]);

 const issues=selection?[
  ...(maxCharacters!==undefined&&selection.text.length>maxCharacters
   ?['This passage has '+selection.text.length+' characters; the maximum is '+
     maxCharacters+'. Choose a shorter excerpt.']:[]),
  ...(validateSelection?.(selection)??[]),
 ]:[];
 return <section className="bsb-picker" aria-label="Choose a Berean Standard Bible passage">
  <header className="bsb-picker-header">
   <strong>Select a Scripture passage</strong>
   <small>Berean Standard Bible (BSB) · Locally hosted text</small>
  </header>
  {loadError&&<p role="alert">{loadError} You can still enter a custom verse in the worksheet editor.</p>}
  <div className="bsb-picker-controls">
   <label>Book
    <select value={book} disabled={!index} onChange={e=>{
     const next=e.target.value,ch=bsbChapters(index!,next)[0]??1;
     choose(next,ch,bsbVerses(index!,next,ch)[0]??1);
    }}>{index?.books.map(name=><option key={name} value={name}>{name}</option>)}</select>
   </label>
   <label>Chapter
    <select value={chapter} disabled={!index} onChange={e=>{
     const ch=Number(e.target.value);
     choose(book,ch,bsbVerses(index!,book,ch)[0]??1);
    }}>{chapters.map(ch=><option key={ch} value={ch}>{ch}</option>)}</select>
   </label>
   <label>From verse
    <select value={firstVerse} disabled={!index} onChange={e=>{
     choose(book,chapter,Number(e.target.value));
    }}>{verses.map(v=><option key={v} value={v}>{v}</option>)}</select>
   </label>
   <label>Through verse
    <select value={lastVerse} disabled={!index} onChange={e=>{
     choose(book,chapter,firstVerse,Number(e.target.value));
    }}>{verses.filter(v=>v>=firstVerse).map(v=><option key={v} value={v}>{v}</option>)}</select>
   </label>
  </div>
  <label className="bsb-picker-reference">Or enter a reference (including cross-chapter ranges)
   <input value={reference} onChange={e=>setReference(e.target.value)}
    placeholder="e.g. Exodus 15:11 or John 3:16-17"/>
  </label>
  {lookup.error&&<p role="alert">{lookup.error}</p>}
  {passage&&<div className="bsb-picker-passage">
   <strong>{passage.reference} · BSB</strong>
   <p>{passage.text}</p>
   <label><input type="checkbox" checked={isExcerpt} onChange={e=>{
    setIsExcerpt(e.target.checked);setFirstWord(0);setLastWord(Math.max(0,words.length-1));
   }}/> Use a shorter excerpt of this passage</label>
   {isExcerpt&&<div className="bsb-picker-excerpt">
    <label>First word
     <select value={excerptStart} onChange={e=>setFirstWord(Number(e.target.value))}>
      {words.map((item,i)=><option key={i} value={i}>{i+1}. {item.word}</option>)}
     </select>
    </label>
    <label>Last word
     <select value={excerptEnd} onChange={e=>setLastWord(Number(e.target.value))}>
      {words.map((item,i)=><option key={i} value={i} disabled={i<excerptStart}>
       {i+1}. {item.word}</option>)}
     </select>
    </label>
   </div>}
   {selection&&<div className="bsb-picker-selection">
    <strong>Selected text · {selection.text.length} characters</strong>
    <p>{selection.text}</p>
   </div>}
  </div>}
  {issues.length>0&&<div className="bsb-picker-errors" role="alert">
   <strong>This passage won't fit the requested worksheet activities:</strong>
   <ul>{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>
  </div>}
  <footer className="bsb-picker-footer">
   <a href={BSB_TERMS_URL} target="_blank" rel="noreferrer">BSB source and public-domain terms</a>
   <div>
    {onCancel&&<button type="button" onClick={onCancel}>Cancel</button>}
    <button type="button" disabled={!selection||issues.length>0}
     onClick={()=>{if(selection&&issues.length===0)onApply(selection);}}>
     Use this verse</button>
   </div>
  </footer>
 </section>;
}
