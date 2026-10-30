import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
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
  const box=inside(rect);
  const puzzle=generateWordSearch(module);
  center(page,fonts.title,'WORD SEARCH',box.x,box.y+box.height-28,box.width,25);
  // Reserve 76pt for the 2-column word list, plus header and gutters.
  const cell=Math.min((box.width-12)/WORD_COLS,(box.height-134)/WORD_ROWS);
  if(cell<15)throw Error('Not enough space for a readable word-search grid.');
  const gridWidth=cell*WORD_COLS,gridHeight=cell*WORD_ROWS;
  const x0=box.x+(box.width-gridWidth)/2;
  const top=box.y+box.height-43;
  const bottom=top-gridHeight;
  page.drawRectangle({x:x0-2,y:bottom-2,width:gridWidth+4,height:gridHeight+4,borderColor:FAINT,borderWidth:.5});
  for(let y=0;y<WORD_ROWS;y++)for(let x=0;x<WORD_COLS;x++){
    const letter=puzzle.grid[y][x];
    const size=Math.min(17,cell*.73);
    const cx=x0+x*cell+(cell-textWidth(fonts.puzzle,letter,size))/2;
    const cy=top-(y+1)*cell+(cell-size)*.55+size*.12;
    page.drawText(letter,{x:cx,y:cy,size,font:fonts.puzzle,color:BLACK});
  }
  const bankTop=bottom-16;
  const colW=box.width/2;
  const rows=Math.ceil(puzzle.words.length/2);
  if(bankTop-rows*13<box.y+2)throw Error('Word list does not fit; shorten your words.');
  const fontSize=Math.min(11.3,...puzzle.words.map(word=>{
    for(let s=11.3;s>=8;s-=.5)if(textWidth(fonts.body,word,s)<=colW-14)return s;
    throw Error('Word-list entry is too long to print clearly.');
  }));
  puzzle.words.forEach((word,i)=>{
    const col=i%2,row=Math.floor(i/2);
    center(page,fonts.body,word,box.x+col*colW,bankTop-row*13,colW,fontSize);
  });
}

function drawMaze(page:PDFPage,rect:Rect,fonts:ModuleFonts,module:Extract<PuzzleModule,{type:'true-false-maze'}>):void{
  const box=inside(rect);
  const maze=generateMaze(module),top=box.y+box.height;
  center(page,fonts.title,'TRUE OR FALSE TREK!',box.x,top-23,box.width,23);
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
