import {rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram,type Cryptogram} from './cryptograms.ts';
import type {ModuleFonts} from './modulePdf.ts';

type Rect={x:number;y:number;width:number;height:number};
const INK=rgb(.14,.14,.14),GREY=rgb(.43,.43,.43);
function interior(rect:Rect):Rect{
  const p=BOOKLET.padding*72;
  return {x:rect.x+p,y:rect.y+p,width:rect.width-2*p,height:rect.height-2*p};
}
function width(font:PDFFont,text:string,size:number):number{
  return font.widthOfTextAtSize(text,size);
}
function centered(page:PDFPage,font:PDFFont,text:string,x:number,y:number,w:number,size:number):void{
  page.drawText(text,{x:x+(w-width(font,text,size))/2,y,font,size,color:INK});
}
/** All symbols are direct vector lines/dots; no missing-glyph font fallback. */
export function drawCipherGlyph(page:PDFPage,id:number,x:number,y:number,size:number):void{
  const glyph=cipherSymbol(id);
  for(const p of glyph.paths) {
    page.drawSvgPath(p.d,{
      x,y,scale:size/16,
      ...(p.filled ? {color:INK} : {borderColor:INK,borderWidth:1.45}),
    });
  }
}
type Cell={char:string;symbol?:number};
function splitTokens(text:string,mapping:Record<string,number>):Cell[][]{
  // Keep words together; spaces are handled separately by the line wrapper.
  return text.trim().split(/\s+/u).map(word=>Array.from(word).map(char=>
    /^[A-Za-z]$/u.test(char)?{char,symbol:mapping[char.toUpperCase()]}:{char}));
}
function characterWidth(c:Cell,body:PDFFont):number{
  return c.symbol===undefined?Math.max(7,width(body,c.char,10)+2):13;
}
/**
 * Pre-compute every cipher row before painting, so long user inputs fail
 * with an actionable fit error instead of being printed outside the frame.
 */
function layoutWords(words:Cell[][],font:PDFFont,availableWidth:number):Cell[][]{
  const lines:Cell[][]=[];
  let current:Cell[]=[];
  let used=0;
  for(const word of words){
    const wordWidth=word.reduce((sum,cell)=>sum+characterWidth(cell,font),0);
    if(wordWidth>availableWidth)throw Error('A cryptogram word is too long to fit; shorten it.');
    if(current.length&&used+7+wordWidth>availableWidth){
      lines.push(current);current=[];used=0;
    }
    if(current.length){current.push({char:' '});used+=7;}
    current.push(...word);used+=wordWidth;
  }
  if(current.length)lines.push(current);
  return lines;
}
export function drawCryptogramPdf(page:PDFPage,rect:Rect,module:Cryptogram,fonts:ModuleFonts):void{
  const box=interior(rect),data=generateCryptogram(module);
  const top=box.y+box.height;
  centered(page,fonts.title,'SOLVE THE CODE!',box.x,top-25,box.width,25);
  const keyCols=module.type==='verse-cryptogram'?20:18;
  const keyRows=Math.ceil(data.key.length/keyCols);
  const keyTop=top-37,keyHeight=28;
  for(let i=0;i<data.key.length;i++){
    const row=Math.floor(i/keyCols), col=i%keyCols;
    const colsInRow=Math.min(keyCols,data.key.length-row*keyCols);
    const cellWidth=box.width/colsInRow;
    const cx=box.x+col*cellWidth,cy=keyTop-(row+1)*keyHeight;
    const symbolSize=Math.min(13,cellWidth-6);
    page.drawRectangle({x:cx,y:cy,width:cellWidth,height:keyHeight,borderWidth:.65,borderColor:GREY});
    page.drawLine({start:{x:cx,y:cy+12},end:{x:cx+cellWidth,y:cy+12},thickness:.55,color:GREY});
    drawCipherGlyph(page,data.key[i].symbol,cx+(cellWidth-symbolSize)/2,cy+13.5,symbolSize);
    centered(page,fonts.puzzle,data.key[i].letter,cx,cy+2,cellWidth,9.2);
  }
  const bodyTop=keyTop-keyRows*keyHeight-10;
  const footer=module.type==='verse-cryptogram'?23:4;
  const lines=layoutWords(splitTokens(data.text,data.mapping),fonts.body,box.width-4);
  const step=25;
  const firstY=bodyTop-24;
  if(firstY-(lines.length-1)*step<box.y+footer+3)
    throw Error('The cryptogram text does not fit this module. Shorten the text.');
  lines.forEach((line,row)=>{
    let x=box.x+2;
    const y=firstY-row*step;
    for(const cell of line){
      const cw=characterWidth(cell,fonts.body);
      if(cell.symbol!==undefined){
        page.drawLine({start:{x:x+.8,y:y+16},end:{x:x+cw-1,y:y+16},thickness:.8,color:INK});
        drawCipherGlyph(page,cell.symbol,x+(cw-10)/2,y,10);
      }else if(cell.char!==' '){
        page.drawText(cell.char,{x,y:y+2,font:fonts.body,size:10,color:INK});
      }
      x+=cw;
    }
  });
  if(data.reference){
    if(width(fonts.body,data.reference,10)>box.width)
      throw Error('Verse reference is too long to fit.');
    centered(page,fonts.body,data.reference,box.x,box.y+5,box.width,10);
  }
}
