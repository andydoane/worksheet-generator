import {useEffect,useState} from 'react';
import fontkit from '@pdf-lib/fontkit';
import {planCrossword,CROSSWORD_WIDTH,CROSSWORD_HEIGHT,type CrosswordPlan} from './crosswordLayout.ts';
import {
  generateCrossword,connectPositions,parseConnectionWords,spiralPoints,spiralTurns,spiralFirstWord,
  type SpecialtyModule,
} from './specialtyModules.ts';

let crosswordFace:Promise<ReturnType<typeof fontkit.create>>|null=null;
function crosswordFont(){
  if(!crosswordFace)crosswordFace=fetch(new URL('../fonts/Nunito-Medium.ttf',import.meta.url))
    .then(r=>{if(!r.ok)throw Error('Nunito Medium');return r.arrayBuffer();})
    .then(bytes=>fontkit.create(new Uint8Array(bytes)))
    .catch(error=>{crosswordFace=null;throw error;});
  return crosswordFace;
}
function CrosswordView({module}:{module:Extract<SpecialtyModule,{type:'crossword'}>}){
  const [plan,setPlan]=useState<CrosswordPlan|null>(null);
  let puzzle;
  try{puzzle=generateCrossword(module);}catch(error){
    return <div className="module-preview module-incomplete"><strong>CROSSWORD</strong>
      <span>{error instanceof Error?error.message:'Unable to place these answers.'}</span></div>;
  }
  const fingerprint=module.entries+'|'+module.seed;
  useEffect(()=>{
    let active=true;
    setPlan(null);
    const grid=generateCrossword(module);
    void crosswordFont().then(face=>{
      const width=(text:string,size:number)=>
        face.layout(text).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/face.unitsPerEm;
      if(active)setPlan(planCrossword(grid,width));
    }).catch(()=>{if(active)setPlan(null);});
    return ()=>{active=false;};
  },[fingerprint]);
  return <div className="module-preview specialty-preview crossword-preview crossword-print-preview">
    {plan?<svg className="crossword-print-svg" viewBox={'0 0 '+CROSSWORD_WIDTH+' '+CROSSWORD_HEIGHT}
      preserveAspectRatio="xMidYMid meet" aria-label="Crossword grid and clues" role="img">
      <text x={CROSSWORD_WIDTH/2} y="27" fontFamily="Mouse Memoirs" fontSize="25"
        textAnchor="middle" fill="#222">CROSSWORD</text>
      {puzzle.cells.flatMap((row,y)=>row.map((letter,x)=>letter?<g key={x+','+y}>
        <rect x={plan.gridX+x*plan.cell} y={plan.gridTop+y*plan.cell}
          width={plan.cell} height={plan.cell} fill="white" stroke="#222" strokeWidth=".65"/>
        {puzzle.numbers[x+','+y]&&<text x={plan.gridX+x*plan.cell+1.4}
          y={plan.gridTop+y*plan.cell+6.4} fontFamily="Nunito" fontSize="5.6" fill="#222">
            {puzzle.numbers[x+','+y]}</text>}
      </g>:null))}
      {(['ACROSS','DOWN'] as const).map((name,i)=><text key={name}
        x={(i?plan.downHeader.x:plan.acrossHeader.x)+(CROSSWORD_WIDTH/2-12)/2}
        y={i?plan.downHeader.y:plan.acrossHeader.y} fontSize="17"
        fontFamily="Mouse Memoirs" textAnchor="middle" fill="#222">{name}</text>)}
      {[...plan.acrossRows,...plan.downRows].map((line,i)=><text key={i}
        x={line.x} y={line.y} fontFamily="Nunito" fontWeight="500"
        fontSize={plan.clueFontSize} fill="#222">{line.text}</text>)}
    </svg>:<div className="crossword-preview-loading" aria-live="polite">
      Preparing print-matched crossword…
    </div>}
  </div>;
}
function SpiralView({module}:{module:Extract<SpecialtyModule,{type:'spiral-verse'}>}){
  const pts=spiralPoints(800,spiralTurns(module.verse)).reverse();
  const path=pts.map(p=>(p.x*1000).toFixed(1)+','+(p.y*1000).toFixed(1)).join(' ');
  const first=spiralFirstWord(module.verse);
  const x=Math.min(900,Math.max(70,pts[0].x*1000));
  const y=Math.min(920,Math.max(80,pts[0].y*1000-16));
  const labelW=first.length*17+18;
  return <div className="module-preview specialty-preview spiral-preview">
    <div className="module-title">SPIRAL VERSE</div>
    <div className="specialty-instruction">Copy the verse on the spiral line.</div>
    <div className="spiral-bank"><strong>{module.reference}</strong>
      <span className="spiral-bank-verse">{module.verse}</span></div>
    <svg className="spiral-svg" viewBox="35 35 930 930" role="img"
      aria-label="Writing spiral with a starter word at the outside">
      <polyline points={path} fill="none" stroke="currentColor"
        strokeWidth="2.8" strokeLinecap="round"/>
      {first&&<g>
        <rect x={Math.max(35,Math.min(965-labelW,x-labelW/2))} y={y-27}
          width={labelW} height="34" fill="white"/>
        <text x={x} y={y} fill="#222" textAnchor="middle" fontFamily="Nunito"
          fontWeight="700" fontSize="24">{first}</text>
      </g>}
    </svg>
  </div>;
}
function UpsideDownView({module}:{module:Extract<SpecialtyModule,{type:'upside-down-verse'}>}){
  return <div className="module-preview specialty-preview upside-preview">
    <div className="module-title">UPSIDE DOWN VERSE</div>
    <div className="specialty-verse-reference">{module.reference}</div>
    <div className="upside-words">{module.verse.toUpperCase().split(/(\s+)/u).map((word,i)=>
      /^\s+$/u.test(word)?<span key={i} className="upside-space"> </span>:
      <span className="upside-word" key={i}>{Array.from(word).map((char,j)=>
        <span key={j} className="upside-letter"><i/>
          <b className={/^[A-Z]$/.test(char)?'upside-flip':''}>{char}</b>
        </span>)}</span>)}</div>
  </div>;
}
function ConnectView({module}:{module:Extract<SpecialtyModule,{type:'connect-verse'|'connect-big-idea'}>}){
  const positions=connectPositions(module),allWords=parseConnectionWords(module.type==='connect-verse'?module.verse:module.idea);
  return <div className="module-preview specialty-preview connect-preview">
    <div className="module-title">CONNECT THE VERSE</div>
    <div className="specialty-instruction">Draw lines from the first word to the second, all the way to the last.</div>
    {module.type==='connect-big-idea'&&<div className="connect-bank">{allWords.join('  ·  ')}</div>}
    <div className="connect-field">
      {positions.map(pos=><div key={pos.order} className="connect-word" style={{
        left:(pos.x*100)+'%',top:(pos.y*100)+'%',transform:'translate(-50%,-50%) rotate('+pos.angle+'deg)',
      }}>{Array.from(pos.word).map((letter,i)=><span key={i} style={{transform:'translateY('+(pos.jitter[i]*300)+'px)'}}>{letter}</span>)}</div>)}
    </div>
  </div>;
}
export default function SpecialtyPreview({module}:{module:SpecialtyModule}){
  switch(module.type){
    case 'crossword':return <CrosswordView module={module}/>;
    case 'spiral-verse':return <SpiralView module={module}/>;
    case 'upside-down-verse':return <UpsideDownView module={module}/>;
    case 'connect-verse':
    case 'connect-big-idea':return <ConnectView module={module}/>;
  }
}
