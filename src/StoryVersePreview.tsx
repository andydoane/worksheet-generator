import { boxGrid, orderedStoryEvents, sortedStoryBank, type StoryVerseModule } from './storyVerseModules.ts';
import {MistakesPrintPreview} from './MediumPrintPreview.tsx';
import FinishVersePrintPreview from './FinishVersePrintPreview.tsx';
import {VerseReconstructionPreview} from './VerseReconstructionPreview.tsx';

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
        <div className="sv-instruction sv-sort-instruction">Sort the letters into TRUE or FALSE. Circle the incorrect words in false statements.</div>
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
            <span className="sv-drawing-blank"/><span className="sv-drawing-label" style={{fontSize:cols===3?'8px':'10px'}}>{text}</span>
          </div>)}
        </div>
      </div>;
    }
    case 'finish-verse':return <FinishVersePrintPreview module={module}/>;
    case 'unscramble-verse':return <VerseReconstructionPreview module={module}/>;
    case 'circle-mistakes':return <MistakesPrintPreview module={module}/>;
  }
}
