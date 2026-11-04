import {useEffect,useState} from 'react';
import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram,type Cryptogram,type VerseCryptogram} from './cryptograms.ts';
import BigIdeaCryptogramPreview from './BigIdeaCryptogramPreview.tsx';
import {mediumWidths} from './MediumPrintPreview.tsx';
import {
 planVerseCryptogram,LARGE_CIPHER_WIDTH,LARGE_CIPHER_HEIGHT,
 type VerseCryptogramPlan,
} from './verseCryptogramLayout.ts';

/** Retained for the interactive editor's inline cipher-key glyphs. */
export function CipherGlyph({id}:{id:number}){
 const glyph=cipherSymbol(id);
 return <svg viewBox="0 0 16 16" className="cipher-glyph" aria-hidden="true">
  {glyph.paths.map((path,i)=><path key={i} d={path.d}
   fill={path.filled?'currentColor':'none'}
   stroke={path.filled?'none':'currentColor'} strokeWidth="1.45"
   strokeLinejoin="round" strokeLinecap="round"/>)}
 </svg>;
}

function PrintSymbol({id,x,y,size}:{id:number;x:number;y:number;size:number}){
 const glyph=cipherSymbol(id);
 return <g transform={'translate('+x+' '+y+') scale('+(size/16)+')'}>
  {glyph.paths.map((path,i)=><path key={i} d={path.d}
   fill={path.filled?'#242424':'none'}
   stroke={path.filled?'none':'#242424'} strokeWidth="1.45"
   strokeLinejoin="round" strokeLinecap="round"/>)}
 </g>;
}
/** The Large Verse Cryptogram uses exactly the PDF's measured point scene. */
function VerseCryptogramPreview({module}:{module:VerseCryptogram}){
 const [plan,setPlan]=useState<VerseCryptogramPlan|null|false>(null);
 const data=generateCryptogram(module);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({finishBody})=>{
   if(active)setPlan(planVerseCryptogram(generateCryptogram(module),finishBody)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.type,module.verse,module.reference,module.seed]);
 return <div className="module-preview medium-print-layout cipher-large">
  {plan===null?<div className="medium-print-loading">Preparing print-matched cryptogram…</div>:
   plan===false?<div className="medium-print-loading">The verse needs more handwriting room. Use shorter words or a shorter verse.</div>:
   <svg className="medium-print-svg"
    viewBox={'0 0 '+LARGE_CIPHER_WIDTH+' '+LARGE_CIPHER_HEIGHT}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label="Verse cryptogram with print-matched symbol key and handwriting lines">
    <text x={LARGE_CIPHER_WIDTH/2} y={plan.titleY} textAnchor="middle"
     fontFamily="Mouse Memoirs" fontSize="25" fill="#242424">SOLVE THE CODE!</text>
    {plan.keyCells.map((item,i)=><g key={'key-'+i}>
     <rect x={item.x} y={item.y} width={item.width} height={plan.keyHeight}
      fill="none" stroke="#707070" strokeWidth=".65"/>
     <line x1={item.x} x2={item.x+item.width}
      y1={item.y+17} y2={item.y+17} stroke="#707070" strokeWidth=".55"/>
     <PrintSymbol id={item.symbol} size={plan.keySymbolSize}
      x={item.x+(item.width-plan.keySymbolSize)/2}
      y={item.y+(17-plan.keySymbolSize)/2}/>
     <text x={item.x+item.width/2} y={item.y+plan.keyHeight-4}
      fontFamily="Zilla Slab" fontWeight="700" fontSize={plan.keyLetterSize}
      textAnchor="middle" fill="#242424">{item.letter}</text>
    </g>)}
    {data.reference&&<text x={LARGE_CIPHER_WIDTH/2} y={plan.referenceY}
     textAnchor="middle" fontFamily="Nunito" fontWeight="700"
     fontSize={plan.referenceSize} fill="#242424">{data.reference}</text>}
    {plan.bodyCells.map((cell,i)=>cell.symbol===undefined?
     <text key={'punct-'+i} x={cell.x} y={cell.lineY+2}
      fontFamily="Nunito" fontWeight="500" fontSize="10"
      fill="#242424">{cell.char}</text>:
     <g key={'cipher-'+i}>
      <line x1={cell.x+.8} x2={cell.x+.8+plan.answerLineWidth}
       y1={cell.lineY} y2={cell.lineY} stroke="#242424" strokeWidth=".8"/>
      <PrintSymbol id={cell.symbol}
       x={cell.x+(cell.width-plan.symbolSize)/2}
       y={cell.lineY+plan.symbolTopOffset} size={plan.symbolSize}/>
     </g>)}
   </svg>}
 </div>;
}
export default function CryptogramPreview({module}:{module:Cryptogram}){
 return module.type==='big-idea-cryptogram'
  ?<BigIdeaCryptogramPreview module={module}/>
  :<VerseCryptogramPreview module={module}/>;
}
