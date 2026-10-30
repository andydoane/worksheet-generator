import type { StoryVerseModule } from './storyVerseModules.ts';

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
    case 'unscramble-verse':
      return <div className="activity-inputs">
        <label htmlFor="sv-reference">Memory verse reference</label>
        <input id="sv-reference" value={module.reference}
          onChange={e=>onChange({reference:e.target.value})} placeholder="John 3:16"/>
        <label htmlFor="sv-verse">Verse with missing words</label>
        <textarea id="sv-verse" rows={8} value={module.verse}
          onChange={e=>onChange({verse:e.target.value})}
          placeholder={'For [God] so [loved] the [world] that he [gave] his one and only [Son].'}/>
        <p>Enclose {module.type==='finish-verse'?'4–8':'4–6'} missing words in [square brackets]. {module.type==='finish-verse'?'Children fill letter boxes using a shuffled word bank.':'Children write the missing word above its scrambled letters.'}</p>
      </div>;
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
