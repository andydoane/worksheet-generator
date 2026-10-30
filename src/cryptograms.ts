import {shuffledIndices} from './shuffle.ts';

export type VerseCryptogram={type:'verse-cryptogram';reference:string;verse:string;seed:number};
export type BigIdeaCryptogram={type:'big-idea-cryptogram';idea:string;seed:number};
export type Cryptogram=VerseCryptogram|BigIdeaCryptogram;
export type CryptogramId=Cryptogram['type'];
export const CRYPTOGRAM_MODULES=[
  {id:'verse-cryptogram',name:'Verse Cryptogram',size:'large',description:'Decode a Scripture verse with a shuffled 26-symbol cipher.'},
  {id:'big-idea-cryptogram',name:'Big Idea Cryptogram',size:'medium',description:'Decode the Big Idea with the same reusable symbol cipher.'},
] as const;
export function isCryptogramId(id:unknown):id is CryptogramId{
  return id==='verse-cryptogram'||id==='big-idea-cryptogram';
}
export function blankCryptogram(id:CryptogramId):Cryptogram{
  return id==='verse-cryptogram'
    ?{type:id,reference:'',verse:'',seed:1}
    :{type:id,idea:'',seed:1};
}
export function isCryptogram(input:unknown):input is Cryptogram{
  if(!input||typeof input!=='object')return false;
  const p=input as Record<string,unknown>;
  if(!Number.isSafeInteger(p.seed)||Number(p.seed)<0)return false;
  return p.type==='verse-cryptogram'
    ?typeof p.reference==='string'&&typeof p.verse==='string'
    :p.type==='big-idea-cryptogram'&&typeof p.idea==='string';
}
export function cryptogramText(module:Cryptogram):string{
  return module.type==='verse-cryptogram'?module.verse:module.idea;
}
export function cryptogramLetters(text:string):string[]{
  return [...new Set((text.toUpperCase().match(/[A-Z]/g)??[]))].sort();
}
export function validateCryptogram(module:Cryptogram):string[]{
  const content=cryptogramText(module),letters=cryptogramLetters(content);
  const errors:string[]=[];
  if(module.type==='verse-cryptogram'&&(!module.reference.trim()||module.reference.length>42))
    errors.push('Enter a Scripture reference of 1–42 characters.');
  const max=module.type==='verse-cryptogram'?145:62;
  if(!content.trim()||content.trim().length>max)
    errors.push('Enter text of 1–'+max+' characters for the '+(module.type==='verse-cryptogram'?'large':'medium')+' cryptogram.');
  if(letters.length<3)errors.push('Use at least three different letters for a meaningful code.');
  // Other symbols (punctuation and digits) are preserved verbatim.
  if([...content].some(c=>/\p{L}/u.test(c)&&!/[A-Za-z]/.test(c)))
    errors.push('Use unaccented A–Z letters; punctuation and numbers may remain.');
  if(/\s{3,}/u.test(content))errors.push('Use ordinary single spaces between words.');
  if(module.type==='big-idea-cryptogram'&&letters.length>18)
    errors.push('This Big Idea has too many different letters for the small key (maximum 18).');
  return errors;
}
export type SymbolCode={letter:string;symbol:number};
export type CryptogramResult={text:string;reference:string|null;key:SymbolCode[];mapping:Record<string,number>};
export function generateCryptogram(module:Cryptogram):CryptogramResult{
  const errs=validateCryptogram(module);
  if(errs.length)throw Error(errs.join(' '));
  const text=cryptogramText(module).trim();
  const alphabet=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const perm=shuffledIndices(26,'pigpen-alphabet-v1',module.seed);
  const mapping:Record<string,number>={};
  alphabet.forEach((letter,index)=>{mapping[letter]=perm[index];});
  const key=cryptogramLetters(text).map(letter=>({letter,symbol:mapping[letter]}));
  return{text,reference:module.type==='verse-cryptogram'?module.reference.trim():null,key,mapping};
}
export function cipherTextCharacters(result:CryptogramResult):{letter:string;symbol:number|null}[]{
  return Array.from(result.text).map(char=>({letter:char,symbol:/^[A-Za-z]$/.test(char)?result.mapping[char.toUpperCase()]:null}));
}
export function checkCryptogram(result:CryptogramResult):boolean{
  const actual=cryptogramLetters(result.text);
  if(result.key.length!==actual.length||result.key.some((x,i)=>x.letter!==actual[i]))return false;
  const all=Object.values(result.mapping);
  if(all.length!==26||new Set(all).size!==26||all.some(x=>!Number.isInteger(x)||x<0||x>=26))return false;
  return result.key.every(item=>result.mapping[item.letter]===item.symbol);
}
