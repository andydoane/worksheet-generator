import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planCrossword,CROSSWORD_WIDTH,CROSSWORD_HEIGHT} from '../src/crosswordLayout.ts';
import {generateCrossword,spiralTurns} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
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
test('Crossword PDF and preview produce the same grid and clue coordinates',async()=>{
 const puzzle=generateCrossword({type:'crossword',entries,seed:4});
 const bytes=await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url));
 const browser=fontkit.create(bytes);
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const embedded=await pdf.embedFont(bytes,{subset:false});
 const planPdf=planCrossword(puzzle,(text,size)=>embedded.widthOfTextAtSize(text,size));
 const planBrowser=planCrossword(puzzle,(text,size)=>
   browser.layout(text).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/browser.unitsPerEm);
 assert.ok(planPdf&&planBrowser);
 assert.equal(planBrowser.cell,planPdf.cell);
 assert.equal(planBrowser.clueFontSize,planPdf.clueFontSize);
 assert.equal(planBrowser.acrossRows.length,planPdf.acrossRows.length);
 assert.equal(planBrowser.downRows.length,planPdf.downRows.length);
 assert.equal(planPdf.gridX,(CROSSWORD_WIDTH-planPdf.gridWidth)/2);
 assert.ok(planPdf.gridTop+planPdf.gridHeight<CROSSWORD_HEIGHT);
 assert.ok([...planPdf.acrossRows,...planPdf.downRows].every(x=>x.y<CROSSWORD_HEIGHT));
});
test('Spiral length varies by verse size',()=>{
 assert.ok(spiralTurns('Jesus wept.')<spiralTurns('Who shall separate us from the love of Christ?'));
});
test('App displays package version plus GitHub build revision, and page footers are absent',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.version,'0.16.1');
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 const pdf=await readFile(new URL('../src/pdf.ts',import.meta.url),'utf8');
 assert.match(app,/pkg\.version/);
 assert.match(app,/VITE_BUILD_SHA/);
 assert.doesNotMatch(app,/className="booklet-page-number"/);
 assert.doesNotMatch(pdf,/drawHalfPageLabel/);
});
test('Medium body, word-bank and reference typefaces stay on actual Nunito weights',async()=>{
 const css=await readFile(new URL('../src/layout.css',import.meta.url),'utf8');
 const pdf=await readFile(new URL('../src/storyVersePdf.ts',import.meta.url),'utf8');
 const recon=await readFile(new URL('../src/verseReconstructionPdf.ts',import.meta.url),'utf8');
 assert.match(css,/sv-medium-preview \.new-verse-body\s*\{\s*font:500/u);
 assert.match(css,/sv-medium-preview \.sv-word-bank\s*\{font-weight:800/u);
 assert.match(css,/sv-medium-preview \.sv-verse-ref\s*\{font-weight:700/u);
 assert.match(pdf,/drawReconstructionPdf\(page,region,m,fonts\)/u);
 assert.match(recon,/centered\(fonts\.bodyBold,plan\.reference/u);
});
test('Mixed Medium modules and spiral make a complete two-sheet print booklet',async()=>{
 const draft={title:'God Cares For Us',scripture:'Psalm 23',layouts:{
  2:'large-medium',3:'medium-medium-small-small',4:'medium-medium-small-small',
 },modules:{
  '1:cover-activity':{type:'crossword',entries,seed:4},
  '2:top-large':{type:'spiral-verse',reference:'Psalm 23:1',
    verse:'Who is my shepherd? The Lord watches over me and leads me beside quiet waters.'},
  '2:bottom-medium':{type:'finish-verse',reference:'Psalm 23:1',
    verse:'The [Lord] is my [shepherd] I [shall] not [want].',seed:4},
  '3:top-medium':{type:'circle-mistakes',count:3,
    text:'Daniel lived in Egypt. Daniel prayed to idols. The lions were not hungry.'},
  '3:middle-medium':{type:'big-idea-cryptogram',idea:'God loves us and guides our steps.',seed:4},
  '4:top-medium':{type:'connect-big-idea',idea:'God protects and guides his children.',seed:3},
  '4:middle-medium':{type:'match-words',
    pairs:'Moses, Leader\nPharaoh, King\nIsraelites, People\nRed Sea, Water',seed:2},
 }};
 const bytes=await createBookletPdf(draft,await fonts());
 const doc=await PDFDocument.load(bytes);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
