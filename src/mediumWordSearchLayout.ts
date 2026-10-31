import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {MEDIUM_WORD_COLS,MEDIUM_WORD_ROWS,type WordSearchGrid} from './puzzleEngines.ts';

/** One Medium activity, visually split into two equal Small-sized panels:
 * left: almost full-height 9×9 grid; right: standard title and word bank.
 * Everything is measured in physical top-left PDF points for SVG/PDF parity.
 */
export const MEDIUM_SEARCH_TITLE='CROSSWORD';
export type MediumWordSearchMetrics={puzzle:MeasureText;bank:MeasureText;title:MeasureText};
export type MediumWordSearchPlan={
 gridX:number;gridTop:number;gridWidth:number;gridHeight:number;
 cell:number;letterSize:number;letters:{char:string;col:number;row:number;x:number;y:number}[];
 panelWidth:number;dividerX:number;dividerTop:number;dividerBottom:number;
 titleX:number;titleY:number;titleSize:number;
 bankX:number;bankWidth:number;bankSize:number;bankPitch:number;
 bankTop:number;bankHeight:number;
 bankEntries:{text:string;x:number;y:number}[];
 /** Enclosing title + bank block, centered within the right-hand panel. */
 rightStackTop:number;rightStackHeight:number;
};
export function planMediumWordSearch(puzzle:WordSearchGrid,metrics:MediumWordSearchMetrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):MediumWordSearchPlan|null{
 if(puzzle.grid.length!==MEDIUM_WORD_ROWS||
  puzzle.grid.some(row=>row.length!==MEDIUM_WORD_COLS)||
  puzzle.labels.length<1||puzzle.labels.length>6)return null;
 const panelWidth=width/2,dividerX=panelWidth;
 const outerInset=2.4,borderMargin=2,bankInset=6;
 // The grid must stay completely inside its Small-sized left half, including
 // the .5pt outer rule. Do not squeeze the left half to fit long bank labels.
 const cell=Math.min(18,
  (panelWidth-2*outerInset-2*borderMargin)/MEDIUM_WORD_COLS,
  (height-2*outerInset-2*borderMargin)/MEDIUM_WORD_ROWS);
 if(cell<15)return null;
 const gridWidth=cell*MEDIUM_WORD_COLS,gridHeight=cell*MEDIUM_WORD_ROWS;
 const gridX=(panelWidth-gridWidth)/2,gridTop=(height-gridHeight)/2;
 const letterSize=Math.min(15,cell*.82);
 if(metrics.puzzle('W',letterSize)>cell-2)return null;
 // The right-hand panel uses the same 25pt Mouse Memoirs heading as the
 // existing Medium activities, but it sits above a single centered bank.
 const titleSize=MODULE_TITLE_PT,titleX=panelWidth+panelWidth/2;
 if(metrics.title(MEDIUM_SEARCH_TITLE,titleSize)>panelWidth-2*bankInset)return null;
 const bankX=panelWidth+bankInset,bankWidth=panelWidth-2*bankInset;
 let bankSize=0;
 for(let size=12.5;size>=9;size-=.5){
  if(puzzle.labels.every(label=>metrics.bank(label,size)<=bankWidth-4)){
   bankSize=size;break;
  }
 }
 if(!bankSize)return null;
 const titleHeight=28,titleGap=8,bankPitch=20;
 const bankHeight=puzzle.labels.length*bankPitch;
 const rightStackHeight=titleHeight+titleGap+bankHeight;
 const rightStackTop=(height-rightStackHeight)/2;
 if(rightStackTop<outerInset)return null;
 const titleY=rightStackTop+24;
 const bankTop=rightStackTop+titleHeight+titleGap;
 const bankEntries=puzzle.labels.map((text,i)=>({
  text,x:bankX+bankWidth/2,
  y:bankTop+(i+.68)*bankPitch,
 }));
 if(bankEntries.some(entry=>
  entry.y-bankSize<outerInset||entry.y+3>height-outerInset))return null;
 const letters=puzzle.grid.flatMap((row,y)=>row.map((char,x)=>({
  char,col:x,row:y,
  x:gridX+(x+.5)*cell-metrics.puzzle(char,letterSize)/2,
  y:gridTop+y*cell+.45*cell+.43*letterSize,
 })));
 return {gridX,gridTop,gridWidth,gridHeight,cell,letterSize,letters,
  panelWidth,dividerX,dividerTop:4,dividerBottom:height-4,
  titleX,titleY,titleSize,
  bankX,bankWidth,bankSize,bankPitch,bankTop,bankHeight,bankEntries,
  rightStackTop,rightStackHeight};
}
