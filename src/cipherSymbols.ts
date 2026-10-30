/**
 * Worksheet-owned vector drawing primitives; glyphs are NEVER rendered as
 * Unicode characters or emoji. The labels are explanatory metadata only.
 * Each path uses a 16 × 16 SVG coordinate system. Plain stroke geometry
 * and filled silhouettes work identically in browser SVG and pdf-lib.
 *
 * The user's 26-symbol shortlist repeated ∴. Position 17 uses a
 * provisional ☾ crescent instead, for 26 unambiguously different signs.
 */
export type CipherPath={d:string;filled?:boolean};
export type CipherSymbol={label:string;paths:readonly CipherPath[]};
const s=(d:string):CipherPath=>({d});
const f=(d:string):CipherPath=>({d,filled:true});
const ring=(cx:number,cy:number,r:number):string=>{
  const k=.5522847498*r;
  return [
    'M',cx+r,cy,'C',cx+r,cy+k,cx+k,cy+r,cx,cy+r,
    'C',cx-k,cy+r,cx-r,cy+k,cx-r,cy,
    'C',cx-r,cy-k,cx-k,cy-r,cx,cy-r,
    'C',cx+k,cy-r,cx+r,cy-k,cx+r,cy,'Z',
  ].join(' ');
};
const glyphs:readonly CipherSymbol[]=[
  {label:'■',paths:[f('M 2 2 H 14 V 14 H 2 Z')]},
  {label:'△',paths:[s('M 8 1 L 15 14 H 1 Z')]},
  {label:'◆',paths:[f('M 8 1 L 15 8 L 8 15 L 1 8 Z')]},
  {label:'☆',paths:[s('M 8 1 L 10.3 5.9 L 15.5 6.4 L 11.6 10 L 12.7 15 L 8 12.4 L 3.3 15 L 4.4 10 L .5 6.4 L 5.7 5.9 Z')]},
  {label:'♡',paths:[s('M 8 14 C 5 11 1 8 1 5 C 1 1 6 0 8 4 C 10 0 15 1 15 5 C 15 8 11 11 8 14 Z')]},
  {label:'✿',paths:[
    s('M 8 5 C 3 0 1 3 5 8 C 0 12 3 15 8 11 C 12 16 15 12 11 8 C 16 4 13 1 8 5 Z'),
    f(ring(8,8,2)),
  ]},
  {label:'♫',paths:[s('M 6 12 V 3 L 13 1 V 10 M 6 3 L 13 1 M 6 5 L 13 3'),
    f('M 6 11 C 3 10 1 12 2 14 C 3 16 7 14 6 12 Z'),
    f('M 13 9 C 10 8 8 10 9 12 C 10 14 14 12 13 10 Z')]},
  {label:'⚑',paths:[s('M 3 15 V 1 M 3 2 C 7 0 9 5 14 2 V 10 C 9 12 7 7 3 9')]},
  {label:'⌂',paths:[s('M 1 8 L 8 1 L 15 8 M 4 7 V 15 H 12 V 7 M 7 15 V 10 H 10 V 15')]},
  {label:'∞',paths:[s('M 8 8 C 5 2 1 3 1 8 C 1 13 5 14 8 8 C 11 2 15 3 15 8 C 15 13 11 14 8 8')]},
  {label:'◎',paths:[s(ring(8,8,7)),s(ring(8,8,3.4))]},
  {label:'∴',paths:[f(ring(8,3,1.6)),f(ring(3,12,1.6)),f(ring(13,12,1.6))]},
  {label:'⊗',paths:[s(ring(8,8,6.9)),s('M 4 4 L 12 12 M 12 4 L 4 12')]},
  {label:'◐',paths:[s(ring(8,8,6.5)),f('M 8 1.5 C 11.6 1.5 14.5 4.4 14.5 8 C 14.5 11.6 11.6 14.5 8 14.5 Z')]},
  {label:'↗',paths:[s('M 2 14 L 13 3 M 5 3 H 13 V 11')]},
  {label:'≋',paths:[s('M 1 3 C 5 0 11 6 15 3 M 1 8 C 5 5 11 11 15 8 M 1 13 C 5 10 11 16 15 13')]},
  {label:'☾',paths:[s('M 12 1 C 7 2 4 5 4 8 C 4 12 7 14 12 15 C 6 16 1 13 1 8 C 1 3 6 0 12 1 Z')]},
  {label:'※',paths:[s('M 3 3 L 13 13 M 13 3 L 3 13 M 8 1 V 15 M 1 8 H 15'),
    f(ring(8,8,1.8))]},
  {label:'⊞',paths:[s('M 2 2 H 14 V 14 H 2 Z M 8 4 V 12 M 4 8 H 12')]},
  {label:'⧓',paths:[s('M 2 3 H 14 L 8 8 L 14 13 H 2 L 8 8 Z')]},
  {label:'⟐',paths:[s('M 8 1 L 15 8 L 8 15 L 1 8 Z')]},
  {label:'⚠',paths:[s('M 8 1 L 15 14 H 1 Z M 8 5 V 10'),f(ring(8,12,0.8))]},
  {label:'☺',paths:[s(ring(8,8,7)),f(ring(5.3,6.3,1)),f(ring(10.7,6.3,1)),s('M 4 10 C 6 14 10 14 12 10')]},
  {label:'☀',paths:[s(ring(8,8,3.2)),s('M 8 0 V 3 M 8 13 V 16 M 0 8 H 3 M 13 8 H 16 M 2.3 2.3 L 4.4 4.4 M 11.6 11.6 L 13.7 13.7 M 13.7 2.3 L 11.6 4.4 M 4.4 11.6 L 2.3 13.7')]},
  {label:'Ω',paths:[s('M 6 14 H 1 V 12 H 4 C -1 6 3 1 8 1 C 13 1 17 6 12 12 H 15 V 14 H 10 V 12 C 16 6 12 3 8 3 C 4 3 0 6 6 12 Z')]},
  {label:'⇔',paths:[s('M 1 5 H 15 M 1 11 H 15 M 5 1 L 1 5 L 5 9 M 11 7 L 15 11 L 11 15')]},
];
export const CIPHER_SYMBOL_COUNT=glyphs.length;
export const CIPHER_SYMBOL_LABELS=glyphs.map(x=>x.label);
export function cipherSymbol(id:number):CipherSymbol {
  if(!Number.isInteger(id)||id<0||id>=glyphs.length)throw Error('Unknown cryptogram symbol');
  return glyphs[id];
}
export function cipherSymbolSignature(id:number):string{
  const glyph=cipherSymbol(id);
  return glyph.paths.map(p=>(p.filled?'F':'S')+p.d).join('|');
}
