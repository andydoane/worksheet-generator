import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {balancedBankLines} from '../src/balancedBankLines.ts';
import {generatePixelPicture} from '../src/pixelPicture.ts';
import {
 planPixelPicture,pixelWordWidth,PIXEL_TITLE,PIXEL_BLANK_WORD_GAP,
 PIXEL_WRITING_BLANK_WIDTH,
} from '../src/pixelPictureLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const face=async name=>fontkit.create(await readFile(new URL('../fonts/'+name,import.meta.url)));
const measure=face=>(text,size)=>face.layout(text).glyphs.reduce((total,g)=>total+g.advanceWidth,0)*size/face.unitsPerEm;
async function metrics(){
 const [title,body,puzzle]=await Promise.all([
  face('MouseMemoirs-Regular.ttf'),face('Nunito-Medium.ttf'),face('ZillaSlab-Bold-pdf.ttf'),
 ]);
 return {title:measure(title),body:measure(body),puzzle:measure(puzzle)};
}
const phrase='Andy Dwyer is the coolest guy on the planet.';
const moduleFor=(text,seed=1,shapeId='heart')=>({
 type:'pixel-picture',phrase:text,seed,shapeId,
});
const measuredWidth=(text,size,measurePuzzle)=>text.split(' ').reduce((total,word,i)=>
 total+pixelWordWidth(word,size,measurePuzzle)+(i?measurePuzzle(' ',size):0),0);

