import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from './smallParityLayout.ts';
import {planWhoAmI,WHO_AM_I_LABEL,type WhoAmIPrintPlan} from './whoAmIPrintLayout.ts';
import type {WhoAmI} from './smallModules.ts';

export default function WhoAmIPrintPreview({module}:{module:WhoAmI}){
 const [plan,setPlan]=useState<WhoAmIPrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title})=>{
   if(active)setPlan(planWhoAmI(module,title)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.clue,module.answer]);
 return <div className="module-preview medium-print-layout small-who-print-preview">
  {plan===null?<div className="medium-print-loading">Measuring the clue…</div>:
   plan===false?<div className="medium-print-loading">Shorten the clue or answer to fit the Small activity.</div>:
   <svg className="medium-print-svg" viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Who Am I clue above a separate question and handwriting answer area">
    {plan.clueLines.map((line,i)=><text key={'clue-'+i} x={line.x} y={line.y}
     textAnchor="middle" fontFamily="Mouse Memoirs" fontSize={plan.clueSize} fill="#222">{line.text}</text>)}
    <text x={SMALL_PRINT_WIDTH/2} y={plan.questionY} textAnchor="middle"
     fontFamily="Mouse Memoirs" fontSize={plan.questionSize} fill="#222">{WHO_AM_I_LABEL}</text>
    {plan.answerMarks.map((mark,i)=>mark.kind==='hyphen'?
     <text key={i} x={(mark.x+mark.endX)/2} y={mark.y}
      textAnchor="middle" fontFamily="Nunito" fontWeight="500" fontSize="13" fill="#222">-</text>:
     <line key={i} x1={mark.x} y1={mark.y} x2={mark.endX} y2={mark.y}
      stroke="#222" strokeWidth="1"/>)}
   </svg>}
 </div>;
}
