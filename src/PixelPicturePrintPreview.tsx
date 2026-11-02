import {useEffect,useMemo,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {generatePixelPicture,type PixelPicture} from './pixelPicture.ts';
import {planPixelPicture,type PixelPlan} from './pixelPictureLayout.ts';

/** Printed puzzle is monochrome. Mint-filled shape cells appear only when the
 * teacher toggles the editor's existing Show puzzle solution action.
 */
export default function PixelPicturePrintPreview({module,showSolution=false}:{
 module:PixelPicture;showSolution?:boolean;
}){
 const puzzle=useMemo(()=>generatePixelPicture(module),
  [module.phrase,module.shapeId,module.seed]);
 const [plan,setPlan]=useState<PixelPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title,finishBody,puzzlePdf})=>{
   if(active)setPlan(planPixelPicture(puzzle,{title,body:finishBody,puzzle:puzzlePdf})??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[puzzle]);
 return <div className="module-preview medium-print-layout pixel-picture-preview">
  {plan===null?<div className="medium-print-loading">Preparing print-matched Pixel Picture…</div>:
   plan===false?<div className="medium-print-loading">This phrase cannot fit beside the 13×13 grid. Shorten it.</div>:
  <svg className="medium-print-svg"
   viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
   preserveAspectRatio="xMidYMid meet" role="img"
   aria-label="Pixel Picture with a missing-letter phrase on the left and a 13 by 13 letter grid on the right">
   <text x={plan.titleX} y={plan.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize={plan.titleSize} fill="#222">{plan.title}</text>
   {plan.instructions.map((line,i)=><text key={'instruction-'+i}
    x={line.x} y={line.y} fontFamily="Nunito" fontWeight="500"
    fontSize={plan.instructionSize} fill="#444">{line.text}</text>)}
   {plan.phraseLines.map((line,i)=><text key={'phrase-'+i}
    x={line.x} y={line.y} fontFamily="Nunito" fontWeight="500"
    fontSize={plan.phraseSize} fill="#222">{line.text}</text>)}
   {plan.cells.map(cell=><g key={cell.row+','+cell.col}>
    <rect x={cell.rectX} y={cell.rectY} width={plan.cell} height={plan.cell}
     fill={showSolution&&cell.active?'#ccebd9':'#fff'} stroke="#777" strokeWidth=".43"/>
    <text x={cell.x} y={cell.y} fontFamily="Zilla Slab" fontWeight="700"
     fontSize={plan.letterSize} fill="#222">{cell.char}</text>
   </g>)}
  </svg>}
 </div>;
}
