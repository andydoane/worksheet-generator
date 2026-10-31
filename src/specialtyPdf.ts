import {
  rgb, degrees, type PDFFont, type PDFPage, pushGraphicsState,
  popGraphicsState, concatTransformationMatrix,
} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {balancedLines} from './storyVersePdf.ts';
import type {ModuleFonts} from './modulePdf.ts';
import {
  generateCrossword,parseConnectionWords,connectPositions,spiralPoints,spiralTurns,spiralFirstWord,validateSpecialty,
  type SpecialtyModule,type CrosswordPlacement,
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
function crossword(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'crossword'}>,fonts:ModuleFonts):void{
  const puzzle=generateCrossword(module);
  centered(page,fonts.title,'CROSSWORD',b.x,b.y+b.height-27,b.width,MODULE_TITLE_PT);
  const top=b.y+b.height-40;
  const colWidth=b.width/2-12;
  const lists=[puzzle.across,puzzle.down];
  const fit=(clueHeight:number)=>{
    for(let size=9.2;size>=6.6;size-=.4){
      const step=size*1.25;
      const rows=lists.map(list=>list.map(p=>wrapped(fonts.body,p.number+'. '+p.clue,size,colWidth-4)));
      if(rows.some(group=>group.some(lines=>!lines)))continue;
      if(rows.every(group=>group.reduce((sum,lines)=>sum+(lines!.length*step+4),0)<=clueHeight)){
        return {size,step,rows:rows as string[][][]};
      }
    }
    return null;
  };
  const maxCell=Math.min(25,(b.width-12)/puzzle.width);
  let chosen:{cell:number;format:NonNullable<ReturnType<typeof fit>>}|null=null;
  for(let cell=maxCell;cell>=9;cell-=.5){
    const clueTop=top-puzzle.height*cell-11;
    const clueSpace=clueTop-(b.y+3)-28;
    if(clueSpace<=25)continue;
    const format=fit(clueSpace);
    if(format){chosen={cell,format};break;}
  }
  if(!chosen)throw Error('Crossword grid and clues cannot fit. Try shorter clues or regenerate.');
  const {cell,format}=chosen;
  const gw=puzzle.width*cell,gh=puzzle.height*cell;
  const x0=b.x+(b.width-gw)/2,y0=top-gh;
  for(let y=0;y<puzzle.height;y++)for(let x=0;x<puzzle.width;x++){
    if(!puzzle.cells[y][x])continue;
    const cx=x0+x*cell,cy=top-(y+1)*cell;
    page.drawRectangle({x:cx,y:cy,width:cell,height:cell,borderColor:INK,borderWidth:.65});
    const number=puzzle.numbers[x+','+y];
    if(number)page.drawText(String(number),{x:cx+1.4,y:cy+cell-6.4,font:fonts.body,size:5.6,color:INK});
  }
  const clueTop=y0-11;
  for(const [col,name] of ['ACROSS','DOWN'].entries()){
    const left=b.x+col*(b.width/2+3);
    centered(page,fonts.title,name,left,clueTop-14,colWidth,17);
    let cursor=clueTop-32;
    for(const lines of format.rows[col]){
      for(const line of lines){
        page.drawText(line,{x:left+2,y:cursor,size:format.size,font:fonts.body,color:INK});
        cursor-=format.step;
      }
      cursor-=4;
    }
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
  const bankHeight=rows.length*size*1.27+35;
  const bankTop=b.y+b.height-53,bankBottom=bankTop-bankHeight;
  page.drawRectangle({x:b.x,y:bankBottom,width:b.width,height:bankHeight,borderColor:LIGHT,borderWidth:.9});
  centered(page,fonts.bodyBold,module.reference,b.x,bankTop-15,b.width,10.5);
  rows.forEach((text,i)=>centered(page,fonts.bodyBold,text,b.x+6,
    bankTop-31-i*size*1.27,b.width-12,size));
  const bottom=b.y+2;
  const spaceHeight=bankBottom-bottom-10;
  const diameter=Math.min(b.width-8,spaceHeight);
  if(diameter<120)throw Error('Verse bank leaves insufficient room for a writing spiral.');
  const cx=b.x+b.width/2,cy=bottom+spaceHeight/2+5;
  const side=diameter*.98;
  // The writing path STARTS on the outside, spiraling inward.
  const points=spiralPoints(800,spiralTurns(module.verse)).reverse()
    .map(p=>({x:cx+(p.x-.5)*side,y:cy-(p.y-.5)*side}));
  for(let i=1;i<points.length;i++){
    page.drawLine({start:points[i-1],end:points[i],thickness:1.1,color:INK});
  }
  const first=spiralFirstWord(module.verse);
  if(first){
    const fontSize=10.2;
    let distance=7,segment=1;
    // Draw first word along the outside arc, not in a separate disconnected label.
    for(const character of first){
      const advance=sizeOf(fonts.bodyBold,character,fontSize);
      const at=distance+advance/2;
      let traversed=0,point=points[0],angle=0;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],z=points[i],len=Math.hypot(z.x-a.x,z.y-a.y);
        if(traversed+len>=at){
          const t=(at-traversed)/len;
          point={x:a.x+(z.x-a.x)*t,y:a.y+(z.y-a.y)*t};
          angle=Math.atan2(z.y-a.y,z.x-a.x);
          segment=i;
          break;
        }
        traversed+=len;
      }
      const nx=-Math.sin(angle),ny=Math.cos(angle);
      page.drawText(character,{x:point.x+nx*5-advance/2,y:point.y+ny*5,
        font:fonts.bodyBold,size:fontSize,rotate:degrees(angle*180/Math.PI),color:INK});
      distance+=advance;
    }
    void segment;
  }
}
function upsideDown(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'upside-down-verse'}>,fonts:ModuleFonts):void{
  centered(page,fonts.title,'UPSIDE DOWN VERSE',b.x,b.y+b.height-25,b.width,MODULE_TITLE_PT);
  centered(page,fonts.body,module.reference,b.x,b.y+b.height-42,b.width,10.5);
  const s=module.verse.trim().toUpperCase();
  const tokens=s.split(/(\s+)/u);
  const cell=12.8,maxCols=Math.floor((b.width-6)/cell);
  if(maxCols<12)throw Error('The Upside Down Verse area is too narrow.');
  const lines:string[]=[];let line='';
  for(const token of tokens){
    if(/^\s+$/u.test(token)){if(line&&!line.endsWith(' '))line+=' ';continue;}
    if(token.length>maxCols)throw Error('A verse word is too long for this section.');
    if(line.trim().length+token.length>maxCols){lines.push(line.trimEnd());line=token;}
    else line+=token;
  }
  if(line.trim())lines.push(line.trimEnd());
  if(lines.length>4)throw Error('Verse is too long for the upside-down writing rows.');
  const firstY=b.y+b.height-77,step=28;
  if(firstY-(lines.length-1)*step<b.y+18)throw Error('Upside-down letters need more vertical room.');
  for(const [row,text] of lines.entries()){
    const lineW=Array.from(text).length*cell,x0=b.x+(b.width-lineW)/2,y=firstY-row*step;
    for(const [i,ch] of Array.from(text).entries()){
      if(ch===' ')continue;
      const x=x0+i*cell;
      if(/^[A-Z]$/u.test(ch)){
        page.drawLine({start:{x:x+1,y:y+18},end:{x:x+cell-1,y:y+18},color:INK,thickness:.85});
        // Reflect each glyph across its horizontal axis, without reversing order.
        page.pushOperators(pushGraphicsState(),concatTransformationMatrix(1,0,0,-1,0,2*y+12));
        centered(page,fonts.puzzle,ch,x,y,cell,13);
        page.pushOperators(popGraphicsState());
      }else centered(page,fonts.puzzle,ch,x,y,cell,11);
    }
  }
}
function connect(page:PDFPage,b:Rect,module:Extract<SpecialtyModule,{type:'connect-verse'|'connect-big-idea'}>,fonts:ModuleFonts):void{
  centered(page,fonts.title,'CONNECT THE VERSE',b.x,b.y+b.height-25,b.width,23);
  centered(page,fonts.body,'Connect each word to the next in order.',b.x,b.y+b.height-39,b.width,8.8);
  const hasBank=module.type==='connect-big-idea';
  const list=parseConnectionWords(hasBank?module.idea:module.verse);
  let bankBottom=b.y+b.height-49;
  if(hasBank){
    const bank=module.idea.toUpperCase(),rows=wrapped(fonts.body,bank,9,b.width-16);
    if(!rows||rows.length>2)throw Error('Big Idea bank needs shorter text.');
    const bankHeight=rows.length*12+9;
    bankBottom=b.y+b.height-47-bankHeight;
    page.drawRectangle({x:b.x,y:bankBottom,width:b.width,height:bankHeight,borderColor:LIGHT,borderWidth:.8});
    rows.forEach((row,i)=>centered(page,fonts.body,row,b.x+4,bankBottom+bankHeight-14-i*12,b.width-8,9));
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
    case 'upside-down-verse':return upsideDown(page,b,module,fonts);
    case 'connect-verse':
    case 'connect-big-idea':return connect(page,b,module,fonts);
  }
}
