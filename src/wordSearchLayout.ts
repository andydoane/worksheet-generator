import {BOOKLET} from './booklet.ts';
import {WORD_COLS,WORD_ROWS,type WordSearchGrid} from './puzzleEngines.ts';
import type {MeasureText} from './mediumParityLayout.ts';

/** Title-free Large Word Search, measured once for both PDF and SVG. */
export const WORD_SEARCH_WIDTH=(BOOKLET.cell.width*2-BOOKLET.padding*2)*72;
export const WORD_SEARCH_HEIGHT=(BOOKLET.cell.height*2-BOOKLET.padding*2)*72;
export type WordSearchLetter={char:string;x:number;y:number;col:number;row:number};
export type WordSearchBankEntry={text:string;x:number;y:number};
export type WordSearchPlan={
 gridX:number;gridTop:number;gridWidth:number;gridHeight:number;
 cell:number;letterSize:number;letters:WordSearchLetter[];
 bankSize:number;bankColumns:number;bankRows:number;
 bankTop:number;bankBottom:number;bankEntries:WordSearchBankEntry[];
};
export type WordSearchMetrics={puzzle:MeasureText;bank:MeasureText};

/** The grid wins as much space as possible without shrinking the word bank
 * below print-legible text or clipping the bottom labels. No heading is drawn.
 * All coordinates use a top-left origin in physical PDF points.
 */
export function planWordSearch(puzzle:WordSearchGrid,metrics:WordSearchMetrics,
 width=WORD_SEARCH_WIDTH,height=WORD_SEARCH_HEIGHT):WordSearchPlan|null{
 if(puzzle.grid.length!==WORD_ROWS||
  puzzle.grid.some(row=>row.length!==WORD_COLS)||
  puzzle.labels.length<4||puzzle.labels.length>12)return null;
 const columns=puzzle.labels.length>8?3:2;
 const rows=Math.ceil(puzzle.labels.length/columns);
 const colWidth=width/columns;
 let bankSize=0;
 for(let size=12.5;size>=7.5;size-=.5){
  if(puzzle.labels.every(label=>metrics.bank(label,size)<=colWidth-9)){
   bankSize=size;break;
  }
 }
 if(!bankSize)return null;
 const gridTop=7,bankGap=15,bottom=7;
 const pitch=Math.max(17,bankSize*1.52);
 const maxCell=Math.min(27,(width-9)/WORD_COLS);
 for(let cell=maxCell;cell>=15;cell-=.25){
  const gridWidth=WORD_COLS*cell,gridHeight=WORD_ROWS*cell;
  const gridBottom=gridTop+gridHeight;
  const remaining=height-bottom-(gridBottom+bankGap);
  if(remaining+1e-6<rows*pitch)continue;
  const gridX=(width-gridWidth)/2;
  const letterSize=Math.min(18.5,cell*.73);
  if(metrics.puzzle('W',letterSize)>cell-3)continue;
  const letters:WordSearchLetter[]=puzzle.grid.flatMap((row,y)=>
   row.map((char,x)=>({
    char,col:x,row:y,
    x:gridX+(x+.5)*cell-metrics.puzzle(char,letterSize)/2,
    y:gridTop+y*cell+.45*cell+.43*letterSize,
   })));
  const bankTop=gridBottom+bankGap+(remaining-rows*pitch)/2;
  const bankBottom=bankTop+rows*pitch;
  const bankEntries=puzzle.labels.map((label,i)=>({
   text:label,x:((i%columns)+.5)*colWidth,
   y:bankTop+(Math.floor(i/columns)+.68)*pitch,
  }));
  return {gridX,gridTop,gridWidth,gridHeight,cell,letterSize,letters,
   bankSize,bankColumns:columns,bankRows:rows,bankTop,bankBottom,bankEntries};
 }
 return null;
}
