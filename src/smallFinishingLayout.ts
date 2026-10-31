import type {MeasureText} from './mediumParityLayout.ts';
import {balancedBankLines} from './balancedBankLines.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from './smallParityLayout.ts';
import {scramblePhrase,type Unscramble} from './smallModules.ts';

export type PictureLine={text:string;x:number;y:number};
export type DrawPicturePlan={
 lines:PictureLine[];fontSize:number;
 drawing:{x:number;y:number;width:number;height:number};
};
export type ScrambleLetter={char:string;x:number;y:number;lineStart:number;lineEnd:number;lineY:number};
export type ScrambleRow={letters:ScrambleLetter[];answer:string};
export type UnscramblePrintPlan={titleY:number;titleSize:number;letterSize:number;rows:ScrambleRow[]};

/** Match the original protected drawing box, now with balanced measured
 * wrapping shared across SVG preview and vector PDF. Top-left coordinates. */
export function planDrawPicture(prompt:string,measure:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):DrawPicturePlan|null{
 const text='Draw a picture of '+prompt.trim();
 for(let fontSize=15;fontSize>=10;fontSize-=.5){
  const rows=balancedBankLines(text,width,measure,fontSize,3);
  if(!rows)return null;
  const captionHeight=rows.length*(fontSize*1.08)+12;
  const drawingHeight=height-captionHeight-5;
  if(drawingHeight<70)continue;
  return {
   fontSize,
   drawing:{x:0,y:0,width,height:drawingHeight},
   lines:rows.map((line,i)=>({
    text:line,x:width/2,
    y:height-captionHeight+fontSize*1.05+i*fontSize*1.08,
   })),
  };
 }
 return null;
}

/** Phrase-aware letter scramble. Preserve an empty gap between original
 * words; only letters get a blank and a scrambled letter underneath. */
export function planSmallUnscramble(module:Unscramble,measure:MeasureText,
 width=SMALL_PRINT_WIDTH,height=SMALL_PRINT_HEIGHT):UnscramblePrintPlan|null{
 const phrases=[module.first,module.second].map((phrase,i)=>
   scramblePhrase(phrase,module.seed+i*101));
 const maximumLetters=Math.max(...phrases.map(s=>s.replace(/ /gu,'').length));
 if(maximumLetters>10||maximumLetters<3)return null;
 const maxFont=15;
 for(let letterSize=maxFont;letterSize>=10;letterSize-=.5){
  const rows:ScrambleRow[]=[];
  let possible=true;
  for(let i=0;i<phrases.length;i++){
   const phrase=phrases[i],chars=Array.from(phrase);
   const count=chars.filter(c=>c!==' ').length;
   const spaceCount=chars.filter(c=>c===' ').length;
   const gap=spaceCount?10:0;
   const cellWidth=Math.min(17,(width-8-gap)/count);
   if(cellWidth<=9||measure('W',letterSize)>cellWidth-2){possible=false;break;}
   const total=count*cellWidth+gap;
   const firstX=(width-total)/2;
   const textY=88+i*65,lineY=textY-21;
   if(textY+letterSize*.12>height-4){possible=false;break;}
   let x=firstX;
   const letters:ScrambleLetter[]=[];
   for(const char of chars){
    if(char===' '){x+=gap;continue;}
    letters.push({
     char,x:x+cellWidth/2,y:textY,
     lineStart:x+1,lineEnd:x+cellWidth-3,lineY,
    });
    x+=cellWidth;
   }
   rows.push({letters,answer:phrase});
  }
  if(possible)return {titleY:25,titleSize:22,letterSize,rows};
 }
 return null;
}
