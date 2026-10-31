import {parseVerse,verseScrambles,type UnscrambleVerse} from './storyVerseModules.ts';
import {letterOnly,verseGlyphs,shortenBibleReference,type VerseGlyph} from './versePunctuation.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import type {UpsideDownVerseModule} from './specialtyModules.ts';

export type ReconstructionMark={
 kind:'ordinary'|'letter'|'punctuation';text:string;x:number;y:number;
 scramble?:string;upside?:boolean;
};
export type ReconstructionPlan={
 title:string;titleSize:number;titleY:number;reference?:string;referenceY?:number;
 marks:ReconstructionMark[];cell:number;fontSize:number;invertedFontSize:number;lineStep:number;glyphOffset:number;rowCount:number;
 rowWidths:number[];
};
type Metrics={title:MeasureText;body:MeasureText;puzzle:MeasureText};
type Segment={kind:'ordinary'|'blank'|'upside';text:string;scramble?:string};
type Chunk={segments:Segment[]};
function chunksFromSegments(segments:Segment[]):Chunk[]{
 const chunks:Chunk[]=[];let current:Segment[]=[];
 function finish(){if(current.length){chunks.push({segments:current});current=[];}}
 for(const segment of segments){
  if(segment.kind==='blank'){current.push(segment);continue;}
  for(const piece of segment.text.match(/\s+|[^\s]+/gu)??[]){
   if(/^\s+$/u.test(piece))finish();
   else current.push({...segment,text:piece});
  }
 }
 finish();
 return chunks;
}
function segmentsForUnscramble(m:UnscrambleVerse):Segment[]{
 const scrambled=verseScrambles(m),out:Segment[]=[];let i=0;
 for(const part of parseVerse(m.verse).parts){
  if(part.kind==='blank')out.push({kind:'blank',text:part.value,scramble:scrambled[i++]});
  else out.push({kind:'ordinary',text:part.value});
 }
 return out;
}
const glyphWidth=(g:VerseGlyph,cell:number)=>g.kind==='letter'?cell:cell*.44;
/** Minimize line-width imbalance across measured word-boundary chunks.
 * The old greedy wrapping could strand one or two words on the last line.
 * Preserve the minimum necessary row count and never split a marked blank,
 * its punctuation, or any other word. The Upside Down planner stays greedy.
 */
