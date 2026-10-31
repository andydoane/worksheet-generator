import {useEffect,useMemo,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {generateWordSearch,wordSearchCells,type MediumWordSearch} from './puzzleEngines.ts';
import {planMediumWordSearch,MEDIUM_SEARCH_TITLE,type MediumWordSearchPlan} from './mediumWordSearchLayout.ts';

/** Same measured 9×9 scene and label positions as the vector PDF.
 * Solution highlighting is editor-only and never appears on printed pages.
 */
export default function MediumWordSearchPrintPreview({module,showSolution=false}:{
 module:MediumWordSearch;showSolution?:boolean;
}){
 const puzzle=useMemo(()=>generateWordSearch(module),[module.words,module.seed]);
 const selected=useMemo(()=>showSolution?wordSearchCells(puzzle):new Set<string>(),
  [puzzle,showSolution]);
 const [plan,setPlan]=useState<MediumWordSearchPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({puzzlePdf,bank,title})=>{
   if(active)setPlan(planMediumWordSearch(puzzle,{puzzle:puzzlePdf,bank,title})??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[puzzle]);
 return <div className="module-preview medium-print-layout puzzle-medium-word-search">
  {plan===null?<div className="medium-print-loading">Preparing print-matched Medium Word Search…</div>:
   plan===false?<div className="medium-print-loading">The grid and word bank cannot fit. Try shorter entries.</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Medium Word Search, nine by nine grid in left panel and Crossword title over word list in right panel">
   <line x1={plan.dividerX} y1={plan.dividerTop}
    x2={plan.dividerX} y2={plan.dividerBottom} stroke="#929292" strokeWidth=".5"/>
   <text x={plan.titleX} y={plan.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize={plan.titleSize} fill="#222">{MEDIUM_SEARCH_TITLE}</text>
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
