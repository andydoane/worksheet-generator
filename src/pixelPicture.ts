import {shuffledIndices} from './shuffle.ts';
import {PIXEL_SHAPES,pixelShape} from './pixelPictureShapes.ts';

export type PixelPicture={type:'pixel-picture';phrase:string;shapeId:string;seed:number};
export const PIXEL_SIZE=13;
export const PIXEL_MIN_LENGTH=30,PIXEL_MAX_LENGTH=85;
export const PIXEL_INSTRUCTION='Fill in the missing letters. Color those letters in the grid.';
export type PixelPicturePuzzle={
 maskedPhrase:string;
 missingLetters:string[];
 missingPositions:number[];
 grid:string[][];
 mask:readonly string[];
};

export function pixelMissingTarget(length:number):number {
 return Math.max(4,Math.min(8,4+Math.floor((length-30)/10)));
}
type Candidate={at:number;letter:string;word:number};
function candidates(phrase:string):Candidate[] {
 const found:Candidate[]=[];
 const pattern=/[A-Za-z]+/gu;
 let word=0;
 for(const match of phrase.matchAll(pattern)){
  const value=match[0],start=match.index??0;
  // Never make a one- or two-letter word unreadable.
  if(value.length>=3)for(let i=0;i<value.length;i++)
   found.push({at:start+i,letter:value[i].toUpperCase(),word});
  word++;
 }
 return found;
}
/** Seeded spatial selection: one occurrence of each different letter.
 * Sample candidate layouts are scored for even spacing and diverse words.
 * The original phrase remains unchanged apart from its explicit '_' blanks.
 */
export function choosePixelBlanks(phrase:string,seed:number):number[]{
 const all=candidates(phrase);
 const unique=new Set(all.map(x=>x.letter)).size;
 if(unique<4)return [];
 const desired=Math.min(pixelMissingTarget(phrase.trim().length),unique);
 for(let count=desired;count>=4;count--){
  let best:number[]|null=null,bestScore=Infinity;
  for(let trial=0;trial<36;trial++){
   const order=shuffledIndices(all.length,phrase,seed*47+trial*1009);
   const rank=new Map(order.map((index,i)=>[index,i]));
   const chosen:Candidate[]=[];
   for(let n=0;n<count;n++){
    const target=(n+.5)*phrase.length/count;
    const valid=all.map((candidate,index)=>({candidate,index})).filter(({candidate})=>
     !chosen.some(c=>c.letter===candidate.letter||Math.abs(c.at-candidate.at)<2||
       (c.word===candidate.word&&all.filter(x=>x.word===c.word).length<=6)));
    if(!valid.length)break;
    valid.sort((a,b)=>{
     const score=(o:typeof a)=>Math.abs(o.candidate.at-target)+
       (chosen.some(c=>c.word===o.candidate.word)?12:0)+
       (rank.get(o.index)??0)/all.length*5;
     return score(a)-score(b);
    });
    chosen.push(valid[0].candidate);
   }
   if(chosen.length!==count)continue;
   const sorted=chosen.map(x=>x.at).sort((a,b)=>a-b);
   const score=sorted.reduce((sum,at,i)=>
    sum+Math.abs(at-(i+.5)*phrase.length/count),0)+
    (new Set(chosen.map(c=>c.word)).size<count?(count-new Set(chosen.map(c=>c.word)).size)*15:0);
   if(score<bestScore){bestScore=score;best=sorted;}
  }
  if(best)return best;
 }
 return [];
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
 if(!errors.length&&choosePixelBlanks(phrase,module.seed).length<4)
  errors.push('Use a phrase with at least four different letters in words of three or more letters.');
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
 const missingLetters=positions.map(i=>phrase[i].toUpperCase()).sort();
 const missingSet=new Set(missingLetters);
 const decoys=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').filter(ch=>!missingSet.has(ch));
 const rng=seedStream(phrase+'|'+module.shapeId,module.seed);
 const shape=pixelShape(module.shapeId)!;
 const grid=shape.rows.map(row=>Array.from(row,ch=>{
  const options=ch==='1'?missingLetters:decoys;
  return options[Math.floor(rng()*options.length)];
 }));
 const maskedPhrase=Array.from(phrase).map((ch,i)=>positions.includes(i)?'_':ch).join('');
 return {maskedPhrase,missingLetters,missingPositions:positions,grid,mask:shape.rows};
}
