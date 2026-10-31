import {BOOKLET} from './booklet.ts';
import {measureWrappedLines} from './pdfLayout.ts';
import {shuffledChoices,shuffledWordList,type MultipleChoice,type OddWords} from './smallModules.ts';
import type {MeasureText} from './mediumParityLayout.ts';

export const SMALL_PRINT_WIDTH=(BOOKLET.cell.width-2*BOOKLET.padding)*72;
export const SMALL_PRINT_HEIGHT=(BOOKLET.cell.height-2*BOOKLET.padding)*72;
export type SmallLine={text:string;x:number;y:number};
export type ChoiceRow={squareX:number;squareY:number;squareSize:number;fontSize:number;lines:SmallLine[]};
export type MultipleChoicePrintPlan={
 questionSize:number;questionLines:SmallLine[];rows:ChoiceRow[];
};
export type OddWordsPrintPlan={
 instructionSize:number;instructions:SmallLine[];fontSize:number;
 left:SmallLine[];right:SmallLine[];groupLeft:number;groupRight:number;
};

/** Both print renderers use the same fontkit glyph bounds to center the
 * checkbox alongside the visible text ink, including wrapped answers. */
export function planMultipleChoice(module:MultipleChoice,measure:MeasureText,
 inkCenter:(text:string,size:number)=>number,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):MultipleChoicePrintPlan|null{
 const options=shuffledChoices(module);
 const textX=19,answerWidth=width-textX-3,squareSize=11;
 let winner:{score:number;plan:MultipleChoicePrintPlan}|null=null;
 for(let qSize=20;qSize>=13;qSize-=.5){
  const question=measureWrappedLines(module.question,width-5,s=>measure(s,qSize));
  if(!question||question.length>3||!question.length)continue;
  const qStep=qSize*1.12,qHeight=question.length*qStep+2;
  for(let aSize=15;aSize>=9;aSize-=.5){
   const answerLines=options.map(text=>measureWrappedLines(text,answerWidth,s=>measure(s,aSize)));
   if(answerLines.some(x=>!x||x.length>3))continue;
   const step=aSize*1.23;
   const heights=answerLines.map(x=>Math.max(22,(x?.length??0)*step+5));
   const contentHeight=qHeight+9+heights.reduce((a,b)=>a+b,0)+
    (heights.length-1)*3.5;
   if(contentHeight>height-7)continue;
   const top=(height-contentHeight)/2;
   const questionLines=question.map((text,i)=>({
    text,x:width/2,y:top+qSize+(i*qStep),
   }));
   let rowTop=top+qHeight+9;
   const rows:ChoiceRow[]=answerLines.map((lines,index)=>{
    const actual=lines??[];
    const firstBaseline=rowTop+(heights[index]-(actual.length-1)*step)/2+
     aSize*.36;
    const textLines=actual.map((text,i)=>({text,x:textX,y:firstBaseline+i*step}));
    const inkFirst=textLines[0]?.y-inkCenter(actual[0]??'',aSize)??rowTop+heights[index]/2;
    const inkLast=textLines.at(-1)?.y-inkCenter(actual.at(-1)??'',aSize)??inkFirst;
    const center=(inkFirst+inkLast)/2;
    const row={squareX:2,squareY:center-squareSize/2,squareSize,
     fontSize:aSize,lines:textLines};
    rowTop+=heights[index]+3.5;
    return row;
   });
   const score=qSize*.7+aSize*.6;
   if(!winner||score>winner.score)winner={score,plan:{questionSize:qSize,questionLines,rows}};
  }
 }
 return winner?.plan??null;
}

/** The two columns are a single centered composition, with each column's
 * source-order words aligned on consistent, vertically centered rows. */
export function planOddWords(module:OddWords,title:MeasureText,puzzle:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):OddWordsPrintPlan|null{
 const instruction="Scribble out the words that don't match the story.";
 const words=shuffledWordList(module);
 const left=words.filter((_,i)=>i%2===0).map(w=>w.text.toUpperCase());
 const right=words.filter((_,i)=>i%2===1).map(w=>w.text.toUpperCase());
 let best:OddWordsPrintPlan|null=null;
 for(let headingSize=15;headingSize>=11&&!best;headingSize-=.5){
  const instructions=measureWrappedLines(instruction,width-3,t=>title(t,headingSize));
  if(!instructions||instructions.length>3)continue;
  const headingStep=headingSize*1.28;
  const fieldTop=6+instructions.length*headingStep+10;
  const available=height-fieldTop-5;
  for(let fontSize=13;fontSize>=6.5;fontSize-=.5){
   const leftW=Math.max(...left.map(w=>puzzle(w,fontSize)));
   const rightW=Math.max(...right.map(w=>puzzle(w,fontSize)));
   const columnGap=14,total=leftW+columnGap+rightW;
   if(total>width-8)continue;
   const rows=Math.max(left.length,right.length);
   const pitch=Math.min(23,(available-fontSize*1.15)/(rows-1||1));
   if(pitch<fontSize*1.16+2)continue;
   const blockHeight=(rows-1)*pitch+fontSize*1.15;
   const firstBaseline=fieldTop+(available-blockHeight)/2+fontSize;
   const start=(width-total)/2;
   best={
    instructionSize:headingSize,
    instructions:instructions.map((text,i)=>({text,x:width/2,
      y:6+headingSize+i*headingStep})),
    fontSize,
    left:left.map((text,i)=>({text,x:start,y:firstBaseline+i*pitch})),
    right:right.map((text,i)=>({text,x:start+leftW+columnGap,y:firstBaseline+i*pitch})),
    groupLeft:start,groupRight:start+total,
   };
   break;
  }
 }
 return best;
}
