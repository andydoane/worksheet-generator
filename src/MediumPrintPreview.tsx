import {useEffect,useState} from 'react';
import fontkit from '@pdf-lib/fontkit';
import {matchRows,type MatchWordsModule} from './modules.ts';
import {mistakesTitle,type CircleMistakes} from './storyVerseModules.ts';
import {
  planMatching,planMistakes,MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,
  type MatchPrintPlan,type MistakesPrintPlan,type MeasureText,
} from './mediumParityLayout.ts';

type MediumWidths={body:MeasureText;bold:MeasureText;puzzle:MeasureText};
let widthsPromise:Promise<MediumWidths>|null=null;
/** Measure the same static TrueType faces embedded in PDF output. */
function mediumWidths():Promise<MediumWidths>{
  if(!widthsPromise)widthsPromise=Promise.all([
    '../fonts/Nunito-Medium.ttf',
    '../fonts/Nunito-Bold.ttf',
    '../fonts/ZillaSlab-Bold-pdf.ttf',
  ].map(path=>fetch(new URL(path,import.meta.url)).then(response=>{
    if(!response.ok)throw Error('Print font could not be loaded');
    return response.arrayBuffer();
  }))).then(bytes=>{
    const faces=bytes.map(data=>fontkit.create(new Uint8Array(data)));
    const width=(face:typeof faces[number]):MeasureText=>(value,size)=>
      face.layout(value).positions.reduce((sum,pos)=>sum+pos.xAdvance,0)*size/face.unitsPerEm;
    return {body:width(faces[0]),bold:width(faces[1]),puzzle:width(faces[2])};
  }).catch(error=>{widthsPromise=null;throw error;});
  return widthsPromise;
}
function MediumSvg({children,label}:{children:React.ReactNode;label:string}){
  return <svg className="medium-print-svg"
    viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
    preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>{children}</svg>;
}
function Unavailable(){return <div className="medium-print-loading">Unable to prepare the print-matched preview.</div>;}

export function MatchingPrintPreview({module}:{module:MatchWordsModule}){
  const [state,setState]=useState<MatchPrintPlan|null|false>(null);
  const rows=matchRows(module);
  useEffect(()=>{
    let active=true;
    setState(null);
    void mediumWidths().then(({bold,puzzle})=>{
      if(active)setState(planMatching(matchRows(module),bold,puzzle)??false);
    }).catch(()=>{if(active)setState(false);});
    return ()=>{active=false;};
  },[module.pairs,module.seed]);
  return <div className="module-preview medium-print-layout matching-module">
    {state===false?<Unavailable/>:state===null?<div className="medium-print-loading">Preparing print-matched words…</div>:
    <MediumSvg label="Match the Words, left and right-aligned word columns">
      <text x={MEDIUM_PRINT_WIDTH/2} y={state.titleY} textAnchor="middle"
        fontFamily="Mouse Memoirs" fontSize="25" fill="#222">MATCH THE WORDS</text>
      {state.instructions.map((line,i)=><text key={'instruction-'+i}
        x={line.x} y={line.y} textAnchor="middle" fontFamily="Nunito" fontWeight="700"
        fontSize={state.instructionSize} fill="#666">{line.text}</text>)}
      {state.leftRows.map((line,i)=><text key={'left-'+i} x={line.x} y={line.y}
        fontFamily="Zilla Slab" fontWeight="700" fontSize={state.fontSize}
        textAnchor="start" fill="#222">{line.text}</text>)}
      {state.rightRows.map((line,i)=><text key={'right-'+i} x={line.x} y={line.y}
        fontFamily="Zilla Slab" fontWeight="700" fontSize={state.fontSize}
        textAnchor="end" fill="#222">{line.text}</text>)}
    </MediumSvg>}
  </div>;
}

export function MistakesPrintPreview({module}:{module:CircleMistakes}){
  const [state,setState]=useState<MistakesPrintPlan|null|false>(null);
  useEffect(()=>{
    let active=true;
    setState(null);
    void mediumWidths().then(({body})=>{
      if(active)setState(planMistakes(module.text,body)??false);
    }).catch(()=>{if(active)setState(false);});
    return ()=>{active=false;};
  },[module.text]);
  return <div className="module-preview medium-print-layout sv-preview sv-medium-preview">
    {state===false?<Unavailable/>:state===null?<div className="medium-print-loading">Preparing print-matched paragraph…</div>:
    <MediumSvg label="Circle the Mistakes, print-matched text and handwriting spacing">
      <text x={MEDIUM_PRINT_WIDTH/2} y="24" fontFamily="Mouse Memoirs"
        fontSize="25" textAnchor="middle" fill="#222">{mistakesTitle(module.count)}</text>
      {state.lines.map((line,i)=><text key={i} x={line.x} y={line.y}
        fontFamily="Nunito" fontWeight="500" fontSize={state.fontSize}
        textAnchor="start" fill="#222">{line.text}</text>)}
    </MediumSvg>}
  </div>;
}
