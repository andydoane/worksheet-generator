import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import { type ModuleFonts } from './modulePdf.ts';
import {planMultipleChoice,planOddWords} from './smallParityLayout.ts';
import {planFirstLetters,planCheckboxes} from './smallBalancedLayout.ts';
import {planTrueFalse,TRUE_FALSE_TITLE} from './trueFalsePrintLayout.ts';
import {planWhoAmI,WHO_AM_I_LABEL} from './whoAmIPrintLayout.ts';
import {THUMB_SOURCE_VIEW,THUMB_UP_PATH,THUMB_DOWN_PATH,
 THUMB_CIRCLE_RADIUS,THUMB_CIRCLE_STROKE,THUMB_DOWN_PATH_X_OFFSET} from './thumbArtwork.ts';
import {
  scrambleWord,
  type SmallModule,
} from './smallModules.ts';

type Rect = { x: number; y: number; width: number; height: number };
const INK = rgb(.12, .12, .12);
const GREY = rgb(.38, .38, .38);

function inside(rect: Rect): Rect {
  const m = BOOKLET.padding * 72;
  return { x:rect.x+m, y:rect.y+m, width:rect.width-2*m, height:rect.height-2*m };
}
function measure(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}
function fitSize(font: PDFFont, text: string, maxW: number, preferred: number, minimum: number): number {
  for (let size = preferred; size >= minimum; size -= .5) {
    if (measure(font,text,size) <= maxW) return size;
  }
  throw new Error('Text is too wide for the small area; shorten the longest word.');
}
function centered(page: PDFPage, font: PDFFont, text: string, centerX: number, y: number, size: number): void {
  page.drawText(text, { x:centerX - measure(font,text,size)/2, y, size, font, color:INK });
}
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] | null {
  const words = text.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const rows: string[] = []; let current = '';
  for (const word of words) {
    if (measure(font, word, size) > maxWidth) return null;
    const candidate = current ? current + ' ' + word : word;
    if (current && measure(font, candidate, size) > maxWidth) {rows.push(current);current=word;}
    else current=candidate;
  }
  if(current)rows.push(current);
  return rows;
}
function paragraph(
  page:PDFPage,font:PDFFont,text:string,rect:Rect,
  top:number,preferred:number,minimum:number,maxLines:number,align:'center'|'left'='center',
):number {
  for(let size=preferred;size>=minimum;size-=.5){
    const rows=wrap(font,text,size,rect.width);
    if (!rows || rows.length>maxLines)continue;
    const step=size*1.28;
    rows.forEach((line,i)=>{
      const y=top-(i+1)*step;
      const x=align==='center'?rect.x+(rect.width-measure(font,line,size))/2:rect.x;
      page.drawText(line,{x,y,size,font,color:INK});
    });
    return top-rows.length*step;
  }
  throw new Error('Text does not fit this small module. Shorten it and try again.');
}
function square(page:PDFPage,x:number,y:number,size=10):void {
  page.drawRectangle({x,y,width:size,height:size,borderColor:INK,borderWidth:.9});
}
function label(page:PDFPage,font:PDFFont,text:string,box:Rect,y:number,preferred:number,minimum:number):void {
  const size=fitSize(font,text,box.width,preferred,minimum);
  centered(page,font,text,box.x+box.width/2,y,size);
}

function drawMultipleChoice(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'multiple-choice'}>,fonts:ModuleFonts):void {
  const plan=planMultipleChoice(module,(text,size)=>measure(fonts.title,text,size),
    fonts.titleInkCenter??((_text,size)=>size*.35),box.width,box.height);
  if(!plan)throw Error('Multiple Choice question and answers do not fit the small area.');
  const top=box.y+box.height;
  for(const line of plan.questionLines)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.questionSize);
  for(const row of plan.rows){
    square(page,box.x+row.squareX,top-row.squareY-row.squareSize,row.squareSize);
    for(const line of row.lines)
      page.drawText(line.text,{x:box.x+line.x,y:top-line.y,
        font:fonts.title,size:row.fontSize,color:INK});
  }
}
/** Exact uploaded artwork, native vector curves rather than PDF emoji.
 * PDF drawSvgPath flips the SVG vertical axis automatically; down SVG's
 * nested Inkscape translations combine to -28.222776 along x.
 */
