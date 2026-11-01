import {useEffect,useState} from 'react';
import fontkit from '@pdf-lib/fontkit';
import {COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT} from './coverBorders.ts';
import {planCoverText,type TextMeasure} from './coverTitleLayout.ts';

type CoverMetrics={title:TextMeasure;reference:TextMeasure};
let metricsPromise:Promise<CoverMetrics>|null=null;
function coverMetrics():Promise<CoverMetrics>{
  if(!metricsPromise)metricsPromise=Promise.all([
    fetch(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)).then(r=>{
      if(!r.ok)throw Error('Mouse Memoirs font');return r.arrayBuffer();
    }),
    fetch(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)).then(r=>{
      if(!r.ok)throw Error('Nunito Medium font');return r.arrayBuffer();
    }),
  ]).then(([titleBytes,bodyBytes])=>{
    const titleFace=fontkit.create(new Uint8Array(titleBytes));
    const bodyFace=fontkit.create(new Uint8Array(bodyBytes));
    const measure=(face:typeof titleFace):TextMeasure=>(text,size)=>
      face.layout(text).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/face.unitsPerEm;
    return {title:measure(titleFace),reference:measure(bodyFace)};
  }).catch(error=>{metricsPromise=null;throw error;});
  return metricsPromise;
}

/** The same line breaks, sizes and baselines as the PDF cover. */
export default function CoverTitlePreview({title,reference,bordered}:{
  title:string;reference:string;bordered:boolean;
}){
  const [metrics,setMetrics]=useState<CoverMetrics|null>(null);
  useEffect(()=>{
    let active=true;
    void coverMetrics().then(value=>{if(active)setMetrics(value);}).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  const width=(bordered?COVER_BORDER_SAFE_WIDTH:4.6)*72;
  const height=(bordered?COVER_BORDER_SAFE_HEIGHT:2.4)*72;
  const safeTitle=title.trim()||'Your story title';
  const safeReference=reference.trim()||'Scripture reference';
  const plan=metrics?planCoverText(safeTitle,safeReference,width,height,metrics.title,metrics.reference):null;
  if(!plan)return <>
    <span className="cover-title">{safeTitle}</span>
    <span className="cover-reference">{safeReference}</span>
  </>;
  return <svg className="cover-title-layout" viewBox={'0 0 '+width+' '+height}
    preserveAspectRatio="xMidYMid meet" role="img"
    aria-label={safeTitle+' — '+safeReference}>
    {plan.titleLines.map((line,i)=><text key={'title-'+i} x={line.x} y={line.y}
      fontFamily="Mouse Memoirs" fontSize={line.size} fill="#225b53">{line.text}</text>)}
    {plan.referenceLines.map((line,i)=><text key={'reference-'+i} x={line.x} y={line.y}
      fontFamily="Nunito" fontWeight="500" fontSize={line.size}
      fill="#688b7b">{line.text}</text>)}
  </svg>;
}
