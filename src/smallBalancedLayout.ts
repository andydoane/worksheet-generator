import type {MeasureText} from './mediumParityLayout.ts';
import {balancedBankLines} from './balancedBankLines.ts';
import {shuffledWordList,verseInitials,type FirstLetters,type Checkboxes} from './smallModules.ts';
import {shortenBibleReference} from './versePunctuation.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT,type SmallLine} from './smallParityLayout.ts';

/** Every coordinate is top-left print-space points, including text baselines. */
export type FirstLetterPrintPlan={
 instruction:string;instructionSize:number;instructionLines:SmallLine[];
 letterSize:number;letterLines:SmallLine[];fieldTop:number;fieldBottom:number;
};
export type CheckboxWordRow={
 text:string;x:number;y:number;squareX:number;squareY:number;squareSize:number;
};
export type CheckboxPrintPlan={
 instructionSize:number;instructionLines:SmallLine[];
 wordSize:number;rows:CheckboxWordRow[];fieldTop:number;fieldBottom:number;
};
export const CHECKBOX_INSTRUCTION='Check off everything that is part of the story.';

export function firstLetterInstruction(reference:string):string{
 return 'Try to say '+shortenBibleReference(reference)+' using just the first letters.';
}

/** Balance consecutive initial letters by measured glyph widths. We must
 * preserve order and can wrap between any two initials (there are no spaces).
 * DP chooses the shortest raggedness while respecting an absolute line cap.
 */
export function balancedInitialLines(initials:string,maxWidth:number,
 measure:MeasureText,fontSize:number,lineCount:number):string[]|null{
 const letters=Array.from(initials),n=letters.length;
 if(!n||lineCount<1||lineCount>n)return null;
 const advances=letters.map(ch=>measure(ch,fontSize));
 if(advances.some(w=>w>maxWidth))return null;
 const cumulative=[0];
 for(const w of advances)cumulative.push(cumulative[cumulative.length-1]+w);
 const span=(a:number,b:number)=>cumulative[b]-cumulative[a];
 const target=cumulative[n]/lineCount;
 const memo=new Map<string,{score:number;lines:string[]}|null>();
 function fit(at:number,left:number):{score:number;lines:string[]}|null{
  const key=at+':'+left;
  if(memo.has(key))return memo.get(key)??null;
  if(left===0)return at===n?{score:0,lines:[]}:null;
  if(n-at<left)return null;
  let best:{score:number;lines:string[]}|null=null;
  for(let end=at+1;end<=n-left+1;end++){
   const width=span(at,end);
   if(width>maxWidth+.0001)break;
   const next=fit(end,left-1);
   if(!next)continue;
   const score=next.score+(width-target)**2;
   if(!best||score<best.score)
    best={score,lines:[letters.slice(at,end).join(''),...next.lines]};
  }
  memo.set(key,best);
  return best;
 }
 return fit(0,lineCount)?.lines??null;
}

export function planFirstLetters(module:FirstLetters,title:MeasureText,
 puzzle:MeasureText,width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):FirstLetterPrintPlan|null{
 const initials=verseInitials(module.verse);
 if(initials.length<3||initials.length>75)return null;
 const instruction=firstLetterInstruction(module.reference);
 const maxLineWidth=width-8,top=7,bottom=height-6;
 for(let instructionSize=18;instructionSize>=11;instructionSize-=.5){
  const lines=balancedBankLines(instruction,maxLineWidth,title,instructionSize,4);
  if(!lines)continue;
  const headingPitch=instructionSize*1.12;
  const instructionLines=lines.map((text,i)=>({
   text,x:width/2,y:top+instructionSize+i*headingPitch,
  }));
  const fieldTop=instructionLines.at(-1)!.y+12;
  const available=bottom-fieldTop;
  if(available<30)continue;
  for(let letterSize=30;letterSize>=8.5;letterSize-=.5){
   let best:{score:number;rows:string[];pitch:number;total:number}|null=null;
   for(let count=1;count<=Math.min(8,initials.length);count++){
    const rows=balancedInitialLines(initials,maxLineWidth,puzzle,letterSize,count);
    if(!rows)continue;
    const minimumPitch=letterSize*1.34;
    const preferredPitch=letterSize*1.65;
    if(letterSize+(count-1)*minimumPitch>available)continue;
    const pitch=count===1?0:Math.min(preferredPitch,(available-letterSize)/(count-1));
    const total=letterSize+(count-1)*pitch;
    const longest=Math.max(...rows.map(row=>puzzle(row,letterSize)));
    const utilization=longest/maxLineWidth;
    const score=(1-utilization)+.6*(1-total/available);
    if(!best||score<best.score)best={score,rows,pitch,total};
   }
   if(!best)continue;
   const letterStart=fieldTop+(available-best.total)/2+letterSize;
   const letterLines=best.rows.map((text,i)=>({
    text,x:width/2,y:letterStart+i*best.pitch,
   }));
   return {instruction,instructionSize,instructionLines,letterSize,letterLines,fieldTop,fieldBottom:bottom};
  }
 }
 return null;
}

export function planCheckboxes(module:Checkboxes,title:MeasureText,puzzle:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):CheckboxPrintPlan|null{
 const words=shuffledWordList(module).map(row=>row.text.toUpperCase());
 if(words.length<2||words.length>10)return null;
 const top=7,bottom=height-6;
 for(let instructionSize=17;instructionSize>=11;instructionSize-=.5){
  const lines=balancedBankLines(CHECKBOX_INSTRUCTION,width-8,title,instructionSize,3);
  if(!lines)continue;
  const headingPitch=instructionSize*1.13;
  const instructionLines=lines.map((text,i)=>({
   text,x:width/2,y:top+instructionSize+i*headingPitch,
  }));
  const fieldTop=instructionLines.at(-1)!.y+12;
  const available=bottom-fieldTop;
  if(available<35)continue;
  // Prefer the existing two-column presentation. For valid 14-character
  // phrases that cannot fit a half-width column, fall back to a single
  // column rather than shrinking the letters below child-readable size.
  for(const columns of [2,1] as const){
   const colWidth=width/columns,rowsCount=Math.ceil(words.length/columns);
   for(let wordSize=12;wordSize>=6.5;wordSize-=.5){
    const squareSize=9,textOffset=14;
    if(words.some(word=>puzzle(word,wordSize)>colWidth-textOffset-5))continue;
    const minimumPitch=Math.max(columns===2?17:10.5,wordSize*1.28);
    if(wordSize+(rowsCount-1)*minimumPitch>available)continue;
    const pitch=rowsCount===1?0:Math.min(columns===2?22:14,
      (available-wordSize)/(rowsCount-1));
    if(pitch<minimumPitch-.001)continue;
    const total=wordSize+(rowsCount-1)*pitch;
    const firstY=fieldTop+(available-total)/2+wordSize;
    const rows=words.map((text,i)=>{
     const col=i%columns,row=Math.floor(i/columns),left=col*colWidth+2,y=firstY+row*pitch;
     return {text,x:left+textOffset,y,squareX:left,
       squareY:y-wordSize*.36-squareSize/2,squareSize};
    });
    if(rows.some(row=>row.squareY<fieldTop||row.squareY+squareSize>bottom))continue;
    return {instructionSize,instructionLines,wordSize,rows,fieldTop,fieldBottom:bottom};
   }
  }
 }
 return null;
}
