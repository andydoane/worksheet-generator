import {BOOKLET} from './booklet.ts';
import {measureWrappedLines} from './pdfLayout.ts';

/**
 * Physical top-left coordinates (points) for medium activities.
 * The exact same plans are consumed by PDF and browser SVG renderers.
 * Body widths must be measured using the matching local static font faces.
 */
export const MEDIUM_PRINT_WIDTH=(BOOKLET.cell.width*2-BOOKLET.padding*2)*72;
export const MEDIUM_PRINT_HEIGHT=(BOOKLET.cell.height-BOOKLET.padding*2)*72;
export const MATCH_INSTRUCTION='Draw a line from each word on the left to its match on the right.';
export type MeasureText=(text:string,size:number)=>number;
export type PrintLine={text:string;x:number;y:number};
export type MatchPrintPlan={
  titleY:number;instructionSize:number;instructions:PrintLine[];
  fontSize:number;leftRows:PrintLine[];rightRows:PrintLine[];
  leftEdge:number;rightEdge:number;
};

export function planMatching(
  rows:readonly {left:string;right:string}[],
  boldWidth:MeasureText,puzzleWidth:MeasureText,
  width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT,
):MatchPrintPlan|null{
  if(rows.length<3||rows.length>6)return null;
  const instructionSize=9;
  const subtitle=measureWrappedLines(MATCH_INSTRUCTION,width,t=>boldWidth(t,instructionSize));
  if(!subtitle)return null;
  const start=60+(subtitle.length-1)*10;
  const end=height-13;
  const gap=(end-start)/(rows.length-1);
  if(gap<16)return null;
  const colWidth=width/2-18;
  const labels=rows.flatMap(row=>[row.left.toUpperCase(),row.right.toUpperCase()]);
  let size=13.5;
  for(;size>=8;size-=.5)
    if(labels.every(text=>puzzleWidth(text,size)<=colWidth))break;
  if(size<8)return null;
  const leftEdge=7,rightEdge=width-7;
  return {
    titleY:25,instructionSize,
    instructions:subtitle.map((text,i)=>({text,x:width/2,y:41+i*10})),
    fontSize:size,leftEdge,rightEdge,
    leftRows:rows.map((row,i)=>({text:row.left.toUpperCase(),x:leftEdge,y:start+i*gap})),
    rightRows:rows.map((row,i)=>({text:row.right.toUpperCase(),x:rightEdge,y:start+i*gap})),
  };
}

export type MistakesPrintPlan={fontSize:number;lineStep:number;lines:PrintLine[]};

/** Smaller copy and generous writing/circling pitch. The whole paragraph must
 * fit; never conceal lines in the browser while the PDF exports more text.
 */
export function planMistakes(
  text:string,bodyWidth:MeasureText,
  width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT,
):MistakesPrintPlan|null{
  const left=7,top=45,bottom=height-10,usableWidth=width-left*2;
  for(let size=11.5;size>=8;size-=.5){
    const rows=measureWrappedLines(text,usableWidth,value=>bodyWidth(value,size));
    const lineStep=size*1.75;
    if(!rows?.length||top+rows.length*lineStep>bottom)continue;
    return {
      fontSize:size,lineStep,
      lines:rows.map((line,i)=>({text:line,x:left,y:top+(i+1)*lineStep})),
    };
  }
  return null;
}
