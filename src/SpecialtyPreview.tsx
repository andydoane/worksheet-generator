import {useId} from 'react';
import {
  generateCrossword,connectPositions,parseConnectionWords,spiralPoints,
  type SpecialtyModule,
} from './specialtyModules.ts';

function CrosswordView({module}:{module:Extract<SpecialtyModule,{type:'crossword'}>}){
  let puzzle;
  try{puzzle=generateCrossword(module);}catch(error){
    return <div className="module-preview module-incomplete"><strong>CROSSWORD</strong>
      <span>{error instanceof Error?error.message:'Unable to place these answers.'}</span></div>;
  }
  return <div className="module-preview specialty-preview crossword-preview">
    <div className="module-title">CROSSWORD</div>
    <svg className="crossword-grid" viewBox={'0 0 '+(puzzle.width*20)+' '+(puzzle.height*20)}
      role="img" aria-label={'Blank numbered crossword grid with '+puzzle.width+' columns'}>
      {puzzle.cells.flatMap((row,y)=>row.map((letter,x)=>letter?<g key={x+','+y}>
        <rect x={x*20+.4} y={y*20+.4} width={19.2} height={19.2} fill="#fff" stroke="#333" strokeWidth=".7"/>
        {puzzle.numbers[x+','+y]&&<text x={x*20+2} y={y*20+6} fontSize="6">{puzzle.numbers[x+','+y]}</text>}
      </g>:null))}
    </svg>
    <div className="crossword-clues">
      <div><strong>Across</strong>{puzzle.across.map(p=><span key={p.number}>{p.number}. {p.clue}</span>)}</div>
      <div><strong>Down</strong>{puzzle.down.map(p=><span key={p.number}>{p.number}. {p.clue}</span>)}</div>
    </div>
  </div>;
}
function SpiralView({module}:{module:Extract<SpecialtyModule,{type:'spiral-verse'}>}){
  const path=spiralPoints().map(p=>(p.x*1000).toFixed(1)+','+(p.y*1000).toFixed(1)).join(' ');
  return <div className="module-preview specialty-preview spiral-preview">
    <div className="module-title">SPIRAL VERSE</div>
    <div className="specialty-instruction">Copy the verse onto the spiral line.</div>
    <div className="spiral-bank"><strong>{module.reference}</strong><span>{module.verse}</span></div>
    <svg className="spiral-svg" viewBox="0 0 1000 1000" role="img" aria-label="Blank spiral writing line">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/>
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
