import {BOOKLET} from './booklet.ts';
import type {MeasureText} from './mediumParityLayout.ts';
import {balancedBankLines} from './balancedBankLines.ts';
import {parseConnectionWords,type ConnectVerseModule} from './specialtyModules.ts';
import {scatterWords,type ScatteredWord,type ScatterBounds} from './wordScatterLayout.ts';

export const CONNECT_VERSE_TITLE='CONNECT THE VERSE';
export const CONNECT_VERSE_INSTRUCTION='Connect each word to the next in order.';
export const LARGE_CONNECT_WIDTH=(BOOKLET.cell.width*2-BOOKLET.padding*2)*72;
export const LARGE_CONNECT_HEIGHT=(BOOKLET.cell.height*2-BOOKLET.padding*2)*72;
export type ConnectVersePrintPlan={
 titleY:number;subtitleY:number;subtitleSize:number;
 bankTop:number;bankHeight:number;bankFontSize:number;
 bankLines:{text:string;x:number;y:number}[];
 field:ScatterBounds;scattered:ScatteredWord[];fontSize:number;
};

/** Large print-space scene. The boxed bank follows Spiral Verse's Nunito
 * Bold verse style and presents the original punctuation and word order;
 * only the scattered words are normalized to uppercase.
 */
export function planConnectVerse(module:ConnectVerseModule,metrics:{
 puzzle:MeasureText;verse:MeasureText;subtitle:MeasureText;
},width=LARGE_CONNECT_WIDTH,height=LARGE_CONNECT_HEIGHT):ConnectVersePrintPlan|null{
 const words=parseConnectionWords(module.verse);
 if(words.length<4||words.length>35)return null;
 const titleY=25,subtitleY=42,subtitleSize=9.4,bankTop=51;
 if(metrics.subtitle(CONNECT_VERSE_INSTRUCTION,subtitleSize)>width-8)return null;
 for(let bankFontSize=11.2;bankFontSize>=8.4;bankFontSize-=.4){
  const rows=balancedBankLines(module.verse.trim(),width-16,metrics.verse,bankFontSize,5);
  if(!rows)continue;
  const bankLineHeight=bankFontSize*1.25+1.6;
  const bankHeight=rows.length*bankLineHeight+10;
  const bankLines=rows.map((text,i)=>({
   text,x:width/2,y:bankTop+5+bankFontSize+i*bankLineHeight,
  }));
  const fieldTop=bankTop+bankHeight+11;
  const field:ScatterBounds={x:6,y:fieldTop,width:width-12,height:height-fieldTop-7};
  if(field.height<130)continue;
  const placements=scatterWords({
   words,seed:module.seed,key:module.verse,field,measure:metrics.puzzle,
   maxFont:words.length>=30?14.5:words.length>=21?15.5:17,
   minFont:8.5,gap:words.length>25?2.5:3.2,
  });
  if(!placements)continue;
  return {titleY,subtitleY,subtitleSize,bankTop,bankHeight,bankFontSize,
   bankLines,field,scattered:placements.words,fontSize:placements.fontSize};
 }
 return null;
}
