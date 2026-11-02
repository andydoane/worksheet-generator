import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {MODULES,blankModule,readAssignments,validateModule} from '../src/modules.ts';
import {generatePixelPicture,choosePixelBlanks,pixelMissingTarget,validatePixelPicture} from '../src/pixelPicture.ts';
import {PIXEL_SHAPES} from '../src/pixelPictureShapes.ts';
import {planPixelPicture} from '../src/pixelPictureLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {MODULE_GUIDANCE,newModuleWithExample,samplePlaceholder} from '../src/moduleGuidance.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const medium={type:'pixel-picture',phrase:'The Egyptians chased after the Israelites.',shapeId:'star',seed:2};
const face=async file=>fontkit.create(await readFile(new URL('../fonts/'+file,import.meta.url)));
const width=face=>(text,size)=>face.layout(text).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*size/face.unitsPerEm;
async function measured(){
 const [body,title,puzzle]=await Promise.all([
  face('Nunito-Medium.ttf'),face('MouseMemoirs-Regular.ttf'),face('ZillaSlab-Bold-pdf.ttf')]);
 return {body:width(body),title:width(title),puzzle:width(puzzle)};
}
test('Pixel Picture is a Medium choice with an empty saved input and a gray sample phrase',()=>{
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
test('All supplied 13×13 masks have exactly 169 binary cells and different silhouettes',()=>{
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
test('One occurrence of each missing letter, 4–8 letters, distributed over the phrase',()=>{
 for(const [length,count] of [[30,4],[39,4],[40,5],[50,6],[60,7],[70,8],[85,8]])
  assert.equal(pixelMissingTarget(length),count);
 for(const phrase of [
  medium.phrase,
  'God led his people into safety and made a path across the deep sea.',
  'Pharaoh sent the soldiers to pursue the Israelites into the wilderness.',
 ]){
  const positions=choosePixelBlanks(phrase,9);
  assert.ok(positions.length>=4&&positions.length<=8,phrase);
  assert.equal(new Set(positions.map(i=>phrase[i].toUpperCase())).size,positions.length);
  assert.ok(positions.every(i=>/[A-Za-z]/u.test(phrase[i])));
  assert.ok(positions.every((pos,i)=>i===0||pos-positions[i-1]>=2));
  const grid=generatePixelPicture({...medium,phrase,seed:9});
  assert.equal(grid.missingPositions.length,positions.length);
  assert.equal(grid.maskedPhrase.split('_').length-1,positions.length);
  assert.deepEqual(grid.missingLetters,[...new Set(grid.missingLetters)].sort());
  for(const pos of positions)assert.equal(grid.maskedPhrase[pos],'_');
  assert.equal(grid.maskedPhrase.replace(/_/gu,'').length,phrase.length-positions.length);
 }
});
test('Coloring exactly the missing-letter set reveals the requested silhouette',()=>{
 for(const shape of PIXEL_SHAPES){
  const m={...medium,shapeId:shape.id};
  const puzzle=generatePixelPicture(m);
  assert.deepEqual(puzzle.mask,shape.rows);
  assert.equal(puzzle.grid.length,13);
  assert.ok(puzzle.grid.every(row=>row.length===13));
  const key=new Set(puzzle.missingLetters);
  for(let y=0;y<13;y++)for(let x=0;x<13;x++)
   assert.equal(key.has(puzzle.grid[y][x]),shape.rows[y][x]==='1',
    shape.id+' cell '+x+','+y);
  assert.deepEqual(generatePixelPicture(m),puzzle,'fixed seed must produce identical puzzle');
 }
 const later=generatePixelPicture({...medium,seed:medium.seed+1});
 assert.notDeepEqual(later.grid,generatePixelPicture(medium).grid,'Regenerate must change letter placement');
});
test('Phrase validator enforces bounded length, readable English, known shape and four distinct letters',()=>{
 assert.ok(validatePixelPicture({...medium,phrase:'Too short.'}).some(s=>s.includes('30–85')));
 assert.ok(validatePixelPicture({...medium,phrase:'A'.repeat(86)}).length);
 assert.ok(validatePixelPicture({...medium,phrase:'The Çhildren crossed the Red Sea together.'}).length);
 assert.ok(validatePixelPicture({...medium,shapeId:'not-a-shape'}).length);
 assert.ok(validatePixelPicture({...medium,phrase:'aaaaaaaaaaaaaaaaaaaaaaaaaaa aaa'}).length);
 assert.deepEqual(validatePixelPicture(medium),[]);
});
test('Shared measured layout bounds all text within the left Small-sized half and every grid cell within right half',async()=>{
 const metrics=await measured();
 const examples=[
  medium.phrase,
  'God made a safe path through the Red Sea and led the people out of Egypt.',
  'The Israelites praised God because he made a way through the Red Sea and kept them safe.',
  'Pharaoh and his soldiers chased the Israelites, but God protected everyone who trusted him.',
 ];
 for(const phrase of examples){
  assert.ok(phrase.length>=30&&phrase.length<=85,phrase.length+' '+phrase);
  const puzzle=generatePixelPicture({...medium,phrase});
  const plan=planPixelPicture(puzzle,metrics);
  assert.ok(plan,'measured plan failed for: '+phrase);
  const left=MEDIUM_PRINT_WIDTH/2;
  assert.ok(plan.titleX-metrics.title(plan.title,plan.titleSize)/2>=0);
  assert.ok(plan.titleX+metrics.title(plan.title,plan.titleSize)/2<left);
  for(const line of [...plan.instructions,...plan.phraseLines]){
   const fontSize=plan.instructions.includes(line)?plan.instructionSize:plan.phraseSize;
   assert.ok(line.x>=0&&line.x+metrics.body(line.text,fontSize)<=left-3,
    'text crosses panel: '+line.text);
   assert.ok(line.y>=0&&line.y+fontSize*.38<=MEDIUM_PRINT_HEIGHT-3,
    'text crosses bottom: '+line.text);
  }
  assert.equal(plan.cells.length,169);
  assert.ok(plan.cells.every(cell=>cell.rectX>=left&&
   cell.rectX+plan.cell<=MEDIUM_PRINT_WIDTH&&cell.rectY>=0&&
   cell.rectY+plan.cell<=MEDIUM_PRINT_HEIGHT));
 }
});
test('The editor, SVG, and PDF all consume the same layout and never print the teacher answer key',async()=>{
 const [preview,pdf,editor,puzzle,app]=await Promise.all([
  readFile(new URL('../src/PixelPicturePrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pixelPicturePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzleEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzlePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8')]);
 assert.match(preview,/planPixelPicture\(puzzle/u);
 assert.match(pdf,/planPixelPicture\(puzzle/u);
 assert.match(preview,/showSolution&&cell\.active/u);
 assert.doesNotMatch(pdf,/missingLetters\.join/u);
 assert.match(editor,/key\.missingLetters\.join/u);
 assert.match(editor,/pixel-phrase/u);
 assert.match(editor,/pixel-shape/u);
 assert.match(puzzle,/PixelPicturePrintPreview/u);
 assert.match(app,/Regenerate missing letters and picture/u);
});
test('Pixel Picture renders a real, readable two-sheet vector PDF in a Medium slot',async()=>{
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
