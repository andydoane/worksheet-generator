import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {planUnscrambleVerse,planUpsideDownVerse,type ReconstructionPlan} from './verseReconstructionLayout.ts';
import type {UnscrambleVerse} from './storyVerseModules.ts';
import type {UpsideDownVerseModule} from './specialtyModules.ts';

export function VerseReconstructionPreview({module}:{
 module:UnscrambleVerse|UpsideDownVerseModule
}){
 const [plan,setPlan]=useState<ReconstructionPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(fonts=>{
   const metrics={title:fonts.title,body:fonts.finishBody,puzzle:fonts.puzzle};
   const result=module.type==='unscramble-verse'
    ?planUnscrambleVerse(module,metrics):planUpsideDownVerse(module,metrics);
   if(active)setPlan(result??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.type,module.type==='unscramble-verse'?module.seed:0,module.verse,module.reference]);
 const upside=module.type==='upside-down-verse';
 return <div className="module-preview medium-print-layout">
  {plan===false?<div className="medium-print-loading">This verse needs shorter text or fewer marked words to fit.</div>:
   plan===null?<div className="medium-print-loading">Preparing print-matched verse…</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label={upside?'Upside Down Verse with upright punctuation and inverted letters':'Unscramble Verse with letters below the answer lines'}>
    <text x={MEDIUM_PRINT_WIDTH/2} y={plan.titleY} textAnchor="middle"
      fontFamily="Mouse Memoirs" fontSize={plan.titleSize} fill="#222">{plan.title}</text>
    {plan.reference&&<text x={MEDIUM_PRINT_WIDTH/2} y={plan.referenceY}
      textAnchor="middle" fontFamily="Nunito" fontWeight="700"
      fontSize="10.5" fill="#222">{plan.reference}</text>}
    {plan.marks.map((m,i)=>m.kind==='ordinary'
     ?<text key={i} x={m.x} y={m.y} fontFamily="Nunito" fontWeight="500"
       fontSize={plan.fontSize} fill="#222">{m.text}</text>
     :m.kind==='punctuation'
     ?<text key={i} x={m.x} y={m.y+(upside?1:0)}
       fontFamily="Zilla Slab" fontWeight="700" fontSize={plan.fontSize}
       fill="#222">{m.text}</text>
     :<g key={i}>
       <line x1={m.x+.8} x2={m.x+plan.cell-1}
        y1={m.y+2} y2={m.y+2} stroke="#222" strokeWidth=".8"/>
       {upside?<text x={m.x+plan.cell/2} y={m.y+16} textAnchor="middle"
          fontFamily="Zilla Slab" fontSize={plan.fontSize} fontWeight="700"
          fill="#222" transform={'translate(0 '+(2*(m.y+16))+') scale(1 -1)'}>{m.text}</text>
       :<text x={m.x+plan.cell/2} y={m.y+16} textAnchor="middle"
          fontFamily="Zilla Slab" fontSize="8.2" fontWeight="700"
          fill="#222">{m.scramble}</text>}
      </g>)}
  </svg>}
 </div>;
}
