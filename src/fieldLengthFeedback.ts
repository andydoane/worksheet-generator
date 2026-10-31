import type {ActivityModule} from './modules.ts';
import {parseStatements} from './storyVerseModules.ts';

/** Length-only feedback for editor fields. These correspond to the existing
 * validation caps; other errors continue to appear in the validation panel.
 * Never truncate or reject input: users can edit their way back into range.
 */
const lines=(value:string)=>value.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean);
const tooLongLine=(value:string,max:number)=>lines(value).some(s=>s.length>max);
export function fieldExceedsLength(module:ActivityModule,id:string,value:string):boolean{
 switch(id){
  case 'draw-prompt':return value.trim().length>105;
  case 'matching-pairs':return lines(value).some(line=>{
   const comma=line.indexOf(',');
   return comma<0?line.length>22:
    line.slice(0,comma).trim().length>22||line.slice(comma+1).trim().length>22;
  });
  case 'story-text':return value.length>1100;
  case 'mc-question':return value.trim().length>105;
  case 'mc-correct':case 'mc-wrong1':case 'mc-wrong2':
    return value.trim().length>42;
  case 'tf-statement':return value.trim().length>80;
  case 'fl-reference':return value.trim().length>32;
  case 'odd-correct':case 'odd-incorrect':
    return tooLongLine(value,12);
  case 'check-correct':case 'check-incorrect':
    return tooLongLine(value,14);
  case 'un-first':case 'un-second':return value.trim().length>10;
  case 'who-clue':return value.trim().length>170;
  case 'who-answer':return (value.match(/\p{L}/gu)??[]).length>14;
  case 'sv-events':return tooLongLine(value,115);
  case 'sv-statements':return parseStatements(value).some(row=>row.text.length>115);
  case 'sv-draw':return tooLongLine(value,105);
  case 'sv-reference':return value.length>38;
  case 'sv-verse':
    return value.length>(module.type==='finish-verse'?300:240);
  case 'sv-mistakes':return value.length>475;
  case 'search-words':return lines(value).some(s=>
    s.replace(/\s/gu,'').length>12);
  case 'maze-statement':return value.length>65;
  case 'crypto-ref':return value.length>42;
  case 'crypto-content':return value.trim().length>
    (module.type==='verse-cryptogram'?145:62);
  case 'cross-entries':return lines(value).some(s=>{
    const comma=s.indexOf(',');
    return comma>=0&&s.slice(comma+1).trim().length>85;
  });
  case 'special-ref':return value.length>
    (module.type==='spiral-verse'?45:42);
  case 'special-verse':return value.length>
    (module.type==='spiral-verse'?260:240);
  case 'connect-text':return value.length>
    (module.type==='connect-verse'?260:125);
  default:return false;
 }
}
