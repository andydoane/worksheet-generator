import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BOOKLET } from './booklet.ts';
import {MODULE_TITLE_PT,measureWrappedLines} from './pdfLayout.ts';
import {planDrawPicture} from './smallFinishingLayout.ts';
import {planMatching} from './mediumParityLayout.ts';
import {planStory} from './storyLayout.ts';
import { drawSmallModulePdf } from './smallPdf.ts';
import { isSmallModule } from './smallModules.ts';
import { isStoryVerseModule } from './storyVerseModules.ts';
import { drawStoryVersePdf } from './storyVersePdf.ts';
import { isPuzzleModule } from './puzzleEngines.ts';
import { drawPuzzlePdf } from './puzzlePdf.ts';
import { isCryptogram } from './cryptograms.ts';
import { drawCryptogramPdf } from './cryptogramPdf.ts';
import {isSpecialtyModule} from './specialtyModules.ts';
import {drawSpecialtyPdf} from './specialtyPdf.ts';
import {
  matchRows, parseStory, storyBank, validateModule, type ActivityModule,
} from './modules.ts';

type Rect = { x: number; y: number; width: number; height: number };
export type ModuleFonts = { title: PDFFont; body: PDFFont; bodyBold: PDFFont; bank: PDFFont; puzzle: PDFFont; bankInkCenter?:(word:string,size:number)=>number;titleInkCenter?:(word:string,size:number)=>number };
const INCH = 72;
const INSET = BOOKLET.padding * INCH;
const INK = rgb(0.13, 0.13, 0.13);
const GREY = rgb(0.40, 0.40, 0.40);
const WHITE = rgb(1, 1, 1);

const measure = (font: PDFFont, text: string, size: number) => font.widthOfTextAtSize(text, size);
function interior(rect: Rect): Rect {
  return { x: rect.x + INSET, y: rect.y + INSET, width: rect.width - INSET * 2, height: rect.height - INSET * 2 };
}

/** Word wrapping with no clipping or invisible text. */
/** Measured wrapping shared with the newer module PDF renderers. */
function lines(text:string,font:PDFFont,size:number,maxWidth:number):string[]{
  const result=measureWrappedLines(text,maxWidth,value=>measure(font,value,size));
  if(!result)throw Error('A word is too long to fit; please shorten the text.');
  return result;
}
function centered(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number, size: number, color = INK): void {
  page.drawText(text, { x: x + (width - measure(font, text, size)) / 2, y, font, size, color });
}

function fittedSize(font: PDFFont, words: readonly string[], maxWidth: number, preferred: number, minimum: number): number {
  for (let size = preferred; size >= minimum; size -= .5) {
    if (words.every(word => measure(font, word, size) <= maxWidth)) return size;
  }
  throw new Error('A word or answer is too long for this module. Shorten it and try again.');
}

function drawPicture(page: PDFPage, rect: Rect, font: PDFFont, prompt: string, bordered=false): void {
  const inner=interior(rect);
  const plan=planDrawPicture(prompt,(text,size)=>measure(font,text,size),inner.width,inner.height);
  if(!plan)throw Error('Drawing prompt does not fit while preserving the drawing space.');
  page.drawRectangle({
    x:inner.x+plan.drawing.x,
    y:inner.y+inner.height-plan.drawing.y-plan.drawing.height,
    width:plan.drawing.width,height:plan.drawing.height,
    borderColor:bordered?undefined:GREY,borderWidth:bordered?0:1,color:WHITE,
  });
  for(const line of plan.lines)
    page.drawText(line.text,{
      x:inner.x+line.x-measure(font,line.text,plan.fontSize)/2,
      y:inner.y+inner.height-line.y,size:plan.fontSize,font,color:INK,
    });
}

