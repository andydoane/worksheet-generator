import {parseVerse,verseBank,type FinishVerse} from './storyVerseModules.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';

/** Browser and PDF draw identical measured top-left print-space coordinates. */
export type VerseWord={kind:'text'|'blank';text:string;x:number;y:number;width:number};
export type BankWord={text:string;x:number;y:number};
export type FinishVersePlan={
 title:string;titleSize:number;titleY:number;
 bankTop:number;bankHeight:number;bankFontSize:number;bankWords:BankWord[];
 fontSize:number;cell:number;boxHeight:number;lines:number;lineStep:number;
 words:VerseWord[];
};
type Metrics={title:MeasureText;body:MeasureText;bank:MeasureText;
 /** Height of the actual visible glyph midpoint above the baseline, in pt. */
 bankInkCenter?:(text:string,size:number)=>number};
type Token={kind:'text'|'blank'|'space';value:string};
function verseTokens(verse:string):Token[]{
 const out:Token[]=[];
 for(const part of parseVerse(verse).parts){
  if(part.kind==='blank')out.push({kind:'blank',value:part.value});
  else for(const piece of part.value.match(/\s+|[^\s]+/gu)??[])
   out.push({kind:/^\s+$/u.test(piece)?'space':'text',value:piece});
 }
 return out;
}
/** Never split words, blanks or punctuation adjacent to a blank. */
function wordGroups(tokens:Token[]):Token[][]{
 const groups:Token[][]=[];let group:Token[]=[];
 for(const token of tokens){
  if(token.kind==='space'){if(group.length)groups.push(group);group=[];}
  else group.push(token);
 }
 if(group.length)groups.push(group);
 return groups;
}
function balancedRows(widths:number[],space:number,maxWidth:number,count:number):number[][]|null{
 const target=(widths.reduce((a,b)=>a+b,0)+space*(widths.length-count))/count;
 const memo=new Map<string,{cost:number;rows:number[][]}|null>();
 function solve(index:number,k:number):{cost:number;rows:number[][]}|null{
  const key=index+':'+k;
  if(memo.has(key))return memo.get(key)??null;
  if(k===0)return index===widths.length?{cost:0,rows:[]}:null;
  if(widths.length-index<k)return null;
  let winner:{cost:number;rows:number[][]}|null=null,used=0;
  for(let end=index+1;end<=widths.length-k+1;end++){
   used+=widths[end-1]+(end===index+1?0:space);
   if(used>maxWidth+.0001)break;
   const tail=solve(end,k-1);
   if(!tail)continue;
   const shortLast=k===1&&used<target*.6?(target*.6-used)**2*3:0;
   const cost=(used-target)**2+shortLast+tail.cost;
   if(!winner||cost<winner.cost)
    winner={cost,rows:[widths.slice(index,end).map((_,i)=>index+i),...tail.rows]};
  }
  memo.set(key,winner);return winner;
 }
 return solve(0,count)?.rows??null;
}
type BankLayout={top:number;height:number;fontSize:number;words:BankWord[]};
/** Fit one/two rows, then center the *ink* vertically using the font's
 * actual glyph bounds. No hand-tuned baseline offsets. */
