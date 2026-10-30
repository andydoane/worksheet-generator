import {PDFDocument,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/**
 * The user-supplied, static Nunito family (not Nunito Sans).
 * Face definitions are shared with @font-face declarations in styles.css:
 * body = Nunito Medium 500, subtitles = Nunito Bold 700,
 * word banks = Nunito ExtraBold 800.
 *
 * Full font embedding deliberately avoids the missing-glyph problem observed
 * with fontkit's subsetting of variable font outlines.
 */
export type NunitoWeightFaces={body:PDFFont;bodyBold:PDFFont;bank:PDFFont};
export type NunitoWeightSources={
  body:Uint8Array|ArrayBuffer;
  bodyBold:Uint8Array|ArrayBuffer;
  bank:Uint8Array|ArrayBuffer;
};
export const NUNITO_WEIGHTS={body:500,bodyBold:700,bank:800} as const;
export async function embedNunitoWeights(document:PDFDocument,sources:NunitoWeightSources):Promise<NunitoWeightFaces>{
  document.registerFontkit(fontkit);
  const output={} as NunitoWeightFaces;
  try{
    for(const key of ['body','bodyBold','bank'] as const){
      const face=await document.embedFont(sources[key],{subset:false});
      face.widthOfTextAtSize('BIBLE STORY WORKSHEET',12);
      output[key]=face;
    }
    return output;
  }catch(error){
    throw Error('Could not embed Nunito PDF fonts: '+(error instanceof Error?error.message:String(error)));
  }
}