function drawMatching(page: PDFPage, rect: Rect, fonts: ModuleFonts, module: Extract<ActivityModule, { type: 'match-words' }>): void {
  const box = interior(rect);
  const plan=planMatching(matchRows(module),
    (text,size)=>measure(fonts.bodyBold,text,size),
    (text,size)=>measure(fonts.puzzle,text,size),box.width,box.height);
  if(!plan)throw Error('Matching rows do not fit. Use shorter words or fewer pairs.');
  centered(page,fonts.title,'MATCH THE WORDS',box.x,box.y+box.height-plan.titleY,box.width,MODULE_TITLE_PT);
  plan.instructions.forEach(line=>
    centered(page,fonts.bodyBold,line.text,box.x,box.y+box.height-line.y,box.width,plan.instructionSize,GREY));
  plan.leftRows.forEach(line=>page.drawText(line.text,{
    x:box.x+line.x,y:box.y+box.height-line.y,font:fonts.puzzle,size:plan.fontSize,color:INK,
  }));
  plan.rightRows.forEach(line=>page.drawText(line.text,{
    x:box.x+line.x-measure(fonts.puzzle,line.text,plan.fontSize),
    y:box.y+box.height-line.y,font:fonts.puzzle,size:plan.fontSize,color:INK,
  }));
}

function drawStory(page: PDFPage, rect: Rect, fonts: ModuleFonts, module: Extract<ActivityModule, { type: 'finish-story' }>): void {
  const inner = interior(rect);
  centered(page, fonts.title, 'FINISH THE STORY', inner.x, inner.y + inner.height - 28, inner.width, MODULE_TITLE_PT);

  const bank = storyBank(module);
  const columns = Math.ceil(bank.length / 2);
  const bankTop = inner.y + inner.height - 42;
  const bankHeight = 64;
  const bankBottom = bankTop - bankHeight;
  page.drawRectangle({
    x: inner.x, y: bankBottom, width: inner.width, height: bankHeight,
    borderColor: GREY, borderWidth: .8, color: WHITE,
  });

  const cellWidth = inner.width / columns;
  const size = fittedSize(fonts.bank, bank.map(word => word.toUpperCase()), cellWidth - 6, 11.5, 6.5);
  bank.forEach((word, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    centered(page, fonts.bank, word.toUpperCase(), inner.x + col * cellWidth, bankTop - 24 - row * 29, cellWidth, size);
  });

  const storyBox = {
    x: inner.x + 3, y: inner.y + 5,
    width: inner.width - 6,
    height: bankBottom - inner.y - 18,
  };
  const layout=planStory(module.story,(text,size)=>measure(fonts.body,text,size),storyBox.width,storyBox.height);
  if (!layout) throw new Error('Story text does not fit in the large area. Shorten it or use fewer words.');
  for(const token of layout.placements){
    const x=storyBox.x+token.x,y=storyBox.y+storyBox.height-token.y;
    if(token.kind==='blank'){
      page.drawLine({start:{x,y:y-2},end:{x:x+token.width,y:y-2},thickness:.95,color:INK});
    }else{
      page.drawText(token.text,{x,y,size:layout.fontSize,font:fonts.body,color:INK});
    }
  }
}

/** Single dispatch point for all module PDF renderers. */
export function drawModulePdf(page: PDFPage, rect: Rect, module: ActivityModule, fonts: ModuleFonts,
 bordered=false,symbols:ReadonlyMap<number,PDFImage>=new Map()): void {
  const errors = validateModule(module);
  if (errors.length) throw new Error(errors.join(' '));
  if (isSmallModule(module)) return drawSmallModulePdf(page, rect, module, fonts);
  if (isStoryVerseModule(module)) return drawStoryVersePdf(page, rect, module, fonts, symbols);
  if (isPuzzleModule(module)) return drawPuzzlePdf(page, rect, module, fonts, bordered);
  if (isCryptogram(module)) return drawCryptogramPdf(page, rect, module, fonts);
  if (isSpecialtyModule(module)) return drawSpecialtyPdf(page,rect,module,fonts);
  switch (module.type) {
    case 'draw-picture': return drawPicture(page, rect, fonts.title, module.prompt, bordered);
    case 'match-words': return drawMatching(page, rect, fonts, module);
    case 'finish-story': return drawStory(page, rect, fonts, module);
  }
}
