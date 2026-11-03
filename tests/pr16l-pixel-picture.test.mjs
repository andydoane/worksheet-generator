import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {MODULES,blankModule,readAssignments,validateModule} from '../src/modules.ts';
import {
 generatePixelPicture,choosePixelBlanks,choosePixelLetter,pixelLetterCandidates,
 validatePixelPicture,PIXEL_INSTRUCTION,
} from '../src/pixelPicture.ts';
import {PIXEL_SHAPES} from '../src/pixelPictureShapes.ts';
import {planPixelPicture,PIXEL_WRITING_BLANK_WIDTH} from '../src/pixelPictureLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {MODULE_GUIDANCE,newModuleWithExample,samplePlaceholder} from '../src/moduleGuidance.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const medium={type:'pixel-picture',phrase:'The Egyptians chased after the Israelites.',shapeId:'star',seed:2};
const face=async file=>fontkit.create(await readFile(new URL('../fonts/'+file,import.meta.url)));
const width=face=>(text,size)=>face.layout(text).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*size/face.unitsPerEm;
async function measured(){
 const [body,puzzle,title]=await Promise.all([face('Nunito-Medium.ttf'),face('ZillaSlab-Bold-pdf.ttf'),face('MouseMemoirs-Regular.ttf')]);
 return {body:width(body),puzzle:width(puzzle),title:width(title)};
}
test('Pixel Picture remains a Medium activity with a blank editor input and a non-counting sample',()=>{
 assert.equal(MODULES.find(m=>m.id==='pixel-picture')?.size,'medium');
 const selected=blankModule('pixel-picture');
 assert.deepEqual(selected,{type:'pixel-picture',phrase:'',shapeId:'star',seed:1});
 assert.ok(validateModule(selected).length>0);
 const example=newModuleWithExample('pixel-picture');
 assert.deepEqual(validateModule(example),[]);
 assert.equal(samplePlaceholder('pixel-picture','phrase'),medium.phrase);
 assert.equal(MODULE_GUIDANCE['pixel-picture'].instruction.includes('13×13'),true);
 assert.deepEqual(readAssignments({'2:top-medium':medium})['2:top-medium'],medium);
});
test('All supplied 13×13 silhouette masks remain byte-for-byte shape identities',()=>{
 assert.equal(PIXEL_SHAPES.length,19);
 assert.equal(new Set(PIXEL_SHAPES.map(s=>s.id)).size,19);
 assert.equal(new Set(PIXEL_SHAPES.map(s=>s.rows.join(''))).size,19);
 for(const shape of PIXEL_SHAPES){
  assert.equal(shape.size,13,shape.id);
  assert.equal(shape.rows.length,13,shape.id);
  assert.ok(shape.rows.every(row=>/^[01]{13}$/u.test(row)),shape.id);
  assert.ok(shape.rows.some(row=>row.includes('1')),shape.id);
  assert.ok(shape.rows.some(row=>row.includes('0')),shape.id);
 }
});
test('Choose exactly one repeated letter, preferring uncommon letters and rotating candidates with seed',()=>{
 const withZ='Zebras zigzag in a zany green meadow.';
 assert.ok(withZ.length>=30);
 assert.equal(choosePixelLetter(withZ,1),'Z');
 const letters=pixelLetterCandidates(withZ);
 assert.ok(letters.length>=2);
 assert.equal(letters[0],'Z');
 assert.notEqual(choosePixelLetter(withZ,1),choosePixelLetter(withZ,2));
 assert.equal(choosePixelLetter(withZ,1),choosePixelLetter(withZ,1));
 for(const phrase of [
  medium.phrase,
  'God led his people into safety and made a path across the deep sea.',
  'Pharaoh sent the soldiers to pursue the Israelites into the wilderness.',
 ]){
  const letter=choosePixelLetter(phrase,2);
  assert.ok(letter,'must pick exactly one letter');
  const positions=choosePixelBlanks(phrase,2);
  assert.ok(positions.length>=2,phrase);
  assert.deepEqual(positions,
   Array.from(phrase.toUpperCase()).flatMap((ch,i)=>ch===letter?[i]:[]),
   'every occurrence of chosen letter, no others');
  const generated=generatePixelPicture({...medium,phrase,seed:2});
  assert.deepEqual(generated.missingLetters,[letter]);
  assert.deepEqual(generated.missingPositions,positions);
  assert.equal(generated.maskedPhrase.split('_').length-1,positions.length);
  assert.equal(generated.maskedPhrase,
   Array.from(phrase.toUpperCase()).map((ch,i)=>positions.includes(i)?'_':ch).join(''));
 }
});
test('Every one-bit contains the SAME selected letter and zero-bit cells never contain it',()=>{
 for(const shape of PIXEL_SHAPES){
  const m={...medium,shapeId:shape.id};
  const puzzle=generatePixelPicture(m);
  assert.deepEqual(puzzle.mask,shape.rows);
  assert.equal(puzzle.grid.length,13);
  assert.ok(puzzle.grid.every(row=>row.length===13));
  assert.equal(puzzle.missingLetters.length,1);
  const key=puzzle.missingLetters[0];
  for(let y=0;y<13;y++)for(let x=0;x<13;x++)
   assert.equal(puzzle.grid[y][x]===key,shape.rows[y][x]==='1',
    shape.id+' cell '+x+','+y);
  assert.ok(puzzle.grid.flat().filter(ch=>ch===key).length>=2,shape.id);
  assert.deepEqual(generatePixelPicture(m),puzzle,'fixed seed must produce identical puzzle');
 }
 const later=generatePixelPicture({...medium,seed:medium.seed+1});
 assert.notDeepEqual(later.grid,generatePixelPicture(medium).grid,'regeneration must change grid');
});
test('Phrase validator retains the 30–85 character bound and requires a repeated letter',()=>{
 assert.ok(validatePixelPicture({...medium,phrase:'Too short.'}).some(s=>s.includes('30–85')));
 assert.ok(validatePixelPicture({...medium,phrase:'A'.repeat(86)}).length);
 assert.ok(validatePixelPicture({...medium,phrase:'The Çhildren crossed the Red Sea together.'}).length);
 assert.ok(validatePixelPicture({...medium,shapeId:'not-a-shape'}).length);
 assert.ok(validatePixelPicture({...medium,phrase:'Abc def ghi jkl mno pqr stu vwx?'}).length);
 assert.deepEqual(validatePixelPicture(medium),[]);
});
test('Title, instructions and uppercase Zilla phrase form ONE vertically centered left block with fixed-size blanks',async()=>{
 const metrics=await measured();
 const phrases=[
  medium.phrase,
  'God made a safe path through the Red Sea and led the people out of Egypt.',
  'The Israelites praised God because he made a way through the sea and kept them safe.',
  'Pharaoh chased the Israelites, but God protected everyone who trusted him.',
 ];
 let firstBlankWidth=null;
 let shortSize=null;
 for(const phrase of phrases){
  assert.ok(phrase.length>=30&&phrase.length<=85,phrase.length+' '+phrase);
  const puzzle=generatePixelPicture({...medium,phrase});
  const plan=planPixelPicture(puzzle,metrics);
  assert.ok(plan,'measured plan failed for: '+phrase);
  const left=MEDIUM_PRINT_WIDTH/2;
  assert.equal(plan.blankWidth,PIXEL_WRITING_BLANK_WIDTH);
  assert.ok(plan.blankWidth>=17,'fixed underline must be handwriting-sized');
  if(firstBlankWidth===null)firstBlankWidth=plan.blankWidth;
  assert.equal(plan.blankWidth,firstBlankWidth);
  if(shortSize===null)shortSize=plan.phraseSize;
  else assert.ok(plan.phraseSize<=shortSize,'long phrase font may shrink, blank never does');
  assert.equal(plan.title,'PIXEL PICTURE');
  assert.equal(plan.titleX,MEDIUM_PRINT_WIDTH/4);
  assert.ok(plan.titleY>=plan.groupTop&&plan.titleY<=plan.groupBottom);
  assert.ok(plan.groupTop>=4&&plan.groupBottom<=MEDIUM_PRINT_HEIGHT-4);
  assert.ok(Math.abs((plan.groupTop+plan.groupBottom)/2-MEDIUM_PRINT_HEIGHT/2)<.001,
   'title + instruction + phrase block should be vertically centered');
  assert.equal(plan.phraseGlyphs.filter(g=>g.kind==='blank').length,puzzle.missingPositions.length);
  for(const line of plan.instructions){
   assert.ok(line.x>=0&&line.x+metrics.body(line.text,plan.instructionSize)<left-3,
    'instruction crosses left panel: '+line.text);
   assert.ok(line.y>=plan.groupTop&&line.y<plan.groupBottom);
  }
  for(const glyph of plan.phraseGlyphs){
   assert.equal(glyph.char,glyph.char.toUpperCase(),'phrase must be all caps');
   assert.ok(glyph.x>=0&&glyph.x+glyph.width<=left-4,'phrase crosses left half');
   assert.ok(glyph.y>=plan.groupTop&&glyph.y+4<=plan.groupBottom,'phrase baseline out of block');
   if(glyph.kind==='blank')assert.equal(glyph.width,PIXEL_WRITING_BLANK_WIDTH);
  }
  assert.equal(plan.cells.length,169);
  assert.ok(plan.cells.every(cell=>cell.rectX>=left&&
   cell.rectX+plan.cell<=MEDIUM_PRINT_WIDTH&&cell.rectY>=0&&
   cell.rectY+plan.cell<=MEDIUM_PRINT_HEIGHT));
 }
});
test('SVG/PDF render title, uppercase Zilla glyphs, fixed underlines and exactly 35%-opacity grid letters',async()=>{
 const [preview,pdf,editor,puzzle,app]=await Promise.all([
  readFile(new URL('../src/PixelPicturePrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pixelPicturePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzleEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzlePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8')]);
 assert.equal(PIXEL_INSTRUCTION,'Fill in the missing letter. Color in the squares containing that letter.');
 assert.match(preview,/planPixelPicture\(puzzle/u);
 assert.match(pdf,/planPixelPicture\(puzzle/u);
 assert.match(preview,/fontFamily="Zilla Slab" fontWeight="700"/u);
 assert.match(pdf,/font:fonts\.puzzle,size:plan\.phraseSize/u);
 assert.match(preview,/opacity="\.35"/u);
 assert.match(pdf,/opacity:\.35/u);
 assert.match(preview,/x2=\{glyph\.x\+plan\.blankWidth\}/u);
 assert.match(pdf,/glyph\.x\+plan\.blankWidth/u);
 assert.match(preview,/\{plan\.title\}/u);
 assert.match(pdf,/page\.drawText\(plan\.title/u);
 assert.match(preview,/showSolution&&cell\.active/u);
 assert.doesNotMatch(pdf,/missingLetters\.join/u);
 assert.match(editor,/key\.missingLetters\[0\]/u);
 assert.match(editor,/one letter that repeats/u);
 assert.match(editor,/pixel-phrase/u);
 assert.match(editor,/pixel-shape/u);
 assert.match(puzzle,/PixelPicturePrintPreview/u);
 assert.match(app,/Regenerate missing letter and picture/u);
});
test('Pixel Picture still exports a two-sheet vector PDF in a Medium slot',async()=>{
 const fontFiles={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
 };
 const draft=makeParityDraft(6,{allBorderless:true});
 const slot=getPrintableSheetRegions(draft).flat().find(r=>r.bookletPage!==1&&r.size==='medium');
 assert.ok(slot,'test fixture must contain a Medium slot');
 draft.modules[slot.bookletPage+':'+slot.id]=medium;
 const original=structuredClone(draft);
 const bytes=await createBookletPdf(draft,fontFiles);
 assert.deepEqual(draft,original);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
 assert.ok(bytes.length>20000);
});
