import {useEffect,useMemo,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {generateWordSearch,wordSearchCells,type WordSearch} from './puzzleEngines.ts';
import {planWordSearch,WORD_SEARCH_WIDTH,WORD_SEARCH_HEIGHT,type WordSearchPlan} from './wordSearchLayout.ts';

/** Exact printable Word Search scene, with editor-only solution highlights. */
export default function WordSearchPrintPreview({module,showSolution=false}:{
 module:WordSearch;showSolution?:boolean;
}){
 const puzzle=useMemo(()=>generateWordSearch(module),[module.words,module.seed]);
 const selected=useMemo(()=>showSolution?wordSearchCells(puzzle):new Set<string>(),
  [puzzle,showSolution]);
 const [plan,setPlan]=useState<WordSearchPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({puzzlePdf,bank})=>{
   if(active)setPlan(planWordSearch(puzzle,{puzzle:puzzlePdf,bank})??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[puzzle]);
 return <div className="module-preview medium-print-layout puzzle-word-search">
  {plan===null?<div className="medium-print-loading">Preparing print-matched Word Search…</div>:
   plan===false?<div className="medium-print-loading">The grid and word bank do not fit. Try shorter entries.</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+WORD_SEARCH_WIDTH+' '+WORD_SEARCH_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Word Search grid and word bank with print-matched geometry">
   <rect x={plan.gridX-2} y={plan.gridTop-2} width={plan.gridWidth+4}
    height={plan.gridHeight+4} fill="none" stroke="#929292" strokeWidth=".5"/>
   {plan.letters.map(letter=><g key={letter.col+','+letter.row}>
    {selected.has(letter.col+','+letter.row)&&<rect
     x={plan.gridX+letter.col*plan.cell+.4}
     y={plan.gridTop+letter.row*plan.cell+.4}
     width={plan.cell-.8} height={plan.cell-.8} fill="#ccebd9"/>}
    <text x={letter.x} y={letter.y} fontFamily="Zilla Slab" fontWeight="700"
     fontSize={plan.letterSize} fill="#222">{letter.char}</text>
   </g>)}
   {plan.bankEntries.map((entry,i)=><text key={'bank-'+i}
    x={entry.x} y={entry.y} fontFamily="Nunito" fontWeight="800"
    fontSize={plan.bankSize} textAnchor="middle" fill="#222">{entry.text}</text>)}
  </svg>}
 </div>;
}
