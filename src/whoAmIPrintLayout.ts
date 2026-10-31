import type {MeasureText} from './mediumParityLayout.ts';
import {balancedBankLines} from './balancedBankLines.ts';
import {answerCharacters,type WhoAmI} from './smallModules.ts';
import {WHO_AM_I_CLUE_MAX} from './whoAmILimits.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT,type SmallLine} from './smallParityLayout.ts';

/** Shared constraint for the editor and printable layout.
 * Short enough to reserve the lower half for the prompt and writing line.
 */
export {WHO_AM_I_CLUE_MAX} from './whoAmILimits.ts';
export const WHO_AM_I_LABEL='WHO AM I?';

export type AnswerMark={
 kind:'blank'|'hyphen';x:number;endX:number;y:number;
};
export type WhoAmIPrintPlan={
 clueSize:number;clueLines:SmallLine[];
 clueTop:number;clueBottom:number;dividerY:number;
 questionSize:number;questionY:number;answerMarks:AnswerMark[];
 answerY:number;answerStart:number;answerEnd:number;
};

/** Reserve the entire lower half BEFORE laying out the clue. The same
 * top-left print coordinates and exact embedded-font advances drive the
 * browser SVG and vector PDF.
 */
export function planWhoAmI(module:WhoAmI,clueWidth:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):WhoAmIPrintPlan|null{
 const clue=module.clue.trim(),answer=answerCharacters(module.answer);
 if(!clue||clue.length>WHO_AM_I_CLUE_MAX||!answer.length)return null;
 const clueTop=8,dividerY=height*.52,clueBottom=dividerY-6;
 const clueAvailable=clueBottom-clueTop;
 if(clueAvailable<42)return null;
 let clueSize=0,clueLines:SmallLine[]=[];
 for(let size=20;size>=10;size-=.5){
  const rows=balancedBankLines(clue,width-11,clueWidth,size,7);
  if(!rows)continue;
  const linePitch=size*1.18,blockHeight=(rows.length-1)*linePitch+size*1.07;
  if(blockHeight>clueAvailable)continue;
  // Center the entire clue as a unit in its protected upper region.
  const top=clueTop+(clueAvailable-blockHeight)/2;
  const output=rows.map((text,i)=>({text,x:width/2,y:top+size+i*linePitch}));
  if(output.at(-1)!.y+size*.08>clueBottom)continue;
  clueSize=size;clueLines=output;break;
 }
 if(!clueLines.length)return null;
 const lowerHeight=height-dividerY,questionSize=24;
 const questionY=dividerY+lowerHeight*.39;
 const answerY=dividerY+lowerHeight*.80;
 // Letters take a full writing cell. Spaces separate words without
 // drawing a line, and hyphens retain the original visible separator.
 const weights=answer.map(char=>char===' '?0.55:char==='-'?0.70:1);
 const total=weights.reduce((a,b)=>a+b,0);
 const cell=Math.min(14.5,(width-12)/total);
 if(cell<7.2)return null;
 const answerStart=(width-total*cell)/2;
 let x=answerStart;
 const answerMarks:AnswerMark[]=[];
 for(let i=0;i<answer.length;i++){
  const char=answer[i],span=weights[i]*cell;
  if(char!==' '){
   const left=x+Math.min(1.1,span*.12),right=x+span-Math.min(1.1,span*.12);
   if(right<=left)return null;
   answerMarks.push({kind:char==='-'?'hyphen':'blank',x:left,endX:right,y:answerY});
  }
  x+=span;
 }
 if(questionY-questionSize<dividerY+2||answerY-questionY<19||
    answerY>height-8||x>width-4)return null;
 return {clueSize,clueLines,clueTop,clueBottom,dividerY,
   questionSize,questionY,answerMarks,answerY,answerStart,answerEnd:x};
}
