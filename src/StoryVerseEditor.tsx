import {useRef,useState} from 'react';
import {markWordSelection} from './storySelection.ts';
import {parseVerse,type FinishVerse,type UnscrambleVerse,type StoryVerseModule} from './storyVerseModules.ts';
import {letterOnly} from './versePunctuation.ts';

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
 const maxBlanks=finishing?8:6;
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
          placeholder={'The king made a law.\nDaniel prayed to God.\nDaniel was arrested.\nDaniel was thrown to the lions.\nGod protected Daniel.'}/>
        <p>One sentence per line. The worksheet will scramble the event order and provide numbered circles.</p>
      </div>;
    case 'sort-story':
      return <div className="activity-inputs">
        <label htmlFor="sv-statements">Story statements (4–8)</label>
        <textarea id="sv-statements" rows={9} value={module.statements}
          onChange={e=>onChange({statements:e.target.value})}
          placeholder={'Daniel prayed to God. true\nDaniel stopped praying. false\nThe king made a law. true\nLions were afraid of the king. false'}/>
        <p>End every sentence with <code>true</code> or <code>false</code>. Students write each scrambled statement’s letter in the correct box.</p>
      </div>;
    case 'draw-story':
      return <div className="activity-inputs">
        <label htmlFor="sv-draw">Drawing prompts (4–6)</label>
        <textarea id="sv-draw" rows={8} value={module.prompts}
          onChange={e=>onChange({prompts:e.target.value})}
          placeholder={'Daniel prays by his window.\nThe king makes a new law.\nDaniel is thrown to the lions.\nGod sends an angel.'}/>
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
          placeholder="Paul sailed to the moon. He and Peter flew on a spaceship."/>
        <p>The heading states how many mistakes to find. Students circle errors in your paragraph.</p>
      </div>;
  }
}
