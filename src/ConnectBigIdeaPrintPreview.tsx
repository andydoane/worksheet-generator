import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {
 CONNECT_BIG_TITLE,CONNECT_BIG_INSTRUCTION,planConnectBigIdea,type ConnectBigIdeaPrintPlan,
} from './connectBigIdeaLayout.ts';
import type {ConnectBigIdeaModule} from './specialtyModules.ts';

/** No HTML flex/column positioning: use the same measured point coordinates
 * and individual Zilla Slab glyph positions as the PDF renderer.
 */
export default function ConnectBigIdeaPrintPreview({module}:{module:ConnectBigIdeaModule}){
 const [state,setState]=useState<ConnectBigIdeaPrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setState(null);
  void mediumWidths().then(({puzzlePdf,bank,finishBody})=>{
   if(active)setState(planConnectBigIdea(module,{
    puzzle:puzzlePdf,bank,subtitle:finishBody,
   })??false);
  }).catch(()=>{if(active)setState(false);});
  return ()=>{active=false;};
 },[module.idea,module.seed]);
 return <div className="module-preview medium-print-layout connect-big-idea-preview">
  {state===null?<div className="medium-print-loading">Preparing scattered Big Idea…</div>:
   state===false?<div className="medium-print-loading">The words do not fit. Try shorter words or fewer words.</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Connect the Big Idea, with randomly scattered nonoverlapping words">
   <text x={MEDIUM_PRINT_WIDTH/2} y={state.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize="23" fill="#222">{CONNECT_BIG_TITLE}</text>
   <text x={MEDIUM_PRINT_WIDTH/2} y={state.subtitleY} textAnchor="middle"
    fontFamily="Nunito" fontWeight="500" fontSize={state.subtitleSize}
    fill="#222">{CONNECT_BIG_INSTRUCTION}</text>
   <rect x=".45" y={state.bankTop} width={MEDIUM_PRINT_WIDTH-.9}
    height={state.bankHeight} fill="white" stroke="#888" strokeWidth=".8"/>
   {state.bankLines.map((line,i)=><text key={'bank-'+i} x={line.x} y={line.y}
    textAnchor="middle" fontFamily="Nunito" fontWeight="800"
    fontSize={state.bankFontSize} fill="#222">{line.text}</text>)}
   {state.scattered.map(item=><g key={'scatter-'+item.order}
    transform={'translate('+item.x+' '+item.y+') rotate('+item.angle+')'}>
    {item.glyphs.map((glyph,i)=><text key={i} x={glyph.x} y={glyph.y}
     fontFamily="Zilla Slab" fontWeight="700" fontSize={item.fontSize}
     fill="#222">{glyph.char}</text>)}
   </g>)}
  </svg>}
 </div>;
}
