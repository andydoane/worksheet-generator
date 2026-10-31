import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {generateWordSearch,wordSearchCells} from '../src/puzzleEngines.ts';
import {planWordSearch,WORD_SEARCH_WIDTH,WORD_SEARCH_HEIGHT} from '../src/wordSearchLayout.ts';
import {planCrossword,CROSSWORD_WIDTH,CROSSWORD_HEIGHT} from '../src/crosswordLayout.ts';
import {generateCrossword} from '../src/specialtyModules.ts';

const four='David\nGoliath\nSlingshot\nStone';
const eight='David\nGoliath\nSling\nStone\nShepherd\nSaul\nGiants\nArmor';
const twelve='Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover';
const entries=[
 'DAVID, Young shepherd who faced a giant',
 'GOLIATH, Giant from Gath',
 'SLING, Weapon David used',
 'STONE, David picked up five',
 'SAUL, King of Israel',
 'SHEEP, Animals David watched',
 'GIANT, Very tall warrior',
 'ISRAEL, Nation David defended',
 'RED SEA, Where the Israelites crossed',
 'MANGER, Bed for baby Jesus',
].join('\n');
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function measurements(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [puzzle,bank,body]=await Promise.all([
  doc.embedFont(files.zillaSlab,{subset:false}),
  doc.embedFont(files.nunitoSans900,{subset:false}),
  doc.embedFont(files.nunitoSans,{subset:false}),
 ]);
 const face=fontkit.create(files.zillaSlab),bankFace=fontkit.create(files.nunitoSans900);
 const bodyFace=fontkit.create(files.nunitoSans);
 const pdf=font=>(s,size)=>font.widthOfTextAtSize(s,size);
 const browser=font=>(s,size)=>
  font.layout(s).glyphs.reduce((n,g)=>n+g.advanceWidth,0)*size/font.unitsPerEm;
 return {files,wordPdf:{puzzle:pdf(puzzle),bank:pdf(bank)},
  wordBrowser:{puzzle:browser(face),bank:browser(bankFace)},
  crossPdf:pdf(body),crossBrowser:browser(bodyFace)};
}
test('Title-free Word Search uses more space at 4, 8 and 12 entries and never clips',async()=>{
 const m=await measurements();
 for(const [words,count] of [[four,4],[eight,8],[twelve,12]]){
  for(const seed of [1,7,15]){
   const puzzle=generateWordSearch({type:'word-search',words,seed});
   const a=planWordSearch(puzzle,m.wordPdf);
   const b=planWordSearch(puzzle,m.wordBrowser);
   assert.ok(a&&b,'Cannot fit '+count+' words, seed '+seed);
   assert.ok(Math.abs(a.cell-b.cell)<.001);
   assert.ok(Math.abs(a.bankSize-b.bankSize)<.001);
   assert.equal(a.letters.length,120);
   assert.equal(a.bankEntries.length,count);
   assert.equal(a.bankColumns,count>8?3:2);
   assert.ok(a.gridTop>=4&&a.gridX>=2);
   assert.ok(a.gridTop+a.gridHeight+5<a.bankTop);
   assert.ok(a.bankBottom<=WORD_SEARCH_HEIGHT-6);
   assert.ok(a.gridX+a.gridWidth<=WORD_SEARCH_WIDTH-2);
   assert.ok(a.bankSize>=7.5&&a.letterSize>=12);
   const previous=Math.min((WORD_SEARCH_WIDTH-12)/12,
    (WORD_SEARCH_HEIGHT-52-(Math.ceil(count/(count>8?3:2))*22+15))/10);
   assert.ok(a.cell>previous+.4,
    'Expected heading removal to enlarge '+count+' word grid: '+a.cell+' versus '+previous);
   for(let i=0;i<a.letters.length;i++){
    const x=a.letters[i],y=b.letters[i];
    assert.equal(x.char,y.char);
    assert.ok(Math.abs(x.x-y.x)<.02&&Math.abs(x.y-y.y)<.02);
    const left=a.gridX+x.col*a.cell,top=a.gridTop+x.row*a.cell;
    assert.ok(x.x>=left+1,'Letter starts outside its cell');
    assert.ok(x.x+m.wordPdf.puzzle(x.char,a.letterSize)<=left+a.cell-1);
    assert.ok(x.y>=top+a.letterSize*.6&&x.y<top+a.cell-1);
   }
   const colWidth=WORD_SEARCH_WIDTH/a.bankColumns;
   for(let i=0;i<a.bankEntries.length;i++){
    const label=a.bankEntries[i],other=b.bankEntries[i];
    const relative=label.x-(i%a.bankColumns+.5)*colWidth;
    assert.ok(Math.abs(relative)<1e-6);
    assert.ok(Math.abs(label.y-other.y)<.02);
    assert.ok(m.wordPdf.bank(label.text,a.bankSize)<colWidth-8);
    assert.ok(label.y-a.bankSize>=a.bankTop-3);
    assert.ok(label.y+3<a.bankBottom+1);
   }
   assert.ok(wordSearchCells(puzzle).size>0,'Solution highlighting remains available');
  }
 }
});
test('Title-free Crossword starts near the top and protects grid, clue columns and bottom',async()=>{
 const m=await measurements();
 for(const seed of [2,4,8,16]){
  const puzzle=generateCrossword({type:'crossword',entries,seed});
  const a=planCrossword(puzzle,m.crossPdf),b=planCrossword(puzzle,m.crossBrowser);
  assert.ok(a&&b,'Crossword failed seed '+seed);
  assert.equal(a.gridTop,8);
  assert.ok(a.cell>9);
  assert.ok(Math.abs(a.cell-b.cell)<.001);
  assert.equal(a.clueFontSize,b.clueFontSize);
  assert.ok(a.gridX>=4);
  assert.ok(a.gridX+a.gridWidth<=CROSSWORD_WIDTH-4);
  assert.ok(a.gridTop+a.gridHeight+8<a.acrossHeader.y);
  assert.ok(a.gridTop+a.gridHeight+8<a.downHeader.y);
  assert.ok([...a.acrossRows,...a.downRows].every(row=>row.y<CROSSWORD_HEIGHT-3));
  assert.equal(a.acrossRows.length,b.acrossRows.length);
  assert.equal(a.downRows.length,b.downRows.length);
  assert.ok([...a.acrossRows,...a.downRows].every(row=>
   m.crossPdf(row.text,a.clueFontSize)<=CROSSWORD_WIDTH/2-16));
 }
});
test('Both title-free Large puzzles export together to physical two-sheet booklet',async()=>{
 const {files}=await measurements();
 const draft={title:'God Makes a Way',scripture:'Exodus 14',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{
   '1:cover-activity':{type:'crossword',entries,seed:4},
   '2:top-large':{type:'word-search',words:four,seed:7},
   '3:top-large':{type:'word-search',words:twelve,seed:15},
   '4:top-large':{type:'crossword',entries,seed:8},
  }};
 const bytes=await createBookletPdf(draft,files);
 const document=await PDFDocument.load(bytes);
 assert.deepEqual(document.getPages().map(p=>[p.getWidth(),p.getHeight()]),
  [[792,612],[792,612]]);
 const [svg,pdf,crossSvg,crossPdf]=await Promise.all([
  readFile(new URL('../src/WordSearchPrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/puzzlePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/SpecialtyPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(svg,/planWordSearch/u);
 assert.match(pdf,/planWordSearch/u);
 assert.doesNotMatch(svg,/>WORD SEARCH</u);
 assert.doesNotMatch(pdf,/'WORD SEARCH',box/u);
 assert.doesNotMatch(crossSvg,/>CROSSWORD<\/text>/u);
 assert.doesNotMatch(crossPdf,/'CROSSWORD',b\.x/u);
 assert.match(crossSvg,/>ACROSS|ACROSS'/u);
});
