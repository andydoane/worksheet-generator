import type {MeasureText} from './mediumParityLayout.ts';

/** Balance bank word wrapping using actual embedded font advances.
 * Keep the fewest possible lines, but minimize ragged widths within that
 * count; never split a word, discard punctuation or exceed the width.
 * Shared by the preview/PDF bank plans for Connect activities.
 */
export function balancedBankLines(input:string,maxWidth:number,
  measure:MeasureText,fontSize:number,maxRows=3):string[]|null{
 const words=input.trim().split(/\s+/u).filter(Boolean);
 if(!words.length||maxWidth<=0)return null;
 const widths=words.map(word=>measure(word,fontSize));
 const space=measure(' ',fontSize);
 if(widths.some(w=>w>maxWidth))return null;
 const sums=[0];
 for(const w of widths)sums.push(sums[sums.length-1]+w);
 const lineWidth=(start:number,end:number)=>sums[end]-sums[start]+space*(end-start-1);
 for(let count=1;count<=Math.min(maxRows,words.length);count++){
  const target=(sums[words.length]+space*(words.length-count))/count;
  const memo=new Map<string,{cost:number;lines:string[]}|null>();
  function fit(index:number,rows:number):{cost:number;lines:string[]}|null{
   const key=index+':'+rows;
   if(memo.has(key))return memo.get(key)??null;
   if(rows===0)return index===words.length?{cost:0,lines:[]}:null;
   if(words.length-index<rows)return null;
   let best:{cost:number;lines:string[]}|null=null;
   for(let end=index+1;end<=words.length-rows+1;end++){
    const width=lineWidth(index,end);
    if(width>maxWidth+1e-6)break;
    const tail=fit(end,rows-1);
    if(!tail)continue;
    const score=(width-target)**2+tail.cost;
    if(!best||score<best.cost){
      best={cost:score,lines:[words.slice(index,end).join(' '),...tail.lines]};
    }
   }
   memo.set(key,best);
   return best;
  }
  const answer=fit(0,count);
  if(answer)return answer.lines;
 }
 return null;
}
