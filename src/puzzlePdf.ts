import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import type { ModuleFonts } from './modulePdf.ts';
import {
  generateMaze, generateWordSearch, NORTH, SOUTH, EAST, WEST,
  WORD_COLS, WORD_ROWS, MAZE_COLS, MAZE_ROWS, type PuzzleModule,
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

function drawWordSearch(page:PDFPage,rect:Rect,fonts:ModuleFonts,module:Extract<PuzzleModule,{type:'word-search'}>):void{
  const box=inside(rect),puzzle=generateWordSearch(module);
  center(page,fonts.title,'WORD SEARCH',box.x,box.y+box.height-28,box.width,MODULE_TITLE_PT);
  const columns=puzzle.words.length>8?3:2,rows=Math.ceil(puzzle.words.length/columns);
  // A short bank needs fewer lines, so the grid can grow. A longer bank
  // reserves more vertical space instead of squeezing the last word row.
  const rowTarget=22;
  const reservedBank=rows*rowTarget+15;
  const cell=Math.min((box.width-12)/WORD_COLS,(box.height-52-reservedBank)/WORD_ROWS);
  if(cell<15)throw Error('Not enough space for a readable word-search grid.');
  const gridWidth=cell*WORD_COLS,gridHeight=cell*WORD_ROWS;
  const x0=box.x+(box.width-gridWidth)/2,top=box.y+box.height-43;
  const bottom=top-gridHeight;
  page.drawRectangle({x:x0-2,y:bottom-2,width:gridWidth+4,height:gridHeight+4,
    borderColor:FAINT,borderWidth:.5});
  for(let y=0;y<WORD_ROWS;y++)for(let x=0;x<WORD_COLS;x++){
    const letter=puzzle.grid[y][x],size=Math.min(17,cell*.73);
    const cx=x0+x*cell+(cell-textWidth(fonts.puzzle,letter,size))/2;
    const cy=top-(y+1)*cell+(cell-size)*.55+size*.12;
    page.drawText(letter,{x:cx,y:cy,size,font:fonts.puzzle,color:BLACK});
  }
  const bankTop=bottom-13,bankBottom=box.y+6;
  const available=bankTop-bankBottom;
  if(available<rows*14)throw Error('Word list does not fit; use fewer entries.');
  const step=Math.min(27,available/rows);
  const colW=box.width/columns;
  const fontSize=Math.min(12,...puzzle.labels.map(word=>{
    for(let s=12;s>=7.5;s-=.5)
      if(textWidth(fonts.bank,word,s)<=colW-9)return s;
    throw Error('Word-list entry is too long to print clearly.');
  }));
  const bankGroupHeight=step*rows;
  const bankGroupTop=bankBottom+(available+bankGroupHeight)/2;
  puzzle.labels.forEach((word,i)=>{
    const col=i%columns,row=Math.floor(i/columns);
    const baseline=bankGroupTop-(row+.5)*step-fontSize*.36;
    center(page,fonts.bank,word,box.x+col*colW,baseline,colW,fontSize);
  });
}

function drawMaze(page:PDFPage,rect:Rect,fonts:ModuleFonts,module:Extract<PuzzleModule,{type:'true-false-maze'}>):void{
  const box=inside(rect);
  const maze=generateMaze(module),top=box.y+box.height;
  center(page,fonts.title,'TRUE OR FALSE TREK!',box.x,top-23,box.width,MODULE_TITLE_PT);
  center(page,fonts.body,'Exit the maze at the correct answer.',box.x,top-37,box.width,8.7);
  // Limit statement to two comfortably readable lines above the maze.
  let statementRows:string[]|null=null,statementSize=10.2;
  for(;statementSize>=8.5;statementSize-=.5){
    const rows=wrap(module.statement,fonts.body,statementSize,box.width-6);
    if(rows&&rows.length<=2){statementRows=rows;break;}
  }
  if(!statementRows)throw Error('The maze statement is too long. Please shorten it.');
  statementRows.forEach((line,i)=>center(page,fonts.body,line,box.x,top-52-i*11.5,box.width,statementSize));
  const mazeTop=top-(statementRows.length===2?72:62);
  // Leave space for side labels and one bottom answer label.
  const maxW=box.width-58;
  const maxH=mazeTop-box.y-18;
  const size=Math.min(maxW/MAZE_COLS,maxH/MAZE_ROWS);
  if(size<5.5)throw Error('The maze is too small to print; shorten the statement.');
  const width=MAZE_COLS*size,height=MAZE_ROWS*size;
  const startX=box.x+26+(maxW-width)/2;
  const startY=mazeTop-height;
  const line=(x1:number,y1:number,x2:number,y2:number)=>{
    page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:.68,color:BLACK});
  };
  for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
    const w=maze.walls[y][x],cx=startX+x*size,cy=mazeTop-y*size;
    if(w&NORTH)line(cx,cy,cx+size,cy);
    if(w&WEST)line(cx,cy,cx,cy-size);
    if(x===MAZE_COLS-1&&(w&EAST))line(cx+size,cy,cx+size,cy-size);
    if(y===MAZE_ROWS-1&&(w&SOUTH))line(cx,cy-size,cx+size,cy-size);
  }
  const startText='IN';
  center(page,fonts.body,startText,
    startX+(maze.entrance.x+.5)*size-14,startY-12,28,7.4);
  for(const exit of maze.exits){
    const sizeLabel=7.4;
    const x=exit.edge==='left'
      ? startX-textWidth(fonts.body,exit.label,sizeLabel)-4
      : startX+width+4;
    const y=mazeTop-(exit.y+.5)*size-2.5;
    page.drawText(exit.label,{x,y,font:fonts.body,size:sizeLabel,color:BLACK});
  }
}

export function drawPuzzlePdf(page:PDFPage,rect:Rect,module:PuzzleModule,fonts:ModuleFonts):void{
  if(module.type==='word-search')return drawWordSearch(page,rect,fonts,module);
  return drawMaze(page,rect,fonts,module);
}
