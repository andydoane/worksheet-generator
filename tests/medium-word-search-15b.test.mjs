import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 MEDIUM_WORD_COLS,MEDIUM_WORD_ROWS,WORD_COLS,WORD_ROWS,
 blankPuzzleModule,isPuzzleModule,generateWordSearch,checkWordSearch,
 validatePuzzle,wordSearchCells,parseSearchEntries,
} from '../src/puzzleEngines.ts';
import {planMediumWordSearch,MEDIUM_SEARCH_TITLE} from '../src/mediumWordSearchLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {moduleForSize,readAssignments,validateModule} from '../src/modules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const one='Moses';
const three='Red Sea\nDry Land\nMoses';
const six='Joseph\nPharaoh\nRed Sea\nDry Land\nPromises\nCourage';
const maxSix='Shepherd\nPassover\nCreation\nJerusalem\nRighteous\nCommanded';
const cases=[one,three,six,maxSix];
async function fonts(){
 return {
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
  // The standard Medium 25pt title uses the Mouse Memoirs face above.
 };
}
async function metricSets(){
 const files=await fonts(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [puzzle,bank,title]=await Promise.all([
  doc.embedFont(files.zillaSlab,{subset:false}),
  doc.embedFont(files.nunitoSans900,{subset:false}),
  doc.embedFont(files.mouseMemoirs,{subset:false}),
 ]);
 const browserPuzzle=fontkit.create(files.zillaSlab),browserBank=fontkit.create(files.nunitoSans900),browserTitle=fontkit.create(files.mouseMemoirs);
 const metric=font=>(s,n)=>font.widthOfTextAtSize(s,n);
 const advance=font=>(s,n)=>font.layout(s).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*n/font.unitsPerEm;
 return {files,pdf:{puzzle:metric(puzzle),bank:metric(bank),title:metric(title)},
  browser:{puzzle:advance(browserPuzzle),bank:advance(browserBank),title:advance(browserTitle)}};
}
test('Medium Word Search is distinct and preserves saved Large IDs and payloads',()=>{
 assert.deepEqual([MEDIUM_WORD_COLS,MEDIUM_WORD_ROWS],[9,9]);
 assert.deepEqual([WORD_COLS,WORD_ROWS],[12,10]);
 assert.equal(moduleForSize('medium').find(x=>x.id==='medium-word-search')?.name,'Word Search (Medium)');
 assert.equal(moduleForSize('large').find(x=>x.id==='word-search')?.name,'Word Search');
 assert.equal(moduleForSize('large').some(x=>x.id==='medium-word-search'),false);
 assert.equal(moduleForSize('medium').some(x=>x.id==='word-search'),false);
 const m={type:'medium-word-search',words:three,seed:17};
 const previous={type:'word-search',words:six,seed:7};
 assert.deepEqual(blankPuzzleModule('medium-word-search'),{type:'medium-word-search',words:'',seed:1});
 assert.equal(isPuzzleModule(m),true);
 assert.deepEqual(readAssignments({'2:top-medium':m,'3:top-large':previous}),
  {'2:top-medium':m,'3:top-large':previous});
 assert.deepEqual(validateModule(previous),[]);
 assert.deepEqual(validateModule(m),[]);
 assert.equal(generateWordSearch(previous).grid.length,WORD_ROWS);
 assert.equal(generateWordSearch(previous).grid[0].length,WORD_COLS);
});
test('One through six Medium words, nine-letter entries, and useful errors',()=>{
 for(const [i,words]of cases.entries()){
  const module={type:'medium-word-search',words,seed:i+1};
  assert.deepEqual(validatePuzzle(module),[]);
  const grid=generateWordSearch(module);
  assert.equal(grid.grid.length,MEDIUM_WORD_ROWS);
  assert.ok(grid.grid.every(row=>row.length===MEDIUM_WORD_COLS));
  assert.equal(grid.placements.length,parseSearchEntries(words).length);
  assert.deepEqual(grid.labels,parseSearchEntries(words).map(x=>x.label));
  assert.equal(grid.cols,9);
  assert.equal(grid.rows,9);
  assert.equal(checkWordSearch(grid),true);
 }
 for(const [words,pattern] of [
  ['',/1–6/u],
  ['A',/2–9/u],
  ['ABCDEFGHIJ',/2–9/u],
  ['Mary\nMary',/different/u],
  ['A B C D E F G H I J',/2–9/u],
  ['One\nTwo\nThree\nFour\nFive\nSix\nSeven',/1–6/u],
  ['José',/A–Z/u],
 ])assert.ok(validatePuzzle({type:'medium-word-search',words,seed:1})
  .some(message=>pattern.test(message)),words+' should be rejected');
});
test('Small and max-length 9×9 puzzles solve and reproduce across seeds',()=>{
 for(const words of cases)for(const seed of [0,1,5,12,27]){
  const module={type:'medium-word-search',words,seed};
  const result=generateWordSearch(module);
  assert.equal(checkWordSearch(result),true);
  assert.deepEqual(result,generateWordSearch(module),'Seed must reproduce every letter and placement');
  assert.deepEqual(result.words,parseSearchEntries(words).map(x=>x.word));
  assert.ok(wordSearchCells(result).size>=Math.max(...result.words.map(x=>x.length)));
  for(const p of result.placements){
   assert.equal(p.word.length,result.words[result.placements.indexOf(p)].length);
   for(let i=0;i<p.word.length;i++)
    assert.equal(result.grid[p.y+i*p.dy][p.x+i*p.dx],p.word[i]);
  }
 }
});
test('Medium plan behaves like two Small panels: left grid, right centered title + bank',async()=>{
 const {pdf,browser}=await metricSets();
 for(const words of cases)for(const seed of [2,9,17]){
  const grid=generateWordSearch({type:'medium-word-search',words,seed});
  const a=planMediumWordSearch(grid,pdf),b=planMediumWordSearch(grid,browser);
  assert.ok(a&&b,'Layout could not fit '+grid.labels.length+' words');
  assert.ok(Math.abs(a.cell-b.cell)<.0001);
  assert.equal(a.bankSize,b.bankSize);
  assert.equal(a.bankEntries.length,grid.labels.length);
  assert.equal(a.letters.length,81);
  assert.equal(a.cell*9,a.gridWidth);
  assert.equal(a.gridWidth,a.gridHeight);
  assert.ok(a.cell>=17.3,'9x9 grid must nearly fill the Small-sized left half');
  assert.ok(a.letterSize>=13.2&&a.bankSize>=9);
  assert.equal(MEDIUM_SEARCH_TITLE,'CROSSWORD');
  assert.equal(a.titleSize,25);
  assert.equal(a.titleSize,b.titleSize);
  assert.ok(Math.abs(a.panelWidth-MEDIUM_PRINT_WIDTH/2)<1e-8);
  assert.ok(Math.abs(a.dividerX-a.panelWidth)<1e-8);
  assert.ok(Math.abs(a.gridX+a.gridWidth/2-a.panelWidth/2)<1e-8);
  assert.ok(Math.abs(a.gridTop+a.gridHeight/2-MEDIUM_PRINT_HEIGHT/2)<1e-8);
  assert.ok(a.gridX+a.gridWidth+2<a.dividerX);
  assert.ok(a.bankX>=a.dividerX+4);
  assert.ok(Math.abs(a.bankX+a.bankWidth/2-a.panelWidth*1.5)<1e-8);
  assert.ok(Math.abs(a.titleX-a.panelWidth*1.5)<1e-8);
  assert.ok(Math.abs(a.rightStackTop+a.rightStackHeight/2-MEDIUM_PRINT_HEIGHT/2)<1e-8);
  assert.ok(Math.abs(a.rightStackHeight-(28+8+a.bankHeight))<1e-8);
  assert.ok(a.rightStackTop>2);
  assert.ok(a.titleY<a.bankEntries[0].y-a.bankSize);
  assert.ok(Math.abs(pdf.title(MEDIUM_SEARCH_TITLE,a.titleSize)-
   browser.title(MEDIUM_SEARCH_TITLE,b.titleSize))<.02);
  assert.ok(pdf.title(MEDIUM_SEARCH_TITLE,a.titleSize)<a.bankWidth);
  assert.ok(a.gridX-2>=2&&a.gridTop-2>=2);
  assert.ok(a.gridTop+a.gridHeight+2<=MEDIUM_PRINT_HEIGHT-2);
  assert.ok(a.bankX+a.bankWidth<=MEDIUM_PRINT_WIDTH-3);
  assert.ok(a.dividerTop>0&&a.dividerBottom<MEDIUM_PRINT_HEIGHT);
  assert.ok(a.bankEntries.every(e=>Math.abs(e.x-(a.bankX+a.bankWidth/2))<1e-9));
  for(let i=0;i<a.bankEntries.length;i++){
   const entry=a.bankEntries[i],other=b.bankEntries[i];
   assert.ok(Math.abs(entry.x-other.x)<.025&&Math.abs(entry.y-other.y)<.025);
   assert.ok(pdf.bank(entry.text,a.bankSize)<=a.bankWidth-7);
   assert.ok(entry.y-a.bankSize>=3&&entry.y+3<=MEDIUM_PRINT_HEIGHT-3);
   if(i>0)assert.ok(entry.y-a.bankEntries[i-1].y>=a.bankPitch-.001);
  }
  for(let i=0;i<a.letters.length;i++){
   const l=a.letters[i],other=b.letters[i];
   assert.equal(l.char,other.char);
   assert.ok(Math.abs(l.x-other.x)<.025&&Math.abs(l.y-other.y)<.025);
   const left=a.gridX+l.col*a.cell,top=a.gridTop+l.row*a.cell;
   assert.ok(l.x>=left+.95&&l.x+pdf.puzzle(l.char,a.letterSize)<=left+a.cell-.95);
   assert.ok(l.y>=top+a.letterSize*.6&&l.y<top+a.cell-1);
  }
 }
});
test('Both print renderers use one shared measured Medium plan and editor exposes new limits',async()=>{
 const [svg,pdf,editor,preview]=await Promise.all([
  readFile(new URL('../src/MediumWordSearchPrintPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/puzzlePdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzleEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/PuzzlePreview.tsx',import.meta.url),'utf8'),
 ]);
 assert.match(svg,/planMediumWordSearch/u);
 assert.match(pdf,/planMediumWordSearch/u);
 assert.match(svg,/wordSearchCells/u);
 assert.match(svg,/selected\.has/u);
 assert.doesNotMatch(pdf,/selected\.has/u);
 assert.match(editor,/medium-word-search/u);
 assert.match(editor,/Use 2–9 letters/u);
 assert.match(preview,/MediumWordSearchPrintPreview/u);
 assert.doesNotMatch(svg,/>WORD SEARCH</u);
 assert.match(svg,/MEDIUM_SEARCH_TITLE/u);
 assert.match(pdf,/MEDIUM_SEARCH_TITLE/u);
 assert.doesNotMatch(svg,/plan\.dividerX/u);
 assert.doesNotMatch(pdf,/plan\.dividerX/u);
 assert.match(svg,/Mouse Memoirs/u);
 assert.match(pdf,/fonts\.title/u);
});
test('Medium, Large and legacy modules export together into two PDF sheets',async()=>{
 const {files}=await metricSets();
 const draft={title:'God Guides His People',scripture:'Exodus 14',
  layouts:{2:'medium-medium-small-small',3:'large-medium',4:'medium-medium-small-small'},
  modules:{
   '2:top-medium':{type:'medium-word-search',words:one,seed:3},
   '2:middle-medium':{type:'medium-word-search',words:three,seed:7},
   '3:top-large':{type:'word-search',words:six,seed:11},
   '3:bottom-medium':{type:'medium-word-search',words:maxSix,seed:12},
   '4:top-medium':{type:'medium-word-search',words:six,seed:17},
   '4:middle-medium':{type:'medium-word-search',words:maxSix,seed:27},
  }};
 const document=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(document.getPages().map(page=>[page.getWidth(),page.getHeight()]),
  [[792,612],[792,612]]);
});
