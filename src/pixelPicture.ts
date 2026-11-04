import {PIXEL_SHAPES,pixelShape} from './pixelPictureShapes.ts';

export type PixelPicture={type:'pixel-picture';phrase:string;shapeId:string;seed:number};
export const PIXEL_SIZE=13;
export const PIXEL_MIN_LENGTH=30,PIXEL_MAX_LENGTH=85;
/** A picture belongs to a generated worksheet, never the curriculum.
 * Sequential Regenerate seeds rotate through all silhouettes. Same seed and
 * phrase always produce the same shape for print preview and PDF export.
 * Old lesson shapeId fields are intentionally ignored by the converter.
 */
export function choosePixelShapeId(seed:number,phrase:string):string{
 const offset=Array.from(phrase).reduce((acc,ch)=>(
  (Math.imul(acc,31)+ch.charCodeAt(0))>>>0
 ),0);
 return PIXEL_SHAPES[((Math.max(0,Math.trunc(seed))-1+offset)%PIXEL_SHAPES.length
  +PIXEL_SHAPES.length)%PIXEL_SHAPES.length].id;
}
export const PIXEL_INSTRUCTION='Fill in the missing letter. Color in the squares containing that letter.';
export type PixelPicturePuzzle={
 maskedPhrase:string;
 missingLetters:string[];
 missingPositions:number[];
 grid:string[][];
 mask:readonly string[];
};

/** Widely used approximate English character frequency, common to rare.
 * Repeated uncommon letters are preferred over common E/T; the seed rotates
 * through at most four of the rarest eligible letters on Regenerate.
 */
const COMMON_TO_RARE='ETAOINSHRDLCUMWFGYPBVKJXQZ';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function pixelLetterCandidates(phrase:string):string[]{
 const frequency=new Map<string,number>();
 for(const letter of phrase.toUpperCase()){
  if(!/^[A-Z]$/u.test(letter))continue;
  frequency.set(letter,(frequency.get(letter)??0)+1);
 }
 return [...frequency].filter(([,count])=>count>=2).map(([letter])=>letter)
  .sort((a,b)=>COMMON_TO_RARE.indexOf(b)-COMMON_TO_RARE.indexOf(a)||
   frequency.get(a)!-frequency.get(b)!||a.localeCompare(b));
}
export function choosePixelLetter(phrase:string,seed:number):string|undefined{
 const options=pixelLetterCandidates(phrase);
 if(!options.length)return undefined;
 const preferred=options.slice(0,Math.min(4,options.length));
 return preferred[(Math.max(1,seed)-1)%preferred.length];
}
/** Remove *every* occurrence of exactly one repeated letter. */
export function choosePixelBlanks(phrase:string,seed:number):number[]{
 const letter=choosePixelLetter(phrase,seed);
 if(!letter)return [];
 return Array.from(phrase.toUpperCase()).flatMap((ch,index)=>ch===letter?[index]:[]);
}
export function validatePixelPicture(module:PixelPicture):string[]{
 const phrase=module.phrase.trim();
 const errors:string[]=[];
 if(phrase.length<PIXEL_MIN_LENGTH||phrase.length>PIXEL_MAX_LENGTH)
  errors.push('Enter a phrase of 30–85 characters so the text fits beside the picture grid.');
 if(/[^A-Za-z0-9\s.,!?;:'’\-]/u.test(phrase))
  errors.push('Use English letters A–Z, spaces, numbers and simple punctuation in the phrase.');
 if(phrase.split(/\s+/u).some(word=>word.length>18))
  errors.push('Keep individual words under 19 characters so they wrap in the left panel.');
 if(!pixelShape(module.shapeId))errors.push('Choose one of the available 13×13 pictures.');
 if(!Number.isSafeInteger(module.seed)||module.seed<0)errors.push('The picture seed is invalid.');
 if(!errors.length&&!pixelLetterCandidates(phrase).length)
  errors.push('Use a phrase with at least one letter that appears more than once.');
 return errors;
}
function seedStream(phrase:string,seed:number):()=>number{
 let state=2166136261^(seed>>>0);
 for(const c of phrase){state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;}
 return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
export function generatePixelPicture(module:PixelPicture):PixelPicturePuzzle{
 const errors=validatePixelPicture(module);
 if(errors.length)throw Error(errors.join(' '));
 const phrase=module.phrase.trim(),positions=choosePixelBlanks(phrase,module.seed);
 const missingLetter=choosePixelLetter(phrase,module.seed)!;
 const missingLetters=[missingLetter];
 const decoys=Array.from(alphabet).filter(ch=>ch!==missingLetter);
 const rng=seedStream(phrase+'|'+module.shapeId,module.seed);
 const shape=pixelShape(module.shapeId)!;
 const grid=shape.rows.map(row=>Array.from(row,ch=>{
  const options=ch==='1'?missingLetters:decoys;
  return options[Math.floor(rng()*options.length)];
 }));
 const maskedPhrase=Array.from(phrase.toUpperCase()).map((ch,i)=>
  positions.includes(i)?'_':ch).join('');
 return {maskedPhrase,missingLetters,missingPositions:positions,grid,mask:shape.rows};
}
