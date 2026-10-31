import {balancedBankLines} from './balancedBankLines.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {parseConnectionWords,type ConnectBigIdeaModule} from './specialtyModules.ts';
import {scatterWords,expandScatterCoverage,scaleConnectScatterFont,type ScatteredWord,type ScatterBounds} from './wordScatterLayout.ts';

export const CONNECT_BIG_TITLE='CONNECT THE PHRASE';
export const CONNECT_PHRASE_BOX_PADDING_X=2.25;
export const CONNECT_PHRASE_BOX_PADDING_Y=1;
export const CONNECT_PHRASE_BOX_STROKE=.8;
export const CONNECT_BIG_INSTRUCTION='Draw lines from box to box in the order of the phrase.';
export type ConnectBigIdeaPrintPlan={
 titleY:number;subtitleY:number;subtitleSize:number;
 bankTop:number;bankHeight:number;bankFontSize:number;
 bankLines:{text:string;x:number;y:number}[];
 field:ScatterBounds;scattered:ScatteredWord[];fontSize:number;
};
/** All coordinates are physical PDF points measured from the top-left of
 * the 4.6×2.4in printable Medium interior; the preview uses the same plan.
 */
export function planConnectBigIdea(module:ConnectBigIdeaModule,metrics:{
 puzzle:MeasureText;bank:MeasureText;subtitle:MeasureText;
},width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):ConnectBigIdeaPrintPlan|null{
 const words=parseConnectionWords(module.idea);
 if(words.length<4||words.length>20)return null;
 const titleY=24,subtitleY=39,subtitleSize=8.8;
 if(metrics.subtitle(CONNECT_BIG_INSTRUCTION,subtitleSize)>width-8)return null;
 const bankTop=45;
 for(let bankSize=9.4;bankSize>=8.2;bankSize-=.4){
  const rows=balancedBankLines(module.idea.trim().toUpperCase(),width-14,
    metrics.bank,bankSize,3);
  if(!rows?.length||rows.length>3)continue;
  const bankLineHeight=12.7;
  const bankHeight=rows.length*bankLineHeight+8;
  const bankLines=rows.map((text,i)=>({
   text,x:width/2,y:bankTop+5+bankSize+i*bankLineHeight,
  }));
  const fieldTop=bankTop+bankHeight+6;
  const field:ScatterBounds={x:5,y:fieldTop,width:width-10,height:height-fieldTop-5};
  if(field.height<45)continue;
  // Retain the 80% count-based font target, original clearance and full-size
  // reference bank. Every measured box exterior is included in collisions.
  const originalMaxFont=words.length>=17?11.5:words.length>=13?12.5:13.5;
  const placements=scatterWords({
   words,seed:module.seed,key:module.idea,field,measure:metrics.puzzle,
   maxFont:scaleConnectScatterFont(originalMaxFont),
   minFont:8.5,gap:2.6,gapReferenceFont:originalMaxFont,
   boxed:{paddingX:CONNECT_PHRASE_BOX_PADDING_X,paddingY:CONNECT_PHRASE_BOX_PADDING_Y},
  });
  if(!placements)continue;
  return {titleY,subtitleY,subtitleSize,bankTop,bankHeight,bankFontSize:bankSize,
   bankLines,field,scattered:expandScatterCoverage(placements.words,field),fontSize:placements.fontSize};
 }
 return null;
}
