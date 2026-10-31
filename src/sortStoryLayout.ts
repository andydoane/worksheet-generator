import {BOOKLET} from './booklet.ts';
import {balancedBankLines} from './balancedBankLines.ts';
import {sortedStoryBank,type SortStory} from './storyVerseModules.ts';
import type {MeasureText} from './mediumParityLayout.ts';

/** Physical print-space scene shared by the Large SVG preview and PDF. */
export const SORT_STORY_WIDTH=(BOOKLET.cell.width*2-BOOKLET.padding*2)*72;
export const SORT_STORY_HEIGHT=(BOOKLET.cell.height*2-BOOKLET.padding*2)*72;
export const SORT_STORY_INSTRUCTION=
 'Sort the letters into TRUE or FALSE. Circle the incorrect words in false statements.';
export const SORT_STORY_STROKE=.85;

type TextLine={text:string;x:number;y:number};
type Rectangle={x:number;y:number;width:number;height:number};
export type SortStoryRow={
 letter:string;letterBox:Rectangle;letterX:number;letterY:number;
 textSize:number;lines:TextLine[];
};
export type SortStoryPlan={
 titleY:number;strokeWidth:number;instructionSize:number;instructions:TextLine[];
 bank:Rectangle;separators:number[];rows:SortStoryRow[];
 answers:{label:string;labelX:number;labelY:number;box:Rectangle}[];
};
type Metrics={body:MeasureText;instruction:MeasureText};

/** All y coordinates are measured DOWN from the top of the printable interior.
 * Reserve the full answer area before fitting any statement. Each row adapts
 * its measured line wrapping and font size without shrinking letter boxes.
 */
export function planSortStory(module:SortStory,metrics:Metrics,
 width=SORT_STORY_WIDTH,height=SORT_STORY_HEIGHT):SortStoryPlan|null{
 const items=sortedStoryBank(module);
 if(items.length<4||items.length>8||width<=0||height<=0)return null;
 const instructionSize=9.4;
 const instructionLines=balancedBankLines(SORT_STORY_INSTRUCTION,
  width-12,metrics.instruction,instructionSize,3);
 if(!instructionLines)return null;
 const instructions=instructionLines.map((text,i)=>({
  text,x:width/2,y:42+i*11.2,
 }));
 const bankTop=instructions[instructions.length-1].y+16;
 const bankBottom=height-85;
 const bankHeight=bankBottom-bankTop;
 if(bankHeight<=0)return null;
 const rowHeight=bankHeight/items.length;
 const letterWidth=19,letterHeight=18;
 if(rowHeight<letterHeight+5)return null;
 const bank:Rectangle={x:0,y:bankTop,width,height:bankHeight};
 const rows:SortStoryRow[]=[];
 for(let i=0;i<items.length;i++){
  const rowY=bankTop+i*rowHeight;
  let fitted:{textSize:number;lines:string[];step:number}|null=null;
  for(let size=10.5;size>=8;size-=.5){
   const lines=balancedBankLines(items[i].text,width-39,
    metrics.body,size,4);
   const step=size*1.22;
   if(lines&&lines.length*step<=rowHeight-4){
    fitted={textSize:size,lines,step};break;
   }
  }
  if(!fitted)return null;
  const firstBaseline=rowY+(rowHeight-fitted.lines.length*fitted.step)/2+
   fitted.textSize*.98;
  const letterBox={x:5,y:rowY+(rowHeight-letterHeight)/2,
   width:letterWidth,height:letterHeight};
  rows.push({
   letter:String.fromCharCode(65+i),letterBox,
   letterX:letterBox.x+letterWidth/2,
   letterY:letterBox.y+letterHeight/2+3.7,
   textSize:fitted.textSize,
   lines:fitted.lines.map((text,j)=>({text,x:31,y:firstBaseline+j*fitted.step})),
  });
 }
 const gap=10,half=(width-gap)/2;
 const answers=['TRUE','FALSE'].map((label,i)=>({
  label,labelX:i*(half+gap)+half/2,
  labelY:height-65,
  box:{x:i*(half+gap),y:height-58,width:half,height:height-(height-58)-4},
 }));
 return {titleY:24,strokeWidth:SORT_STORY_STROKE,instructionSize,instructions,
  bank,separators:items.slice(1).map((_,i)=>bankTop+(i+1)*rowHeight),
  rows,answers};
}
