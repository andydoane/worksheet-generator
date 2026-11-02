import {measureWrappedLines} from './pdfLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {PIXEL_INSTRUCTION,PIXEL_SIZE,type PixelPicturePuzzle} from './pixelPicture.ts';

export type PixelMetrics={title:MeasureText;body:MeasureText;puzzle:MeasureText};
export type PixelTextLine={text:string;x:number;y:number};
export type PixelCell={char:string;row:number;col:number;x:number;y:number;rectX:number;rectY:number;active:boolean};
export type PixelPlan={
 title:string;titleSize:number;titleX:number;titleY:number;
 instructions:PixelTextLine[];instructionSize:number;
 phraseLines:PixelTextLine[];phraseSize:number;
 leftPanelWidth:number;leftSafeX:number;leftSafeWidth:number;
 gridX:number;gridY:number;gridSize:number;cell:number;letterSize:number;
 cells:PixelCell[];
};
/** Both the browser SVG and vector PDF consume the exact same print-point
 * plan. Reject a layout before any text can cross into the 13×13 grid.
 * No CSS wrapping, clipped HTML, or browser-only measurements are involved.
 */
export function planPixelPicture(puzzle:PixelPicturePuzzle,metrics:PixelMetrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):PixelPlan|null{
 if(puzzle.grid.length!==PIXEL_SIZE||
  puzzle.grid.some(row=>row.length!==PIXEL_SIZE))return null;
 const half=width/2,leftSafeX=6,leftSafeWidth=half-12;
 const title='PIXEL PICTURE',titleY=25;
 let titleSize=25;
 while(titleSize>=21&&metrics.title(title,titleSize)>leftSafeWidth)titleSize-=.5;
 if(titleSize<21)return null;
 const instructionSize=8.5,instructionPitch=10.8;
 const instructionLines=measureWrappedLines(PIXEL_INSTRUCTION,leftSafeWidth,
  line=>metrics.body(line,instructionSize));
 if(!instructionLines||instructionLines.length>4)return null;
 const instructions=instructionLines.map((text,i)=>({
  text,x:leftSafeX,y:41+i*instructionPitch,
 }));
 const phraseStart=instructions[instructions.length-1].y+20;
 let phraseSize=0,phraseLines:PixelTextLine[]=[];
 for(let size=13;size>=9.5;size-=.5){
  const lines=measureWrappedLines(puzzle.maskedPhrase,leftSafeWidth,
   line=>metrics.body(line,size));
  if(!lines||!lines.length)continue;
  const pitch=size*1.48;
  const mapped=lines.map((text,i)=>({text,x:leftSafeX,y:phraseStart+i*pitch}));
  if(mapped[mapped.length-1].y+size*.38>height-5)continue;
  phraseSize=size;phraseLines=mapped;break;
 }
 if(!phraseSize)return null;
 // Center the grid inside the right-hand Small-sized panel. Each cell is
 // a real square with enough point-size clearance for an uppercase glyph.
 const cell=Math.min(12,(half-10)/PIXEL_SIZE,(height-10)/PIXEL_SIZE);
 if(cell<10.7)return null;
 const gridSize=cell*PIXEL_SIZE,gridX=half+(half-gridSize)/2;
 const gridY=(height-gridSize)/2,letterSize=Math.min(9.1,cell*.76);
 if(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').some(ch=>
  metrics.puzzle(ch,letterSize)>cell-2))return null;
 const cells=puzzle.grid.flatMap((row,r)=>row.map((char,c)=>({
  char,row:r,col:c,
  rectX:gridX+c*cell,rectY:gridY+r*cell,
  x:gridX+(c+.5)*cell-metrics.puzzle(char,letterSize)/2,
  y:gridY+(r+.5)*cell+letterSize*.36,
  active:puzzle.mask[r][c]==='1',
 })));
 return {title,titleSize,titleX:half/2,titleY,
  instructions,instructionSize,phraseLines,phraseSize,
  leftPanelWidth:half,leftSafeX,leftSafeWidth,
  gridX,gridY,gridSize,cell,letterSize,cells};
}
