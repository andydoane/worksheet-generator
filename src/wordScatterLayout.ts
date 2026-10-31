import {shuffledIndices} from './shuffle.ts';
import type {MeasureText} from './mediumParityLayout.ts';

/** Shared, seeded, collision-aware word placement. Its point-space coordinates
 * work in either PDF or SVG and are intentionally independent of module size.
 * PR 11f adopts it for Big Idea; a later PR can reuse it for Large Verse.
 */
export type ScatterBounds={x:number;y:number;width:number;height:number};
export type ScatterGlyph={char:string;x:number;y:number};
export type ScatteredWord={
 word:string;order:number;x:number;y:number;angle:number;
 fontSize:number;glyphs:ScatterGlyph[];
 bounds:ScatterBounds;
};
export type ScatterResult={fontSize:number;words:ScatteredWord[]};
export type ScatterOptions={
 words:string[];seed:number;key:string;field:ScatterBounds;
 measure:MeasureText;maxFont?:number;minFont?:number;gap?:number;
};
function seedState(text:string,seed:number):()=>number{
 let state=(seed>>>0)^2166136261;
 for(const char of text){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}
 if(!state)state=1;
 return ()=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return state/4294967296;
 };
}
function intersect(a:ScatterBounds,b:ScatterBounds,gap:number):boolean{
 return a.x+a.width+gap>b.x&&b.x+b.width+gap>a.x&&
  a.y+a.height+gap>b.y&&b.y+b.height+gap>a.y;
}
export function scatterWords(options:ScatterOptions):ScatterResult|null{
 const {words,field,measure}=options;
 if(words.length<1||field.width<=0||field.height<=0)return null;
 // Place long words first to avoid leaving impossible narrow slots, but
 // their shuffled initial order supplies deterministic, unique placement.
 const order=shuffledIndices(words.length,options.key,options.seed);
 const ordered=order.map(i=>({word:words[i],order:i})).sort((a,b)=>
   b.word.length-a.word.length||order.indexOf(a.order)-order.indexOf(b.order));
 const max=options.maxFont??13,min=options.minFont??8.3;
 const margin=2;
 for(let fontSize=max;fontSize>=min-.01;fontSize-=.5){
  const random=seedState(options.key+'|'+fontSize,options.seed);
  const gap=(options.gap??2.1)*Math.max(.75,fontSize/11);
  const picked:ScatteredWord[]=[];
  let failed=false;
  for(const entry of ordered){
   const width=measure(entry.word,fontSize),height=fontSize*1.24;
   if(width+2*margin>field.width||height+2*margin>field.height){failed=true;break;}
   let best:{score:number;cx:number;cy:number;angle:number;bounds:ScatterBounds}|null=null;
   // Uniform seeded 2-D proposals with conservative rotated bounding boxes.
   // No columns, slots, or predeclared rows determine positions.
   for(let trial=0;trial<1600;trial++){
    const angle=(random()-.5)*2.6; // ±1.3 degrees, much less than the old jitter.
    const radians=angle*Math.PI/180;
    const boxWidth=width*Math.cos(radians)+height*Math.abs(Math.sin(radians))+1.2;
    const boxHeight=height*Math.cos(radians)+width*Math.abs(Math.sin(radians))+1.2;
    const cx=field.x+margin+boxWidth/2+random()*(field.width-2*margin-boxWidth);
    const cy=field.y+margin+boxHeight/2+random()*(field.height-2*margin-boxHeight);
    const bounds={x:cx-boxWidth/2,y:cy-boxHeight/2,width:boxWidth,height:boxHeight};
    if(picked.some(p=>intersect(bounds,p.bounds,gap)))continue;
    const minDistance=picked.length?Math.min(...picked.map(p=>{
     const dx=(cx-p.x)/field.width,dy=(cy-p.y)/field.height;
     return Math.sqrt(dx*dx+dy*dy);
    })):1;
    // Blue-noise-style spacing, with a gentle penalty for clustering near
    // the extreme edges; avoids accidental grids and column structure.
    const nx=(cx-field.x)/field.width,ny=(cy-field.y)/field.height;
    const edge=Math.min(nx,1-nx,ny,1-ny);
    const score=Math.min(.55,minDistance)+.09*edge+random()*.009;
    if(!best||score>best.score)best={score,cx,cy,angle,bounds};
   }
   if(!best){failed=true;break;}
   const glyphs:ScatterGlyph[]=[];
   let pen=-width/2;
   for(const char of Array.from(entry.word)){
    glyphs.push({char,x:pen,y:(random()-.5)*.42});
    pen+=measure(char,fontSize);
   }
   picked.push({
    word:entry.word,order:entry.order,x:best.cx,y:best.cy,angle:best.angle,
    fontSize,glyphs,bounds:best.bounds,
   });
  }
  if(!failed)return {fontSize,words:picked.sort((a,b)=>a.order-b.order)};
 }
 return null;
}
/** Testable collision predicate, with the same conservative bounds as layout. */
export function scatterHasCollision(words:readonly ScatteredWord[],gap=0):boolean{
 return words.some((item,i)=>words.slice(i+1).some(other=>intersect(item.bounds,other.bounds,gap)));
}
