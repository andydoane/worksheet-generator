import { PDFDocument, rgb, degrees, pushGraphicsState, popGraphicsState, concatTransformationMatrix, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {COVER_BORDER_SAFE_WIDTH,COVER_BORDER_SAFE_HEIGHT,isCoverBorderId,type CoverBorderId} from './coverBorders.ts';
import {isActivityBorderReady,readActivityBorders,planActivityBorderFit,type ActivityBorders} from './activityBorders.ts';
import {glyphInkCenter} from './fontInkCenter.ts';
import {planCoverText} from './coverTitleLayout.ts';
import {embedNunitoWeights} from './nunitoPdf.ts';
import type {ModuleFonts} from './modulePdf.ts';
import { drawModulePdf } from './modulePdf.ts';
import { slotKey, moduleForSize, type ModuleAssignments, type ActivityModule } from './modules.ts';
import {
  BOOKLET, DEFAULT_LAYOUTS, SHEETS, getRegions,
  type LayoutId, type PageNumber, type Region,
} from './booklet.ts';

/**
 * Page coordinates in src/booklet.ts use inches measured from the top-left.
 * PDF coordinates use points measured from the bottom-left.
 */
const PT = 72;
const SHEET_WIDTH = BOOKLET.sheet.width * PT;
const SHEET_HEIGHT = BOOKLET.sheet.height * PT;
const CONTENT_PADDING = BOOKLET.padding * PT;

const BLACK = rgb(0.13, 0.13, 0.13);
const DARK_GREY = rgb(0.28, 0.28, 0.28);
const MID_GREY = rgb(0.42, 0.42, 0.42);

export type PdfDraft = {
  title: string;
  scripture: string;
  coverBorder?: CoverBorderId;
  activityBorders?: ActivityBorders;
  layouts: Record<2 | 3 | 4, LayoutId>;
  modules?: ModuleAssignments;
};

export type PdfFontFiles = {
  mouseMemoirs: Uint8Array | ArrayBuffer;
  /** Legacy property names retained to preserve the existing booklet API.
   * Contents are now Nunito Medium, Bold, and ExtraBold (NOT Nunito Sans). */
  nunitoSans: Uint8Array | ArrayBuffer;
  nunitoSans750: Uint8Array | ArrayBuffer;
  nunitoSans900: Uint8Array | ArrayBuffer;
  zillaSlab: Uint8Array | ArrayBuffer;
};

type Fonts = ModuleFonts;

type PdfRect = { x: number; y: number; width: number; height: number };

export type PrintableRegion = {
  bookletPage: PageNumber;
  side: 'left' | 'right';
  id: string;
  kind: Region['kind'];
  size: Region['size'];
  rect: PdfRect;
};

function toPdfRect(region: Region, half: 0 | 1): PdfRect {
  return {
    x: (half * BOOKLET.page.width + region.x) * PT,
    y: (BOOKLET.sheet.height - region.y - region.height) * PT,
    width: region.width * PT,
    height: region.height * PT,
  };
}

/**
 * Exact print positions for each side; also useful for geometry tests
 * and future module renderers.
 */
export function getPrintableSheetRegions(draft: PdfDraft): PrintableRegion[][] {
  return SHEETS.map((sheet) =>
    sheet.pages.flatMap((bookletPage, half) => {
      const layout = bookletPage === 1 ? DEFAULT_LAYOUTS[2] : draft.layouts[bookletPage];
      return getRegions(bookletPage, layout).map((region) => ({
        bookletPage,
        side: half === 0 ? 'left' as const : 'right' as const,
        id: region.id,
        kind: region.kind,
        size: region.size,
        rect: toPdfRect(region, half as 0 | 1),
      }));
    }),
  );
}

function inset(rect: PdfRect, amount: number): PdfRect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: rect.width - amount * 2,
    height: rect.height - amount * 2,
  };
}

