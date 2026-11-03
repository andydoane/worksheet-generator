import {balancedBankLines} from './balancedBankLines.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT,type MeasureText} from './mediumParityLayout.ts';
import {PIXEL_INSTRUCTION,PIXEL_SIZE,type PixelPicturePuzzle} from './pixelPicture.ts';

export type PixelMetrics={title:MeasureText;body:MeasureText;puzzle:MeasureText};
export type PixelTextLine={text:string;x:number;y:number};
export type PixelPhraseGlyph={kind:'glyph'|'blank';char:string;x:number;y:number;width:number;line:number};
export type PixelCell={char:string;row:number;col:number;x:number;y:number;rectX:number;rectY:number;active:boolean};
export const PIXEL_TITLE='PIXEL PERFECT';
export const PIXEL_WRITING_BLANK_WIDTH=17.5; // Printed size never shrinks with glyph size.
export const PIXEL_BLANK_WORD_GAP=4; // Extra breathing room at word-edge blanks.
export type PixelPlan={
 title:string;titleX:number;titleY:number;titleSize:number;
 instructions:PixelTextLine[];instructionSize:number;
 phraseLines:PixelTextLine[];phraseGlyphs:PixelPhraseGlyph[];
 phraseSize:number;phraseLineCount:number;
 blankWidth:number;groupTop:number;groupBottom:number;
 leftPanelWidth:number;leftSafeX:number;leftSafeWidth:number;
 gridX:number;gridY:number;gridSize:number;cell:number;letterSize:number;
 cells:PixelCell[];
};

/** A blank at the beginning or end of a word gets extra whitespace on its
 * exposed side. This counts toward measured wrapping, without changing the
 * underline's fixed width. Internal blanks get no artificial separation.
 */
export function pixelWordWidth(word:string,size:number,measure:MeasureText):number{
 const chars=Array.from(word);
 if(!chars.length)return 0;
 const ink=chars.reduce((total,char)=>total+
  (char==='_'?PIXEL_WRITING_BLANK_WIDTH:measure(char,size)),0);
 return ink+(chars[0]==='_'?PIXEL_BLANK_WORD_GAP:0)+
  (chars[chars.length-1]==='_'?PIXEL_BLANK_WORD_GAP:0);
}
/** Shared balanced word-wrap algorithm handles both instruction and phrase.
 * In the phrase the layout widths include immutable writing lines and their
 * boundary clearance; use the same measured widths to center every line.
 */
function balancePhrase(masked:string,size:number,maxWidth:number,measure:MeasureText):string[]|null{
 return balancedBankLines(masked,maxWidth,(word,fontSize)=>
  word===' '?measure(' ',fontSize):pixelWordWidth(word,fontSize,measure),size,9);
}
function placePhraseLines(lines:readonly string[],size:number,
 leftSafeX:number,leftSafeWidth:number,measure:MeasureText):{
 textLines:PixelTextLine[];glyphs:PixelPhraseGlyph[];
}{
 const space=measure(' ',size);
 const textLines:PixelTextLine[]=[],glyphs:PixelPhraseGlyph[]=[];
 lines.forEach((text,line)=>{
  const words=text.split(' ');
  const lineWidth=words.reduce((total,word,i)=>
   total+pixelWordWidth(word,size,measure)+(i?space:0),0);
  let cursor=leftSafeX+(leftSafeWidth-lineWidth)/2;
  textLines.push({text,x:cursor,y:0});
  words.forEach((word,index)=>{
   if(index)cursor+=space;
   const chars=Array.from(word);
   if(chars[0]==='_')cursor+=PIXEL_BLANK_WORD_GAP;
   chars.forEach(char=>{
    const width=char==='_'?PIXEL_WRITING_BLANK_WIDTH:measure(char,size);
    glyphs.push({kind:char==='_'?'blank':'glyph',char,x:cursor,y:0,width,line});
    cursor+=width;
   });
   if(chars[chars.length-1]==='_')cursor+=PIXEL_BLANK_WORD_GAP;
  });
 });
 return {textLines,glyphs};
}

