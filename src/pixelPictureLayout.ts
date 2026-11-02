import {measureWrappedLines} from './pdfLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {PIXEL_INSTRUCTION,PIXEL_SIZE,type PixelPicturePuzzle} from './pixelPicture.ts';

export type PixelMetrics={body:MeasureText;puzzle:MeasureText};
export type PixelTextLine={text:string;x:number;y:number};
export type PixelPhraseGlyph={kind:'glyph'|'blank';char:string;x:number;y:number;width:number;line:number};
export type PixelCell={char:string;row:number;col:number;x:number;y:number;rectX:number;rectY:number;active:boolean};
export const PIXEL_WRITING_BLANK_WIDTH=17.5; // Fixed physical points: never shrinks with font.
export type PixelPlan={
 instructions:PixelTextLine[];instructionSize:number;
 phraseGlyphs:PixelPhraseGlyph[];phraseSize:number;phraseLineCount:number;
 blankWidth:number;groupTop:number;groupBottom:number;
 leftPanelWidth:number;leftSafeX:number;leftSafeWidth:number;
 gridX:number;gridY:number;gridSize:number;cell:number;letterSize:number;
 cells:PixelCell[];
};

type WordLayout={tokens:PixelPhraseGlyph[];lineCount:number;lineWidths:number[]};
/** Fit whole words, but render letters individually. A blank is an underline
 * of immutable physical width, NOT a shrunken '_' glyph. All widths are
 * computed with the same embedded Zilla Slab Bold used by both PDF and SVG.
 */
function phraseWords(masked:string,size:number,x:number,maxWidth:number,measure:MeasureText):WordLayout|null{
 const words=masked.trim().split(/\s+/u).filter(Boolean);
 if(!words.length)return null;
 const advance=(char:string)=>char==='_'?PIXEL_WRITING_BLANK_WIDTH:measure(char,size);
 const space=measure(' ',size);
 let line=0,cursor=0;
 const lineWidths:number[]=[0];
 const tokens:PixelPhraseGlyph[]=[];
 for(const word of words){
  const chars=Array.from(word);
  const wordWidth=chars.reduce((total,ch)=>total+advance(ch),0);
  if(wordWidth>maxWidth+.001)return null;
  const gap=cursor>0?space:0;
  if(cursor>0&&cursor+gap+wordWidth>maxWidth+.001){
   line++;cursor=0;lineWidths.push(0);
  }else cursor+=gap;
  for(const char of chars){
   const width=advance(char);
   tokens.push({kind:char==='_'?'blank':'glyph',char,x:x+cursor,y:0,width,line});
   cursor+=width;
  }
  lineWidths[line]=cursor;
 }
 return {tokens,lineCount:line+1,lineWidths};
}

/** A single physical top-left-point scene, shared by PDF and browser SVG.
 * The instruction and phrase form ONE vertically centered group within the
 * left panel. Long phrases reduce ONLY the Zilla letter size, never the width
 * of the handwriting underlines, while 13×13 cells stay in the right half.
 */
export function planPixelPicture(puzzle:PixelPicturePuzzle,metrics:PixelMetrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):PixelPlan|null{
 if(puzzle.grid.length!==PIXEL_SIZE||
  puzzle.grid.some(row=>row.length!==PIXEL_SIZE))return null;
 const half=width/2,leftSafeX=6,leftSafeWidth=half-12;
 const instructionSize=9,instructionPitch=12;
 const instructionRows=measureWrappedLines(PIXEL_INSTRUCTION,leftSafeWidth,
  line=>metrics.body(line,instructionSize));
 if(!instructionRows||!instructionRows.length||instructionRows.length>4)return null;
 const instructionHeight=instructionSize+(instructionRows.length-1)*instructionPitch+3;
 const gap=14;
 let phraseSize=0,phraseLayout:WordLayout|null=null;
 let groupTop=0,groupBottom=0,phraseFirstBaseline=0,phrasePitch=0;
 for(let size=13;size>=9;size-=.5){
  const trial=phraseWords(puzzle.maskedPhrase,size,leftSafeX,leftSafeWidth,metrics.puzzle);
  if(!trial)continue;
  const pitch=Math.max(18,size*1.5);
  const phraseHeight=size+(trial.lineCount-1)*pitch+4.5;
  const groupHeight=instructionHeight+gap+phraseHeight;
  if(groupHeight>height-9)continue;
  phraseSize=size;phraseLayout=trial;
  groupTop=(height-groupHeight)/2;
  groupBottom=groupTop+groupHeight;
  phraseFirstBaseline=groupTop+instructionHeight+gap+size;
  phrasePitch=pitch;
  break;
 }
 if(!phraseLayout)return null;
 const instructions=instructionRows.map((text,i)=>({
  text,x:leftSafeX,y:groupTop+instructionSize+i*instructionPitch,
 }));
 const phraseGlyphs=phraseLayout.tokens.map(token=>({
  ...token,y:phraseFirstBaseline+token.line*phrasePitch,
 }));
 // Grid letters must remain centered and very pale to leave white shading space.
 const cell=Math.min(12,(half-10)/PIXEL_SIZE,(height-10)/PIXEL_SIZE);
 if(cell<10.7)return null;
 const gridSize=cell*PIXEL_SIZE,gridX=half+(half-gridSize)/2;
 const gridY=(height-gridSize)/2,letterSize=Math.min(9.1,cell*.76);
 if(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').some(ch=>
  metrics.puzzle(ch,letterSize)>cell-2))return null;
 const cells=puzzle.grid.flatMap((row,r)=>row.map((char,c)=>({
  char,row:r,col:c,
  rectX:gridX+c*cell,rectY:gridY+r*cell,
  x:gridX+(c+.5)*cell-metrics.puzzle(char,letterSize)/2,
  y:gridY+(r+.5)*cell+letterSize*.36,
  active:puzzle.mask[r][c]==='1',
 })));
 return {instructions,instructionSize,phraseGlyphs,phraseSize,
  phraseLineCount:phraseLayout.lineCount,
  blankWidth:PIXEL_WRITING_BLANK_WIDTH,groupTop,groupBottom,
  leftPanelWidth:half,leftSafeX,leftSafeWidth,
  gridX,gridY,gridSize,cell,letterSize,cells};
}
