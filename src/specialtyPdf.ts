import {
  rgb, type PDFFont, type PDFPage, pushGraphicsState,
  popGraphicsState, concatTransformationMatrix,
} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {balancedLines} from './storyVersePdf.ts';
import {planCrossword,crosswordBlackCells} from './crosswordLayout.ts';
import {drawReconstructionPdf} from './verseReconstructionPdf.ts';
import type {ModuleFonts} from './modulePdf.ts';
import {
  generateCrossword,parseConnectionWords,connectPositions,spiralPoints,spiralTurns,validateSpecialty,
  type SpecialtyModule,
} from './specialtyModules.ts';

type Rect={x:number;y:number;width:number;height:number};
const INK=rgb(.13,.13,.13),LIGHT=rgb(.55,.55,.55);
const sizeOf=(font:PDFFont,s:string,size:number)=>font.widthOfTextAtSize(s,size);
const inside=(r:Rect):Rect=>{
  const p=BOOKLET.padding*72;
  return {x:r.x+p,y:r.y+p,width:r.width-2*p,height:r.height-2*p};
};
function centered(page:PDFPage,font:PDFFont,text:string,x:number,y:number,w:number,size:number):void{
  page.drawText(text,{x:x+(w-sizeOf(font,text,size))/2,y,size,font,color:INK});
}
function fitted(font:PDFFont,text:string,w:number,preferred:number,minimum:number):number{
  for(let size=preferred;size>=minimum;size-=.5)if(sizeOf(font,text,size)<=w)return size;
  throw Error('A word is too long for its printable cell. Shorten it.');
}
function wrapped(font:PDFFont,text:string,size:number,width:number):string[]|null{
  const pieces=text.trim().split(/\s+/u).filter(Boolean),out:string[]=[];let current='';
  for(const p of pieces){
    if(sizeOf(font,p,size)>width)return null;
    const next=current?current+' '+p:p;
    if(current&&sizeOf(font,next,size)>width){out.push(current);current=p;}
    else current=next;
  }
  if(current)out.push(current);
  return out;
}
/** Fit the clues first, then maximize physical square size with the rest. */
/** Same physical grid and clue geometry as the browser SVG preview. */
function crossword(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'crossword'}>,fonts:ModuleFonts):void{
  const puzzle=generateCrossword(module);
  const plan=planCrossword(puzzle,(text,size)=>sizeOf(fonts.body,text,size),b.width,b.height);
  if(!plan)throw Error('Crossword grid and clues cannot fit. Try shorter clues or regenerate.');
  centered(page,fonts.title,'CROSSWORD',b.x,b.y+b.height-27,b.width,MODULE_TITLE_PT);
  const top=b.y+b.height-plan.gridTop;
  for(const {x,y} of crosswordBlackCells(puzzle)){
    page.drawRectangle({x:b.x+plan.gridX+x*plan.cell,
      y:top-(y+1)*plan.cell,width:plan.cell,height:plan.cell,color:INK});
  }
  for(let y=0;y<puzzle.height;y++)for(let x=0;x<puzzle.width;x++){
    if(!puzzle.cells[y][x])continue;
    const cx=b.x+plan.gridX+x*plan.cell,cy=top-(y+1)*plan.cell;
    page.drawRectangle({x:cx,y:cy,width:plan.cell,height:plan.cell,
      borderColor:INK,borderWidth:.65});
    const number=puzzle.numbers[x+','+y];
    if(number)page.drawText(String(number),{x:cx+1.4,y:cy+plan.cell-6.4,
      font:fonts.body,size:5.6,color:INK});
  }
  const cw=b.width/2-12;
  for(const [name,header] of [['ACROSS',plan.acrossHeader],['DOWN',plan.downHeader]] as const){
    centered(page,fonts.title,name,b.x+header.x,b.y+b.height-header.y,cw,17);
  }
  for(const row of [...plan.acrossRows,...plan.downRows]){
    page.drawText(row.text,{x:b.x+row.x,y:b.y+b.height-row.y,
      font:fonts.body,size:plan.clueFontSize,color:INK});
  }
}
function spiral(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'spiral-verse'}>,fonts:ModuleFonts):void{
  centered(page,fonts.title,'SPIRAL VERSE',b.x,b.y+b.height-27,b.width,MODULE_TITLE_PT);
  centered(page,fonts.bodyBold,'Copy the verse on the spiral line.',b.x,b.y+b.height-42,b.width,9);
  let size=10.8,rows:string[]|null=null;
  for(;size>=8;size-=.4){
    rows=balancedLines(module.verse,fonts.bodyBold,size,b.width-16);
    if(rows&&rows.length<=4)break;
  }
  if(!rows||rows.length>4)throw Error('Verse does not fit the reference bank. Shorten it.');
  const verseStep=size*1.27;
  // The last verse baseline sits just 10pt above the lower border;
  // the previous bank reserved an entire EXTRA line below it.
  const bankHeight=36+(rows.length-1)*verseStep;
  const bankTop=b.y+b.height-53,bankBottom=bankTop-bankHeight;
  page.drawRectangle({x:b.x,y:bankBottom,width:b.width,height:bankHeight,
    borderColor:LIGHT,borderWidth:.9});
  centered(page,fonts.bank,module.reference,b.x,bankTop-12,b.width,10.5);
  rows.forEach((text,i)=>centered(page,fonts.bodyBold,text,b.x+6,
    bankTop-26-i*verseStep,b.width-12,size));

  const bottom=b.y+4,spaceHeight=bankBottom-bottom-6;
  const diameter=Math.min(b.width-6,spaceHeight);
  if(diameter<120)throw Error('Verse bank leaves insufficient room for a writing spiral.');
  const cx=b.x+b.width/2,cy=bottom+spaceHeight/2+3;
  // Outer radius .445: 1.08x scaling leaves ~4pt vertical margins.
  const side=diameter*1.08;
  const points=spiralPoints(800,spiralTurns(module.verse)).reverse()
    .map(p=>({x:cx+(p.x-.5)*side,y:cy-(p.y-.5)*side}));
  for(let i=1;i<points.length;i++)
    page.drawLine({start:points[i-1],end:points[i],thickness:1.1,color:INK});

}
function connect(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'connect-verse'|'connect-big-idea'}>,fonts:ModuleFonts):void{
  centered(page,fonts.title,'CONNECT THE VERSE',b.x,b.y+b.height-25,b.width,23);
  centered(page,fonts.bodyBold,'Connect each word to the next in order.',b.x,b.y+b.height-39,b.width,8.8);
  const hasBank=module.type==='connect-big-idea';
  const list=parseConnectionWords(hasBank?module.idea:module.verse);
  let bankBottom=b.y+b.height-49;
  if(hasBank){
    const bank=module.idea.toUpperCase(),rows=wrapped(fonts.bank,bank,9,b.width-16);
    if(!rows||rows.length>2)throw Error('Big Idea bank needs shorter text.');
    const bankHeight=rows.length*12+9;
    bankBottom=b.y+b.height-47-bankHeight;
    page.drawRectangle({x:b.x,y:bankBottom,width:b.width,height:bankHeight,borderColor:LIGHT,borderWidth:.8});
    rows.forEach((row,i)=>centered(page,fonts.bank,row,b.x+4,bankBottom+bankHeight-14-i*12,b.width-8,9));
  }
  const field={x:b.x+3,y:b.y+4,width:b.width-6,height:bankBottom-b.y-12};
  const rows=Math.ceil(list.length/3),cw=field.width/3,rh=field.height/rows;
  if(rh<18)throw Error('There are too many words to scatter in the available space.');
  for(const item of connectPositions(module)){
    const cx=field.x+item.x*field.width,cy=field.y+(1-item.y)*field.height;
    const word=item.word;
    const fontSize=fitted(fonts.puzzle,word,cw-9,13.5,8.5);
    const angle=item.angle*Math.PI/180;
    page.pushOperators(pushGraphicsState(),concatTransformationMatrix(
      Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),cx,cy));
    let x=-sizeOf(fonts.puzzle,word,fontSize)/2;
    for(const [i,char] of Array.from(word).entries()){
      page.drawText(char,{x,y:item.jitter[i]*190,font:fonts.puzzle,size:fontSize,color:INK});
      x+=sizeOf(fonts.puzzle,char,fontSize);
    }
    page.pushOperators(popGraphicsState());
  }
}
export function drawSpecialtyPdf(page:PDFPage,region:Rect,module:SpecialtyModule,fonts:ModuleFonts):void{
  const errors=validateSpecialty(module);
  if(errors.length)throw Error(errors.join(' '));
  const b=inside(region);
  switch(module.type){
    case 'crossword':return crossword(page,b,module,fonts);
    case 'spiral-verse':return spiral(page,b,module,fonts);
    case 'upside-down-verse':return drawReconstructionPdf(page,region,module,fonts);
    case 'connect-verse':
    case 'connect-big-idea':return connect(page,b,module,fonts);
  }
}