function drawTrueFalse(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'true-false'}>,fonts:ModuleFonts):void {
  const plan=planTrueFalse(module.statement,(text,size)=>measure(fonts.title,text,size),
    box.width,box.height);
  if(!plan)throw new Error('True or False statement cannot fit in the Small space.');
  const top=box.y+box.height,artInk=rgb(0,0,0);
  centered(page,fonts.title,TRUE_FALSE_TITLE,box.x+box.width/2,
    top-plan.titleY,plan.titleSize);
  for(const line of plan.statementLines)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.statementSize);
  plan.thumbs.forEach((thumb,i)=>{
    const scale=thumb.size/THUMB_SOURCE_VIEW;
    page.drawSvgPath(i===0?THUMB_UP_PATH:THUMB_DOWN_PATH,{
      x:box.x+thumb.x-(i===0?0:THUMB_DOWN_PATH_X_OFFSET*scale),
      y:top-thumb.y,scale,color:artInk,
    });
    page.drawEllipse({
      x:box.x+thumb.x+thumb.size/2,
      y:top-thumb.y-thumb.size/2,
      xScale:THUMB_CIRCLE_RADIUS*scale,
      yScale:THUMB_CIRCLE_RADIUS*scale,
      borderWidth:THUMB_CIRCLE_STROKE*scale,borderColor:artInk,
    });
    centered(page,fonts.bodyBold,thumb.label,box.x+thumb.labelX,
      top-thumb.labelY,10);
  });
}
function drawFirstLetters(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'first-letters'}>,fonts:ModuleFonts):void {
  const plan=planFirstLetters(module,
    (text,size)=>measure(fonts.title,text,size),
    (text,size)=>measure(fonts.puzzle,text,size),box.width,box.height);
  if(!plan)throw Error('First Letter Challenge cannot fit the verse and instruction.');
  const top=box.y+box.height;
  for(const line of plan.instructionLines)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.instructionSize);
  for(const line of plan.letterLines)
    centered(page,fonts.puzzle,line.text,box.x+line.x,top-line.y,plan.letterSize);
}
function drawOddWords(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'odd-words'}>,fonts:ModuleFonts):void {
  const plan=planOddWords(module,
    (text,size)=>measure(fonts.title,text,size),
    (text,size)=>measure(fonts.puzzle,text,size),box.width,box.height);
  if(!plan)throw Error('What Doesn’t Belong words do not fit the small area.');
  const top=box.y+box.height;
  for(const line of plan.instructions)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.instructionSize);
  for(const line of [...plan.left,...plan.right])
    page.drawText(line.text,{x:box.x+line.x,y:top-line.y,
      font:fonts.puzzle,size:plan.fontSize,color:INK});
}
function drawUnscramble(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'unscramble-words'}>,fonts:ModuleFonts):void {
  label(page,fonts.title,'UNSCRAMBLE THE WORDS',box,box.y+box.height-25,22,14);
  [module.first,module.second].forEach((word,i)=>{
    const scrambled=scrambleWord(word,module.seed+i*101);
    const chars=Array.from(scrambled);
    const cellWidth=Math.min(17,box.width/chars.length);
    const size=Math.min(15,fitSize(fonts.puzzle,'W',cellWidth-2,15,10));
    const startX=box.x+(box.width-chars.length*cellWidth)/2;
    const baseY=box.y+box.height-88-i*65;
    chars.forEach((c,index)=>{
      const x=startX+index*cellWidth;
      page.drawLine({start:{x:x+1,y:baseY+21},end:{x:x+cellWidth-3,y:baseY+21},thickness:1,color:INK});
      centered(page,fonts.puzzle,c,x+cellWidth/2,baseY,size);
    });
  });
}
function drawCheckboxes(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'checkboxes'}>,fonts:ModuleFonts):void {
  const plan=planCheckboxes(module,
    (text,size)=>measure(fonts.title,text,size),
    (text,size)=>measure(fonts.puzzle,text,size),box.width,box.height);
  if(!plan)throw Error('Checkboxes entries do not fit the small area.');
  const top=box.y+box.height;
  for(const line of plan.instructionLines)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.instructionSize);
  for(const row of plan.rows){
    square(page,box.x+row.squareX,top-row.squareY-row.squareSize,row.squareSize);
    page.drawText(row.text,{
      x:box.x+row.x,y:top-row.y,size:plan.wordSize,font:fonts.puzzle,color:INK,
    });
  }
}
function drawWho(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'who-am-i'}>,fonts:ModuleFonts):void {
  const plan=planWhoAmI(module,(text,size)=>measure(fonts.title,text,size),box.width,box.height);
  if(!plan)throw Error('Who Am I clue or answer cannot fit in the Small activity.');
  const top=box.y+box.height;
  for(const line of plan.clueLines)
    centered(page,fonts.title,line.text,box.x+line.x,top-line.y,plan.clueSize);
  centered(page,fonts.title,WHO_AM_I_LABEL,box.x+box.width/2,top-plan.questionY,plan.questionSize);
  for(const mark of plan.answerMarks){
    if(mark.kind==='hyphen')
      centered(page,fonts.body,'-',box.x+(mark.x+mark.endX)/2,top-mark.y,13);
    else page.drawLine({start:{x:box.x+mark.x,y:top-mark.y},
      end:{x:box.x+mark.endX,y:top-mark.y},thickness:1,color:INK});
  }
}

export function drawSmallModulePdf(page: PDFPage, region: Rect, module: SmallModule, fonts:ModuleFonts):void {
  const box=inside(region);
  switch(module.type){
    case 'multiple-choice':return drawMultipleChoice(page,box,module,fonts);
    case 'true-false':return drawTrueFalse(page,box,module,fonts);
    case 'first-letters':return drawFirstLetters(page,box,module,fonts);
    case 'odd-words':return drawOddWords(page,box,module,fonts);
    case 'unscramble-words':return drawUnscramble(page,box,module,fonts);
    case 'checkboxes':return drawCheckboxes(page,box,module,fonts);
    case 'who-am-i':return drawWho(page,box,module,fonts);
  }
}
