import {useEffect,useState} from 'react';
import {type FinishVerse} from './storyVerseModules.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {planFinishVerse,type FinishVersePlan} from './finishVerseLayout.ts';
import {mediumWidths} from './MediumPrintPreview.tsx';

/** One physically measured print scene, matching the PDF's line and box geometry. */
export default function FinishVersePrintPreview({module}:{module:FinishVerse}){
 const [plan,setPlan]=useState<FinishVersePlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(widths=>{
   if(active)setPlan(planFinishVerse(module,{title:widths.title,body:widths.finishBody,bank:widths.bank})??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.reference,module.verse,module.seed]);
 return <div className="module-preview medium-print-layout sv-medium-preview">
  {plan===false?<div className="medium-print-loading">
   Verse needs fewer blanks or shorter text to fit this Medium space.
  </div>:plan===null?<div className="medium-print-loading">Preparing print-matched verse…</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Finish the Verse with reference, word bank and writing boxes">
   <text x={MEDIUM_PRINT_WIDTH/2} y={plan.titleY} textAnchor="middle"
    fill="#222" fontFamily="Mouse Memoirs" fontSize={plan.titleSize}>{plan.title}</text>
   <rect x=".45" y={plan.bankTop} width={MEDIUM_PRINT_WIDTH-.9}
    height={plan.bankHeight} fill="white" stroke="#777" strokeWidth=".9"/>
   {plan.bankWords.map((word,i)=><text key={'bank-'+i}
    x={word.x} y={word.y} fontFamily="Nunito" fontWeight="800"
    fontSize={plan.bankFontSize} fill="#222">{word.text}</text>)}
   {plan.words.map((word,i)=>word.kind==='text'
    ?<text key={'verse-'+i} x={word.x} y={word.y} fontFamily="Nunito"
      fontWeight="500" fontSize={plan.fontSize} fill="#222">{word.text}</text>
    :<g key={'verse-'+i}>{Array.from(word.text).map((_,j)=>
     <rect key={j} x={word.x+j*plan.cell+.3}
      y={word.y-10} width={plan.cell} height={plan.boxHeight}
      fill="white" stroke="#222" strokeWidth=".8"/>)}</g>)}
  </svg>}
 </div>;
}
