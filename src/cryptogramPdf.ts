import {rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram,type Cryptogram,type BigIdeaCryptogram} from './cryptograms.ts';
import {planBigIdeaCryptogram,BIG_IDEA_CELL_WIDTH,
 BIG_IDEA_ANSWER_LINE_WIDTH,BIG_IDEA_SYMBOL_SIZE} from './bigIdeaCryptogramLayout.ts';
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
      x,y:y+size,scale:size/16,
      ...(p.filled ? {color:INK} : {borderColor:INK,borderWidth:1.45}),
    });
  }
}
export const CIPHER_WORD_GAP=16; // roughly two ordinary word spaces on paper
type Cell={char:string;symbol?:number};
function splitTokens(text:string,mapping:Record<string,number>):Cell[][]{
  // Keep words together; spaces are handled separately by the line wrapper.
  return text.trim().split(/\s+/u).map(word=>Array.from(word).map(char=>
    /^[A-Za-z]$/u.test(char)?{char,symbol:mapping[char.toUpperCase()]}:{char}));
}
function characterWidth(c:Cell,body:PDFFont):number{
  if(c.char===' ')return CIPHER_WORD_GAP;
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
    if(current.length&&used+CIPHER_WORD_GAP+wordWidth>availableWidth){
      lines.push(current);current=[];used=0;
    }
    if(current.length){current.push({char:' '});used+=CIPHER_WORD_GAP;}
    current.push(...word);used+=wordWidth;
  }
  if(current.length)lines.push(current);
  return lines;
}
/** Child-friendly handwriting spacing, with generous room ABOVE each line.
 * Both content and cipher key are centered within the same print region.
 * Returns null only when the permitted text cannot be laid out legibly.
 */
export function cryptogramBodyGeometry(rowCount:number,top:number,bottom:number):
  {firstY:number;step:number;totalHeight:number}|null{
  if(rowCount<1||!Number.isInteger(rowCount)||top<=bottom)return null;
  const available=top-bottom;
  const minGap=28,inkHeight=21;
  if(inkHeight+(rowCount-1)*minGap>available)return null;
  const step=rowCount===1?0:Math.min(40,(available-inkHeight)/(rowCount-1));
  const totalHeight=inkHeight+(rowCount-1)*step;
  const lowestY=bottom+(available-totalHeight)/2+1;
  return {firstY:lowestY+(rowCount-1)*step,step,totalHeight};
}
/** Medium Big Idea only: shared physical row and key coordinates with SVG.
 * Keep the Large Verse Cryptogram's existing PDF renderer untouched.
 */