/** One top-left physical point scene consumed by both vector PDF and SVG.
 * Heading, balanced/centered instructions and balanced/centered uppercase
 * phrase are centered AS ONE GROUP within the left Medium half. Grid geometry
 * and the constant-size writing lines remain independent of text fitting.
 */
export function planPixelPicture(puzzle:PixelPicturePuzzle,metrics:PixelMetrics,
 width=MEDIUM_PRINT_WIDTH,height=MEDIUM_PRINT_HEIGHT):PixelPlan|null{
 if(puzzle.grid.length!==PIXEL_SIZE||
  puzzle.grid.some(row=>row.length!==PIXEL_SIZE))return null;
 const half=width/2,leftSafeX=6,leftSafeWidth=half-12;
 const titleSize=25,titleHeight=25,titleGap=5;
 if(metrics.title(PIXEL_TITLE,titleSize)>leftSafeWidth)return null;
 const instructionSize=9,instructionPitch=11;
 const instructionRows=balancedBankLines(PIXEL_INSTRUCTION,leftSafeWidth,
  metrics.body,instructionSize,4);
 if(!instructionRows?.length)return null;
 const instructionHeight=instructionSize+(instructionRows.length-1)*instructionPitch+3;
 const phraseGap=11;
 let phraseSize=0,phraseRows:string[]|null=null;
 let groupTop=0,groupBottom=0,phraseBaseline=0,phrasePitch=0;
 for(let size=13;size>=9;size-=.5){
  const rows=balancePhrase(puzzle.maskedPhrase,size,leftSafeWidth,metrics.puzzle);
  if(!rows?.length)continue;
  const pitch=Math.max(17,size*1.48);
  const phraseHeight=size+(rows.length-1)*pitch+4.5;
  const groupHeight=titleHeight+titleGap+instructionHeight+phraseGap+phraseHeight;
  if(groupHeight>height-9)continue;
  phraseSize=size;phraseRows=rows;
  groupTop=(height-groupHeight)/2;
  groupBottom=groupTop+groupHeight;
  phraseBaseline=groupTop+titleHeight+titleGap+instructionHeight+phraseGap+size;
  phrasePitch=pitch;
  break;
 }
 if(!phraseRows)return null;
 const titleY=groupTop+21;
 const instructions=instructionRows.map((text,i)=>({
  text,x:half/2-metrics.body(text,instructionSize)/2,
  y:groupTop+titleHeight+titleGap+instructionSize+i*instructionPitch,
 }));
 const positioned=placePhraseLines(phraseRows,phraseSize,leftSafeX,leftSafeWidth,metrics.puzzle);
 const phraseLines=positioned.textLines.map((line,i)=>({
  ...line,y:phraseBaseline+i*phrasePitch,
 }));
 const phraseGlyphs=positioned.glyphs.map(glyph=>({
  ...glyph,y:phraseBaseline+glyph.line*phrasePitch,
 }));
 const cell=Math.min(12,(half-10)/PIXEL_SIZE,(height-10)/PIXEL_SIZE);
 if(cell<10.7)return null;
 const gridSize=cell*PIXEL_SIZE,gridX=half+(half-gridSize)/2;
 const gridY=(height-gridSize)/2,letterSize=Math.min(9.1,cell*.76);
 if(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').some(char=>
  metrics.puzzle(char,letterSize)>cell-2))return null;
 const cells=puzzle.grid.flatMap((row,r)=>row.map((char,c)=>({
  char,row:r,col:c,
  rectX:gridX+c*cell,rectY:gridY+r*cell,
  x:gridX+(c+.5)*cell-metrics.puzzle(char,letterSize)/2,
  y:gridY+(r+.5)*cell+letterSize*.36,
  active:puzzle.mask[r][c]==='1',
 })));
 return {title:PIXEL_TITLE,titleX:half/2,titleY,titleSize,
  instructions,instructionSize,phraseLines,phraseGlyphs,phraseSize,
  phraseLineCount:phraseRows.length,blankWidth:PIXEL_WRITING_BLANK_WIDTH,
  groupTop,groupBottom,leftPanelWidth:half,leftSafeX,leftSafeWidth,
  gridX,gridY,gridSize,cell,letterSize,cells};
}