function width(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

/** Print regions are invisible guides; the preview retains an editor-only selection outline. */
function drawFrame(_page: PDFPage, _rect: PdfRect): void {}

function drawCoverTitle(page: PDFPage, rect: PdfRect, fonts: Fonts, draft: PdfDraft): void {
  const bordered=isCoverBorderId(draft.coverBorder)&&draft.coverBorder!=='none';
  const box = bordered?inset(rect,0):inset(rect, CONTENT_PADDING);
  if(bordered){
    box.x+=(box.width-COVER_BORDER_SAFE_WIDTH*PT)/2;
    box.y+=(box.height-COVER_BORDER_SAFE_HEIGHT*PT)/2;
    box.width=COVER_BORDER_SAFE_WIDTH*PT;
    box.height=COVER_BORDER_SAFE_HEIGHT*PT;
  }
  const title = draft.title.trim() || 'Your story title';
  const reference = draft.scripture.trim() || 'Scripture reference';
  const plan=planCoverText(title,reference,box.width,box.height,
    (text,size)=>width(fonts.title,text,size),
    (text,size)=>width(fonts.body,text,size));
  if(!plan)throw Error('The front-cover text is too long to fit. Shorten the title or Scripture reference.');
  // SVG and PDF share the exact title breaks, font sizes and centered baselines.
  for(const line of plan.titleLines)page.drawText(line.text,{
    x:box.x+line.x,y:box.y+box.height-line.y,
    size:line.size,font:fonts.title,color:BLACK,
  });
  for(const line of plan.referenceLines)page.drawText(line.text,{
    x:box.x+line.x,y:box.y+box.height-line.y,
    size:line.size,font:fonts.body,color:DARK_GREY,
  });
}

function drawActivityPlaceholder(page: PDFPage, rect: PdfRect, size: Region['size'], fonts: Fonts): void {
  const box = inset(rect, CONTENT_PADDING);
  const centerY = box.y + box.height / 2;
  const big = size === 'small' ? 16 : 19;
  const text = size.toUpperCase();
  const textWidth = width(fonts.puzzle, text, big);
  page.drawText(text, {
    x: box.x + (box.width - textWidth) / 2,
    y: centerY + (size === 'small' ? 9 : 14),
    size: big,
    font: fonts.puzzle,
    color: DARK_GREY,
  });

  const descriptor = 'Activity space';
  const captionSize = size === 'small' ? 9 : 10;
  page.drawText(descriptor, {
    x: box.x + (box.width - width(fonts.body, descriptor, captionSize)) / 2,
    y: centerY - 6,
    size: captionSize,
    font: fonts.body,
    color: MID_GREY,
  });

  const dimensions = size === 'large' ? '4.8 x 5.2 in' : size === 'medium' ? '4.8 x 2.6 in' : '2.4 x 2.6 in';
  const labelSize = size === 'small' ? 7 : 8;
  page.drawText(dimensions, {
    x: box.x + (box.width - width(fonts.body, dimensions, labelSize)) / 2,
    y: centerY - 22,
    size: labelSize,
    font: fonts.body,
    color: MID_GREY,
  });
}

/**
 * Generates exactly two landscape letter PDF pages:
 *   1. Outside: booklet page 4 (left) and page 1 (right)
 *   2. Inside:  booklet page 2 (left) and page 3 (right)
 *
 * All text/graphics are vectors. No canvas screenshots or print dialogs.
 */
export async function createBookletPdf(draft: PdfDraft, fontFiles: PdfFontFiles, borderPng?:Uint8Array, activityBorderPngs:Record<string,Uint8Array>={}): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle((draft.title.trim() || 'Bible Worksheet') + ' - Booklet');
  document.setSubject('Four-page folded Bible worksheet, print double-sided on landscape US Letter');
  document.setCreator('Worksheet Studio');
  document.setProducer('Worksheet Studio / pdf-lib');

  async function embedChecked(name: string, bytes: Uint8Array | ArrayBuffer): Promise<PDFFont> {
    try {
      const custom = await document.embedFont(bytes, { subset: false });
      // Trigger glyph metrics now, so font-format failures have a useful label.
      custom.widthOfTextAtSize('ABC', 12);
      return custom;
    } catch (error) {
      throw new Error('Could not embed ' + name + ' in the PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  // The supplied static Nunito Medium/Bold/ExtraBold fonts preserve the full cmap.
  const {body,bodyBold,bank}=await embedNunitoWeights(document,{
    body:fontFiles.nunitoSans,
    bodyBold:fontFiles.nunitoSans750,
    bank:fontFiles.nunitoSans900,
  });
  const title=await embedChecked('Mouse Memoirs',fontFiles.mouseMemoirs);
  // Full-glyph fontTools reserialization fixes Zilla's original fontkit error.
  const puzzle=await embedChecked('Zilla Slab Bold',fontFiles.zillaSlab);
  const bankFace=fontkit.create(fontFiles.nunitoSans900 instanceof Uint8Array
    ?fontFiles.nunitoSans900:new Uint8Array(fontFiles.nunitoSans900));
  const titleFace=fontkit.create(fontFiles.mouseMemoirs instanceof Uint8Array
    ?fontFiles.mouseMemoirs:new Uint8Array(fontFiles.mouseMemoirs));
  const fonts: Fonts = {title,body,bodyBold,bank,puzzle,
    bankInkCenter:(word,size)=>glyphInkCenter(bankFace,word,size),
    titleInkCenter:(word,size)=>glyphInkCenter(titleFace,word,size)};

  const borderEnabled=isCoverBorderId(draft.coverBorder)&&draft.coverBorder!=='none';
  if(borderEnabled&&!borderPng)throw Error('Selected cover border image is unavailable. Try exporting again.');
  const borderImage=borderEnabled&&borderPng?await document.embedPng(borderPng):undefined;
  const selections=readActivityBorders(draft.activityBorders);
  const activityImages=new Map<string,Awaited<ReturnType<typeof document.embedPng>>>();
  const sheets = getPrintableSheetRegions(draft);
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    const page = document.addPage([SHEET_WIDTH, SHEET_HEIGHT]);
    for (const item of sheets[sheetIndex]) {
      drawFrame(page, item.rect);
      if (item.kind === 'title') {
        if(borderImage)page.drawImage(borderImage,{x:item.rect.x,y:item.rect.y,width:item.rect.width,height:item.rect.height});
        drawCoverTitle(page, item.rect, fonts, draft);
      } else {
        const key=slotKey(item.bookletPage,item.id);
        const assigned: ActivityModule | undefined = draft.modules?.[key];
        // Never paint a border on a mismatched/legacy placement. Every
        // certified Small, Medium and Large renderer uses the common inset
        // and a centered, isotropic content transform.
        const matched=!!assigned&&moduleForSize(item.size).some(def=>def.id===assigned.type);
        if(selections[key]&&(!isActivityBorderReady(assigned?.type)||!matched))
          throw Error('Page '+item.bookletPage+' ('+item.id+'): Activity borders are not supported for this module and region. Remove the border before exporting.');
        const bordered=!!selections[key]&&matched;
        if (assigned) {
          if (!moduleForSize(item.size).some((definition) => definition.id === assigned.type) &&
              !(item.size === 'medium' && assigned.type === 'connect-verse')) {
            throw new Error('Page ' + item.bookletPage + ' contains an activity in the wrong size area.');
          }
          try {
            if(bordered){
              const imageBytes=activityBorderPngs[key];
              if(!imageBytes)throw Error('Selected '+item.size[0].toUpperCase()+item.size.slice(1)+' border image is missing; try exporting again.');
              const imageKey=item.size+':'+selections[key];
              let image=activityImages.get(imageKey);
              if(!image){
                image=await document.embedPng(imageBytes);
                activityImages.set(imageKey,image);
              }
              if(item.size==='large'){
                // Uploaded Large assets are 5.2:4.8 landscape source images.
                // PDF coordinates are y-up: -90° is the same visual clockwise
                // rotation as CSS rotate(90deg) in the y-down preview.
                page.drawImage(image,{
                  x:item.rect.x,y:item.rect.y+item.rect.height,
                  width:item.rect.height,height:item.rect.width,
                  rotate:degrees(-90),
                });
              }else page.drawImage(image,{
                x:item.rect.x,y:item.rect.y,
                width:item.rect.width,height:item.rect.height,
              });
              const fit=planActivityBorderFit(item.size,item.rect);
              page.pushOperators(pushGraphicsState(),
                concatTransformationMatrix(fit.scale,0,0,fit.scale,fit.translateX,fit.translateY));
              try { drawModulePdf(page,item.rect,assigned,fonts,true); }
              finally { page.pushOperators(popGraphicsState()); }
            }else drawModulePdf(page, item.rect, assigned, fonts);
          } catch (error) {
            throw new Error('Page ' + item.bookletPage + ' (' + assigned.type.replaceAll('-', ' ') + '): ' +
              (error instanceof Error ? error.message : String(error)));
          }
        } else {
          drawActivityPlaceholder(page, item.rect, item.size, fonts);
        }
      }
    }
    const sheet = SHEETS[sheetIndex];

  }

  return document.save();
}
