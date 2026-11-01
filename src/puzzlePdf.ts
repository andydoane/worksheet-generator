import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {planMazePrint,MAZE_ARROW_PATH,MAZE_ARROW_VIEW_SIZE} from './mazePrintLayout.ts';
import {planWordSearch} from './wordSearchLayout.ts';
import {planMediumWordSearch,MEDIUM_SEARCH_TITLE} from './mediumWordSearchLayout.ts';
import type { ModuleFonts } from './modulePdf.ts';
import {
  generateMaze, generateWordSearch, NORTH, SOUTH, EAST, WEST,
  MAZE_COLS, MAZE_ROWS, type PuzzleModule,
} from './puzzleEngines.ts';

type Rect={x:number;y:number;width:number;height:number};
const BLACK=rgb(.12,.12,.12), FAINT=rgb(.57,.57,.57);
function inside(rect:Rect):Rect{
  const p=BOOKLET.padding*72;
  return {x:rect.x+p,y:rect.y+p,width:rect.width-2*p,height:rect.height-2*p};
}
function textWidth(font:PDFFont,txt:string,size:number):number{return font.widthOfTextAtSize(txt,size);}
function center(page:PDFPage,font:PDFFont,txt:string,x:number,y:number,w:number,size:number):void{
  page.drawText(txt,{x:x+(w-textWidth(font,txt,size))/2,y,font,size,color:BLACK});
}
function wrap(text:string,font:PDFFont,size:number,w:number):string[]|null{
  const words=text.trim().replace(/\s+/gu,' ').split(' ').filter(Boolean);
  const rows:string[]=[];let current='';
  for(const word of words){
    if(textWidth(font,word,size)>w)return null;
    const next=current?current+' '+word:word;
    if(current&&textWidth(font,next,size)>w){rows.push(current);current=word;}
    else current=next;
  }
  if(current)rows.push(current);
  return rows;
}

function drawWordSearch(page:PDFPage,rect:Rect,fonts:ModuleFonts,module:Extract<PuzzleModule,{type:'word-search'}>,bordered=false):void{
 const box=inside(rect),puzzle=generateWordSearch(module);
 const plan=planWordSearch(puzzle,{
  puzzle:(text,size)=>textWidth(fonts.puzzle,text,size),
  bank:(text,size)=>textWidth(fonts.bank,text,size),
 },box.width,box.height);
 if(!plan)throw Error('Word Search grid and word bank cannot fit clearly. Use shorter words.');
 const top=box.y+box.height;
 if(!bordered)page.drawRectangle({
  x:box.x+plan.gridX-2,y:top-plan.gridTop-plan.gridHeight-2,
  width:plan.gridWidth+4,height:plan.gridHeight+4,
  borderColor:FAINT,borderWidth:.5,
 });
 for(const letter of plan.letters){
  page.drawText(letter.char,{x:box.x+letter.x,y:top-letter.y,
   size:plan.letterSize,font:fonts.puzzle,color:BLACK});
 }
 for(const entry of plan.bankEntries){
  page.drawText(entry.text,{
   x:box.x+entry.x-textWidth(fonts.bank,entry.text,plan.bankSize)/2,
   y:top-entry.y,size:plan.bankSize,font:fonts.bank,color:BLACK,
  });
 }
}

