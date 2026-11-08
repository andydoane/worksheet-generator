import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {verseGlyphs,formatVerseDashes} from '../src/versePunctuation.ts';
import {createBookletPdf} from '../src/pdf.ts';

const load=name=>readFile(new URL('../fonts/'+name,import.meta.url));
async function fontMetrics(){
 const doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const [title,body,puzzle]=await Promise.all([
  'MouseMemoirs-Regular.ttf','Nunito-Medium.ttf','ZillaSlab-Bold-pdf.ttf',
 ].map(async name=>doc.embedFont(await load(name),{subset:false})));
 return {
  title:(text,size)=>title.widthOfTextAtSize(text,size),
  body:(text,size)=>body.widthOfTextAtSize(text,size),
  puzzle:(text,size)=>puzzle.widthOfTextAtSize(text,size),
 };
}
const romans={type:'upside-down-verse',reference:'Romans 3:23',
 verse:'for all have sinned and fall short of the glory of God,'};
const jeremiah={type:'upside-down-verse',reference:'Jeremiah 32:27',
 verse:'Behold, I am the LORD, the God of all flesh. Is anything too difficult for Me?'};
const longIsaiah={type:'upside-down-verse',reference:'Isaiah 41:10',
 verse:'fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'};

function verifyBounds(plan,module){
 assert.ok(plan,'No printable plan for '+module.reference);
 assert.ok(plan.rowWidths.every(w=>w<=MEDIUM_PRINT_WIDTH-8+.001),
  'Every balanced row must fit inside the horizontal safe area');
 assert.equal(new Set(plan.marks.map(mark=>mark.y)).size,plan.rowCount);
 const expected=verseGlyphs(formatVerseDashes(module.verse).toUpperCase())
  .filter(g=>g.kind!=='space').map(g=>g.value).join('');
 assert.equal(plan.marks.map(mark=>mark.text).join(''),expected,
  'Balancing must preserve every verse glyph and its punctuation in order');
 assert.ok(plan.marks.every(mark=>mark.x>=3.99&&
  mark.x+(mark.kind==='letter'?plan.cell:0)<=MEDIUM_PRINT_WIDTH-3.99),
  'Letter rules must stay inside the printable region');
 const firstY=Math.min(...plan.marks.map(mark=>mark.y));
 const lastY=Math.max(...plan.marks.map(mark=>mark.y));
 assert.ok(firstY-plan.fontSize*.83>plan.titleY+2,'Title and verse cannot overlap');
 assert.ok(lastY+plan.glyphOffset+plan.invertedFontSize+2<=MEDIUM_PRINT_HEIGHT-3.99,
  'Upside-down glyphs must not extend beyond the print-safe bottom');
 assert.ok(plan.titleY-plan.titleSize*.8>=3.99,'Title must not reach beyond top inset');
 if(plan.rowCount>1)assert.ok(plan.lineStep>=plan.glyphOffset+
  plan.invertedFontSize+2.8-.001,'Inverted glyphs cannot collide with next rule');
}

test('Romans 3:23: two-line Upside Down grows its line pitch and centers the entire group',async()=>{
 const plan=planUpsideDownVerse(romans,await fontMetrics());
 verifyBounds(plan,romans);
 assert.equal(plan.rowCount,2,'Short two-line verse should stay on two lines');
 assert.ok(plan.lineStep>=39&&plan.lineStep<=42.01,
  'Two rows with spare height should use the comfortable 42pt pitch');
 assert.ok(plan.titleY>25,'Title must no longer be pinned to the top edge');
 const firstY=Math.min(...plan.marks.map(mark=>mark.y));
 const lastY=Math.max(...plan.marks.map(mark=>mark.y));
 const inkTop=plan.titleY-plan.titleSize*.8;
 const inkBottom=lastY+plan.glyphOffset+plan.invertedFontSize*.82+2;
 assert.ok(Math.abs((inkTop+inkBottom)/2-MEDIUM_PRINT_HEIGHT/2)<2,
  'Title and both verse rows should be centered together');
 assert.ok(firstY>plan.titleY+14,'Verse rows should clear the title');
});

test('Jeremiah 32:27: measured word balancing prevents an isolated final Me',async()=>{
 const plan=planUpsideDownVerse(jeremiah,await fontMetrics());
 verifyBounds(plan,jeremiah);
 assert.ok(plan.rowCount>=2);
 const lastY=Math.max(...plan.marks.map(mark=>mark.y));
 const finalLine=plan.marks.filter(mark=>mark.y===lastY).map(mark=>mark.text).join('');
 assert.ok(finalLine.length>8,'The final row should not contain only ME?');
 assert.ok(plan.rowWidths.at(-1)>=Math.max(...plan.rowWidths)*.48,
  'Last row should be comparable to other rows, not a stray word');
 assert.deepEqual(plan.rowWidths,planUpsideDownVerse(jeremiah,await fontMetrics()).rowWidths,
  'Balancing must be deterministic');
});

test('Long Upside Down remains printable with a reduced pitch, without changing source text',async()=>{
 const before=JSON.stringify(longIsaiah);
 const plan=planUpsideDownVerse(longIsaiah,await fontMetrics());
 verifyBounds(plan,longIsaiah);
 assert.ok(plan.lineStep<=42.01,'The preferred pitch is capped for print');
 assert.equal(JSON.stringify(longIsaiah),before,'Fitting cannot edit an approved verse');
});

test('Browser preview and vector PDF consume the same measured Upside Down plan',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/VerseReconstructionPreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/verseReconstructionPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/planUpsideDownVerse\(module,metrics\)/u);
 assert.match(pdf,/planUpsideDownVerse\(module,metrics,b\.width,b\.height\)/u);
 assert.match(preview,/plan\.titleY/u);
 assert.match(preview,/plan\.marks\.map/u);
 assert.match(pdf,/plan\.titleY/u);
 assert.match(pdf,/for\(const item of plan\.marks\)/u);
 const draft={title:'Upside Down Verse',scripture:'Romans 3; Jeremiah 32',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
   '2:top-medium':romans,'2:middle-medium':jeremiah,
   '3:top-medium':longIsaiah,
  }};
 const assets={
  mouseMemoirs:await load('MouseMemoirs-Regular.ttf'),
  nunitoSans:await load('Nunito-Medium.ttf'),
  nunitoSans750:await load('Nunito-Bold.ttf'),
  nunitoSans900:await load('Nunito-ExtraBold.ttf'),
  zillaSlab:await load('ZillaSlab-Bold-pdf.ttf'),
 };
 const output=await createBookletPdf(draft,assets);
 const document=await PDFDocument.load(output);
 assert.equal(document.getPageCount(),2,'The measured layout must export to PDF');
});
