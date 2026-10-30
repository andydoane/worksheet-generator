import {PDFDocument,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/**
 * Actual static Nunito outlines, generated from the project's licensed
 * variable font using scripts/generate_nunito.py (fontTools). The static
 * binaries are committed to the repository; no runtime tools/network fonts.
 *
 * Full-font embedding is intentional. fontkit's subset encoder dropped glyphs
 * from variable instances despite passing unit tests and PDF serialization.
 */
export type NunitoWeightFaces={body:PDFFont;bodyBold:PDFFont;bank:PDFFont};
export type NunitoWeightSources={
  body:Uint8Array|ArrayBuffer;
  bodyBold:Uint8Array|ArrayBuffer;
  bank:Uint8Array|ArrayBuffer;
};
export const NUNITO_WEIGHTS={body:600,bodyBold:750,bank:900} as const;
export async function embedNunitoWeights(document:PDFDocument,sources:NunitoWeightSources):Promise<NunitoWeightFaces>{
  document.registerFontkit(fontkit);
  const output={} as NunitoWeightFaces;
  try{
    for(const key of ['body','bodyBold','bank'] as const){
      // subset:false preserves the font's complete, tested cmap.
      const face=await document.embedFont(sources[key],{subset:false});
      face.widthOfTextAtSize('BIBLE STORY WORKSHEET',12);
      output[key]=face;
    }
    return output;
  }catch(error){
    throw Error('Could not embed Nunito Sans PDF fonts: '+(error instanceof Error?error.message:String(error)));
  }
}
