import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {planMultipleChoice,planOddWords,SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT,
 type MultipleChoicePrintPlan,type OddWordsPrintPlan} from './smallParityLayout.ts';
import type {MultipleChoice,OddWords} from './smallModules.ts';

export function MultipleChoicePrintPreview({module}:{module:MultipleChoice}){
 const [plan,setPlan]=useState<MultipleChoicePrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title,titleInkCenter})=>{
   if(active)setPlan(planMultipleChoice(module,title,titleInkCenter)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.question,module.correct,module.wrong1,module.wrong2,module.seed]);
 return <div className="module-preview medium-print-layout small-measured-preview">
  {plan===null?<div className="medium-print-loading">Measuring choices…</div>:
   plan===false?<div className="medium-print-loading">Shorten the question or answers to fit.</div>:
   <svg className="medium-print-svg" viewBox={'0 0 '+SMALL_PRINT_WIDTH+' '+SMALL_PRINT_HEIGHT}
    role="img" aria-label="Multiple choice question with centered answer boxes">
    {plan.questionLines.map((line,i)=><text key={'q-'+i}
      x={line.x} y={line.y} textAnchor="middle"
      fontFamily="Mouse Memoirs" fontSize={plan.questionSize} fill="#222">{line.text}</text>)}
    {plan.rows.map((row,i)=><g key={'choice-'+i}>
      <rect x={row.squareX} y={row.squareY} width={row.squareSize} height={row.squareSize}
       stroke="#222" strokeWidth=".9" fill="white"/>
      {row.lines.map((line,j)=><text key={j} x={line.x} y={line.y}
       fontFamily="Mouse Memoirs" fontSize={row.fontSize} fill="#222">{line.text}</text>)}
    </g>)}
   </svg>}
 </div>;
}

export function OddWordsPrintPreview({module}:{module:OddWords}){
 const [plan,setPlan]=useState<OddWordsPrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title,puzzlePdf})=>{
   if(active)setPlan(planOddWords(module,title,puzzlePdf)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.correct,module.incorrect,module.seed]);
 return <div className="module-preview medium-print-layout small-measured-preview">
  {plan===null?<div className="medium-print-loading">Measuring word columns…</div>:
   plan===false?<div className="medium-print-loading">Shorten the words to fit.</div>:
   <svg className="medium-print-svg" viewBox={'0 0 '+SMALL_PRINT_WIDTH+' '+SMALL_PRINT_HEIGHT}
    role="img" aria-label="Story words in two vertically and horizontally centered columns">
    {plan.instructions.map((line,i)=><text key={'instruction-'+i}
      x={line.x} y={line.y} textAnchor="middle"
      fontFamily="Mouse Memoirs" fontSize={plan.instructionSize} fill="#222">{line.text}</text>)}
    {plan.left.map((line,i)=><text key={'left-'+i}
      x={line.x} y={line.y} fontFamily="Zilla Slab" fontWeight="700"
      fontSize={plan.fontSize} fill="#222">{line.text}</text>)}
    {plan.right.map((line,i)=><text key={'right-'+i}
      x={line.x} y={line.y} fontFamily="Zilla Slab" fontWeight="700"
      fontSize={plan.fontSize} fill="#222">{line.text}</text>)}
   </svg>}
 </div>;
}