function bankLayout(words:string[],m:Metrics,width:number,top:number):BankLayout|null{
 for(const rows of [1,2])for(let size=10.5;size>=8.5;size-=.5){
  const gap=10,groups=rows===1?[words]:
   [words.slice(0,Math.ceil(words.length/2)),words.slice(Math.ceil(words.length/2))];
  const widths=groups.map(group=>group.reduce((sum,t)=>sum+m.bank(t,size),0)+(group.length-1)*gap);
  if(widths.some(w=>w>width-14))continue;
  const rowHeight=Math.max(14,size+4),height=rows*rowHeight+7;
  const placed=groups.flatMap((group,row)=>{
   let x=(width-widths[row])/2;
   const cy=top+3.5+row*rowHeight+rowHeight/2;
   return group.map(text=>{
    // The measurement is a glyph-bounding-box midpoint above its baseline.
    const inkCenter=m.bankInkCenter?.(text,size)??size*.35;
    const word={text,x,y:cy+inkCenter};
    x+=m.bank(text,size)+gap;return word;
   });
  });
  return {top,height,fontSize:size,words:placed};
 }
 return null;
}
export function planFinishVerse(module:FinishVerse,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):FinishVersePlan|null{
 const groups=wordGroups(verseTokens(module.verse));
 if(!groups.length)return null;
 const title='FINISH '+module.reference.trim().toUpperCase();
 let titleSize=25;
 while(titleSize>=16&&metrics.title(title,titleSize)>width-12)titleSize-=.5;
 if(titleSize<16)return null;
 // These positions define the group before its final vertical centering pass.
 const titleY=25,bankTop=titleY+9;
 const bank=bankLayout(verseBank(module).map(w=>w.toUpperCase()),metrics,width,bankTop);
 if(!bank)return null;
 const firstBase=bank.top+bank.height+19;
 const left=4,right=width-4,usableWidth=right-left;
 // Leave four points of safety at each end; the 0.1in booklet inset is separate.
 const bottom=height-5;
 let best:{score:number;plan:FinishVersePlan}|null=null;
 // Explore typography and line counts together, instead of returning the first fit.
 for(let fontSize=16;fontSize>=8.5;fontSize-=.5){
  const cell=Math.max(12.3,fontSize*.91),boxHeight=cell;
  const space=metrics.body(' ',fontSize);
  const tokenWidth=(token:Token)=>token.kind==='blank'
    ?Array.from(token.value).length*cell+1:metrics.body(token.value,fontSize);
  const widths=groups.map(group=>group.reduce((sum,t)=>sum+tokenWidth(t),0));
  if(widths.some(w=>w>usableWidth))continue;
  const minimumPitch=Math.max(cell+3.5,fontSize*1.2);
  const maxPitch=Math.max(minimumPitch,fontSize*1.5);
  for(let lines=1;lines<=Math.min(groups.length,8);lines++){
   const rows=balancedRows(widths,space,usableWidth,lines);
   if(!rows)continue;
   // The last line's glyphs/boxes must remain within the printable region.
   const step=lines===1?minimumPitch:
    Math.min(maxPitch,(bottom-2.3-firstBase)/(lines-1));
   if(step<minimumPitch-.0001)continue;
   const widthsByLine=rows.map(indices=>
    indices.reduce((sum,i)=>sum+widths[i],0)+(indices.length-1)*space);
   const maxRow=Math.max(...widthsByLine);
   const minRow=Math.min(...widthsByLine);
   const lastBaseline=firstBase+(lines-1)*step;
   const contentTop=titleY-titleSize*.80;
   const contentBottom=lastBaseline+2.3;
   if(contentBottom>bottom+.0001)continue;
   const usedHeight=contentBottom-contentTop,availableHeight=height-9;
   const widthFill=maxRow/usableWidth,heightFill=usedHeight/availableHeight;
   // Favor a strong full-width composition, meaningful use of height, and
   // balanced lines rather than tiny last rows; keep short verses readable.
   const balance=widthsByLine.reduce((sum,w)=>sum+((maxRow-w)/usableWidth)**2,0)/lines;
   const score=1.7*(1-widthFill)**2+.48*(1-heightFill)**2+
    .6*balance+.3*((maxRow-minRow)/usableWidth)**2+
    .011*(16-fontSize)+.006*Math.max(0,lines-4);
   const words:VerseWord[]=[];
   rows.forEach((indices,row)=>{
    let x=left+(usableWidth-widthsByLine[row])/2;
    const y=firstBase+row*step;
    for(const [order,i] of indices.entries()){
     for(const token of groups[i]){
      const w=tokenWidth(token);
      words.push({kind:token.kind==='blank'?'blank':'text',text:token.value,x,y,width:w});
      x+=w;
     }
     if(order<indices.length-1)x+=space;
    }
   });
   // Center the full title + bank + verse composition as one unit.
   const shift=(height-contentTop-contentBottom)/2;
   const plan:FinishVersePlan={
    title,titleSize,titleY:titleY+shift,
    bankTop:bank.top+shift,bankHeight:bank.height,bankFontSize:bank.fontSize,
    bankWords:bank.words.map(w=>({...w,y:w.y+shift})),
    fontSize,cell,boxHeight,lines,lineStep:step,
    words:words.map(w=>({...w,y:w.y+shift})),
   };
   if(!best||score<best.score)best={score,plan};
  }
 }
 return best?.plan??null;
}
