/**
 * A complete 26-symbol pigpen alphabet, constructed from vector line segments.
 * No installed symbol font, platform-dependent emoji or embedded image required.
 * The first 18 glyphs use 3×3 grid edges, half with a dot; the final 8
 * use X-grid corners, half dotted. All coordinates are in a 16×16 square.
 */
export type Stroke = readonly [number,number,number,number];
export type CipherSymbol = {strokes:Stroke[];dot:boolean};
export const CIPHER_SYMBOL_COUNT=26;
export function cipherSymbol(id:number):CipherSymbol{
  if(!Number.isInteger(id)||id<0||id>=26)throw Error('Unknown cryptogram symbol');
  const strokes:Stroke[]=[];
  if(id<18){
    const shape=id%9,row=Math.floor(shape/3),col=shape%3;
    if(row>0)strokes.push([1,1,15,1]);
    if(row<2)strokes.push([1,15,15,15]);
    if(col>0)strokes.push([1,1,1,15]);
    if(col<2)strokes.push([15,1,15,15]);
    return {strokes,dot:id>=9};
  }
  const corner=(id-18)%4;
  const corners:Stroke[][]=[
    [[1,1,8,8],[15,1,8,8]],
    [[15,1,8,8],[15,15,8,8]],
    [[15,15,8,8],[1,15,8,8]],
    [[1,15,8,8],[1,1,8,8]],
  ];
  return {strokes:corners[corner],dot:id>=22};
}
export function cipherSymbolSignature(id:number):string {
  const s=cipherSymbol(id);
  return s.strokes.map(x=>x.join(',')).join(';')+(s.dot?'·':'');
}
