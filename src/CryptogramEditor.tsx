import type {Cryptogram} from './cryptograms.ts';
import {CIPHER_SYMBOL_COUNT,CIPHER_SYMBOL_LABELS} from './cipherSymbols.ts';
import {CipherGlyph} from './CryptogramPreview';
import {generateCryptogram, validateCryptogram} from './cryptograms.ts';

export default function CryptogramEditor({module,onChange}:{module:Cryptogram;onChange:(patch:Partial<Cryptogram>)=>void}){
  const errors=validateCryptogram(module);
  let chars=0,unique=0;
  if(!errors.length){
    const data=generateCryptogram(module);
    chars=Array.from(data.text).filter(c=>/[A-Za-z]/.test(c)).length;
    unique=data.key.length;
  }
  return <div className="activity-inputs">
    {module.type==='verse-cryptogram'&&<>
      <label htmlFor="crypto-ref">Scripture reference</label>
      <input id="crypto-ref" value={module.reference} onChange={e=>onChange({reference:e.target.value})}
        placeholder="Romans 8:28"/>
    </>}
    <label htmlFor="crypto-content">{module.type==='verse-cryptogram'?'Memory verse':'Big Idea statement'}</label>
    <textarea id="crypto-content" rows={module.type==='verse-cryptogram'?7:4}
      value={module.type==='verse-cryptogram'?module.verse:module.idea}
      onChange={e=>onChange(module.type==='verse-cryptogram'?{verse:e.target.value}:{idea:e.target.value})}
      placeholder={module.type==='verse-cryptogram'
        ?'For God so loved the world that he gave his one and only Son.'
        :'God loves us and calls us to love others.'}/>
    <p>Every letter uses one unique symbol from our 26-piece vector alphabet. Only the letters used in the text appear in the decoding key, sorted A–Z. Punctuation and numbers remain unchanged.</p>
    <details className="cipher-symbol-gallery"><summary>Preview the 26 printable symbols</summary>
      <div className="cipher-symbol-grid">{Array.from({length:CIPHER_SYMBOL_COUNT},(_,i)=><span key={i} title={CIPHER_SYMBOL_LABELS[i]}><CipherGlyph id={i}/></span>)}</div>
      <p>All symbols are vector artwork, not emoji. The second ∴ in the shortlist is provisionally replaced with ☾.</p>
    </details>
    {!errors.length&&<p className="cipher-editor-count">{chars} encoded letters · {unique} key entries · seed {module.seed}</p>}
  </div>;
}
