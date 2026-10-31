import type {CryptogramResult} from './cryptograms.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';

/** One top-left print-space plan shared by browser SVG and PDF.
 * This only applies to the Medium Big Idea Cryptogram; the Large Verse
 * Cryptogram retains its existing separate layout.
 */
export const BIG_IDEA_CELL_WIDTH=13;
export const BIG_IDEA_WORD_GAP=16;
export const BIG_IDEA_SYMBOL_SIZE=8.5;
export const BIG_IDEA_ANSWER_LINE_WIDTH=BIG_IDEA_CELL_WIDTH-1.8;
export type BigIdeaKeyCell={letter:string;symbol:number;x:number;y:number;width:number};
export type BigIdeaBodyCell={char:string;symbol?:number;x:number;lineY:number;width:number};
export type BigIdeaPrintPlan={
 titleY:number;keyTop:number;keyHeight:number;keySymbolSize:number;keyLetterSize:number;
 keyCells:BigIdeaKeyCell[];bodyCells:BigIdeaBodyCell[];lineYs:number[];
 lineStep:number;lineCount:number;firstLineGap:number;
};
type Cell={char:string;symbol?:number};
type Word={cells:Cell[];width:number};
const WIDTH_INSET=4;
const PUNCTUATION_FONT_SIZE=10;
function cellWidth(cell:Cell,measure:MeasureText):number{
 return cell.symbol===undefined
  ?Math.max(7,measure(cell.char,PUNCTUATION_FONT_SIZE)+2)
  :BIG_IDEA_CELL_WIDTH;
}
function wordGroups(data:CryptogramResult,measure:MeasureText):Word[]{
 return data.text.trim().split(/\s+/u).filter(Boolean).map(text=>{
  const cells=Array.from(text).map(char=>{
   const id=/^[A-Za-z]$/u.test(char)?data.mapping[char.toUpperCase()]:undefined;
   return id===undefined?{char}:{char,symbol:id};
  });
  return {cells,width:cells.reduce((sum,c)=>sum+cellWidth(c,measure),0)};
 });
}
export function planBigIdeaCryptogram(data:CryptogramResult,measure:MeasureText,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):BigIdeaPrintPlan|null{
 const titleY=24,keyTop=32,keyHeight=23,keySymbolSize=10.2,keyLetterSize=8.9;
 const keyCells:BigIdeaKeyCell[]=data.key.map((entry,i)=>({
  letter:entry.letter,symbol:entry.symbol,x:i*width/data.key.length,
  y:keyTop,width:width/data.key.length,
 }));
 const content=wordGroups(data,measure);
 const maxWidth=width-WIDTH_INSET*2;
 if(!content.length||content.some(w=>w.width>maxWidth))return null;
 const lines:Word[][]=[];
 let line:Word[]=[],used=0;
 for(const word of content){
  const next=used+(line.length?BIG_IDEA_WORD_GAP:0)+word.width;
  if(line.length&&next>maxWidth){lines.push(line);line=[];used=0;}
  if(line.length)used+=BIG_IDEA_WORD_GAP;
  line.push(word);used+=word.width;
 }
 if(line.length)lines.push(line);
 if(lines.length>3)return null;
 // A symbol is subordinate to its writing line: shorten its vertical footprint
 // without reducing the 13-point width of a child's answer line.
 const glyphTopOffset=4;
 const inkHeight=glyphTopOffset+BIG_IDEA_SYMBOL_SIZE+1;
 const firstAllowed=keyTop+keyHeight+18;
 const bottomLimit=height-5;
 const available=bottomLimit-firstAllowed;
 const minimumPitch=28;
 const step=lines.length===1?0:Math.min(36,(available-inkHeight)/(lines.length-1));
 if(lines.length>1&&step<minimumPitch)return null;
 const totalHeight=inkHeight+(lines.length-1)*step;
 // Center the cipher rows in the usable area, never allowing the key to crowd
 // the first blank line even in a three-line Big Idea.
 const firstY=firstAllowed+(available-totalHeight)/2;
 const lineYs=lines.map((_,i)=>firstY+i*step);
 const bodyCells:BigIdeaBodyCell[]=[];
 lines.forEach((row,lineIndex)=>{
  const rowWidth=row.reduce((sum,word)=>sum+word.width,0)+(row.length-1)*BIG_IDEA_WORD_GAP;
  let x=(width-rowWidth)/2;
  for(const [wordIndex,word] of row.entries()){
   for(const c of word.cells){
    const w=cellWidth(c,measure);
    bodyCells.push({char:c.char,...(c.symbol===undefined?{}:{symbol:c.symbol}),
      x,lineY:lineYs[lineIndex],width:w});
    x+=w;
   }
   if(wordIndex<row.length-1)x+=BIG_IDEA_WORD_GAP;
  }
 });
 return {titleY,keyTop,keyHeight,keySymbolSize,keyLetterSize,keyCells,bodyCells,
  lineYs,lineStep:step,lineCount:lines.length,firstLineGap:firstY-(keyTop+keyHeight)};
}
