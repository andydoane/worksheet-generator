import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import type { ModuleFonts } from './modulePdf.ts';
import {
  boxGrid, linesFromInput, mistakesTitle, orderedStoryEvents, parseVerse,
  sortedStoryBank, verseBank, verseScrambles, type StoryVerseModule,
  type FinishVerse, type UnscrambleVerse,
} from './storyVerseModules.ts';

type Rect={x:number;y:number;width:number;height:number};
const INK=rgb(.13,.13,.13);
const MID=rgb(.40,.40,.40);
const inset=(r:Rect):Rect=>{const p=BOOKLET.padding*72;return{x:r.x+p,y:r.y+p,width:r.width-2*p,height:r.height-2*p}};
const width=(font:PDFFont,text:string,size:number):number=>font.widthOfTextAtSize(text,size);
function centered(page:PDFPage,font:PDFFont,text:string,rect:Rect,y:number,size:number):void {
  page.drawText(text,{x:rect.x+(rect.width-width(font,text,size))/2,y,size,font,color:INK});
}
function wrap(text:string,font:PDFFont,size:number,w:number):string[]|null {
  const words=text.trim().replace(/\s+/gu,' ').split(' ').filter(Boolean);
  const result:string[]=[];let current='';
  for(const word of words){
    if(width(font,word,size)>w)return null;
    const attempt=current?current+' '+word:word;
    if(current&&width(font,attempt,size)>w){result.push(current);current=word;}
    else current=attempt;
  }
  if(current)result.push(current);
  return result;
}
function fittedLines(text:string,font:PDFFont,w:number,h:number,start=12,min=8):{rows:string[];size:number;step:number} {
  for(let size=start;size>=min;size-=.5){
    const rows=wrap(text,font,size,w);
    const step=size*1.25;
    if(rows && rows.length*step<=h)return {rows,size,step};
  }
  throw new Error('A text entry is too long for this section. Shorten the entry or use fewer words.');
}
function drawLines(page:PDFPage,font:PDFFont,text:string,rect:Rect,top:number,maxHeight:number,start=12,min=8):void{
  const {rows,size,step}=fittedLines(text,font,rect.width,maxHeight,start,min);
  const height=rows.length*step;
  rows.forEach((row,i)=>centered(page,font,row,rect,top-(maxHeight-height)/2-(i+1)*step,size));
}
function heading(page:PDFPage,fonts:ModuleFonts,text:string,b:Rect):void {
  centered(page,fonts.title,text,b,b.y+b.height-24,25);
}
function order(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'story-order'}>):void {
  heading(page,fonts,'STORY ORDER',b);
  centered(page,fonts.body,'Number the events from first to last.',b,b.y+b.height-43,10);
  const events=orderedStoryEvents(module);
  const top=b.y+b.height-56, bottom=b.y+4;
  const rowH=(top-bottom)/events.length;
  events.forEach((event,i)=>{
    const y=top-(i+1)*rowH+2;
    const radius=11,cy=y+(rowH-4)/2;
    page.drawEllipse({x:b.x+11,y:cy,xScale:radius,yScale:radius,borderWidth:1,borderColor:INK});
    const textRect={x:b.x+28,y,width:b.width-28,height:rowH-4};
    page.drawRectangle({x:textRect.x,y:textRect.y,width:textRect.width,height:textRect.height,borderWidth:.7,borderColor:MID});
    drawLines(page,fonts.body,event,{x:textRect.x+6,y:textRect.y,width:textRect.width-12,height:textRect.height},
      textRect.y+textRect.height,textRect.height-2,12,8.5);
  });
}
function sort(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'sort-story'}>):void {
  heading(page,fonts,'SORT THE STORY',b);
  centered(page,fonts.body,'Write each letter in the TRUE or FALSE box.',b,b.y+b.height-43,9);
  const items=sortedStoryBank(module);
  const top=b.y+b.height-56,bankBottom=b.y+93;
  const rowH=(top-bankBottom)/items.length;
  page.drawRectangle({x:b.x,y:bankBottom,width:b.width,height:top-bankBottom,borderWidth:.9,borderColor:INK});
  items.forEach((item,i)=>{
    const y=top-(i+1)*rowH;
    if(i)page.drawLine({start:{x:b.x,y:y+rowH},end:{x:b.x+b.width,y:y+rowH},color:MID,thickness:.45});
    page.drawRectangle({x:b.x+5,y:y+(rowH-18)/2,width:19,height:18,borderColor:MID,borderWidth:.7});
    centered(page,fonts.puzzle,String.fromCharCode(65+i),{x:b.x+5,y,width:19,height:rowH},y+(rowH-18)/2+5,11);
    drawLines(page,fonts.body,item.text,{x:b.x+29,y,width:b.width-35,height:rowH},
      y+rowH-2,rowH-4,10.5,8);
  });
  const gap=10,half=(b.width-gap)/2;
  for(let k=0;k<2;k++){
    const x=b.x+k*(half+gap);
    const topBox=b.y+82;
    centered(page,fonts.title,k?'FALSE':'TRUE',{x,y:b.y,width:half,height:80},topBox-14,18);
    page.drawRectangle({x,y:b.y+4,width:half,height:60,borderColor:MID,borderWidth:.8});
  }
}
function drawStory(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'draw-story'}>):void {
  heading(page,fonts,'DRAW THE STORY',b);
  const grid=boxGrid(module);
  const top=b.y+b.height-36, bottom=b.y+3;
  const gutter=7;
  const rowHeight=(top-bottom-gutter)/2;
  const colWidth=(b.width-(grid.cols-1)*gutter)/grid.cols;
  grid.items.forEach((text,i)=>{
    const row=Math.floor(i/grid.cols),col=i%grid.cols;
    const x=b.x+col*(colWidth+gutter);
    const y=top-(row+1)*rowHeight-row*gutter;
    const captionH=44;
    page.drawRectangle({x,y:y+captionH,width:colWidth,height:rowHeight-captionH,borderWidth:.8,borderColor:MID});
    drawLines(page,fonts.body,text,{x:x+2,y,width:colWidth-4,height:captionH},y+captionH,captionH-2,10,7.5);
  });
}
type VerseToken={kind:'word'|'blank'|'space';value:string};
function verseTokens(verse:string):VerseToken[]{
  const result:VerseToken[]=[];
  const parsed=parseVerse(verse);
  for(const part of parsed.parts){
    if(part.kind==='blank')result.push({kind:'blank',value:part.value});
    else for(const piece of part.value.match(/\s+|[^\s]+/gu)??[]){
      result.push({kind:/^\s+$/u.test(piece)?'space':'word',value:piece});
    }
  }
  return result;
}
function drawVerseBody(
  page:PDFPage,fonts:ModuleFonts,verse:string,b:Rect,top:number,
  variant:'box'|'scramble',scrambles:string[],
):void{
  const tokens=verseTokens(verse);
  const size=variant==='box'?11.4:10.6;
  const cell=variant==='box'?11:10.5;
  const step=variant==='box'?21:32;
  let x=b.x,y=top;
  let blankIndex=0;
  const spaces=width(fonts.body,' ',size);
  for(const token of tokens){
    const w=token.kind==='blank'?Array.from(token.value).length*cell+3:
      token.kind==='space'?spaces:width(fonts.body,token.value,size);
    if(w>b.width)throw new Error('A word is too long for the verse area.');
    if(token.kind==='space'&&x===b.x)continue;
    if(x+w>b.x+b.width && x>b.x){
      x=b.x;y-=step;
      if(token.kind==='space')continue;
    }
    if(y-step*.65<b.y+2)throw new Error('The verse does not fit the medium module. Shorten it.');
    if(token.kind==='word'){
      page.drawText(token.value,{x,y:y+(variant==='scramble'?5:0),size,font:fonts.body,color:INK});
    }else if(token.kind==='blank'){
      const n=Array.from(token.value).length;
      const scrambled=variant==='scramble'?Array.from(scrambles[blankIndex]):[];
      for(let c=0;c<n;c++){
        const cx=x+c*cell;
        if(variant==='box'){
          page.drawRectangle({x:cx+1,y:y-2,width:cell-2,height:12,borderWidth:.8,borderColor:INK});
        }else{
          page.drawLine({start:{x:cx+1,y:y+15},end:{x:cx+cell-1,y:y+15},color:INK,thickness:.85});
          const ch=scrambled[c]??'';
          const tx=cx+(cell-width(fonts.puzzle,ch,8.2))/2;
          page.drawText(ch,{x:tx,y:y-2,size:8.2,font:fonts.puzzle,color:INK});
        }
      }
      blankIndex++;
    }
    x+=w;
  }
}
function finishVerse(page:PDFPage,b:Rect,fonts:ModuleFonts,m:FinishVerse):void {
  heading(page,fonts,'FINISH THE VERSE',b);
  const bank=verseBank(m);
  const top=b.y+b.height-36,bankH=42;
  page.drawRectangle({x:b.x,y:top-bankH,width:b.width,height:bankH,borderColor:MID,borderWidth:.9});
  const cols=Math.ceil(bank.length/2),cw=b.width/cols;
  const size=Math.min(11,...bank.map(word=>{
    for(let s=11;s>=6.5;s-=.5)if(width(fonts.body,word.toUpperCase(),s)<cw-4)return s;
    throw new Error('A word-bank entry is too wide for its cell.');
  }));
  bank.forEach((word,i)=>centered(page,fonts.body,word.toUpperCase(),
    {x:b.x+(i%cols)*cw,y:top-bankH,width:cw,height:bankH},top-16-Math.floor(i/cols)*18,size));
  centered(page,fonts.body,m.reference,{x:b.x,y:top-87,width:b.width,height:16},top-bankH-15,10.5);
  drawVerseBody(page,fonts,m.verse,{x:b.x+3,y:b.y+4,width:b.width-6,height:67},top-bankH-38,'box',[]);
}
function unscrambleVerse(page:PDFPage,b:Rect,fonts:ModuleFonts,m:UnscrambleVerse):void {
  heading(page,fonts,'UNSCRAMBLE THE VERSE',b);
  centered(page,fonts.body,m.reference,b,b.y+b.height-43,11);
  drawVerseBody(page,fonts,m.verse,{x:b.x+3,y:b.y+4,width:b.width-6,height:b.height-58},
    b.y+b.height-72,'scramble',verseScrambles(m));
}
function mistakes(page:PDFPage,b:Rect,fonts:ModuleFonts,m:Extract<StoryVerseModule,{type:'circle-mistakes'}>):void {
  heading(page,fonts,mistakesTitle(m.count),b);
  const area={x:b.x+7,y:b.y+9,width:b.width-14,height:b.height-46};
  const fitted=fittedLines(m.text,fonts.body,area.width,area.height-7,14,9.5);
  const top=b.y+b.height-45;
  fitted.rows.forEach((line,i)=>page.drawText(line,{
    x:area.x,y:top-(i+1)*fitted.step,
    size:fitted.size,font:fonts.body,color:INK,
  }));
}
export function drawStoryVersePdf(page:PDFPage,rect:Rect,module:StoryVerseModule,fonts:ModuleFonts):void {
  const b=inset(rect);
  switch(module.type){
    case 'story-order':return order(page,b,fonts,module);
    case 'sort-story':return sort(page,b,fonts,module);
    case 'draw-story':return drawStory(page,b,fonts,module);
    case 'finish-verse':return finishVerse(page,b,fonts,module);
    case 'unscramble-verse':return unscrambleVerse(page,b,fonts,module);
    case 'circle-mistakes':return mistakes(page,b,fonts,module);
  }
}
