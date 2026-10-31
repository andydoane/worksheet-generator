/** Real glyph-ink midpoint measured from the embedded TrueType outline.
 * Returns how far the ink center lies ABOVE the baseline in print points.
 * Calculated separately for each word, so caps/descenders center correctly.
 */
export function glyphInkCenter(face:{
 unitsPerEm:number;
 ascent?:number;descent?:number;
 layout:(text:string)=>{glyphs:Array<{bbox?:{minY:number;maxY:number}}>};
},text:string,size:number):number{
 const boxes=face.layout(text).glyphs.map(g=>g.bbox).filter(
  (b):b is {minY:number;maxY:number}=>!!b &&
    Number.isFinite(b.minY)&&Number.isFinite(b.maxY)
 );
 const high=boxes.length?Math.max(...boxes.map(b=>b.maxY)):face.ascent??0;
 const low=boxes.length?Math.min(...boxes.map(b=>b.minY)):face.descent??0;
 return (high+low)/2*size/face.unitsPerEm;
}
