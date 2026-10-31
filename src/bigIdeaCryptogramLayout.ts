import type {CryptogramResult} from './cryptograms.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';

/** One top-left measured scene shared by browser SVG and Medium PDF.
 * The Large Verse Cryptogram keeps its separate, unchanged PDF renderer.
 * These constants are the dense-layout minimum, not a fixed cell size.
 */
export const BIG_IDEA_CELL_WIDTH=13;
export const BIG_IDEA_WORD_GAP=16;
export const BIG_IDEA_SYMBOL_SIZE=8.5;
export const BIG_IDEA_ANSWER_LINE_WIDTH=BIG_IDEA_CELL_WIDTH-1.8;
export const BIG_IDEA_MAX_CELL_WIDTH=21.5;
export type BigIdeaKeyCell={letter:string;symbol:number;x:number;y:number;width:number};
export type BigIdeaBodyCell={char:string;symbol?:number;x:number;lineY:number;width:number};
export type BigIdeaPrintPlan={
 titleY:number;keyTop:number;keyHeight:number;keySymbolSize:number;keyLetterSize:number;
 keyCells:BigIdeaKeyCell[];bodyCells:BigIdeaBodyCell[];lineYs:number[];
 cellWidth:number;symbolSize:number;answerLineWidth:number;wordGap:number;
 lineStep:number;lineCount:number;firstLineGap:number;
};
type Cell={char:string;symbol?:number};
type Word={cells:Cell[];width:number};
const WIDTH_INSET=4;
const PUNCTUATION_FONT_SIZE=10;
function cellWidth(cell:Cell,measure:MeasureText,cipherCell:number):number{
 return cell.symbol===undefined
  ?Math.max(7,measure(cell.char,PUNCTUATION_FONT_SIZE)+2)
  :cipherCell;
}
function wordGroups(data:CryptogramResult,measure:MeasureText,cipherCell:number):Word[]{
 return data.text.trim().split(/\s+/u).filter(Boolean).map(text=>{
  const cells=Array.from(text).map(char=>{
   const id=/^[A-Za-z]$/u.test(char)?data.mapping[char.toUpperCase()]:undefined;
   return id===undefined?{char}:{char,symbol:id};
  });
  return {cells,width:cells.reduce((sum,c)=>sum+cellWidth(c,measure,cipherCell),0)};
 });
}
function wrapWords(content:Word[],maxWidth:number,wordGap:number):Word[][]|null{
 if(!content.length||content.some(w=>w.width>maxWidth))return null;
 const lines:Word[][]=[];
 let row:Word[]=[],used=0;
 for(const word of content){
  const candidate=used+(row.length?wordGap:0)+word.width;
  if(row.length&&candidate>maxWidth){lines.push(row);row=[];used=0;}
  if(row.length)used+=wordGap;
  row.push(word);used+=word.width;
 }
 if(row.length)lines.push(row);
 return lines.length<=3?lines:null;
}

/** Use the largest readable cipher cells that still fit in three rows,
 * leaving the key and a >=28pt row pitch untouched. Short messages receive
 * significantly larger glyphs and handwriting lines; max-length messages
 * retain the proven dense 13pt minimum.
 */
export function planBigIdeaCryptogram(data:CryptogramResult,measure:MeasureText,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):BigIdeaPrintPlan|null{
 const titleY=24,keyTop=32,keyHeight=23,keySymbolSize=10.2,keyLetterSize=8.9;
 const keyCells:BigIdeaKeyCell[]=data.key.map((entry,i)=>({
  letter:entry.letter,symbol:entry.symbol,x:i*width/data.key.length,
  y:keyTop,width:width/data.key.length,
 }));
 const maxWidth=width-WIDTH_INSET*2,wordGap=BIG_IDEA_WORD_GAP;
 for(let cipherCell=BIG_IDEA_MAX_CELL_WIDTH;
  cipherCell>=BIG_IDEA_CELL_WIDTH-.001;cipherCell-=.5){
  const content=wordGroups(data,measure,cipherCell);
  const lines=wrapWords(content,maxWidth,wordGap);
  if(!lines)continue;
  const symbolSize=Math.min(12.5,Math.max(BIG_IDEA_SYMBOL_SIZE,cipherCell*.65));
  const answerLineWidth=cipherCell-1.8;
  const glyphTopOffset=4;
  const inkHeight=glyphTopOffset+symbolSize+1;
  const firstAllowed=keyTop+keyHeight+18;
  const bottomLimit=height-5;
  const available=bottomLimit-firstAllowed;
  const minimumPitch=28;
  const step=lines.length===1?0:Math.min(36,(available-inkHeight)/(lines.length-1));
  if(lines.length>1&&step<minimumPitch)continue;
  const totalHeight=inkHeight+(lines.length-1)*step;
  const firstY=firstAllowed+(available-totalHeight)/2;
  const lineYs=lines.map((_,i)=>firstY+i*step);
  const bodyCells:BigIdeaBodyCell[]=[];
  lines.forEach((row,lineIndex)=>{
   const rowWidth=row.reduce((sum,word)=>sum+word.width,0)+(row.length-1)*wordGap;
   let x=(width-rowWidth)/2;
   for(const [wordIndex,word] of row.entries()){
    for(const c of word.cells){
     const w=cellWidth(c,measure,cipherCell);
     bodyCells.push({char:c.char,...(c.symbol===undefined?{}:{symbol:c.symbol}),
      x,lineY:lineYs[lineIndex],width:w});
     x+=w;
    }
    if(wordIndex<row.length-1)x+=wordGap;
   }
  });
  return {titleY,keyTop,keyHeight,keySymbolSize,keyLetterSize,keyCells,bodyCells,
   cellWidth:cipherCell,symbolSize,answerLineWidth,wordGap,
   lineYs,lineStep:step,lineCount:lines.length,firstLineGap:firstY-(keyTop+keyHeight)};
 }
 return null;
}
