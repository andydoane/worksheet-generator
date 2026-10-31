import {rgb,pushGraphicsState,popGraphicsState,concatTransformationMatrix,
 type PDFPage,type PDFFont} from 'pdf-lib';
import {BOOKLET} from './booklet.ts';
import type {ModuleFonts} from './modulePdf.ts';
import type {UnscrambleVerse} from './storyVerseModules.ts';
import type {UpsideDownVerseModule} from './specialtyModules.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from './verseReconstructionLayout.ts';

type Rect={x:number;y:number;width:number;height:number};
const INK=rgb(.13,.13,.13);
const measure=(font:PDFFont)=>(s:string,n:number)=>font.widthOfTextAtSize(s,n);
export function drawReconstructionPdf(page:PDFPage,rect:Rect,
 module:UnscrambleVerse|UpsideDownVerseModule,fonts:ModuleFonts):void{
 const p=BOOKLET.padding*72;
 const b={x:rect.x+p,y:rect.y+p,width:rect.width-2*p,height:rect.height-2*p};
 const metrics={title:measure(fonts.title),body:measure(fonts.body),puzzle:measure(fonts.puzzle)};
 const plan=module.type==='unscramble-verse'
  ?planUnscrambleVerse(module,metrics,b.width,b.height)
  :planUpsideDownVerse(module,metrics,b.width,b.height);
 if(!plan)throw Error('The verse needs shorter text or fewer marked words to fit this Medium area.');
 const centered=(font:PDFFont,s:string,atY:number,size:number)=>{
  page.drawText(s,{x:b.x+(b.width-font.widthOfTextAtSize(s,size))/2,
    y:b.y+b.height-atY,font,size,color:INK});
 };
 centered(fonts.title,plan.title,plan.titleY,plan.titleSize);
 if(plan.reference&&plan.referenceY!==undefined)
  centered(fonts.bodyBold,plan.reference,plan.referenceY,10.5);
 for(const item of plan.marks){
  const x=b.x+item.x,y=b.y+b.height-item.y;
  if(item.kind==='ordinary'){
   page.drawText(item.text,{x,y,font:fonts.body,size:plan.fontSize,color:INK});
  }else if(item.kind==='punctuation'){
   page.drawText(item.text,{x,y:y-(module.type==='upside-down-verse'?1:0),
    font:fonts.puzzle,size:plan.fontSize,color:INK});
  }else{
   page.drawLine({start:{x:x+.8,y:y-2},end:{x:x+plan.cell-1,y:y-2},
    color:INK,thickness:.8});
   if(module.type==='unscramble-verse'){
    const char=item.scramble??'',size=8.2;
    page.drawText(char,{x:x+(plan.cell-fonts.puzzle.widthOfTextAtSize(char,size))/2,
      y:y-plan.glyphOffset,font:fonts.puzzle,size,color:INK});
   }else{
    const size=plan.invertedFontSize,baseline=y-plan.glyphOffset;
    const dx=(plan.cell-fonts.puzzle.widthOfTextAtSize(item.text,size))/2;
    page.pushOperators(pushGraphicsState(),concatTransformationMatrix(1,0,0,-1,0,2*baseline));
    page.drawText(item.text,{x:x+dx,y:baseline,font:fonts.puzzle,size,color:INK});
    page.pushOperators(popGraphicsState());
   }
  }
 }
}
