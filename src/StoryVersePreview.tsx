import { boxGrid, linesFromInput, mistakesTitle, orderedStoryEvents, parseVerse, sortedStoryBank, verseBank, verseScrambles, type StoryVerseModule } from './storyVerseModules.ts';

function MissingVerse({ verse, mode, scrambled }: {verse:string;mode:'finish'|'unscramble';scrambled?:string[]}) {
  let index=0;
  return <div className={'new-verse-body '+(mode==='unscramble'?'new-verse-scramble':'')}>
    {parseVerse(verse).parts.map((part,i)=>{
      if(part.kind==='text')return <span key={i}>{part.value}</span>;
      const puzzle=scrambled?.[index++]??part.value;
      if(mode==='finish')return <span key={i} className="new-verse-boxes">
        {Array.from(part.value).map((_,j)=><span key={j} className="new-letter-box"/>)}
      </span>;
      return <span key={i} className="new-verse-boxes">
        {Array.from(puzzle).map((char,j)=><span key={j} className="new-scramble-letter"><i/>{char}</span>)}
      </span>;
    })}
  </div>;
}

export default function StoryVersePreview({module}: {module:StoryVerseModule}) {
  switch(module.type){
    case 'story-order':
      return <div className="module-preview sv-preview">
        <div className="module-title">STORY ORDER</div>
        <div className="sv-instruction">Number the events from first to last.</div>
        <div className="sv-order-list">
          {orderedStoryEvents(module).map((event,i)=><div className="sv-order-row" key={i}>
            <span className="sv-number-circle"/><span className="sv-order-text">{event}</span>
          </div>)}
        </div>
      </div>;
    case 'sort-story':
      return <div className="module-preview sv-preview">
        <div className="module-title">SORT THE STORY</div>
        <div className="sv-instruction">Write each letter in the TRUE or FALSE box.</div>
        <div className="sv-statement-bank">
          {sortedStoryBank(module).map((row,i)=><div className="sv-statement" key={i}>
            <span className="sv-letter">{String.fromCharCode(65+i)}</span><span>{row.text}</span>
          </div>)}
        </div>
        <div className="sv-sort-answers"><div>TRUE<span/></div><div>FALSE<span/></div></div>
      </div>;
    case 'draw-story': {
      const {cols,items}=boxGrid(module);
      return <div className="module-preview sv-preview">
        <div className="module-title">DRAW THE STORY</div>
        <div className="sv-drawing-grid" style={{gridTemplateColumns:'repeat('+cols+',minmax(0,1fr))'}}>
          {items.map((text,i)=><div className="sv-drawing-cell" key={i}>
            <span className="sv-drawing-blank"/><span className="sv-drawing-label">{text}</span>
          </div>)}
        </div>
      </div>;
    }
    case 'finish-verse':
      return <div className="module-preview sv-preview sv-medium-preview">
        <div className="module-title">FINISH THE VERSE</div>
        <div className="sv-word-bank" style={{gridTemplateColumns:'repeat('+Math.ceil(verseBank(module).length/2)+',minmax(0,1fr))'}}>
          {verseBank(module).map((word,i)=><span key={i}>{word.toUpperCase()}</span>)}
        </div>
        <div className="sv-verse-ref">{module.reference}</div>
        <MissingVerse verse={module.verse} mode="finish"/>
      </div>;
    case 'unscramble-verse':
      return <div className="module-preview sv-preview sv-medium-preview">
        <div className="module-title">UNSCRAMBLE THE VERSE</div>
        <div className="sv-verse-ref">{module.reference}</div>
        <MissingVerse verse={module.verse} mode="unscramble" scrambled={verseScrambles(module)}/>
      </div>;
    case 'circle-mistakes':
      return <div className="module-preview sv-preview sv-medium-preview">
        <div className="module-title">{mistakesTitle(module.count)}</div>
        <div className="sv-mistake-paragraph">{module.text}</div>
      </div>;
  }
}