export function balanceUnscrambleRows<T extends {width:number}>(
 chunks:readonly T[],space:number,maxWidth:number,rowCount:number,
):T[][]|null{
 const n=chunks.length;
 if(n<rowCount||rowCount<1)return null;
 const prefix=[0];
 for(const chunk of chunks)prefix.push(prefix[prefix.length-1]+chunk.width);
 const span=(from:number,to:number)=>
  prefix[to]-prefix[from]+(to-from-1)*space;
 const totalWidth=prefix[n]+Math.max(0,n-rowCount)*space;
 const target=totalWidth/rowCount;
 const costs=Array.from({length:rowCount+1},()=>Array<number>(n+1).fill(Infinity));
 const previous=Array.from({length:rowCount+1},()=>Array<number>(n+1).fill(-1));
 costs[0][0]=0;
 for(let rows=1;rows<=rowCount;rows++){
  for(let end=rows;end<=n-(rowCount-rows);end++){
   for(let start=rows-1;start<end;start++){
    const width=span(start,end);
    if(width>maxWidth+.000001||!Number.isFinite(costs[rows-1][start]))continue;
    // Penalize tiny final rows naturally, but preserve all the text when
    // even the optimal layout must have a short word at the end.
    const delta=width-target;
    const score=costs[rows-1][start]+delta*delta;
    if(score<costs[rows][end]){
     costs[rows][end]=score;previous[rows][end]=start;
    }
   }
  }
 }
 if(!Number.isFinite(costs[rowCount][n]))return null;
 const result:T[][]=[];let end=n;
 for(let rows=rowCount;rows>=1;rows--){
  const start=previous[rows][end];
  if(start<0)return null;
  result.unshift(chunks.slice(start,end));end=start;
 }
 return result;
}
function planReconstruction(chunks:Chunk[],metrics:Metrics,mode:'unscramble'|'upside',
 title:string,reference:string|undefined,width:number,height:number):ReconstructionPlan|null{
 let titleSize=25;
 while(titleSize>=15&&metrics.title(title,titleSize)>width-8)titleSize-=.5;
 if(titleSize<15)return null;
 const titleY=25;
 const referenceY=undefined; // reference is in the title for both reconstruction modules.
 const top=mode==='unscramble'?53:44;
 for(let cell=(mode==='unscramble'?10.2:12.1);cell>=8.1;cell-=.5){
  const fontSize=mode==='unscramble'?Math.min(10.6,cell+1):Math.min(13,cell+1);
  const space=mode==='unscramble'?metrics.body(' ',fontSize):cell*.66;
  const measured=chunks.map(chunk=>{
   const items=chunk.segments.map(segment=>{
    const w=segment.kind==='ordinary'?metrics.body(segment.text,fontSize):
      verseGlyphs(segment.text).reduce((sum,g)=>sum+glyphWidth(g,cell),0);
    return {segment,width:w};
   });
   return {items,width:items.reduce((sum,i)=>sum+i.width,0)};
  });
  if(measured.some(c=>c.width>width-8))continue;
  let used=0;
  // Word-boundary greedy packing preserves the punctuation attached to its word.
  const rows:(typeof measured)[]=[];let row:typeof measured=[];used=0;
  for(const chunk of measured){
   const candidate=used+(row.length?space:0)+chunk.width;
   if(row.length&&candidate>width-8){rows.push(row);row=[];used=0;}
   if(row.length)used+=space;
   row.push(chunk);used+=chunk.width;
  }
  if(row.length)rows.push(row);
  if(!rows.length)continue;
  if(mode==='unscramble'){
   const balanced=balanceUnscrambleRows(measured,space,width-8,rows.length);
   if(!balanced)continue;
   rows.splice(0,rows.length,...balanced);
  }
  // Keep the handwriting-line pitch independent from glyph placement.
  const glyphOffset=mode==='unscramble'?11.5:6.8;
  const invertedFontSize=mode==='upside'
    ?Math.max(9.2,Math.min(11.5,fontSize-1.4)):8.2;
  // Only longer Upside passages reclaim a little of the *internal* bottom
  // reserve; the booklet's outer 0.1in inset is never changed.
  const bottom=height-(mode==='upside'&&rows.length>=4?3.5:7);
  const requiredBelow=glyphOffset+invertedFontSize+2;
  const availableStep=rows.length===1?29:
    (bottom-top-requiredBelow)/(rows.length-1);
  // Unscramble retains its comfortable 29pt minimum, but expands toward
  // 1.5× line spacing when a short verse leaves extra writing space.
  const step=mode==='unscramble'?Math.min(43.5,availableStep):Math.min(29,availableStep);
  if(step<(mode==='upside'?Math.max(21.2,requiredBelow+2.8):29)-.001)continue;
  if(top+(rows.length-1)*step+requiredBelow>bottom+.001)continue;
  const rowWidths=rows.map(row=>row.reduce((sum,chunk)=>sum+chunk.width,0)+
   Math.max(0,row.length-1)*space);
  const marks:ReconstructionMark[]=[];
  for(let line=0;line<rows.length;line++){
   const widthUsed=rows[line].reduce((sum,c)=>sum+c.width,0)+(rows[line].length-1)*space;
   let x=(width-widthUsed)/2;
   const y=top+line*step;
   for(const chunk of rows[line]){
    for(const {segment} of chunk.items){
     if(segment.kind==='ordinary'){
      marks.push({kind:'ordinary',text:segment.text,x,y});
      x+=metrics.body(segment.text,fontSize);
     }else{
      const glyphs=verseGlyphs(segment.text);
      const shuffled=Array.from(segment.scramble??'');
      let index=0;
      for(const g of glyphs){
       const w=glyphWidth(g,cell);
       if(g.kind==='letter'){
        marks.push({kind:'letter',text:g.value,x,y,
          ...(mode==='unscramble'?{scramble:shuffled[index++]??''}:{upside:true})});
       }else if(g.kind==='punctuation')marks.push({kind:'punctuation',text:g.value,x,y});
       x+=w;
      }
     }
    }
    x+=space;
   }
  }
  return {title,titleSize,titleY,reference,referenceY,marks,cell,fontSize,lineStep:step,
   glyphOffset,invertedFontSize,rowCount:rows.length,rowWidths};
 }
 return null;
}
export function planUnscrambleVerse(m:UnscrambleVerse,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):ReconstructionPlan|null{
 return planReconstruction(chunksFromSegments(segmentsForUnscramble(m)),metrics,'unscramble',
 'UNSCRAMBLE '+shortenBibleReference(m.reference).toUpperCase(),undefined,width,height);
}
export function planUpsideDownVerse(m:UpsideDownVerseModule,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):ReconstructionPlan|null{
 return planReconstruction(chunksFromSegments([{kind:'upside',text:m.verse.toUpperCase()}]),
  metrics,'upside',shortenBibleReference(m.reference)+' – Upside Down',undefined,width,height);
}
