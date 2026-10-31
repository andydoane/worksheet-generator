import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import { type ModuleFonts } from './modulePdf.ts';
import {planMultipleChoice,planOddWords} from './smallParityLayout.ts';
import {planTrueFalse,TRUE_FALSE_TITLE} from './trueFalsePrintLayout.ts';
import {THUMB_SOURCE_VIEW,THUMB_UP_PATH,THUMB_DOWN_PATH,
 THUMB_CIRCLE_RADIUS,THUMB_CIRCLE_STROKE,THUMB_DOWN_PATH_X_OFFSET} from './thumbArtwork.ts';
import {
  answerCharacters, scrambleWord, shuffledChoices, shuffledWordList, verseInitials,
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

/** Outline-only thumbs: vector geometry avoids platform-dependent emoji. */
function thumb(page:PDFPage,cx:number,cy:number,up:boolean):void {
  page.drawEllipse({x:cx,y:cy,xScale:27,yScale:27,borderColor:GREY,borderWidth:.8});
  const shape:[[number,number],...[number,number][]]=[
    [4,12],[10,12],[10,7],[16,1],[19,1],[20,4],[18,10],
    [26,10],[28,13],[25,25],[22,28],[11,28],[10,25],[4,25],
  ];
  function point([x,y]:[number,number]) {
    return {x:cx+(x-16)*1.15,y:cy+(up?(16-y):(y-16))*1.15};
  }
  for(let i=0;i<shape.length;i++){
    page.drawLine({start:point(shape[i]),end:point(shape[(i+1)%shape.length]),thickness:1.55,color:INK});
  }
  page.drawLine({start:point([10,12]),end:point([10,25]),thickness:1.3,color:INK});
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
function drawTrueFalse(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'true-false'}>,fonts:ModuleFonts):void {
  label(page,fonts.title,'TRUE OR FALSE?',box,box.y+box.height-25,24,17);
  paragraph(page,fonts.title,module.statement,box,box.y+box.height-42,18,12,4);
  const cy=box.y+43;
  thumb(page,box.x+box.width*.29,cy,true);
  thumb(page,box.x+box.width*.71,cy,false);
  centered(page,fonts.body,'TRUE',box.x+box.width*.29,box.y+5,10);
  centered(page,fonts.body,'FALSE',box.x+box.width*.71,box.y+5,10);
}
function drawFirstLetters(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'first-letters'}>,fonts:ModuleFonts):void {
  paragraph(page,fonts.title,'Try to say the verse using only the first letters.',box,box.y+box.height-3,15,11,3);
  label(page,fonts.puzzle,module.reference.trim().toUpperCase(),box,box.y+box.height-69,13,8.5);
  const initials=verseInitials(module.verse);
  const chunks=initials.match(/.{1,15}/g)??[];
  if(chunks.length>5)throw Error('The verse has too many initials to fit; shorten the verse.');
  const fontSize=Math.min(13,...chunks.map(text=>fitSize(fonts.puzzle,text,box.width,13,9)));
  chunks.forEach((text,index)=>centered(page,fonts.puzzle,text,box.x+box.width/2,box.y+box.height-91-index*19,fontSize));
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
  paragraph(page,fonts.title,'Check off everything that is part of the story.',box,box.y+box.height-3,15,11,3);
  const words=shuffledWordList(module);
  const available=box.width/2-17;
  const size=Math.min(12,...words.map(item=>fitSize(fonts.puzzle,item.text.toUpperCase(),available,12,6.5)));
  words.forEach((item,i)=>{
    const x=box.x+(i%2)*box.width/2+2;
    const y=box.y+box.height-77-Math.floor(i/2)*22;
    square(page,x,y-2,9);
    page.drawText(item.text.toUpperCase(),{x:x+14,y,size,font:fonts.puzzle,color:INK});
  });
}
function drawWho(page:PDFPage,box:Rect,module:Extract<SmallModule,{type:'who-am-i'}>,fonts:ModuleFonts):void {
  paragraph(page,fonts.title,module.clue,box,box.y+box.height-3,19,11,6);
  label(page,fonts.title,'WHO AM I?',box,box.y+70,24,16);
  const chars=answerCharacters(module.answer);
  const cellWidth=Math.min(15,box.width/chars.length);
  const startX=box.x+(box.width-cellWidth*chars.length)/2;
  chars.forEach((char,i)=>{
    const x=startX+i*cellWidth;
    if(char===' ')return;
    if(char==='-')centered(page,fonts.body,'-',x+cellWidth/2,box.y+27,13);
    else page.drawLine({start:{x:x+1,y:box.y+28},end:{x:x+cellWidth-2,y:box.y+28},thickness:1,color:INK});
  });
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
