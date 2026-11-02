import {useEffect,useRef,useState} from 'react';
import {markWordSelection} from './storySelection.ts';
import {parseVerse,sortStoryEditorGroups,updateSortStoryGroup,
 type FinishVerse,type UnscrambleVerse,type SortStory,type StoryVerseModule} from './storyVerseModules.ts';
import {letterOnly} from './versePunctuation.ts';
import {samplePlaceholder} from './moduleGuidance.ts';

/** Both bracket-driven verse activities use the same exact-word selection.
 * No invalid bracket insertion: a selected word must fit the activity's limit.
 */
function BracketVerseEditor({module,onChange}:{
 module:FinishVerse|UnscrambleVerse;
 onChange:(patch:Partial<StoryVerseModule>)=>void;
}){
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const [selectionMessage,setSelectionMessage]=useState('');
 const finishing=module.type==='finish-verse';
 const maxBlanks=8;
 const minBlanks=finishing?2:4;
 const blankCount=parseVerse(module.verse).answers.length;
 function reject(message:string,input:HTMLTextAreaElement){
  setSelectionMessage(message);
  input.classList.remove('verse-selection-no');
  void input.offsetWidth;
  input.classList.add('verse-selection-no');
 }
 function markSelection(){
  const input=inputRef.current;
  if(!input||blankCount>=maxBlanks)return;
  const result=markWordSelection(module.verse,input.selectionStart,input.selectionEnd);
  if(!result)return;
  const selected=result.text.slice(result.selectionStart,result.selectionEnd);
  const length=finishing?Array.from(selected).length:letterOnly(selected).length;
  if(length>9){
   reject('That word has more than nine '+(finishing?'characters':'letters')+'. Choose a shorter word.',input);
   return;
  }
  // The normal validator permits only word selections here; blanking a
  // duplicate uses textarea offsets so it does not affect its other copies.
  setSelectionMessage('');
  onChange({verse:result.text});
  requestAnimationFrame(()=>{
   input.focus();
   input.setSelectionRange(result.selectionStart,result.selectionEnd);
  });
 }
 return <div className="activity-inputs">
  <label htmlFor="sv-reference">Memory verse reference</label>
  <input id="sv-reference" value={module.reference}
   onChange={e=>onChange({reference:e.target.value})}
   placeholder={finishing?'Isaiah 41:10':'John 3:16'}/>
  <label htmlFor="sv-verse">Verse with missing words</label>
  <textarea id="sv-verse" rows={8} ref={inputRef} value={module.verse}
   onAnimationEnd={e=>e.currentTarget.classList.remove('verse-selection-no')}
   onChange={e=>{setSelectionMessage('');onChange({verse:e.target.value});}}
   placeholder={finishing
     ?'Fear not, for I am with [you]; be not dismayed, for I am your [God].'
     :'For [God] so [loved] the [world] that he [gave] his only [Son].'}/>
  <button type="button" className="mark-blank" onMouseDown={e=>e.preventDefault()}
   onClick={markSelection} disabled={blankCount>=maxBlanks}>Make selected word a blank</button>
  {selectionMessage&&<p className="verse-selection-feedback" role="status">{selectionMessage}</p>}
  <p>Double-click a word and use the button, or type [brackets] manually.
   Mark {minBlanks}–{maxBlanks} missing words. Repeated words are marked individually.
   {finishing?' For longer passages, fewer blanks keep the handwriting boxes comfortably sized.':
    ' Apostrophes and ending punctuation stay in the answer line.'}</p>
 </div>;
}

/** Keep trailing blank lines visible while typing, while saving the existing
 * truth-suffixed representation for backward-compatible localStorage drafts.
 */
function SortStoryEditor({module,onChange}:{
 module:SortStory;onChange:(patch:Partial<StoryVerseModule>)=>void;
}){
 const [fields,setFields]=useState(()=>sortStoryEditorGroups(module.statements));
 const lastSent=useRef(module.statements);
 useEffect(()=>{
  if(module.statements!==lastSent.current){
   lastSent.current=module.statements;
   setFields(sortStoryEditorGroups(module.statements));
  }
 },[module.statements]);
 function update(truth:boolean,value:string){
  setFields(current=>({...current,[truth?'trueStatements':'falseStatements']:value}));
  const statements=updateSortStoryGroup(module.statements,truth,value);
  lastSent.current=statements;
  onChange({statements});
 }
 return <div className="activity-inputs">
  <label htmlFor="sv-true-statements">True statements</label>
  <textarea id="sv-true-statements" rows={5} value={fields.trueStatements}
   onChange={e=>update(true,e.target.value)}
   placeholder={sortStoryEditorGroups(samplePlaceholder('sort-story','statements')).trueStatements}/>
  <label htmlFor="sv-false-statements">False statements</label>
  <textarea id="sv-false-statements" rows={5} value={fields.falseStatements}
   onChange={e=>update(false,e.target.value)}
   placeholder={sortStoryEditorGroups(samplePlaceholder('sort-story','statements')).falseStatements}/>
  <p>Enter one sentence per line, 4–8 total, with at least one in each field. The worksheet mixes them up and children copy the symbols into TRUE and FALSE.</p>
 </div>;
}

export default function StoryVerseEditor({module,onChange}:{
  module: StoryVerseModule;
  onChange:(patch:Partial<StoryVerseModule>)=>void;
}){
  switch(module.type){
    case 'story-order':
      return <div className="activity-inputs">
        <label htmlFor="sv-events">Story events in chronological order (5–8)</label>
        <textarea id="sv-events" rows={9} value={module.events}
          onChange={e=>onChange({events:e.target.value})}
          placeholder={samplePlaceholder('story-order','events')}/>
        <p>One sentence per line. The worksheet will scramble the event order and provide numbered circles.</p>
      </div>;
    case 'sort-story':return <SortStoryEditor module={module} onChange={onChange}/>;
    case 'draw-story':
      return <div className="activity-inputs">
        <label htmlFor="sv-draw">Drawing prompts (4–6)</label>
        <textarea id="sv-draw" rows={8} value={module.prompts}
          onChange={e=>onChange({prompts:e.target.value})}
          placeholder={samplePlaceholder('draw-story','prompts')}/>
        <p>One prompt per line; four prompts use a 2×2 grid, while five or six use a 3×2 grid.</p>
      </div>;
    case 'finish-verse':
    case 'unscramble-verse':return <BracketVerseEditor module={module} onChange={onChange}/>;
    case 'circle-mistakes':
      return <div className="activity-inputs">
        <label htmlFor="sv-count">Number of mistakes to circle (1–8)</label>
        <input id="sv-count" type="number" min={1} max={8} value={module.count}
          onChange={e=>onChange({count:Number(e.target.value)})}/>
        <label htmlFor="sv-mistakes">Paragraph containing intentional mistakes</label>
        <textarea id="sv-mistakes" rows={9} value={module.text}
          onChange={e=>onChange({text:e.target.value})}
          placeholder={samplePlaceholder('circle-mistakes','text')}/>
        <p>The heading states how many mistakes to find. Students circle errors in your paragraph.</p>
      </div>;
  }
}
