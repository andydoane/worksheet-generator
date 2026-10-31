import {parseVerse,verseBank,type FinishVerse} from './storyVerseModules.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';

/** Shared print-space plan: browser and PDF draw *the same* measured geometry. */
export type VerseWord={kind:'text'|'blank';text:string;x:number;y:number;width:number};
export type BankWord={text:string;x:number;y:number};
export type FinishVersePlan={
 title:string;titleSize:number;titleY:number;
 bankTop:number;bankHeight:number;bankFontSize:number;bankWords:BankWord[];
 fontSize:number;cell:number;boxHeight:number;lines:number;lineStep:number;
 words:VerseWord[];
};
type Metrics={title:MeasureText;body:MeasureText;bank:MeasureText};
type Token={kind:'text'|'blank'|'space';value:string};
function verseTokens(verse:string):Token[]{
 const parts=parseVerse(verse).parts;
 const out:Token[]=[];
 for(const part of parts){
  if(part.kind==='blank')out.push({kind:'blank',value:part.value});
  else for(const piece of part.value.match(/\s+|[^\s]+/gu)??[])
    out.push({kind:/^\s+$/u.test(piece)?'space':'text',value:piece});
 }
 return out;
}
function bankPlan(words:string[],measure:MeasureText,w:number){
 for(const rows of [1,2]){
  for(let fontSize=10.5;fontSize>=8.5;fontSize-=.5){
   const gap=10;
   const groups=rows===1?[words]:[words.slice(0,Math.ceil(words.length/2)),words.slice(Math.ceil(words.length/2))];
   const widths=groups.map(group=>group.reduce((sum,word)=>sum+measure(word,fontSize),0)+(group.length-1)*gap);
   if(widths.every(width=>width<=w-14)){
    const bankTop=34,bankHeight=rows*14+7;
    return {bankTop,bankHeight,fontSize,bankWords:groups.flatMap((group,row)=>{
     let x=(w-widths[row])/2;
     return group.map(text=>{const value={text,x,y:bankTop+13+row*14};x+=measure(text,fontSize)+gap;return value;});
    })};
   }
  }
 }
 return null;
}
export function planFinishVerse(module:FinishVerse,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):FinishVersePlan|null{
 const tokens=verseTokens(module.verse);
 const title='FINISH '+module.reference.trim().toUpperCase();
 let titleSize=25;
 while(titleSize>=16 && metrics.title(title,titleSize)>width-12)titleSize-=.5;
 if(titleSize<16)return null;
 const bank=bankPlan(verseBank(module).map(w=>w.toUpperCase()),metrics.bank,width);
 if(!bank)return null;
 const bodyTop=bank.bankTop+bank.bankHeight+8;
 const bottom=height-8, left=4,right=width-4;
 // The child's writing boxes never shrink when body text needs a smaller face.
 const cell=10.4,boxHeight=12.3,bodyWidth=right-left;
 for(let fontSize=11;fontSize>=8.5;fontSize-=.5){
  const step=Math.max(16.2,fontSize*1.55);
  const words:VerseWord[]=[];
  let line=0,x=left,blankCount=0,failed=false;
  for(const token of tokens){
   const blank=token.kind==='blank';
   const w=blank?Array.from(token.value).length*cell+2.5:
     token.kind==='space'?metrics.body(' ',fontSize):
     metrics.body(token.value,fontSize);
   if(w>bodyWidth){failed=true;break;}
   if(token.kind==='space'&&x===left)continue;
   if(x+w>right+.001&&x>left){
    line++;x=left;
    if(token.kind==='space')continue;
   }
   if(token.kind!=='space'){
    words.push({kind:blank?'blank':'text',text:token.value,
      x,y:bodyTop+11+line*step,width:w});
    if(blank)blankCount++;
   }
   x+=w;
  }
  if(failed||blankCount!==parseVerse(module.verse).answers.length)continue;
  if(bodyTop+11+line*step+4>bottom)continue;
  return {title,titleSize,titleY:25,...bank,bankFontSize:bank.fontSize,
   fontSize,cell,boxHeight,lines:line+1,lineStep:step,words};
 }
 return null;
}