test('Title Pixel Perfect is fully centered above a balanced, center-aligned instruction block',async()=>{
 const widths=await metrics();
 for(const text of [
  phrase,
  'God made a safe path through the Red Sea and led the people out of Egypt.',
  'The Israelites praised God because he made a way through the sea and kept them safe.',
 ]){
  const plan=planPixelPicture(generatePixelPicture(moduleFor(text)),widths);
  assert.ok(plan,'layout failed: '+text);
  assert.equal(plan.title,PIXEL_TITLE);
  assert.equal(plan.title,'PIXEL PERFECT');
  assert.equal(plan.titleX,MEDIUM_PRINT_WIDTH/4);
  const headlineWidth=widths.title(plan.title,plan.titleSize);
  assert.ok(plan.titleX-headlineWidth/2>=plan.leftSafeX-.01);
  assert.ok(plan.titleX+headlineWidth/2<=MEDIUM_PRINT_WIDTH/2-plan.leftSafeX+.01);
  assert.ok(plan.titleY>=plan.groupTop&&plan.titleY<plan.instructions[0].y,
   'heading must precede instructions inside centered group');
  assert.ok(Math.abs((plan.groupTop+plan.groupBottom)/2-MEDIUM_PRINT_HEIGHT/2)<.001,
   'entire three-part group must be vertically centered');
  const expected=balancedBankLines(
   'Fill in the missing letter. Color in the squares containing that letter.',
   plan.leftSafeWidth,widths.body,plan.instructionSize,4);
  assert.deepEqual(plan.instructions.map(line=>line.text),expected);
  for(const line of plan.instructions){
   const width=widths.body(line.text,plan.instructionSize);
   assert.ok(Math.abs(line.x+width/2-MEDIUM_PRINT_WIDTH/4)<.001,
    'instruction line must be individually center justified: '+line.text);
   assert.ok(line.x>=plan.leftSafeX-.01&&line.x+width<=MEDIUM_PRINT_WIDTH/2-plan.leftSafeX+.01);
  }
 }
});
test('Phrase uses balanced word wrapping and center justification without splitting any words',async()=>{
 const widths=await metrics();
 const examples=[
  phrase,
  'God made a safe path through the Red Sea and led the people out of Egypt.',
  'The Israelites praised God because he made a way through the sea and kept them safe.',
  'Pharaoh chased the Israelites, but God protected everyone who trusted him.',
 ];
 for(const text of examples){
  const puzzle=generatePixelPicture(moduleFor(text));
  const plan=planPixelPicture(puzzle,widths);
  assert.ok(plan,'unfittable: '+text);
  const expected=balancedBankLines(
   puzzle.maskedPhrase,plan.leftSafeWidth,
   (word,size)=>word===' '?widths.puzzle(' ',size):pixelWordWidth(word,size,widths.puzzle),
   plan.phraseSize,9);
  assert.deepEqual(plan.phraseLines.map(line=>line.text),expected);
  assert.equal(plan.phraseGlyphs.filter(g=>g.kind==='blank').length,puzzle.missingPositions.length);
  for(const line of plan.phraseLines){
   const width=measuredWidth(line.text,plan.phraseSize,widths.puzzle);
   assert.ok(Math.abs(line.x+width/2-MEDIUM_PRINT_WIDTH/4)<.001,
    'phrase line should be centered: '+line.text);
   assert.ok(line.x>=plan.leftSafeX-.01);
   assert.ok(line.x+width<=MEDIUM_PRINT_WIDTH/2-plan.leftSafeX+.01);
  }
  for(const glyph of plan.phraseGlyphs){
   assert.ok(glyph.x>=plan.leftSafeX-.01);
   assert.ok(glyph.x+glyph.width<=MEDIUM_PRINT_WIDTH/2-plan.leftSafeX+.01);
   assert.ok(glyph.y>=plan.groupTop&&glyph.y+4<=plan.groupBottom);
   if(glyph.kind==='blank')assert.equal(glyph.width,PIXEL_WRITING_BLANK_WIDTH);
  }
  assert.ok(plan.groupTop>=4&&plan.groupBottom<=MEDIUM_PRINT_HEIGHT-4);
  assert.equal(plan.cells.length,169);
 }
});
test('Word-edge Y blanks get extra whitespace after ANDY and GUY; internal DWYER blank does not',async()=>{
 const widths=await metrics();
 const size=11;
 const unpadded=(text)=>Array.from(text).reduce((sum,c)=>
  sum+(c==='_'?PIXEL_WRITING_BLANK_WIDTH:widths.puzzle(c,size)),0);
 assert.equal(pixelWordWidth('AND_',size,widths.puzzle),
  unpadded('AND_')+PIXEL_BLANK_WORD_GAP);
 assert.equal(pixelWordWidth('GU_',size,widths.puzzle),
  unpadded('GU_')+PIXEL_BLANK_WORD_GAP);
 assert.equal(pixelWordWidth('DW_ER',size,widths.puzzle),
  unpadded('DW_ER'));
 assert.equal(pixelWordWidth('_WYER',size,widths.puzzle),
  unpadded('_WYER')+PIXEL_BLANK_WORD_GAP);
 assert.equal(pixelWordWidth('_',size,widths.puzzle),
  PIXEL_WRITING_BLANK_WIDTH+2*PIXEL_BLANK_WORD_GAP);

 // Force Y into the example to test specific word boundaries independently of
 // rare-letter ordering and keep the original sentence's words intact.
 const generated=generatePixelPicture(moduleFor(phrase));
 assert.equal(generated.missingLetters[0],'Y');
 assert.equal(generated.maskedPhrase,'AND_ DW_ER IS THE COOLEST GU_ ON THE PLANET.');
 const plan=planPixelPicture(generated,widths);
 assert.ok(plan);
 const blanks=plan.phraseGlyphs.filter(g=>g.kind==='blank');
 assert.equal(blanks.length,3);
 const endOfAndy=blanks[0],middleOfDwyer=blanks[1],endOfGuy=blanks[2];
 const afterAndy=plan.phraseGlyphs.find(g=>g.line===endOfAndy.line&&g.x>endOfAndy.x);
 assert.ok(afterAndy,'DWYER should follow ANDY on the same line in this fixture');
 assert.ok(Math.abs(afterAndy.x-(endOfAndy.x+PIXEL_WRITING_BLANK_WIDTH)-
  (widths.puzzle(' ',plan.phraseSize)+PIXEL_BLANK_WORD_GAP))<.001,
  'extra whitespace after ANDY writing line');
 const afterDwyer=plan.phraseGlyphs.find(g=>g.line===middleOfDwyer.line&&g.x>middleOfDwyer.x);
 assert.ok(afterDwyer&&afterDwyer.char==='E');
 assert.ok(Math.abs(afterDwyer.x-(middleOfDwyer.x+PIXEL_WRITING_BLANK_WIDTH))<.001,
  'no extra whitespace inside DWYER');
 assert.equal(endOfGuy.width,PIXEL_WRITING_BLANK_WIDTH);
 const guyLine=plan.phraseLines[endOfGuy.line];
 assert.ok(guyLine.text.includes('GU_'));
});
test('SVG and PDF draw the same restored title, centered instruction lines and blanks',async()=>{
 const [preview,pdf,layout]=await Promise.all([
  readFile(new URL('../src/PixelPicturePrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pixelPicturePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pixelPictureLayout.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/fontFamily="Mouse Memoirs" fontSize=\{plan\.titleSize\}/u);
 assert.match(preview,/textAnchor="middle"/u);
 assert.match(preview,/\{plan\.title\}/u);
 assert.match(pdf,/page\.drawText\(plan\.title/u);
 assert.match(pdf,/fonts\.title\.widthOfTextAtSize\(plan\.title,plan\.titleSize\)\/2/u);
 assert.match(preview,/x2=\{glyph\.x\+plan\.blankWidth\}/u);
 assert.match(pdf,/glyph\.x\+plan\.blankWidth/u);
 assert.match(layout,/balancedBankLines\(PIXEL_INSTRUCTION/u);
 assert.match(layout,/balancePhrase\(puzzle\.maskedPhrase/u);
 assert.match(preview,/opacity="\.35"/u);
 assert.match(pdf,/opacity:\.35/u);
});
test('Star and long Butterfly print-matched booklets still export with heading and word-edge blanks',async()=>{
 const files={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 for(const [text,shape] of [
  [phrase,'star'],
  ['The Israelites praised God because he made a way through the sea and kept them safe.','butterfly'],
 ]){
  const draft=makeParityDraft(6,{allBorderless:true});
  const slot=getPrintableSheetRegions(draft).flat().find(r=>r.bookletPage!==1&&r.size==='medium');
  assert.ok(slot);
  draft.modules[slot.bookletPage+':'+slot.id]=moduleFor(text,1,shape);
  const prior=structuredClone(draft);
  const bytes=await createBookletPdf(draft,files);
  assert.deepEqual(draft,prior);
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.ok(bytes.length>20000);
 }
});
