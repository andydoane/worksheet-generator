import { boxGrid, orderedStoryEvents, type StoryVerseModule } from './storyVerseModules.ts';
import {MistakesPrintPreview} from './MediumPrintPreview.tsx';
import FinishVersePrintPreview from './FinishVersePrintPreview.tsx';
import {VerseReconstructionPreview} from './VerseReconstructionPreview.tsx';
import SortStoryPrintPreview from './SortStoryPrintPreview.tsx';

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
    case 'sort-story':return <SortStoryPrintPreview module={module}/>;
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
