import {shuffledIndices} from './shuffle.ts';
import type {MeasureText} from './mediumParityLayout.ts';

/** Shared, seeded, collision-aware word placement. Its point-space coordinates
 * work in either PDF or SVG and are intentionally independent of module size.
 * PR 11f adopts it for Big Idea; a later PR can reuse it for Large Verse.
 */
/** Both current Connect activities render scattered words at the same
 * fraction of their historical target size. Reference word banks are exempt.
 */
export const CONNECT_SCATTER_FONT_SCALE=0.8;
export const scaleConnectScatterFont=(originalSize:number):number=>
  Math.round(originalSize*CONNECT_SCATTER_FONT_SCALE*1000)/1000;

export type ScatterBounds={x:number;y:number;width:number;height:number};
export type ScatterGlyph={char:string;x:number;y:number};
export type ScatteredWord={
 word:string;order:number;x:number;y:number;angle:number;
 fontSize:number;glyphs:ScatterGlyph[];
 bounds:ScatterBounds;
 /** Printed word box dimensions. Present only for opt-in boxed layouts. */
 box?:{width:number;height:number};
};
export type ScatterResult={fontSize:number;words:ScatteredWord[]};
export type ScatterOptions={
 words:string[];seed:number;key:string;field:ScatterBounds;
 measure:MeasureText;maxFont?:number;minFont?:number;gap?:number;
 /** Optional pre-scale font target, so gap stays large even when letters shrink. */
 gapReferenceFont?:number;
 /** Box occupies measured ink width plus padding; its full exterior is collision-tested. */
 boxed?:{paddingX:number;paddingY:number};
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
  // Preserve the original printed word clearance instead of reducing the
  // collision margin when the lettering is scaled to 80%. Historically,
  // clearance followed the *unscaled* font size, so use that reference.
  const gap=(options.gap??2.1)*Math.max(.75,(options.gapReferenceFont??fontSize)/11);
  const picked:ScatteredWord[]=[];
  let failed=false;
  for(const entry of ordered){
   const width=measure(entry.word,fontSize),height=fontSize*1.24;
   const box=options.boxed?{
    width:width+2*options.boxed.paddingX,
    height:height+2*options.boxed.paddingY,
   }:undefined;
   // The conservative bounds include at least .6pt around every border
   // (the actual vector stroke extends at most .4pt beyond the rectangle).
   const exteriorWidth=(box?.width??width)+1.2;
   const exteriorHeight=(box?.height??height)+1.2;
   if((box?exteriorWidth:width)+2*margin>field.width||
    (box?exteriorHeight:height)+2*margin>field.height){
    failed=true;break;
   }
   let best:{score:number;cx:number;cy:number;angle:number;bounds:ScatterBounds}|null=null;
   // Uniform seeded 2-D proposals with conservative rotated bounding boxes.
   // No columns, slots, or predeclared rows determine positions.
   for(let trial=0;trial<1600;trial++){
    const angle=options.boxed?0:(random()-.5)*2.6; // boxed words stay level
    const radians=angle*Math.PI/180;
    const boxWidth=exteriorWidth*Math.cos(radians)+exteriorHeight*Math.abs(Math.sin(radians));
    const boxHeight=exteriorHeight*Math.cos(radians)+exteriorWidth*Math.abs(Math.sin(radians));
    const cx=field.x+margin+boxWidth/2+random()*(field.width-2*margin-boxWidth);
    const cy=field.y+margin+boxHeight/2+random()*(field.height-2*margin-boxHeight);
    const bounds={x:cx-boxWidth/2,y:cy-boxHeight/2,width:boxWidth,height:boxHeight};
    if(picked.some(p=>intersect(bounds,p.bounds,gap)))continue;
    const minDistance=picked.length?Math.min(...picked.map(p=>{
     const dx=(cx-p.x)/field.width,dy=(cy-p.y)/field.height;
     return Math.sqrt(dx*dx+dy*dy);
    })):1;
    // Keep some distance between words, but avoid the regular lattice
    // that a pure farthest-point score tends to create.
    const nx=(cx-field.x)/field.width,ny=(cy-field.y)/field.height;
    const edge=Math.min(nx,1-nx,ny,1-ny);
    // Stop rewarding perfectly regular rows and columns once nearby words
    // have reasonable breathing room. The seeded random component is
    // deliberately stronger than the capped spacing preference: this
    // produces genuine irregular scatter rather than a max-distance grid.
    const score=Math.min(.16,minDistance)*.12+.012*edge+random()*.075;
    if(!best||score>best.score)best={score,cx,cy,angle,bounds};
   }
   if(!best){failed=true;break;}
   const glyphs:ScatterGlyph[]=[];
   let pen=-width/2;
   for(const char of Array.from(entry.word)){
    glyphs.push({char,x:pen,y:fontSize*.29+(options.boxed?0:(random()-.5)*.42)});
    pen+=measure(char,fontSize);
   }
   picked.push({
    word:entry.word,order:entry.order,x:best.cx,y:best.cy,angle:best.angle,
    fontSize,glyphs,bounds:best.bounds,...(box?{box}:{}),
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

/** Extent coverage is based on visible conservative word boxes, rather
 * than their centers. Ratios are relative to the usable scatter field.
 */
export function scatterCoverage(words:readonly ScatteredWord[],field:ScatterBounds){
 if(!words.length)return {width:0,height:0};
 const left=Math.min(...words.map(w=>w.bounds.x));
 const right=Math.max(...words.map(w=>w.bounds.x+w.bounds.width));
 const top=Math.min(...words.map(w=>w.bounds.y));
 const bottom=Math.max(...words.map(w=>w.bounds.y+w.bounds.height));
 return {width:(right-left)/field.width,height:(bottom-top)/field.height};
}

/** Expand a finished collision-free scatter to use more of the canvas.
 * Each axis transforms all *word centers* by a common affine stretch,
 * always with scale >= 1. Consequently, every pair's axis-separated
 * clearance can only grow; no new collision or handwriting obstruction
 * can be introduced. Original word size, rotation and glyph jitter are
 * unchanged. Recenter the visible *bounds* within the permitted field.
 *
 * Applied opt-in to Medium Connect the Big Idea, NOT Large Connect Verse.
 */
export function expandScatterCoverage(words:readonly ScatteredWord[],
 field:ScatterBounds,target=0.86):ScatteredWord[]{
 if(words.length<2)return [...words];
 const output=words.map(word=>({...word,bounds:{...word.bounds}}));
 for(const axis of ['x','y'] as const){
  const dimension=axis==='x'?'width':'height';
  const start=field[axis],span=field[dimension],mid=start+span/2,margin=2;
  const centers=output.map(w=>w[axis]);
  const halfSizes=output.map(w=>w.bounds[dimension]/2);
  if(Math.max(...centers)-Math.min(...centers)<.00001)continue;
  const positions=(s:number)=>centers.map(c=>mid+(c-mid)*s);
  const limits=(s:number)=>{
   const at=positions(s);
   let lower=-Infinity,upper=Infinity;
   for(let i=0;i<at.length;i++){
    lower=Math.max(lower,start+margin+halfSizes[i]-at[i]);
    upper=Math.min(upper,start+span-margin-halfSizes[i]-at[i]);
   }
   return {lower,upper,at,feasible:lower<=upper+.0000001};
  };
  const extents=(at:number[])=>({
   low:Math.min(...at.map((v,i)=>v-halfSizes[i])),
   high:Math.max(...at.map((v,i)=>v+halfSizes[i])),
  });
  const base=limits(1);
  if(!base.feasible)continue;
  let hi=2;
  while(hi<64&&limits(hi).feasible)hi*=2;
  let lo=1;
  for(let i=0;i<36;i++){
   const m=(lo+hi)/2;
   if(limits(m).feasible)lo=m;else hi=m;
  }
  const maxScale=lo;
  // Find only enough stretch to reach desired coverage, unless the
  // available dimensions physically prevent the desired target.
  let minScale=1,maxSearch=maxScale;
  for(let i=0;i<36;i++){
   const s=(minScale+maxSearch)/2;
   const at=positions(s),e=extents(at);
   if((e.high-e.low)/span<target)minScale=s;else maxSearch=s;
  }
  const originalCoverage=(()=>{
   const e=extents(base.at);return (e.high-e.low)/span;
  })();
  if(originalCoverage>=target)continue;
  const scaled=limits(maxSearch);
  const edges=extents(scaled.at);
  const wantedShift=mid-(edges.low+edges.high)/2;
  const shift=Math.max(scaled.lower,Math.min(scaled.upper,wantedShift));
  for(let i=0;i<output.length;i++){
   const newCenter=scaled.at[i]+shift;
   output[i][axis]=newCenter;
   output[i].bounds[axis]=newCenter-halfSizes[i];
  }
 }
 return output;
}
