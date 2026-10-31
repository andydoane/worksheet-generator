import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {LARGE_CONNECT_WIDTH,LARGE_CONNECT_HEIGHT,
 CONNECT_VERSE_TITLE,CONNECT_VERSE_INSTRUCTION,planConnectVerse,
 type ConnectVersePrintPlan} from './connectVerseLayout.ts';
import type {ConnectVerseModule} from './specialtyModules.ts';

/** Large, fully measured SVG. Same word/bank glyph positions and Zilla Slab
 * font as print PDF; no columns or CSS word layout.
 */
export default function ConnectVersePrintPreview({module}:{module:ConnectVerseModule}){
 const [state,setState]=useState<ConnectVersePrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setState(null);
  void mediumWidths().then(({puzzlePdf,boldPdf,finishBody})=>{
   if(active)setState(planConnectVerse(module,{
    puzzle:puzzlePdf,verse:boldPdf,subtitle:finishBody,
   })??false);
  }).catch(()=>{if(active)setState(false);});
  return ()=>{active=false;};
 },[module.verse,module.seed]);
 return <div className="module-preview medium-print-layout connect-verse-print-preview">
  {state===null?<div className="medium-print-loading">Preparing print-matched verse…</div>:
   state===false?<div className="medium-print-loading">This verse cannot fit. Try shorter words or fewer words.</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+LARGE_CONNECT_WIDTH+' '+LARGE_CONNECT_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Connect the Verse with a complete verse bank and nonoverlapping scattered words">
   <text x={LARGE_CONNECT_WIDTH/2} y={state.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize="23" fill="#222">{CONNECT_VERSE_TITLE}</text>
   <text x={LARGE_CONNECT_WIDTH/2} y={state.subtitleY} textAnchor="middle"
    fontFamily="Nunito" fontWeight="500" fontSize={state.subtitleSize}
    fill="#222">{CONNECT_VERSE_INSTRUCTION}</text>
   <rect x=".45" y={state.bankTop} width={LARGE_CONNECT_WIDTH-.9}
    height={state.bankHeight} fill="white" stroke="#888" strokeWidth=".9"/>
   {state.bankLines.map((line,i)=><text key={'bank-'+i}
    x={line.x} y={line.y} textAnchor="middle" fontFamily="Nunito"
    fontWeight="700" fontSize={state.bankFontSize} fill="#222">{line.text}</text>)}
   {state.scattered.map(item=><g key={'word-'+item.order}
    transform={'translate('+item.x+' '+item.y+') rotate('+item.angle+')'}>
    {item.glyphs.map((glyph,i)=><text key={i}
     x={glyph.x} y={glyph.y} fontFamily="Zilla Slab" fontWeight="700"
     fontSize={item.fontSize} fill="#222">{glyph.char}</text>)}
   </g>)}
  </svg>}
 </div>;
}
