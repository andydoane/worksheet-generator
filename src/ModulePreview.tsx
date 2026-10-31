import {useEffect,useState} from 'react';
import fontkit from '@pdf-lib/fontkit';
import { matchRows, storyBank, validateModule, MODULES, type ActivityModule } from './modules';
import {planStory,STORY_BODY_WIDTH,STORY_BODY_HEIGHT,STORY_INNER_WIDTH,STORY_INNER_HEIGHT,STORY_BODY_TOP,STORY_BANK_TOP,STORY_BANK_HEIGHT,type StoryPlan} from './storyLayout.ts';
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

/** The *whole* cover module shares one physical viewBox with modulePdf.ts.
 * Previously the title and bank were flex children but story text used an
 * unrelated SVG viewBox, so it could overlap the bank and clip its last row.
 *
 * Fontkit uses the identical local static TTF outlines as pdf-lib, avoiding
 * platform-dependent Canvas font widths for reproducible wrapping.
 */
type FontMetrics={body:(text:string,size:number)=>number;bank:(text:string,size:number)=>number};
let metricPromise:Promise<FontMetrics>|null=null;
function storyMetrics():Promise<FontMetrics>{
  if(!metricPromise)metricPromise=Promise.all([
    fetch(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)).then(r=>{if(!r.ok)throw Error('Nunito font');return r.arrayBuffer();}),
    fetch(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)).then(r=>{if(!r.ok)throw Error('Nunito font');return r.arrayBuffer();}),
  ]).then(([bodyBytes,bankBytes])=>{
    const body=fontkit.create(new Uint8Array(bodyBytes));
    const bank=fontkit.create(new Uint8Array(bankBytes));
    const width=(face:typeof body)=>(text:string,size:number)=>
      face.layout(text).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/face.unitsPerEm;
    return {body:width(body),bank:width(bank)};
  }).catch(e=>{metricPromise=null;throw e;});
  return metricPromise;
}
function StoryPreview({module}:{module:Extract<ActivityModule,{type:'finish-story'}>}){
  const [state,setState]=useState<{plan:StoryPlan|null;bankSize:number}|null>(null);
  const bank=storyBank(module),columns=Math.ceil(bank.length/2);
  useEffect(()=>{
    let active=true;
    setState(null);
    void storyMetrics().then(({body,bank:bankWidth})=>{
      let bankSize=11.5;
      while(bankSize>=6.5&&bank.some(word=>
        bankWidth(word.toUpperCase(),bankSize)>STORY_INNER_WIDTH/columns-6))bankSize-=.5;
      if(active)setState({
        plan:planStory(module.story,body,STORY_BODY_WIDTH,STORY_BODY_HEIGHT),
        bankSize:Math.max(6.5,bankSize),
      });
    }).catch(()=>{
      // On rare font-fetch failure, still draw the complete story using the
      // local CSS font's metrics; never fall back to truncated HTML paragraphs.
      const context=document.createElement('canvas').getContext('2d');
      if(!context||!active)return;
      const measure=(text:string,size:number)=>{
        context.font='500 '+size+'px Nunito';
        return context.measureText(text).width;
      };
      setState({plan:planStory(module.story,measure,STORY_BODY_WIDTH,STORY_BODY_HEIGHT),bankSize:10});
    });
    return ()=>{active=false;};
  },[module.story,module.seed]);
  const plan=state?.plan;
  return <div className="module-preview story-module story-svg-module">
    <svg className="story-full-svg" viewBox={'0 0 '+STORY_INNER_WIDTH+' '+STORY_INNER_HEIGHT}
      preserveAspectRatio="xMidYMid meet" role="img" aria-label="Finish the Story printable layout">
      <text x={STORY_INNER_WIDTH/2} y="28" textAnchor="middle"
        fontSize="25" fontFamily="Mouse Memoirs" fill="#222">FINISH THE STORY</text>
      <rect x=".4" y={STORY_BANK_TOP} width={STORY_INNER_WIDTH-.8}
        height={STORY_BANK_HEIGHT} fill="white" stroke="#777" strokeWidth=".8"/>
      {bank.map((word,i)=><text key={'word'+i}
        x={((i%columns)+.5)*STORY_INNER_WIDTH/columns}
        y={STORY_BANK_TOP+24+Math.floor(i/columns)*29}
        textAnchor="middle" fontFamily="Nunito" fontWeight="800"
        fontSize={state?.bankSize??10} fill="#222">{word.toUpperCase()}</text>)}
      {plan?.placements.map((token,i)=>token.kind==='blank'
        ?<line key={i} x1={3+token.x} x2={3+token.x+token.width}
          y1={STORY_BODY_TOP+token.y+2} y2={STORY_BODY_TOP+token.y+2}
          stroke="#222" strokeWidth=".95"/>
        :<text key={i} x={3+token.x} y={STORY_BODY_TOP+token.y}
          fontSize={plan.fontSize} fontWeight="500" fontFamily="Nunito"
          fill="#222">{token.text}</text>)}
      {state&&!plan&&<text x={STORY_INNER_WIDTH/2} y="160" fontFamily="Nunito"
        fontSize="11" textAnchor="middle">Story is too long for the printable area.</text>}
    </svg>
  </div>;
}
