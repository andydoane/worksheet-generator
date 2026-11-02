import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {
 planSortStory,SORT_STORY_WIDTH,SORT_STORY_HEIGHT,
 type SortStoryPlan,
} from './sortStoryLayout.ts';
import type {SortStory} from './storyVerseModules.ts';
import {sortStorySymbolUrl} from './sortStorySymbols.ts';

/** Large Sort the Story uses exactly the same measured point coordinates
 * in the SVG preview and the exported vector PDF.
 */
export default function SortStoryPrintPreview({module}:{module:SortStory}){
 const [plan,setPlan]=useState<SortStoryPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({finishBody,boldPdf})=>{
   if(active)setPlan(planSortStory(module,{
    body:finishBody,instruction:boldPdf,
   })??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.statements,module.seed]);
 return <div className="module-preview medium-print-layout sv-sort-print-preview">
  {plan===null?<div className="medium-print-loading">Measuring story statements…</div>:
   plan===false?<div className="medium-print-loading">The statements cannot fit clearly. Shorten the longest sentence.</div>:
   <svg className="medium-print-svg" viewBox={'0 0 '+SORT_STORY_WIDTH+' '+SORT_STORY_HEIGHT}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Sort the Story with print-matched statement rows and true or false answer boxes">
    <text x={SORT_STORY_WIDTH/2} y={plan.titleY} fontFamily="Mouse Memoirs"
     fontSize="25" textAnchor="middle" fill="#222">SORT THE STORY</text>
    {plan.instructions.map((line,i)=><text key={'instruction-'+i}
     x={line.x} y={line.y} fontFamily="Nunito" fontWeight="700"
     fontSize={plan.instructionSize} textAnchor="middle" fill="#222">{line.text}</text>)}
    <rect x={plan.bank.x} y={plan.bank.y} width={plan.bank.width}
     height={plan.bank.height} fill="none" stroke="#222" strokeWidth={plan.strokeWidth}/>
    {plan.separators.map((y,i)=><line key={'separator-'+i}
     x1={plan.bank.x} y1={y} x2={plan.bank.x+plan.bank.width} y2={y}
     stroke="#222" strokeWidth={plan.strokeWidth}/>)}
    {plan.rows.map((row,i)=><g key={'row-'+i}>
     <rect x={row.symbolBox.x} y={row.symbolBox.y}
      width={row.symbolBox.width} height={row.symbolBox.height}
      fill="white" stroke="#222" strokeWidth={plan.strokeWidth}/>
     <image href={sortStorySymbolUrl(row.symbolId)}
      x={row.symbolBox.x+1} y={row.symbolBox.y+.5}
      width={row.symbolBox.width-2} height={row.symbolBox.height-1}
      preserveAspectRatio="xMidYMid meet"/>
     {row.lines.map((line,j)=><text key={'text-'+j}
      x={line.x} y={line.y} fontFamily="Nunito" fontWeight="500"
      fontSize={row.textSize} fill="#222">{line.text}</text>)}
    </g>)}
    {plan.answers.map((answer,i)=><g key={'answer-'+i}>
     <text x={answer.labelX} y={answer.labelY} fontFamily="Mouse Memoirs"
      fontSize="18" textAnchor="middle" fill="#222">{answer.label}</text>
     <rect x={answer.box.x} y={answer.box.y} width={answer.box.width}
      height={answer.box.height} fill="none" stroke="#222"
      strokeWidth={plan.strokeWidth}/>
    </g>)}
   </svg>}
 </div>;
}
