import type {MeasureText} from './mediumParityLayout.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT,type SmallLine} from './smallParityLayout.ts';
import {balancedBankLines} from './balancedBankLines.ts';

export const TRUE_FALSE_TITLE='TRUE OR FALSE?';
export const TRUE_FALSE_MAX_CHARACTERS=80;
export const THUMB_VIEW_SIZE=26.458333;
/** Fixed print-space artwork reservation: never place statement text here. */
export type ThumbPlacement={x:number;y:number;size:number;label:string;labelX:number;labelY:number};
export type TrueFalsePrintPlan={
 titleY:number;titleSize:number;
 statementSize:number;statementLines:SmallLine[];
 statementTop:number;statementBottom:number;
 thumbs:readonly [ThumbPlacement,ThumbPlacement];
};
/** Top-left physical points for preview SVG and PDF; source images stay square.
 * All statement text is fitted entirely above the 42pt artwork and labels.
 */
export function planTrueFalse(statement:string,measure:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):TrueFalsePrintPlan|null{
 if(!statement.trim()||statement.trim().length>TRUE_FALSE_MAX_CHARACTERS)return null;
 const titleSize=23,titleY=24;
 const iconSize=42,iconTop=height-61.8,labelY=height-8.5;
 const statementTop=34,statementBottom=iconTop-6;
 const statementHeight=statementBottom-statementTop;
 if(statementHeight<45)return null;
 const locations:readonly [number,number]=[width*.29,width*.71];
 const thumbs=locations.map((centerX,i)=>({
   x:centerX-iconSize/2,y:iconTop,size:iconSize,label:i===0?'TRUE':'FALSE',
   labelX:centerX,labelY,
 })) as [ThumbPlacement,ThumbPlacement];
 for(let size=18;size>=10.5;size-=.5){
  const lines=balancedBankLines(statement.trim(),width-8,measure,size,6);
  if(!lines?.length)continue;
  const step=size*1.18,blockHeight=lines.length*step;
  if(blockHeight>statementHeight)continue;
  const firstY=statementTop+(statementHeight-blockHeight)/2+size;
  const statementLines=lines.map((text,i)=>({text,x:width/2,y:firstY+i*step}));
  if(statementLines[statementLines.length-1].y+size*.18>statementBottom)continue;
  return {titleY,titleSize,statementSize:size,statementLines,
    statementTop,statementBottom,thumbs};
 }
 return null;
}
