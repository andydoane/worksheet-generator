import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {MEDIUM_WORD_COLS,MEDIUM_WORD_ROWS,type WordSearchGrid} from './puzzleEngines.ts';

/** Title-free 9×9 Medium Word Search, all positions in top-left physical
 * print points. Both PDF and browser SVG consume exactly this plan.
 */
export type MediumWordSearchMetrics={puzzle:MeasureText;bank:MeasureText};
export type MediumWordSearchPlan={
 gridX:number;gridTop:number;gridWidth:number;gridHeight:number;
 cell:number;letterSize:number;letters:{char:string;col:number;row:number;x:number;y:number}[];
 bankX:number;bankWidth:number;bankSize:number;bankPitch:number;
 bankTop:number;bankHeight:number;
 bankEntries:{text:string;x:number;y:number}[];
 unitLeft:number;unitWidth:number;gap:number;
};
export function planMediumWordSearch(puzzle:WordSearchGrid,metrics:MediumWordSearchMetrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):MediumWordSearchPlan|null{
 if(puzzle.grid.length!==MEDIUM_WORD_ROWS||
  puzzle.grid.some(row=>row.length!==MEDIUM_WORD_COLS)||
  puzzle.labels.length<1||puzzle.labels.length>6)return null;
 const gap=14,outerInset=4,bankPadding=8;
 // Fill the printable Medium height without letting the border escape
 // the book's established padding. The 9×9 board is always square.
 const cell=Math.min(18,(height-outerInset*2-4)/MEDIUM_WORD_ROWS);
 const gridWidth=cell*MEDIUM_WORD_COLS,gridHeight=cell*MEDIUM_WORD_ROWS;
 if(cell<15)return null;
 const letterSize=Math.min(15,cell*.82);
 if(metrics.puzzle('W',letterSize)>cell-2)return null;
 let bankSize=0,bankWidth=0;
 const remaining=width-gridWidth-gap-outerInset*2;
 for(let size=12.5;size>=9;size-=.5){
  const maxLabel=Math.max(...puzzle.labels.map(label=>metrics.bank(label,size)));
  const suggested=Math.max(98,maxLabel+bankPadding);
  if(suggested<=remaining+.00001){
   bankSize=size;bankWidth=suggested;break;
  }
 }
 if(!bankSize)return null;
 const unitWidth=gridWidth+gap+bankWidth;
 const unitLeft=(width-unitWidth)/2;
 if(unitLeft<outerInset-.001)return null;
 const gridX=unitLeft,gridTop=(height-gridHeight)/2;
 const bankX=gridX+gridWidth+gap;
 // One vertical column, centered against the full height of the grid.
 const bankPitch=Math.min(23.5,(height-outerInset*2)/puzzle.labels.length);
 const bankHeight=bankPitch*puzzle.labels.length;
 const bankTop=(height-bankHeight)/2;
 if(bankTop<outerInset-.001)return null;
 const bankEntries=puzzle.labels.map((text,i)=>({
  text,x:bankX+bankWidth/2,
  y:bankTop+(i+.68)*bankPitch,
 }));
 if(bankEntries.some(entry=>
  entry.y-bankSize<outerInset-.001||entry.y+3>height-outerInset+.001))return null;
 const letters=puzzle.grid.flatMap((row,y)=>row.map((char,x)=>({
  char,col:x,row:y,
  x:gridX+(x+.5)*cell-metrics.puzzle(char,letterSize)/2,
  y:gridTop+y*cell+.45*cell+.43*letterSize,
 })));
 return {gridX,gridTop,gridWidth,gridHeight,cell,letterSize,letters,
  bankX,bankWidth,bankSize,bankPitch,bankTop,bankHeight,bankEntries,
  unitLeft,unitWidth,gap};
}
