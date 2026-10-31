import {useEffect,useState} from 'react';
import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram,type BigIdeaCryptogram} from './cryptograms.ts';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {
 planBigIdeaCryptogram,BIG_IDEA_CELL_WIDTH,BIG_IDEA_ANSWER_LINE_WIDTH,
 BIG_IDEA_SYMBOL_SIZE,type BigIdeaPrintPlan,
} from './bigIdeaCryptogramLayout.ts';

/** Render paths from the same vector symbol definition as the PDF.
 * The path coordinate system is 16×16, with y increasing downward.
 */
function PrintSymbol({id,x,y,size}:{id:number;x:number;y:number;size:number}){
 const glyph=cipherSymbol(id),scale=size/16;
 return <g transform={'translate('+x+' '+y+') scale('+scale+')'}>
  {glyph.paths.map((path,i)=><path key={i} d={path.d}
   fill={path.filled?'#242424':'none'}
   stroke={path.filled?'none':'#242424'} strokeWidth="1.45"
   strokeLinejoin="round" strokeLinecap="round"/>)}
 </g>;
}
export default function BigIdeaCryptogramPreview({module}:{module:BigIdeaCryptogram}){
 const [state,setState]=useState<BigIdeaPrintPlan|null|false>(null);
 const data=generateCryptogram(module);
 useEffect(()=>{
  let active=true;setState(null);
  void mediumWidths().then(({finishBody})=>{
   if(active)setState(planBigIdeaCryptogram(generateCryptogram(module),finishBody)??false);
  }).catch(()=>{if(active)setState(false);});
  return ()=>{active=false;};
 },[module.idea,module.seed]);
 return <div className="module-preview medium-print-layout cipher-medium">
  {state===null?<div className="medium-print-loading">Preparing print-matched cryptogram…</div>:
   state===false?<div className="medium-print-loading">This text is too dense for three readable lines.</div>:
  <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Solve the Code with centered handwriting lines and symbol key">
   <text x={MEDIUM_PRINT_WIDTH/2} y={state.titleY} textAnchor="middle"
     fontFamily="Mouse Memoirs" fontSize="25" fill="#242424">SOLVE THE CODE!</text>
   {state.keyCells.map((item,i)=>{
    const symX=item.x+(item.width-state.keySymbolSize)/2;
    return <g key={'key-'+i}>
     <rect x={item.x} y={item.y} width={item.width} height={state.keyHeight}
      fill="none" stroke="#707070" strokeWidth=".65"/>
     <line x1={item.x} x2={item.x+item.width} y1={item.y+13}
      y2={item.y+13} stroke="#707070" strokeWidth=".55"/>
     <PrintSymbol id={item.symbol} x={symX}
      y={item.y+(13-state.keySymbolSize)/2} size={state.keySymbolSize}/>
     <text x={item.x+item.width/2} y={item.y+20} textAnchor="middle"
      fontFamily="Zilla Slab" fontWeight="700" fontSize={state.keyLetterSize}
      fill="#242424">{item.letter}</text>
    </g>;
   })}
   {state.bodyCells.map((item,i)=>item.symbol===undefined?
    <text key={'punc-'+i} x={item.x} y={item.lineY+1}
     fontFamily="Nunito" fontWeight="500" fontSize="10" fill="#242424">{item.char}</text>:
    <g key={'encoded-'+i}>
     <line x1={item.x+.8} x2={item.x+BIG_IDEA_ANSWER_LINE_WIDTH+.8}
      y1={item.lineY} y2={item.lineY} stroke="#242424" strokeWidth=".8"/>
     <PrintSymbol id={item.symbol}
      x={item.x+(BIG_IDEA_CELL_WIDTH-BIG_IDEA_SYMBOL_SIZE)/2}
      y={item.lineY+4} size={BIG_IDEA_SYMBOL_SIZE}/>
    </g>)}
  </svg>}
 </div>;
}
