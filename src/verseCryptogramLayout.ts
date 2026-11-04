import type {CryptogramResult} from './cryptograms.ts';
import {BOOKLET} from './booklet.ts';
import type {MeasureText} from './mediumParityLayout.ts';

/** Physical points inside the existing 0.1-inch module inset. */
export const LARGE_CIPHER_WIDTH=(BOOKLET.cell.width*2-BOOKLET.padding*2)*72;
export const LARGE_CIPHER_HEIGHT=(BOOKLET.cell.height*2-BOOKLET.padding*2)*72;
export const VERSE_CIPHER_WORD_GAP=16;
export const VERSE_CIPHER_MIN_CELL=13;
export const VERSE_CIPHER_MAX_CELL=21.5;

type CipherCell={char:string;symbol?:number};
type Word={cells:CipherCell[];width:number};
export type VerseCipherKeyCell={
 letter:string;symbol:number;x:number;y:number;width:number;
};
export type VerseCipherBodyCell={
 char:string;symbol?:number;x:number;lineY:number;width:number;
};
export type VerseCryptogramPlan={
 titleY:number;keyTop:number;keyHeight:number;keySymbolSize:number;
 keyLetterSize:number;keyCells:VerseCipherKeyCell[];
 referenceY:number;referenceSize:number;
 bodyCells:VerseCipherBodyCell[];lineYs:number[];lineWidths:number[];
 lineCount:number;lineStep:number;cipherCell:number;symbolSize:number;
 answerLineWidth:number;wordGap:number;symbolTopOffset:number;
};

function characterWidth(cell:CipherCell,measure:MeasureText,cipherCell:number):number{
 return cell.symbol===undefined
  ?Math.max(7,measure(cell.char,10)+2):cipherCell;
}
function wordCells(data:CryptogramResult,measure:MeasureText,cipherCell:number):Word[]{
 return data.text.trim().split(/\s+/u).filter(Boolean).map(text=>{
  const cells=Array.from(text).map(char=>{
   const symbol=/^[A-Za-z]$/u.test(char)?data.mapping[char.toUpperCase()]:undefined;
   return symbol===undefined?{char}:{char,symbol};
  });
  return {cells,width:cells.reduce((sum,c)=>sum+characterWidth(c,measure,cipherCell),0)};
 });
}

/** Minimum row count, with dynamic programming to balance the full words.
 * Never split a word to gain a fraction of a point.
 */
function balancedRows(words:Word[],maxWidth:number,gap:number):Word[][]|null{
 if(!words.length||words.some(w=>w.width>maxWidth))return null;
 let count=1,used=0;
 for(const word of words){
  if(used&&used+gap+word.width>maxWidth){count++;used=0;}
  used+=(used?gap:0)+word.width;
 }
 const n=words.length;
 const sums=[0];
 for(const word of words)sums.push(sums[sums.length-1]+word.width);
 const widthOf=(start:number,end:number)=>
  sums[end]-sums[start]+(end-start-1)*gap;
 const dp=Array.from({length:count+1},()=>Array<number>(n+1).fill(Infinity));
 const previous=Array.from({length:count+1},()=>Array<number>(n+1).fill(-1));
 dp[0][0]=0;
 for(let row=1;row<=count;row++){
  for(let end=row;end<=n;end++){
   for(let start=row-1;start<end;start++){
    const width=widthOf(start,end);
    if(width>maxWidth+.001||!Number.isFinite(dp[row-1][start]))continue;
    const slack=maxWidth-width;
    const score=dp[row-1][start]+slack*slack*(row===count?.8:1);
    if(score<dp[row][end]){
     dp[row][end]=score;
     previous[row][end]=start;
    }
   }
  }
 }
 if(!Number.isFinite(dp[count][n]))return null;
 const result:Word[][]=[];
 let end=n;
 for(let row=count;row>0;row--){
  const start=previous[row][end];
  if(start<0)return null;
  result.unshift(words.slice(start,end));
  end=start;
 }
 return result;
}

/** Find the largest handwriting cell that fits, rather than minimizing rows.
 * This lets a 4-row Psalm use larger answer lines than the old 3-row,
 * fixed-13pt renderer. The single-row key and reference stay protected.
 * Both preview and exported PDF must consume this exact scene.
 */
export function planVerseCryptogram(
 data:CryptogramResult,measure:MeasureText,
 width=LARGE_CIPHER_WIDTH,height=LARGE_CIPHER_HEIGHT,
):VerseCryptogramPlan|null{
 const titleY=25,keyTop=38,keyHeight=29,referenceY=84,referenceSize=10;
 if(!data.key.length||!data.text.trim()||width<100||height<140)return null;
 if(data.reference&&measure(data.reference,referenceSize)>width)return null;
 const keyWidth=width/data.key.length;
 const keySymbolSize=Math.min(13,keyWidth*.7);
 const keyLetterSize=Math.min(9.2,keyWidth*.72);
 const keyCells=data.key.map((entry,i)=>({
  letter:entry.letter,symbol:entry.symbol,
  x:i*keyWidth,y:keyTop,width:keyWidth,
 }));
 const maxWidth=width-8,bodyTop=data.reference?102:83,bodyBottom=height-8;
 const available=bodyBottom-bodyTop;
 for(let half=VERSE_CIPHER_MAX_CELL*2;half>=VERSE_CIPHER_MIN_CELL*2;half--){
  const cipherCell=half/2;
  const wordGap=Math.max(VERSE_CIPHER_WORD_GAP,cipherCell*.85);
  const words=wordCells(data,measure,cipherCell);
  const lines=balancedRows(words,maxWidth,wordGap);
  if(!lines)continue;
  const symbolSize=Math.max(10,Math.min(15,cipherCell*.68));
  const symbolTopOffset=6;
  const inkHeight=symbolTopOffset+symbolSize;
  const minimumPitch=Math.max(28,symbolSize+18);
  const lineStep=lines.length===1?0:Math.min(42,(available-inkHeight)/(lines.length-1));
  if(lines.length>1&&lineStep<minimumPitch-.001)continue;
  const totalHeight=inkHeight+(lines.length-1)*lineStep;
  if(totalHeight>available+.001)continue;
  const firstY=bodyTop+(available-totalHeight)/2;
  const lineYs=lines.map((_,i)=>firstY+i*lineStep);
  const lineWidths=lines.map(row=>row.reduce((sum,word)=>sum+word.width,0)+
   (row.length-1)*wordGap);
  const bodyCells:VerseCipherBodyCell[]=[];
  lines.forEach((row,index)=>{
   let x=(width-lineWidths[index])/2;
   for(const [wordIndex,word] of row.entries()){
    for(const c of word.cells){
     const w=characterWidth(c,measure,cipherCell);
     bodyCells.push({char:c.char,...(c.symbol===undefined?{}:{symbol:c.symbol}),
      x,lineY:lineYs[index],width:w});
     x+=w;
    }
    if(wordIndex<row.length-1)x+=wordGap;
   }
  });
  return {
   titleY,keyTop,keyHeight,keySymbolSize,keyLetterSize,keyCells,
   referenceY,referenceSize,bodyCells,lineYs,lineWidths,
   lineCount:lines.length,lineStep,cipherCell,symbolSize,
   answerLineWidth:cipherCell-1.8,wordGap,symbolTopOffset,
  };
 }
 return null;
}
