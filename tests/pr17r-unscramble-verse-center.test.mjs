import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {parseVerse} from '../src/storyVerseModules.ts';

const approved=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',import.meta.url),
 'utf8'));
const raw=name=>readFile(new URL('../fonts/'+name,import.meta.url));
async function metrics(){
 const doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const names=['MouseMemoirs-Regular.ttf','Nunito-Medium.ttf','ZillaSlab-Bold-pdf.ttf'];
 const fonts=await Promise.all(names.map(async name=>
  doc.embedFont(await raw(name),{subset:false})));
 return {
  title:(text,size)=>fonts[0].widthOfTextAtSize(text,size),
  body:(text,size)=>fonts[1].widthOfTextAtSize(text,size),
  puzzle:(text,size)=>fonts[2].widthOfTextAtSize(text,size),
 };
}
test('OT32 Unscramble fills the medium activity width and centers title with verse',async()=>{
 const {draft}=buildWorksheetRecipe(approved,'preset-1',{purpose:'published',seed:1});
 const activity=draft.modules['4:top-medium'];
 assert.equal(activity.type,'unscramble-verse');
 assert.equal(activity.reference,'1 Chronicles 16:8');
 const p=planUnscrambleVerse(activity,await metrics());
 assert.ok(p,'OT32 approved verse must remain printable');
 assert.equal(p.title,'UNSCRAMBLE 1 CHRONICLES 16:8');
 assert.ok(p.fontSize>=13,p.fontSize+'pt text still looks as small as the former 10.6pt cap');
 assert.ok(p.cell>=13,p.cell+'pt blanks should grow with the available width');
 assert.ok(p.scrambleFontSize>8.2,'The scrambled letters must grow as well');
 assert.ok(Math.max(...p.rowWidths)>MEDIUM_PRINT_WIDTH*.78,
  'A verse row should occupy a meaningful share of the printable module width');
 assert.ok(p.rowWidths.every(w=>w<=MEDIUM_PRINT_WIDTH-8+.001));
 assert.equal(new Set(p.marks.map(mark=>mark.y)).size,p.rowCount);
 assert.ok(p.marks.every(mark=>mark.x>=4-.001&&mark.x+(
  mark.kind==='letter'?p.cell:0)<=MEDIUM_PRINT_WIDTH-3+.001),
  'The answer cells must stay inside the print-safe horizontal bounds');
 const firstRow=Math.min(...p.marks.map(mark=>mark.y));
 const lastRow=Math.max(...p.marks.map(mark=>mark.y));
 assert.ok(firstRow-p.fontSize*.83>p.titleY+2,
  'Title must not overlap the first verse line');
 assert.ok(p.lineStep>=p.fontSize+p.glyphOffset+3-.001,
  'Scrambled glyphs must not collide with the next row');
 assert.ok(lastRow+p.glyphOffset+p.scrambleFontSize+2<=MEDIUM_PRINT_HEIGHT-4+.001,
  'All answer lines and scrambled letters must stay in the module');
 const visibleTop=p.titleY-p.titleSize*.8;
 const visibleBottom=lastRow+p.glyphOffset+p.scrambleFontSize*.28+2;
 assert.ok(Math.abs((visibleTop+visibleBottom)/2-MEDIUM_PRINT_HEIGHT/2)<3,
  'Title and verse should form one vertically centered composition');
 const expected=parseVerse(activity.verse).answers
  .reduce((count,word)=>count+(word.match(/[A-Za-z]/gu)??[]).length,0);
 assert.equal(p.marks.filter(mark=>mark.kind==='letter').length,expected,
  'Every approved missing letter must remain present');
});

test('Unscramble shared plan uses the scaled letters in both PDF and browser preview',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/VerseReconstructionPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/verseReconstructionPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/fontSize=\{plan\.scrambleFontSize\}/u);
 assert.match(pdf,/size=plan\.scrambleFontSize/u);
 assert.match(preview,/planUnscrambleVerse\(module,metrics\)/u);
 assert.match(pdf,/planUnscrambleVerse\(module,metrics,b\.width,b\.height\)/u);
});

test('Only Unscramble changes size/placement; Upside Down preserves independent layout',async()=>{
 const upside={type:'upside-down-verse',reference:'Isaiah 41:10',
  verse:'The Lord guides us in love through the challenges of life.'};
 const p=planUpsideDownVerse(upside,await metrics());
 assert.ok(p);
 assert.equal(p.titleY,25);
 assert.equal(p.glyphOffset,6.8);
 assert.ok(p.invertedFontSize>=9.2&&p.invertedFontSize<=11.5);
});