/** Exactly the same 9x9 print-point scene as MediumWordSearchPrintPreview. */
function drawMediumWordSearch(page:PDFPage,rect:Rect,fonts:ModuleFonts,
 module:Extract<PuzzleModule,{type:'medium-word-search'}>,bordered=false):void{
 const box=inside(rect),puzzle=generateWordSearch(module);
 const plan=planMediumWordSearch(puzzle,{
  puzzle:(text,size)=>textWidth(fonts.puzzle,text,size),
  bank:(text,size)=>textWidth(fonts.bank,text,size),
  title:(text,size)=>textWidth(fonts.title,text,size),
 },box.width,box.height);
 if(!plan)throw Error('Medium Word Search grid and word list cannot fit clearly. Use shorter entries.');
 const top=box.y+box.height;
 center(page,fonts.title,MEDIUM_SEARCH_TITLE,
  box.x+plan.panelWidth,top-plan.titleY,plan.panelWidth,plan.titleSize);
 if(!bordered)page.drawRectangle({
  x:box.x+plan.gridX-2,y:top-plan.gridTop-plan.gridHeight-2,
  width:plan.gridWidth+4,height:plan.gridHeight+4,
  borderColor:FAINT,borderWidth:.5,
 });
 for(const letter of plan.letters){
  page.drawText(letter.char,{
   x:box.x+letter.x,y:top-letter.y,
   size:plan.letterSize,font:fonts.puzzle,color:BLACK,
  });
 }
 for(const item of plan.bankEntries){
  page.drawText(item.text,{
   x:box.x+item.x-textWidth(fonts.bank,item.text,plan.bankSize)/2,
   y:top-item.y,size:plan.bankSize,font:fonts.bank,color:BLACK,
  });
 }
}

function drawMaze(page:PDFPage,rect:Rect,fonts:ModuleFonts,module:Extract<PuzzleModule,{type:'true-false-maze'}>):void{
 const box=inside(rect);
 const plan=planMazePrint(module.statement,(text,size)=>textWidth(fonts.body,text,size),
   box.width,box.height);
 if(!plan)throw Error('The maze statement does not fit on one line.');
 const maze=generateMaze(module),top=box.y+box.height;
 center(page,fonts.title,'TRUE OR FALSE TREK!',box.x,top-plan.titleY,box.width,MODULE_TITLE_PT);
 center(page,fonts.body,'Exit the maze at the correct answer.',
   box.x,top-plan.subtitleY,box.width,8.7);
 center(page,fonts.body,module.statement,box.x,top-plan.statementY,box.width,plan.statementSize);
 const {cell,mazeLeft,mazeTop,mazeWidth}=plan;
 const startX=box.x+mazeLeft,mazeTopPdf=top-mazeTop;
 const line=(x1:number,y1:number,x2:number,y2:number)=>
  page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:.68,color:BLACK});
 for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
  const walls=maze.walls[y][x],cx=startX+x*cell,cy=mazeTopPdf-y*cell;
  if(walls&NORTH)line(cx,cy,cx+cell,cy);
  if(walls&WEST)line(cx,cy,cx,cy-cell);
  if(x===MAZE_COLS-1&&(walls&EAST))line(cx+cell,cy,cx+cell,cy-cell);
  if(y===MAZE_ROWS-1&&(walls&SOUTH))line(cx,cy-cell,cx+cell,cy-cell);
 }
 for(const exit of maze.exits){
  const labelX=box.x+(exit.edge==='left'?plan.exitLeftX:plan.exitRightX);
  const exitY=mazeTop+(exit.y+.5)*cell;
  for(const [i,letter]of Array.from(exit.label).entries()){
   const baselineY=exitY+(i-1.5)*plan.exitLetterPitch+plan.exitLabelSize*.35;
   page.drawText(letter,{
    x:labelX-textWidth(fonts.bodyBold,letter,plan.exitLabelSize)/2,
    y:top-baselineY,font:fonts.bodyBold,size:plan.exitLabelSize,color:BLACK,
   });
  }
 }
 // Original user-uploaded images/maze_arrow.svg path; PDF uses vector ink.
 // The PDF coordinate system is y-up; flip the SVG's y-down path about the
 // lower edge of its target square so its arrow tip points up.
 const scale=plan.arrowSize/MAZE_ARROW_VIEW_SIZE;
 page.drawSvgPath(MAZE_ARROW_PATH,{
  x:box.x+plan.arrowX,
  y:top-plan.arrowY,
  scale,color:BLACK,
 });
}

export function drawPuzzlePdf(page:PDFPage,rect:Rect,module:PuzzleModule,fonts:ModuleFonts,bordered=false):void{
  if(module.type==='word-search')return drawWordSearch(page,rect,fonts,module,bordered);
  if(module.type==='medium-word-search')return drawMediumWordSearch(page,rect,fonts,module,bordered);
  return drawMaze(page,rect,fonts,module);
}
