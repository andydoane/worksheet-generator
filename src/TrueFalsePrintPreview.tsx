import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {SMALL_PRINT_HEIGHT,SMALL_PRINT_WIDTH} from './smallParityLayout.ts';
import {planTrueFalse,TRUE_FALSE_TITLE,type TrueFalsePrintPlan} from './trueFalsePrintLayout.ts';
import type {TrueFalse} from './smallModules.ts';

const thumbUpUrl=new URL('../images/thumbs_up.svg',import.meta.url).href;
const thumbDownUrl=new URL('../images/thumbs_down.svg',import.meta.url).href;

/** The PDF and SVG preview consume the exact same print coordinates and
 * measured Mouse Memoirs line breaks. SVG <image> embeds the supplied art.
 */
export default function TrueFalsePrintPreview({module}:{module:TrueFalse}){
 const [plan,setPlan]=useState<TrueFalsePrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;
  setPlan(null);
  void mediumWidths().then(({title})=>{
   if(active)setPlan(planTrueFalse(module.statement,title)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.statement]);
 return <div className="module-preview medium-print-layout small-true-false-measured">
  {plan===null?<div className="medium-print-loading">Measuring True or False…</div>:
   plan===false?<div className="medium-print-loading">Shorten the statement to fit the Small space.</div>:
  <svg className="medium-print-svg"
   viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
   role="img" aria-label="True or False question with thumbs up and thumbs down options">
   <text x={SMALL_PRINT_WIDTH/2} y={plan.titleY} fontFamily="Mouse Memoirs"
    fontSize={plan.titleSize} fill="#222" textAnchor="middle">{TRUE_FALSE_TITLE}</text>
   {plan.statementLines.map((line,i)=><text key={i} x={line.x} y={line.y}
    fontFamily="Mouse Memoirs" fontSize={plan.statementSize}
    textAnchor="middle" fill="#222">{line.text}</text>)}
   {plan.thumbs.map((thumb,i)=><g key={thumb.label}>
    <image href={i===0?thumbUpUrl:thumbDownUrl} x={thumb.x} y={thumb.y}
     width={thumb.size} height={thumb.size} preserveAspectRatio="xMidYMid meet"/>
    <text x={thumb.labelX} y={thumb.labelY} fontFamily="Nunito"
     fontWeight="700" fontSize="10" textAnchor="middle" fill="#222">{thumb.label}</text>
   </g>)}
  </svg>}
 </div>;
}
