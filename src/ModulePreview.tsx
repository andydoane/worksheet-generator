import {useEffect,useState} from 'react';
import { matchRows, storyBank, validateModule, MODULES, type ActivityModule } from './modules';
import {planStory,STORY_BODY_WIDTH,STORY_BODY_HEIGHT,type StoryPlan} from './storyLayout.ts';
import { isSmallModule } from './smallModules';
import SmallModulePreview from './SmallModulePreview';
import { isStoryVerseModule } from './storyVerseModules';
import StoryVersePreview from './StoryVersePreview';
import { isPuzzleModule } from './puzzleEngines';
import PuzzlePreview from './PuzzlePreview';
import { isCryptogram } from './cryptograms.ts';
import CryptogramPreview from './CryptogramPreview';
import {isSpecialtyModule} from './specialtyModules.ts';
import SpecialtyPreview from './SpecialtyPreview';

export default function ModulePreview({ module, showSolution = false }: { module: ActivityModule; showSolution?: boolean }) {
  const errors = validateModule(module);
  if (errors.length) {
    return (
      <div className="module-preview module-incomplete">
        <strong>{MODULES.find(item => item.id === module.type)?.name ?? 'Activity'}</strong>
        <span>Complete this activity in the editor.</span>
      </div>
    );
  }

  if (isSmallModule(module)) return <SmallModulePreview module={module}/>;
  if (isStoryVerseModule(module)) return <StoryVersePreview module={module}/>;
  if (isPuzzleModule(module)) return <PuzzlePreview module={module} showSolution={showSolution}/>;
  if (isCryptogram(module)) return <CryptogramPreview module={module}/>;
  if (isSpecialtyModule(module)) return <SpecialtyPreview module={module}/>;

  if (module.type === 'draw-picture') {
    return (
      <div className="module-preview drawing-module">
        <div className="drawing-box" />
        <div className="drawing-prompt">Draw a picture of {module.prompt.trim()}</div>
      </div>
    );
  }

  if (module.type === 'match-words') {
    const rows = matchRows(module);
    return (
      <div className="module-preview matching-module">
        <div className="module-title">MATCH THE WORDS</div>
        <div className="module-subtitle">Draw a line from each word on the left to its match on the right.</div>
        <div className="match-columns">
          <div>{rows.map((pair, index) => <div key={index} className="match-word">{pair.left}</div>)}</div>
          <div>{rows.map((pair, index) => <div key={index} className="match-word">{pair.right}</div>)}</div>
        </div>
      </div>
    );
  }

  return <StoryPreview module={module}/>;
}

/** Text positions come from exactly the same wrapping/centering algorithm
 * used by the vector PDF. Canvas supplies the actual local Nunito Medium
 * glyph widths after the font is loaded, so long previews never get clipped.
 */
function StoryPreview({module}:{module:Extract<ActivityModule,{type:'finish-story'}>}){
  const [plan,setPlan]=useState<StoryPlan|null>(null);
  const bank=storyBank(module);
  const columns=Math.ceil(bank.length/2);
  useEffect(()=>{
    let live=true;
    const recalculate=()=>{
      if(!live)return;
      const context=document.createElement('canvas').getContext('2d');
      if(!context)return;
      const width=(text:string,size:number)=>{
        context.font='500 '+size+'px Nunito';
        return context.measureText(text).width;
      };
      setPlan(planStory(module.story,width,STORY_BODY_WIDTH,STORY_BODY_HEIGHT));
    };
    recalculate();
    void document.fonts.load('500 13px Nunito').then(recalculate,recalculate);
    return ()=>{live=false;};
  },[module.story]);
  return <div className="module-preview story-module">
    <div className="module-title">FINISH THE STORY</div>
    <div className="story-bank" style={{gridTemplateColumns:'repeat('+columns+',1fr)'}}>
      {bank.map((word,index)=><span key={index} className="bank-word">{word}</span>)}
    </div>
    <div className="story-body story-body-drawn">
      {plan?<svg className="story-text-svg" viewBox={'0 0 '+STORY_BODY_WIDTH+' '+STORY_BODY_HEIGHT}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="Finish the Story fill-in paragraph">
        {plan.placements.map((token,i)=>token.kind==='blank'
          ?<line key={i} x1={token.x} y1={token.y+2} x2={token.x+token.width} y2={token.y+2}
            stroke="#222" strokeWidth=".95"/>
          :<text key={i} x={token.x} y={token.y} fontSize={plan.fontSize}
            fontWeight="500" fontFamily="Nunito" fill="#202c29">{token.text}</text>)}
      </svg>:<span className="story-fit-message">Story is too long to fit the printable area.</span>}
    </div>
  </div>;
}
