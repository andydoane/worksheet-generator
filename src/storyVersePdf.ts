import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import {MODULE_TITLE_PT,verticalStack,centeredBaseline} from './pdfLayout.ts';
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
function sort(page:PDFPage,b:Rect,fonts:ModuleFonts,module:Extract<StoryVerseModule,{type:'sort-story'}>):void {
  heading(page,fonts,'SORT THE STORY',b);
  const subtitle='Sort the letters into TRUE or FALSE. Circle the incorrect words in false statements.';
  // Measure the exact requested subtitle; it wraps naturally without clipping.
  const instructionSize=9.4;
  const instructions=balancedLines(subtitle,fonts.bodyBold,instructionSize,b.width-12);
  if(!instructions)throw Error('Sort the Story instructions do not fit.');
  const instructionTop=b.y+b.height-39;
  instructions.forEach((line,i)=>centered(page,fonts.bodyBold,line,b,instructionTop-i*11.2,instructionSize));
  const items=sortedStoryBank(module);
  const contentTop=instructionTop-instructions.length*11.2-11;
  const area={x:b.x,y:b.y+4,width:b.width,height:contentTop-b.y-4};
  // Banks grow when few statements are present; answer boxes remain stable.
  const [bank,answers]=verticalStack(area,[
    {height:items.length*23,maxHeight:items.length*38,grow:1},
    {height:72,maxHeight:89,grow:.25},
  ],10);
  const top=bank.y+bank.height,rowH=bank.height/items.length;
  page.drawRectangle({x:bank.x,y:bank.y,width:bank.width,height:bank.height,borderWidth:.9,borderColor:INK});
  items.forEach((item,i)=>{
    const y=top-(i+1)*rowH;
    if(i)page.drawLine({start:{x:b.x,y:y+rowH},end:{x:b.x+b.width,y:y+rowH},color:MID,thickness:.45});
    page.drawRectangle({x:b.x+5,y:y+(rowH-18)/2,width:19,height:18,borderColor:MID,borderWidth:.7});
    centered(page,fonts.puzzle,String.fromCharCode(65+i),{x:b.x+5,y,width:19,height:rowH},y+(rowH-18)/2+5,11);
    drawLines(page,fonts.body,item.text,{x:b.x+31,y:y+3,width:b.width-39,height:rowH-6},
      y+rowH-3,rowH-6,10.5,8,'left');
  });
  const gap=10,half=(answers.width-gap)/2;
  for(let k=0;k<2;k++){
    const x=answers.x+k*(half+gap);
    const titleH=23;
    centered(page,fonts.title,k?'FALSE':'TRUE',{x,y:answers.y,width:half,height:answers.height},
      centeredBaseline({x,y:answers.y+answers.height-titleH,width:half,height:titleH},18),18);
    page.drawRectangle({x,y:answers.y+1,width:half,height:answers.height-titleH-2,
      borderColor:MID,borderWidth:.8});
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
    drawLines(page,fonts.body,text,{x:x+4,y:y+4,width:colWidth-8,height:captionH-12},
      y+captionH-4,captionH-12,captionSize,captionSize);
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
    for(let s=11;s>=6.5;s-=.5)if(width(fonts.bank,word.toUpperCase(),s)<cw-4)return s;
    throw new Error('A word-bank entry is too wide for its cell.');
  }));
  bank.forEach((word,i)=>centered(page,fonts.bank,word.toUpperCase(),
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
