import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from './smallParityLayout.ts';
import {planFirstLetters,planCheckboxes,
 type FirstLetterPrintPlan,type CheckboxPrintPlan} from './smallBalancedLayout.ts';
import type {FirstLetters,Checkboxes} from './smallModules.ts';

/** SVG uses the exact PDF points, font advances and baseline coordinates. */
export function FirstLettersPrintPreview({module}:{module:FirstLetters}){
 const [plan,setPlan]=useState<FirstLetterPrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title,puzzlePdf})=>{
   if(active)setPlan(planFirstLetters(module,title,puzzlePdf)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.reference,module.verse]);
 return <div className="module-preview medium-print-layout small-first-letters-measured">
  {plan===null?<div className="medium-print-loading">Measuring first letters…</div>:
   plan===false?<div className="medium-print-loading">The verse cannot fit. Try a shorter verse.</div>:
   <svg className="medium-print-svg"
    viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="First Letter Challenge with balanced reference and initials">
    {plan.instructionLines.map((line,i)=><text key={'title-'+i}
     x={line.x} y={line.y} fontFamily="Mouse Memoirs" fontSize={plan.instructionSize}
     textAnchor="middle" fill="#222">{line.text}</text>)}
    {plan.letterLines.map((line,i)=><text key={'letters-'+i}
     x={line.x} y={line.y} fontFamily="Zilla Slab" fontWeight="700"
     fontSize={plan.letterSize} textAnchor="middle" fill="#222">{line.text}</text>)}
   </svg>}
 </div>;
}

export function CheckboxesPrintPreview({module}:{module:Checkboxes}){
 const [plan,setPlan]=useState<CheckboxPrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title,puzzlePdf})=>{
   if(active)setPlan(planCheckboxes(module,title,puzzlePdf)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.correct,module.incorrect,module.seed]);
 return <div className="module-preview medium-print-layout small-checkboxes-measured">
  {plan===null?<div className="medium-print-loading">Measuring checklist…</div>:
   plan===false?<div className="medium-print-loading">The words cannot fit. Try shorter entries.</div>:
   <svg className="medium-print-svg"
    viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Checkboxes activity with balanced instructions and print-matched choices">
    {plan.instructionLines.map((line,i)=><text key={'title-'+i}
     x={line.x} y={line.y} fontFamily="Mouse Memoirs" fontSize={plan.instructionSize}
     textAnchor="middle" fill="#222">{line.text}</text>)}
    {plan.rows.map((row,i)=><g key={'item-'+i}>
     <rect x={row.squareX} y={row.squareY} width={row.squareSize} height={row.squareSize}
      stroke="#222" fill="white" strokeWidth=".9"/>
     <text x={row.x} y={row.y} fontFamily="Zilla Slab" fontWeight="700"
      fontSize={plan.wordSize} fill="#222">{row.text}</text>
    </g>)}
   </svg>}
 </div>;
}