function drawBigIdeaCryptogramPdf(page:PDFPage,rect:Rect,
 module:BigIdeaCryptogram,fonts:ModuleFonts):void{
 const box=interior(rect),data=generateCryptogram(module);
 const plan=planBigIdeaCryptogram(data,(text,size)=>width(fonts.body,text,size),box.width,box.height);
 if(!plan)throw Error('The Big Idea cryptogram needs too many lines. Use shorter words.');
 const top=box.y+box.height;
 centered(page,fonts.title,'SOLVE THE CODE!',box.x,top-plan.titleY,box.width,MODULE_TITLE_PT);
 for(const item of plan.keyCells){
  const x=box.x+item.x;
  const bottom=top-(item.y+plan.keyHeight);
  page.drawRectangle({x,y:bottom,width:item.width,height:plan.keyHeight,
   borderWidth:.65,borderColor:GREY});
  page.drawLine({start:{x,y:top-(item.y+13)},
    end:{x:x+item.width,y:top-(item.y+13)},thickness:.55,color:GREY});
  const symbolTop=item.y+(13-plan.keySymbolSize)/2;
  drawCipherGlyph(page,item.symbol,x+(item.width-plan.keySymbolSize)/2,
   top-symbolTop-plan.keySymbolSize,plan.keySymbolSize);
  centered(page,fonts.puzzle,item.letter,x,top-(item.y+20),item.width,plan.keyLetterSize);
 }
 for(const item of plan.bodyCells){
  const x=box.x+item.x,line=top-item.lineY;
  if(item.symbol!==undefined){
   page.drawLine({start:{x:x+.8,y:line},end:{x:x+.8+BIG_IDEA_ANSWER_LINE_WIDTH,y:line},
    thickness:.8,color:INK});
   drawCipherGlyph(page,item.symbol,x+(BIG_IDEA_CELL_WIDTH-BIG_IDEA_SYMBOL_SIZE)/2,
    line-4-BIG_IDEA_SYMBOL_SIZE,BIG_IDEA_SYMBOL_SIZE);
  }else page.drawText(item.char,{
   x,y:line-1,font:fonts.body,size:10,color:INK,
  });
 }
}
export function drawCryptogramPdf(page:PDFPage,rect:Rect,module:Cryptogram,fonts:ModuleFonts):void{
  if(module.type==='big-idea-cryptogram')
    return drawBigIdeaCryptogramPdf(page,rect,module,fonts);
  const box=interior(rect),data=generateCryptogram(module);
  const top=box.y+box.height;
  centered(page,fonts.title,'SOLVE THE CODE!',box.x,top-25,box.width,MODULE_TITLE_PT);
  const keyCols=module.type==='verse-cryptogram'?20:18;
  const keyRows=Math.ceil(data.key.length/keyCols),keyHeight=29;
  const keyTop=top-38;
  for(let i=0;i<data.key.length;i++){
    const row=Math.floor(i/keyCols),col=i%keyCols;
    const colsInRow=Math.min(keyCols,data.key.length-row*keyCols);
    const cellWidth=box.width/colsInRow;
    const cx=box.x+col*cellWidth,cy=keyTop-(row+1)*keyHeight;
    const symbolSize=Math.min(13,cellWidth-5);
    page.drawRectangle({x:cx,y:cy,width:cellWidth,height:keyHeight,
      borderWidth:.65,borderColor:GREY});
    page.drawLine({start:{x:cx,y:cy+12},end:{x:cx+cellWidth,y:cy+12},
      thickness:.55,color:GREY});
    // The symbol lives inside the top 17pt. The Zilla label is centered
    // inside the bottom 12pt, rather than sitting on an arbitrary baseline.
    const symbolBottom=cy+12+(keyHeight-12-symbolSize)/2;
    drawCipherGlyph(page,data.key[i].symbol,
      cx+(cellWidth-symbolSize)/2,symbolBottom,symbolSize);
    const letterSize=9.2;
    centered(page,fonts.puzzle,data.key[i].letter,cx,
      cy+(12-letterSize)/2+2,cellWidth,letterSize);
  }
  const keyBottom=keyTop-keyRows*keyHeight;
  if(data.reference){
    if(width(fonts.bodyBold,data.reference,10)>box.width)
      throw Error('Verse reference is too long to fit.');
    // Reference follows the key; it never competes with handwriting space.
    centered(page,fonts.bodyBold,data.reference,box.x,keyBottom-17,box.width,10);
  }
  const bodyTop=keyBottom-(data.reference?30:10);
  const bodyBottom=box.y+6;
  const lines=layoutWords(splitTokens(data.text,data.mapping),fonts.body,box.width-8);
  const geometry=cryptogramBodyGeometry(lines.length,bodyTop,bodyBottom);
  if(!geometry)throw Error(
    'The cryptogram needs more handwriting room. Shorten the verse or choose fewer words.');
  lines.forEach((line,row)=>{
    const lineWidth=line.reduce((sum,cell)=>sum+characterWidth(cell,fonts.body),0);
    let x=box.x+(box.width-lineWidth)/2;
    const y=geometry.firstY-row*geometry.step;
    for(const cell of line){
      const cw=characterWidth(cell,fonts.body);
      if(cell.symbol!==undefined){
        // Leave a full answer-height zone above the symbols. The next
        // encoded row begins no closer than 28pt below the previous one.
        page.drawLine({start:{x:x+.8,y:y+18},end:{x:x+cw-1,y:y+18},
          thickness:.8,color:INK});
        drawCipherGlyph(page,cell.symbol,x+(cw-10)/2,y,10);
      }else if(cell.char!==' '){
        page.drawText(cell.char,{x,y:y+16,font:fonts.body,size:10,color:INK});
      }
      x+=cw;
    }
  });
}
