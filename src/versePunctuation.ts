/** Shared punctuation rules for verse-reconstruction worksheets.
 * A-Z letters require handwriting lines; apostrophes and terminal marks
 * remain visibly printed on the answer line, never scrambled or flipped.
 */
export const VERSE_PUNCTUATION=/^[.,!?;:'’"“”()\-–—]$/u;
export const LETTER=/^[A-Za-z]$/u;
export type VerseGlyph={value:string;kind:'letter'|'punctuation'|'space'};
export function verseGlyphs(input:string):VerseGlyph[]{
 return Array.from(input.toUpperCase()).map(value=>({
  value,kind:/\s/u.test(value)?'space':LETTER.test(value)?'letter':'punctuation',
 }));
}
export function letterOnly(value:string):string{
 return verseGlyphs(value).filter(g=>g.kind==='letter').map(g=>g.value).join('');
}
export function validBracketedAnswer(value:string):boolean{
 const parts=verseGlyphs(value);
 return letterOnly(value).length>=1 && letterOnly(value).length<=9 &&
  parts.every(g=>g.kind==='letter'||g.kind==='punctuation'&&VERSE_PUNCTUATION.test(g.value)) &&
  !/\s/u.test(value);
}
/** Shortens book names only for the combined Upside Down heading. */
const BOOK_ABBREVIATIONS:readonly [string,string][]=[
 ['Song of Solomon','Song'],['1 Thessalonians','1 Thess.'],['2 Thessalonians','2 Thess.'],
 ['New Testament','NT'],['1 Corinthians','1 Cor.'],['2 Corinthians','2 Cor.'],
 ['1 Chronicles','1 Chron.'],['2 Chronicles','2 Chron.'],
 ['Ecclesiastes','Eccl.'],['Lamentations','Lam.'],['Deuteronomy','Deut.'],
 ['Philippians','Phil.'],['Colossians','Col.'],['Revelation','Rev.'],
 ['Leviticus','Lev.'],['Zephaniah','Zeph.'],['Zechariah','Zech.'],
];
export function shortenBibleReference(reference:string):string{
 const clean=reference.trim();
 for(const [name,short] of BOOK_ABBREVIATIONS){
  const re=new RegExp('^'+name+'(?=\\s|\\d|$)','iu');
  if(re.test(clean))return clean.replace(re,short);
 }
 return clean;
}
