import {rgb,type PDFPage} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import type {ModuleFonts} from './modulePdf.ts';
import {generatePixelPicture,type PixelPicture} from './pixelPicture.ts';
import {planPixelPicture} from './pixelPictureLayout.ts';

type Rect={x:number;y:number;width:number;height:number};
const INK=rgb(.13,.13,.13),GRID=rgb(.48,.48,.48);
export function drawPixelPicturePdf(page:PDFPage,rect:Rect,module:PixelPicture,fonts:ModuleFonts):void{
 const inset=BOOKLET.padding*72;
 const box={x:rect.x+inset,y:rect.y+inset,
  width:rect.width-inset*2,height:rect.height-inset*2};
 const puzzle=generatePixelPicture(module);
 const plan=planPixelPicture(puzzle,{
  body:(s,z)=>fonts.body.widthOfTextAtSize(s,z),
  puzzle:(s,z)=>fonts.puzzle.widthOfTextAtSize(s,z),
 },box.width,box.height);
 if(!plan)throw Error('Pixel Picture instructions and phrase cannot fit in the left Medium half; shorten the phrase.');
 const top=box.y+box.height;
 for(const line of plan.instructions)page.drawText(line.text,{
  x:box.x+line.x,y:top-line.y,font:fonts.body,size:plan.instructionSize,color:INK});
 for(const glyph of plan.phraseGlyphs){
  if(glyph.kind==='blank')page.drawLine({
   start:{x:box.x+glyph.x,y:top-glyph.y-3.5},
   end:{x:box.x+glyph.x+plan.blankWidth,y:top-glyph.y-3.5},
   thickness:1,color:INK,
  });
  else page.drawText(glyph.char,{
   x:box.x+glyph.x,y:top-glyph.y,font:fonts.puzzle,size:plan.phraseSize,color:INK});
 }
 for(const cell of plan.cells){
  page.drawRectangle({x:box.x+cell.rectX,y:top-cell.rectY-plan.cell,
   width:plan.cell,height:plan.cell,borderColor:GRID,borderWidth:.43});
  page.drawText(cell.char,{x:box.x+cell.x,y:top-cell.y,
   font:fonts.puzzle,size:plan.letterSize,color:INK,opacity:.35});
 }
}
