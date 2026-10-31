import {MAZE_COLS,MAZE_ROWS} from './puzzleEngines.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';

/** The exact user-provided images/maze_arrow.svg path, in its 26.45833 unit square.
 * Keep the asset as the source for the artwork; both print renderers use
 * this unchanged silhouette, rather than approximating it with a triangle.
 */
export const MAZE_ARROW_PATH="M 13.229166 1.2681396 C 11.987933 1.2681396 4.8508837 13.630105 5.4715006 14.705045 C 5.6876166 15.079369 7.559408 15.32316 9.9337605 15.436784 L 9.9337605 24.945247 L 16.524573 24.945247 L 16.524573 15.436784 C 18.898926 15.32316 20.770716 15.079369 20.986832 14.705045 C 21.607449 13.630105 14.4704 1.2681396 13.229166 1.2681396 z";
export const MAZE_ARROW_VIEW_SIZE=26.458333;
export type MazePrintPlan={
 titleY:number;subtitleY:number;statementY:number;statementSize:number;
 mazeLeft:number;mazeTop:number;cell:number;mazeWidth:number;mazeHeight:number;
 exitLabelSize:number;exitLetterPitch:number;exitLeftX:number;exitRightX:number;
 arrowX:number;arrowY:number;arrowSize:number;
};
export function planMazePrint(statement:string,body:MeasureText,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):MazePrintPlan|null{
 const titleY=22.5,subtitleY=36.5,statementY=50.5;
 let statementSize=11.1;
 while(statementSize>=7.1&&body(statement,statementSize)>width-10)statementSize-=.2;
 if(statementSize<7.1)return null;
 const mazeTop=62.5;
 const arrowSize=11.4,arrowGap=2.1,marginBottom=2.2;
 const availableHeight=height-mazeTop-arrowGap-arrowSize-marginBottom;
 const sideReserve=18;
 const cell=Math.min(availableHeight/MAZE_ROWS,(width-2*sideReserve)/MAZE_COLS);
 if(cell<5.5)return null;
 const mazeWidth=cell*MAZE_COLS,mazeHeight=cell*MAZE_ROWS;
 const mazeLeft=(width-mazeWidth)/2;
 const arrowX=mazeLeft+(Math.floor(MAZE_COLS/2)+.5)*cell-arrowSize/2;
 const arrowY=mazeTop+mazeHeight+arrowGap;
 return {
  titleY,subtitleY,statementY,statementSize,mazeLeft,mazeTop,
  cell,mazeWidth,mazeHeight,
  exitLabelSize:8,exitLetterPitch:8.3,
  exitLeftX:mazeLeft-9.6,exitRightX:mazeLeft+mazeWidth+9.6,
  arrowX,arrowY,arrowSize,
 };
}
