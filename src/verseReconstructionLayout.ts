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
 marks:ReconstructionMark[];cell:number;fontSize:number;lineStep:number;rowCount:number;
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
function planReconstruction(chunks:Chunk[],metrics:Metrics,mode:'unscramble'|'upside',
 title:string,reference:string|undefined,width:number,height:number):ReconstructionPlan|null{
 let titleSize=25;
 while(titleSize>=15&&metrics.title(title,titleSize)>width-8)titleSize-=.5;
 if(titleSize<15)return null;
 const titleY=25;
 const referenceY=mode==='unscramble'?43:undefined;
 const top=mode==='unscramble'?69:53;
 const bottom=height-7;
 for(let cell=(mode==='unscramble'?10.2:12.1);cell>=8.1;cell-=.5){
  const fontSize=mode==='unscramble'?Math.min(10.6,cell+1):Math.min(13,cell+1);
  const step=mode==='unscramble'?29:Math.max(21.5,cell*1.95);
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
  if(!rows.length||top+(rows.length-1)*step+(mode==='unscramble'?16:13)>bottom)continue;
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
  return {title,titleSize,titleY,reference,referenceY,marks,cell,fontSize,lineStep:step,rowCount:rows.length};
 }
 return null;
}
export function planUnscrambleVerse(m:UnscrambleVerse,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):ReconstructionPlan|null{
 return planReconstruction(chunksFromSegments(segmentsForUnscramble(m)),metrics,'unscramble',
 'UNSCRAMBLE THE VERSE',m.reference,width,height);
}
export function planUpsideDownVerse(m:UpsideDownVerseModule,metrics:Metrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):ReconstructionPlan|null{
 return planReconstruction(chunksFromSegments([{kind:'upside',text:m.verse.toUpperCase()}]),
  metrics,'upside',shortenBibleReference(m.reference)+' – Upside Down',undefined,width,height);
}
