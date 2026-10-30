import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram, type Cryptogram} from './cryptograms.ts';

export function CipherGlyph({id}:{id:number}){
  const glyph=cipherSymbol(id);
  return <svg viewBox="0 0 16 16" className="cipher-glyph" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {glyph.strokes.map((line,i)=><line key={i} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]}/>)}
    </g>
    {glyph.dot&&<circle cx="8" cy="8" r="2" fill="currentColor"/>}
  </svg>;
}
export default function CryptogramPreview({module}:{module:Cryptogram}){
  const data=generateCryptogram(module),columns=module.type==='verse-cryptogram'?20:18;
  const chunks:Array<typeof data.key>=[];
  for(let i=0;i<data.key.length;i+=columns)chunks.push(data.key.slice(i,i+columns));
  return <div className={'module-preview cipher-module '+(module.type==='verse-cryptogram'?'cipher-large':'cipher-medium')}>
    <div className="module-title">SOLVE THE CODE!</div>
    <div className="cipher-key" aria-label="Symbol and letter decoding key">
      {chunks.map((chunk,index)=><div className="cipher-key-row" key={index}>
        {chunk.map(item=><div className="cipher-key-cell" key={item.letter}>
          <span className="cipher-key-symbol"><CipherGlyph id={item.symbol}/></span>
          <span className="cipher-key-letter">{item.letter}</span>
        </div>)}
      </div>)}
    </div>
    <div className="cipher-encoded">
      {data.text.split(/(\s+)/u).map((token,index)=>
        /^\s+$/u.test(token)
          ? <span className="cipher-space" key={index}> </span>
          : <span className="cipher-word" key={index}>{Array.from(token).map((char,i)=>{
            const id=data.mapping[char.toUpperCase()];
            return id===undefined
              ?<span className="cipher-punctuation" key={i}>{char}</span>
              :<span className="cipher-character" key={i}><span className="cipher-answer-line"/><CipherGlyph id={id}/></span>;
          })}</span>)}
    </div>
    {data.reference&&<div className="cipher-reference">{data.reference}</div>}
  </div>;
}
