import { rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import {MODULE_TITLE_PT,verticalStack,centeredBaseline} from './pdfLayout.ts';
import {planMistakes} from './mediumParityLayout.ts';
import {planFinishVerse} from './finishVerseLayout.ts';
import {drawReconstructionPdf} from './verseReconstructionPdf.ts';
import {planSortStory} from './sortStoryLayout.ts';
import type { ModuleFonts } from './modulePdf.ts';
import {
  boxGrid, linesFromInput, mistakesTitle, orderedStoryEvents, parseVerse,
  verseBank, verseScrambles, type StoryVerseModule,
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
/** Balance only story events; left-aligned statements keep ordinary word wrapping. */
export function balancedLines(text:string,font:PDFFont,size:number,maxWidth:number):string[]|null {
  const greedy=wrap(text,font,size,maxWidth);
  if(!greedy||greedy.length<2)return greedy;
  const words=text.trim().split(/\s+/u),count=greedy.length,n=words.length;
  const measure=(s:string)=>width(font,s,size);
  const cache=new Map<string,{cost:number;lines:string[]}>();
  function solve(i:number,k:number):{cost:number;lines:string[]}|null {
    if(k===0)return i===n?{cost:0,lines:[]}:null;
    if(n-i<k)return null;
    const key=i+':'+k,cached=cache.get(key);
    if(cached)return cached;
    let best:{cost:number;lines:string[]}|null=null;
    for(let j=i+1;j<=n-k+1;j++){
      const line=words.slice(i,j).join(' '),used=measure(line);
      if(used>maxWidth)break;
      const rest=solve(j,k-1);
      if(!rest)continue;
      const slack=(maxWidth-used)/maxWidth;
      const cost=slack*slack+rest.cost;
      if(!best||cost<best.cost)best={cost,lines:[line,...rest.lines]};
    }
    if(best)cache.set(key,best);
    return best;
  }
  return solve(0,count)?.lines??greedy;
}
function fittedLines(text:string,font:PDFFont,w:number,h:number,start=12,min=8,balance=false):{rows:string[];size:number;step:number} {
  for(let size=start;size>=min;size-=.5){
    const rows=balance?balancedLines(text,font,size,w):wrap(text,font,size,w);
    const step=size*1.25;
    if(rows && rows.length*step<=h)return {rows,size,step};
  }
  throw new Error('A text entry is too long for this section. Shorten the entry or use fewer words.');
}
function drawLines(page:PDFPage,font:PDFFont,text:string,rect:Rect,top:number,maxHeight:number,start=12,min=8,
  alignment:'center'|'left'='center',balance=false):void{
  const {rows,size,step}=fittedLines(text,font,rect.width,maxHeight,start,min,balance);
  const mid=(top+top-maxHeight)/2;
  const firstBaseline=mid+(rows.length-1)*step/2-size*.35;
  rows.forEach((row,i)=>{
    const y=firstBaseline-i*step;
    if(alignment==='left')page.drawText(row,{x:rect.x,y,size,font,color:INK});
    else centered(page,font,row,rect,y,size);
  });
}
function heading(page:PDFPage,fonts:ModuleFonts,text:string,b:Rect):void {
  centered(page,fonts.title,text,b,b.y+b.height-24,MODULE_TITLE_PT);
}
function order(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'story-order'}>):void {
  heading(page,fonts,'STORY ORDER',b);
  centered(page,fonts.bodyBold,'Number the events from first to last.',b,b.y+b.height-43,10);
  const events=orderedStoryEvents(module);
  const available={x:b.x,y:b.y+4,width:b.width,height:b.height-61};
  // Short lists have more surrounding whitespace. Longer lists expand cards.
  const [group]=verticalStack(available,[{
    height:events.length*33,
    maxHeight:Math.min(available.height,events.length*53),
    grow:1,
  }]);
  const rowH=group.height/events.length;
  events.forEach((event,i)=>{
    const y=group.y+(events.length-1-i)*rowH+2;
    const radius=11,cy=y+(rowH-4)/2;
    page.drawEllipse({x:b.x+11,y:cy,xScale:radius,yScale:radius,borderWidth:1,borderColor:INK});
    const textRect={x:b.x+28,y,width:b.width-28,height:rowH-4};
    page.drawRectangle({x:textRect.x,y:textRect.y,width:textRect.width,height:textRect.height,borderWidth:.7,borderColor:MID});
    drawLines(page,fonts.body,event,{x:textRect.x+8,y:textRect.y+4,width:textRect.width-16,height:textRect.height-8},
      textRect.y+textRect.height-4,textRect.height-8,12,8.5,'center',true);
  });
}
function sort(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'sort-story'}>,symbols:ReadonlyMap<number,PDFImage>):void {
 const plan=planSortStory(module,{
  body:(text,size)=>width(fonts.body,text,size),
  instruction:(text,size)=>width(fonts.bodyBold,text,size),
 },b.width,b.height);
 if(!plan)throw Error('Sort the Story statements cannot fit. Shorten the longest sentence.');
 const top=b.y+b.height;
 centered(page,fonts.title,'SORT THE STORY',b,top-plan.titleY,MODULE_TITLE_PT);
 for(const line of plan.instructions){
  page.drawText(line.text,{x:b.x+line.x-width(fonts.bodyBold,line.text,plan.instructionSize)/2,
   y:top-line.y,font:fonts.bodyBold,size:plan.instructionSize,color:INK});
 }
 const stroke=plan.strokeWidth;
 const rectangle=(rect:{x:number;y:number;width:number;height:number})=>
  page.drawRectangle({x:b.x+rect.x,y:top-rect.y-rect.height,
   width:rect.width,height:rect.height,borderColor:INK,borderWidth:stroke});
 rectangle(plan.bank);
 for(const y of plan.separators){
  page.drawLine({start:{x:b.x+plan.bank.x,y:top-y},
   end:{x:b.x+plan.bank.x+plan.bank.width,y:top-y},
   color:INK,thickness:stroke});
 }
 for(const row of plan.rows){
  const symbol=symbols.get(row.symbolId);
  if(!symbol)throw Error('Sort the Story symbol '+row.symbolId+' did not load.');
  page.drawImage(symbol,{x:b.x+row.symbolBox.x,
   y:top-row.symbolBox.y-row.symbolBox.height,
   width:row.symbolBox.width,height:row.symbolBox.height});
  for(const line of row.lines)page.drawText(line.text,{
   x:b.x+line.x,y:top-line.y,font:fonts.body,size:row.textSize,color:INK,
  });
 }
 for(const answer of plan.answers){
  page.drawText(answer.label,{
   x:b.x+answer.labelX-width(fonts.title,answer.label,18)/2,
   y:top-answer.labelY,font:fonts.title,size:18,color:INK,
  });
  rectangle(answer.box);
 }
}
function drawStory(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'draw-story'}>):void {
  heading(page,fonts,'DRAW THE STORY',b);
  const grid=boxGrid(module);
  const top=b.y+b.height-36,bottom=b.y+3;
  const gutter=7; // The caption-to-frame gap equals the horizontal box gutter.
  const rowHeight=(top-bottom-gutter)/2;
  const colWidth=(b.width-(grid.cols-1)*gutter)/grid.cols;
  const captionH=grid.cols===3?56:48,frameGap=gutter;
  if(rowHeight-captionH-frameGap<55)
    throw Error('Not enough height remains for readable drawing boxes.');
  // Determine ONE common caption font size for the entire activity,
  // rather than shrinking five-line captions independently of four-line ones.
  let captionSize=9.4;
  while(captionSize>=6.5){
    const allFit=grid.items.every(text=>{
      try{
        fittedLines(text,fonts.body,colWidth-8,captionH-12,captionSize,captionSize);
        return true;
      }catch{return false;}
    });
    if(allFit)break;
    captionSize-=.3;
  }
  if(captionSize<6.5)throw Error('Drawing captions are too long for the selected layout.');
  grid.items.forEach((text,i)=>{
    const row=Math.floor(i/grid.cols),col=i%grid.cols;
    const x=b.x+col*(colWidth+gutter);
    const y=top-(row+1)*rowHeight-row*gutter;
    page.drawRectangle({x,y:y+captionH+frameGap,width:colWidth,height:rowHeight-captionH-frameGap,
      borderWidth:.8,borderColor:MID});
    // Align caption ink just below the 7pt picture-to-caption gap.
    // Vertical centering used to make shorter captions appear far away.
    const rows=wrap(text,fonts.body,captionSize,colWidth-8);
    if(!rows)throw Error('Drawing caption cannot wrap at the selected font size.');
    rows.forEach((line,j)=>centered(page,fonts.body,line,
      {x:x+4,y,width:colWidth-8,height:captionH},
      y+captionH-captionSize-j*captionSize*1.25,captionSize));
  });
}
function finishVerse(page:PDFPage,b:Rect,fonts:ModuleFonts,m:FinishVerse):void {
  const measure=(font:PDFFont)=>(text:string,size:number)=>width(font,text,size);
  const plan=planFinishVerse(m,{
    title:measure(fonts.title),body:measure(fonts.body),bank:measure(fonts.bank),
    bankInkCenter:fonts.bankInkCenter,
  },b.width,b.height);
  if(!plan)throw Error('Finish the Verse does not fit. Use fewer blanks or shorter verse text.');
  centered(page,fonts.title,plan.title,b,b.y+b.height-plan.titleY,plan.titleSize);
  page.drawRectangle({x:b.x,y:b.y+b.height-plan.bankTop-plan.bankHeight,
    width:b.width,height:plan.bankHeight,borderColor:MID,borderWidth:.9});
  plan.bankWords.forEach(word=>page.drawText(word.text,{
    x:b.x+word.x,y:b.y+b.height-word.y,font:fonts.bank,size:plan.bankFontSize,color:INK,
  }));
  plan.words.forEach(word=>{
    if(word.kind==='text'){
      page.drawText(word.text,{x:b.x+word.x,y:b.y+b.height-word.y,
        font:fonts.body,size:plan.fontSize,color:INK});
    }else{
      Array.from(word.text).forEach((_,j)=>{
        page.drawRectangle({x:b.x+word.x+j*plan.cell+.3,
          y:b.y+b.height-(word.y-(plan.boxHeight-2.3))-plan.boxHeight,
          width:plan.cell,height:plan.boxHeight,borderColor:INK,borderWidth:.8});
      });
    }
  });
}
function unscrambleVerse(page:PDFPage,region:Rect,fonts:ModuleFonts,m:UnscrambleVerse):void {
  drawReconstructionPdf(page,region,m,fonts);
}
function mistakes(page:PDFPage,b:Rect,fonts:ModuleFonts,m:Extract<StoryVerseModule,{type:'circle-mistakes'}>):void {
  const plan=planMistakes(m.text,(text,size)=>width(fonts.body,text,size),b.width,b.height);
  if(!plan)throw Error('Circle the Mistakes paragraph cannot fit. Shorten the text.');
  centered(page,fonts.title,mistakesTitle(m.count),b,b.y+b.height-plan.titleY,MODULE_TITLE_PT);
  plan.lines.forEach(line=>page.drawText(line.text,{
    x:b.x+line.x,y:b.y+b.height-line.y,
    size:plan.fontSize,font:fonts.body,color:INK,
  }));
}
export function drawStoryVersePdf(page:PDFPage,rect:Rect,module:StoryVerseModule,fonts:ModuleFonts,
 symbols:ReadonlyMap<number,PDFImage>=new Map()):void {
  const b=inset(rect);
  switch(module.type){
    case 'story-order':return order(page,b,fonts,module);
    case 'sort-story':return sort(page,b,fonts,module,symbols);
    case 'draw-story':return drawStory(page,b,fonts,module);
    case 'finish-verse':return finishVerse(page,b,fonts,module);
    case 'unscramble-verse':return unscrambleVerse(page,rect,fonts,module);
    case 'circle-mistakes':return mistakes(page,b,fonts,module);
  }
}
