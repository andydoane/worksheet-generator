import {rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import {MODULE_TITLE_PT} from './pdfLayout.ts';
import {cipherSymbol} from './cipherSymbols.ts';
import {generateCryptogram,type Cryptogram,type BigIdeaCryptogram} from './cryptograms.ts';
import {planBigIdeaCryptogram} from './bigIdeaCryptogramLayout.ts';
import {planVerseCryptogram,VERSE_CIPHER_WORD_GAP} from './verseCryptogramLayout.ts';
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
export const CIPHER_WORD_GAP=VERSE_CIPHER_WORD_GAP;
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
 if(!plan)throw Error('Solve the Code needs too many lines. Use shorter words.');
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
   page.drawLine({start:{x:x+.8,y:line},end:{x:x+.8+plan.answerLineWidth,y:line},
    thickness:.8,color:INK});
   drawCipherGlyph(page,item.symbol,x+(plan.cellWidth-plan.symbolSize)/2,
    line-4-plan.symbolSize,plan.symbolSize);
  }else page.drawText(item.char,{
   x,y:line-1,font:fonts.body,size:10,color:INK,
  });
 }
}
export function drawCryptogramPdf(page:PDFPage,rect:Rect,module:Cryptogram,fonts:ModuleFonts):void{
 if(module.type==='big-idea-cryptogram')
  return drawBigIdeaCryptogramPdf(page,rect,module,fonts);
 const box=interior(rect),data=generateCryptogram(module);
 const plan=planVerseCryptogram(
  data,(text,size)=>width(fonts.body,text,size),box.width,box.height);
 if(!plan)throw Error(
  'The cryptogram needs more handwriting room. Shorten the verse or choose fewer words.');
 const top=box.y+box.height;
 centered(page,fonts.title,'SOLVE THE CODE!',box.x,top-plan.titleY,box.width,MODULE_TITLE_PT);
 for(const item of plan.keyCells){
  const x=box.x+item.x,y=top-item.y-plan.keyHeight;
  page.drawRectangle({x,y,width:item.width,height:plan.keyHeight,
   borderWidth:.65,borderColor:GREY});
  page.drawLine({start:{x,y:y+12},end:{x:x+item.width,y:y+12},
   thickness:.55,color:GREY});
  const symbolTop=item.y+(17-plan.keySymbolSize)/2;
  drawCipherGlyph(page,item.symbol,x+(item.width-plan.keySymbolSize)/2,
   top-symbolTop-plan.keySymbolSize,plan.keySymbolSize);
  centered(page,fonts.puzzle,item.letter,x,top-(item.y+plan.keyHeight-4),
   item.width,plan.keyLetterSize);
 }
 if(data.reference)centered(page,fonts.bodyBold,data.reference,
  box.x,top-plan.referenceY,box.width,plan.referenceSize);
 for(const cell of plan.bodyCells){
  const x=box.x+cell.x,answerY=top-cell.lineY;
  if(cell.symbol===undefined){
   page.drawText(cell.char,{x,y:answerY,font:fonts.body,size:10,color:INK});
  }else{
   page.drawLine({start:{x:x+.8,y:answerY},
    end:{x:x+.8+plan.answerLineWidth,y:answerY},
    thickness:.8,color:INK});
   drawCipherGlyph(page,cell.symbol,x+(cell.width-plan.symbolSize)/2,
    top-cell.lineY-plan.symbolTopOffset-plan.symbolSize,plan.symbolSize);
  }
 }
}
