import type {SpecialtyModule} from './specialtyModules.ts';
import {generateCrossword,parseCrossword} from './specialtyModules.ts';

export default function SpecialtyEditor({module,onChange}:{module:SpecialtyModule;onChange:(patch:Partial<SpecialtyModule>)=>void}){
  switch(module.type){
    case 'crossword':{
      let info='';
      if(parseCrossword(module.entries).length>=6)try{
        const puzzle=generateCrossword(module);
        info=puzzle.width+' × '+puzzle.height+' grid · '+puzzle.across.length+' across · '+puzzle.down.length+' down';
      }catch(error){info=error instanceof Error?error.message:'Unable to place those answers.';}
      return <div className="activity-inputs">
        <label htmlFor="cross-entries">Answers and clues (6–10 pairs)</label>
        <textarea id="cross-entries" rows={12} value={module.entries}
          onChange={e=>onChange({entries:e.target.value})}
          placeholder={'DAVID, Young shepherd who faced a giant\nGOLIATH, Giant from Gath\nSLING, David used this weapon\nSTONE, David picked five of these\nSAUL, King of Israel\nSHEEP, Animals David watched'}/>
        <p>One entry per line in <code>ANSWER, clue text</code> format. Two-word answers such as Red Sea become REDSEA in the grid. Use 3–12 A–Z letters per answer, ignoring spaces; entries must cross. Regenerate for a different compact arrangement.</p>
        {info&&<p className="specialty-status" role="status">{info}</p>}
      </div>;
    }
    case 'spiral-verse':
    case 'upside-down-verse':
      return <div className="activity-inputs">
        <label htmlFor="special-ref">Scripture reference</label>
        <input id="special-ref" value={module.reference} onChange={e=>onChange({reference:e.target.value})} placeholder="Psalm 23:1"/>
        <label htmlFor="special-verse">Verse text</label>
        <textarea id="special-verse" rows={6} value={module.verse}
          onChange={e=>onChange({verse:e.target.value})} placeholder="The Lord is my shepherd."/>
        <p>{module.type==='spiral-verse'
          ?'The verse and reference print in a boxed bank above the blank spiral writing line.'
          :'Each letter is flipped vertically, with a blank writing line above for the correct upright letter.'}</p>
      </div>;
    case 'connect-verse':
    case 'connect-big-idea':
      return <div className="activity-inputs">
        <label htmlFor="connect-text">{module.type==='connect-verse'?'Verse text':'Big Idea text'}</label>
        <textarea id="connect-text" rows={6}
          value={module.type==='connect-verse'?module.verse:module.idea}
          onChange={e=>onChange(module.type==='connect-verse'?{verse:e.target.value}:{idea:e.target.value})}
          placeholder="God is our refuge and strength."/>
        <p>Enter {module.type==='connect-big-idea'?'4–20':'4–35'} words. The generator scatters their positions with slight letter jitter and rotation. {module.type==='connect-big-idea'?'The original word order appears in a box for reference.':'The whole verse appears in a bank above the scattered words.'} Use Shuffle to rearrange.</p>
      </div>;
  }
}
