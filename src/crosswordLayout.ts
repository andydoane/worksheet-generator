import type {CrosswordResult} from './specialtyModules.ts';

/** Print-space layout shared by PDF export and browser SVG (top-left origin).
 * Font widths are provided by exactly the same static Nunito Medium outlines.
 * Clues reserve only the height they need; the largest remaining square wins.
 */
export const CROSSWORD_WIDTH=331.2;
export const CROSSWORD_HEIGHT=360;
export type CrosswordClueRow={text:string;x:number;y:number};
export type CrosswordPlan={
  cell:number;gridX:number;gridTop:number;gridWidth:number;gridHeight:number;
  /** The occupied grid-and-clues block has equal whitespace above and below. */
  contentTop:number;contentBottom:number;
  /** Extra grid-to-clue breathing room, allocated only from unused vertical height. */
  clueGapGrowth:number;
  clueFontSize:number;acrossHeader:{x:number;y:number};downHeader:{x:number;y:number};
  acrossRows:CrosswordClueRow[];downRows:CrosswordClueRow[];
};
/** Blank positions completely bounded by real letter cells look like extra
 * crossword squares. Fill just these four-sided interior voids, never
 * changing the generated answer grid or its numbering.
 */
export function crosswordBlackCells(puzzle:Pick<CrosswordResult,'width'|'height'|'cells'>):{x:number;y:number}[]{
  const black:{x:number;y:number}[]=[];
  for(let y=1;y<puzzle.height-1;y++)for(let x=1;x<puzzle.width-1;x++){
    if(puzzle.cells[y][x]!==null)continue;
    if(puzzle.cells[y-1][x]!==null&&puzzle.cells[y+1][x]!==null&&
       puzzle.cells[y][x-1]!==null&&puzzle.cells[y][x+1]!==null){
      black.push({x,y});
    }
  }
  return black;
}
export function crosswordWrap(text:string,maxWidth:number,fontSize:number,
  measure:(text:string,size:number)=>number):string[]|null{
  const result:string[]=[];let line='';
  for(const word of text.trim().split(/\s+/u)){
    if(measure(word,fontSize)>maxWidth)return null;
    const candidate=line?line+' '+word:word;
    if(line&&measure(candidate,fontSize)>maxWidth){result.push(line);line=word;}
    else line=candidate;
  }
  if(line)result.push(line);
  return result;
}
export function planCrossword(puzzle:CrosswordResult,measure:(text:string,size:number)=>number,
  width=CROSSWORD_WIDTH,height=CROSSWORD_HEIGHT):CrosswordPlan|null{
  const colWidth=width/2-12;
  const groups=[puzzle.across,puzzle.down];
  const gridTop=8; // Working origin; the completed composition is centered below.
  const maxCell=Math.min(27,(width-12)/puzzle.width);
  for(let cell=maxCell;cell>=9;cell-=.5){
    const gridHeight=puzzle.height*cell;
    const clueStart=gridTop+gridHeight+11;
    const available=height-4-(clueStart+32);
    if(available<=25)continue;
    for(let size=9.2;size>=6.6;size-=.4){
      const step=size*1.25;
      const wrapped=groups.map(list=>list.map(p=>
        crosswordWrap(p.number+'. '+p.clue,colWidth-4,size,measure)));
      if(wrapped.some(group=>group.some(v=>!v)))continue;
      if(wrapped.some(group=>group.reduce((s,v)=>s+v!.length*step+4,0)>available))continue;
      const rowGroups:CrosswordClueRow[][]=[[],[]];
      for(let col=0;col<2;col++){
        const x=col*(width/2+3)+2;
        let cursor=clueStart+32;
        for(const lines of wrapped[col]){
          for(const text of lines!){rowGroups[col].push({text,x,y:cursor});cursor+=step;}
          cursor+=4;
        }
      }
      // Include grid ink, headings and the lowest actual clue baseline.
      // Use a conservative descender reserve without changing font/box sizes.
      // The space formerly left below a short puzzle is divided equally above
      // and below the entire block, not applied to the grid alone.
      const bottom=Math.max(gridTop+gridHeight,clueStart+17,
        ...rowGroups.flat().map(row=>row.y+size*.3));
      // Reserve at least 8pt on each side, use at most half the remaining
      // height to separate the grid and clues, and cap the extra gap at 30pt.
      // Dense crosswords keep their old compact spacing. The ENTIRE expanded
      // composition is re-centered, retaining the PR16h centered bounds.
      const spare=height-(bottom-gridTop);
      const clueGapGrowth=Math.min(30,Math.max(0,(spare-16)*.5));
      const finalBottom=bottom+clueGapGrowth;
      const offset=(height-(finalBottom-gridTop))/2-gridTop;
      if(offset<-1e-6)continue;
      const centeredTop=gridTop+offset;
      return {
        cell,gridX:(width-puzzle.width*cell)/2,gridTop:centeredTop,
        contentTop:centeredTop,contentBottom:finalBottom+offset,
        clueGapGrowth,
        gridWidth:puzzle.width*cell,gridHeight,
        clueFontSize:size,
        acrossHeader:{x:0,y:clueStart+14+clueGapGrowth+offset},
        downHeader:{x:width/2+3,y:clueStart+14+clueGapGrowth+offset},
        acrossRows:rowGroups[0].map(row=>({...row,y:row.y+clueGapGrowth+offset})), 
        downRows:rowGroups[1].map(row=>({...row,y:row.y+clueGapGrowth+offset})),
      };
    }
  }
  return null;
}
