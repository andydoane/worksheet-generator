/**
 * Converts the user's textarea selection to an exact [blank] marker.
 * Browsers may select a trailing space when a word is double-clicked.
 * Offsets (not string replacement) are used so repeated words are safe.
 */
export type MarkedWord={text:string;selectionStart:number;selectionEnd:number};
const WORD=/^[\p{L}]+(?:['’-][\p{L}]+)*$/u;
const CHAR=/[\p{L}'’-]/u;
export function markWordSelection(text:string,start:number,end:number):MarkedWord|null{
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>text.length)return null;
  while(start<end&&/\s/u.test(text[start]))start++;
  while(end>start&&/\s/u.test(text[end-1]))end--;
  if(start===end){
    while(start>0&&CHAR.test(text[start-1]))start--;
    while(end<text.length&&CHAR.test(text[end]))end++;
  }
  const selected=text.slice(start,end);
  if(!WORD.test(selected)||text[start-1]==='['&&text[end]===']')return null;
  const updated=text.slice(0,start)+'['+selected+']'+text.slice(end);
  return {text:updated,selectionStart:start+1,selectionEnd:end+1};
}
