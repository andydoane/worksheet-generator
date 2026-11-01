import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from './smallParityLayout.ts';
import {
  planDrawPicture,planSmallUnscramble,type DrawPicturePlan,type UnscramblePrintPlan,
} from './smallFinishingLayout.ts';
import type {Unscramble} from './smallModules.ts';

export function DrawPicturePrintPreview({prompt,bordered=false}:{prompt:string;bordered?:boolean}){
 const [plan,setPlan]=useState<DrawPicturePlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({title})=>{
   if(active)setPlan(planDrawPicture(prompt,title)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[prompt]);
 return <div className="module-preview medium-print-layout small-draw-picture-measured">
  {plan===null?<div className="medium-print-loading">Measuring drawing prompt…</div>:
   plan===false?<div className="medium-print-loading">Shorten the drawing prompt to preserve drawing space.</div>:
  <svg className="medium-print-svg" viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
   preserveAspectRatio="xMidYMid meet" role="img" aria-label="Drawing box with balanced prompt underneath">
   <rect x={plan.drawing.x} y={plan.drawing.y} width={plan.drawing.width}
    height={plan.drawing.height} stroke={bordered?'none':'#666'} strokeWidth={bordered?0:1} fill="white"/>
   {plan.lines.map((line,i)=><text key={'prompt-'+i} x={line.x} y={line.y}
    textAnchor="middle" fontFamily="Mouse Memoirs" fontSize={plan.fontSize} fill="#222">{line.text}</text>)}
  </svg>}
 </div>;
}

export function SmallUnscramblePrintPreview({module}:{module:Unscramble}){
 const [plan,setPlan]=useState<UnscramblePrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({puzzlePdf})=>{
   if(active)setPlan(planSmallUnscramble(module,puzzlePdf)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.first,module.second,module.seed]);
 return <div className="module-preview medium-print-layout small-unscramble-measured">
  {plan===null?<div className="medium-print-loading">Measuring scrambled answers…</div>:
   plan===false?<div className="medium-print-loading">Shorten the answers to fit.</div>:
  <svg className="medium-print-svg" viewBox={`0 0 ${SMALL_PRINT_WIDTH} ${SMALL_PRINT_HEIGHT}`}
   preserveAspectRatio="xMidYMid meet" role="img" aria-label="Two phrase-aware scrambled answers with handwriting lines">
   <text x={SMALL_PRINT_WIDTH/2} y={plan.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize={plan.titleSize} fill="#222">UNSCRAMBLE THE WORDS</text>
   {plan.rows.map((row,i)=><g key={'answer-'+i}>
     {row.letters.map((letter,j)=><g key={'letter-'+j}>
       <line x1={letter.lineStart} y1={letter.lineY}
        x2={letter.lineEnd} y2={letter.lineY} stroke="#222" strokeWidth="1"/>
       <text x={letter.x} y={letter.y} fontFamily="Zilla Slab" fontWeight="700"
        fontSize={plan.letterSize} textAnchor="middle" fill="#222">{letter.char}</text>
     </g>)}
   </g>)}
  </svg>}
 </div>;
}
