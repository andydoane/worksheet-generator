import {PDFDocument,type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/**
 * pdf-lib embeds the default face of a variable font unless fontkit is
 * given a specific variation. With subset:true fontkit resolves the chosen
 * variation's outlines into a TrueType subset (not synthetic PDF bold).
 * No additional font downloads or Python toolchain are needed.
 */
export type NunitoWeightFaces={body:PDFFont;bodyBold:PDFFont;bank:PDFFont};
export const NUNITO_WEIGHTS={body:600,bodyBold:750,bank:900} as const;
export async function embedNunitoWeights(document:PDFDocument,source:Uint8Array|ArrayBuffer):Promise<NunitoWeightFaces>{
  const bytes=source instanceof Uint8Array?source:new Uint8Array(source);
  const out={} as NunitoWeightFaces;
  try{
    for(const key of ['body','bodyBold','bank'] as const){
      const weight=NUNITO_WEIGHTS[key];
      const varyingKit={
        create(data:Uint8Array){
          const variable=fontkit.create(data) as ReturnType<typeof fontkit.create> & {
            getVariation?: (axes:Record<string,number>)=>ReturnType<typeof fontkit.create>;
          };
          if(typeof variable.getVariation!=='function'){
            throw new Error('The Nunito Sans font does not expose its weight axis.');
          }
          return variable.getVariation({wght:weight});
        },
      };
      document.registerFontkit(varyingKit as typeof fontkit);
      const face=await document.embedFont(bytes,{subset:true});
      face.widthOfTextAtSize('BIBLE STORY WORKSHEET',12);
      out[key]=face;
    }
    return out;
  }catch(error){
    throw new Error('Could not embed weighted Nunito Sans in the PDF: '+
      (error instanceof Error?error.message:String(error)));
  }finally{
    document.registerFontkit(fontkit);
  }
}
