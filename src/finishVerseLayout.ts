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
     return group.map(text=>{const value={text,x,y:bankTop+15.5+row*14};x+=measure(text,fontSize)+gap;return value;});
    })};
   }
  }
 }
 return null;
}
/** Never split a word, its blank, or punctuation adjacent to that blank. */
function wordGroups(tokens:Token[]):Token[][]{
 const groups:Token[][]=[];let group:Token[]=[];
 function flush(){if(group.length){groups.push(group);group=[];}}
 for(const token of tokens){
  if(token.kind==='space'){flush();continue;}
  group.push(token);
 }
 flush();return groups;
}
/** Choose line breaks by balanced line widths rather than placing an orphaned
 * two-word line at the bottom. The cheapest K-row solution minimizes uneven
 * line lengths and penalizes exceptionally short final rows.
 */
function balancedRows(widths:number[],space:number,maxWidth:number,k:number):number[][]|null{
 const target=(widths.reduce((a,b)=>a+b,0)+space*(widths.length-k))/k;
 const memo=new Map<string,{cost:number;rows:number[][]}|null>();
 function best(index:number,remaining:number):{cost:number;rows:number[][]}|null{
  const key=index+':'+remaining;
  if(memo.has(key))return memo.get(key)??null;
  if(remaining===0)return index===widths.length?{cost:0,rows:[]}:null;
  if(widths.length-index<remaining)return null;
  let winner:{cost:number;rows:number[][]}|null=null,used=0;
  for(let end=index+1;end<=widths.length-remaining+1;end++){
   used+=widths[end-1]+(end===index+1?0:space);
   if(used>maxWidth+.0001)break;
   const rest=best(end,remaining-1);
   if(!rest)continue;
   const shortLast=remaining===1&&used<target*.57?(target*.57-used)**2*3:0;
   const cost=(used-target)**2+shortLast+rest.cost;
   if(!winner||cost<winner.cost)winner={cost,rows:[widths.slice(index,end).map((_,i)=>index+i),...rest.rows]};
  }
  memo.set(key,winner);return winner;
 }
 return best(0,k)?.rows??null;
}
export function planFinishVerse(module:FinishVerse,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):FinishVersePlan|null{
 const groups=wordGroups(verseTokens(module.verse));
 const title='FINISH '+module.reference.trim().toUpperCase();
 let titleSize=25;
 while(titleSize>=16 && metrics.title(title,titleSize)>width-12)titleSize-=.5;
 if(titleSize<16)return null;
 const bank=bankPlan(verseBank(module).map(w=>w.toUpperCase()),metrics.bank,width);
 if(!bank)return null;
 const bodyTop=bank.bankTop+bank.bankHeight+8;
 const bottom=height-8,left=4,right=width-4,bodyWidth=right-left;
 // Square handwriting boxes have a protected 12.3pt side at every verse size.
 const cell=12.3,boxHeight=12.3;
 for(let fontSize=11;fontSize>=8.5;fontSize-=.5){
  const step=Math.max(16.2,fontSize*1.55);
  const space=metrics.body(' ',fontSize);
  const tokenWidth=(t:Token)=>t.kind==='blank'
    ?Array.from(t.value).length*cell+1:metrics.body(t.value,fontSize);
  const widths=groups.map(group=>group.reduce((sum,t)=>sum+tokenWidth(t),0));
  if(widths.some(w=>w>bodyWidth))continue;
  const maxLines=Math.floor((bottom-(bodyTop+11+4))/step)+1;
  for(let lines=1;lines<=Math.min(maxLines,groups.length);lines++){
   const rows=balancedRows(widths,space,bodyWidth,lines);
   if(!rows)continue;
   const words:VerseWord[]=[];
   rows.forEach((indices,row)=>{
    const rowWidth=indices.reduce((sum,i)=>sum+widths[i],0)+(indices.length-1)*space;
    let x=left+(bodyWidth-rowWidth)/2;
    const y=bodyTop+11+row*step;
    for(const [order,i] of indices.entries()){
     for(const token of groups[i]){
      const w=tokenWidth(token);
      words.push({kind:token.kind==='blank'?'blank':'text',text:token.value,x,y,width:w});
      x+=w;
     }
     if(order<indices.length-1)x+=space;
    }
   });
   return {title,titleSize,titleY:25,...bank,bankFontSize:bank.fontSize,
    fontSize,cell,boxHeight,lines,lineStep:step,words};
  }
 }
 return null;
}
