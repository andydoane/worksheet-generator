import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {
 balancedInitialLines,firstLetterInstruction,planFirstLetters,planCheckboxes,CHECKBOX_INSTRUCTION,
} from '../src/smallBalancedLayout.ts';
import {balancedBankLines} from '../src/balancedBankLines.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from '../src/smallParityLayout.ts';
import {verseInitials,validateSmallModule,shuffledWordList} from '../src/smallModules.ts';
import {createBookletPdf} from '../src/pdf.ts';

const assets=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await assets(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const pdf={},browser={};
 for(const [name,file] of [['title',files.mouseMemoirs],['puzzle',files.zillaSlab]]){
  const font=fontkit.create(file),embedded=await doc.embedFont(file,{subset:false});
  pdf[name]=(str,size)=>embedded.widthOfTextAtSize(str,size);
  browser[name]=(str,size)=>font.layout(str).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*size/font.unitsPerEm;
 }
 return {files,pdf,browser};
}
const short={type:'first-letters',reference:'John 3:16',
 verse:'For God so loved the world that he gave his only Son'};
const long={type:'first-letters',reference:'1 Thessalonians 5:16',
 verse:Array.from({length:75},(_,i)=>['For','God','so','loved','the'][i%5]).join(' ')};
const shortList={type:'checkboxes',correct:'DAVID\nSTONE',incorrect:'BOAT\nRAINBOW',seed:3};
const tenList={type:'checkboxes',correct:'THESSALONIANS\nBETHLEHEM\nPROMISE\nSHEPHERD\nGOLIATH',
 incorrect:'RAINBOW\nDESERT\nSAMSON\nWATER\nPHARAOH',seed:7};

test('First Letter instruction combines reference, abbreviates long books, and drops separate reference line',()=>{
 assert.equal(firstLetterInstruction('John 3:16'),'Try to say John 3:16 using just the first letters.');
 assert.equal(firstLetterInstruction('1 Thessalonians 5:16'),'Try to say 1 Thess. 5:16 using just the first letters.');
 assert.equal(firstLetterInstruction('Deuteronomy 6:5'),'Try to say Deut. 6:5 using just the first letters.');
 assert.equal(firstLetterInstruction('Revelation 21:4'),'Try to say Rev. 21:4 using just the first letters.');
});
test('Balanced initials preserve every character and use natural glyph widths',async()=>{
 const {pdf}=await metrics(),text='FGSLTWTHGHOAS';
 const lines=balancedInitialLines(text,115,pdf.puzzle,18,2);
 assert.ok(lines);
 assert.equal(lines.join(''),text);
 assert.equal(lines.length,2);
 assert.ok(lines.every(s=>pdf.puzzle(s,18)<=115+.00001));
 assert.ok(Math.abs(pdf.puzzle(lines[0],18)-pdf.puzzle(lines[1],18))<25);
 assert.equal(balancedInitialLines(text,5,pdf.puzzle,18,2),null);
});
test('Both short and 75-word First Letter layouts fit; PDF/preview exact positions and no clipping',async()=>{
 const {pdf,browser}=await metrics();
 for(const module of [short,long]){
  assert.deepEqual(validateSmallModule(module),[]);
  const p=planFirstLetters(module,pdf.title,pdf.puzzle);
  const q=planFirstLetters(module,browser.title,browser.puzzle);
  assert.ok(p&&q);
  assert.equal(p.instruction,firstLetterInstruction(module.reference));
  assert.deepEqual(p.instructionLines.map(l=>l.text),q.instructionLines.map(l=>l.text));
  assert.deepEqual(p.letterLines.map(l=>l.text),q.letterLines.map(l=>l.text));
  assert.equal(p.letterSize,q.letterSize);
  assert.equal(p.instructionSize,q.instructionSize);
  assert.equal(p.letterLines.map(l=>l.text).join(''),verseInitials(module.verse));
  assert.ok(p.letterLines.length<=8&&p.letterLines.length>=1);
  assert.ok(p.instructionLines.length>=2&&p.instructionLines.length<=4);
  assert.equal(p.instructionLines.map(l=>l.text).join(' '),p.instruction);
  assert.ok(p.letterLines.every(l=>pdf.puzzle(l.text,p.letterSize)<=SMALL_PRINT_WIDTH-7.9));
  assert.ok(p.letterLines.every(l=>l.y-p.letterSize>=p.fieldTop-.001&&l.y<=p.fieldBottom+.001));
  assert.ok(p.instructionLines.at(-1).y+10<p.letterLines[0].y-p.letterSize);
  assert.ok(Math.max(...p.letterLines.map(l=>l.y))<SMALL_PRINT_HEIGHT-5);
 }
});
test('Checkboxes balances instructions with 14-character entries and centered rows',async()=>{
 const {pdf,browser}=await metrics();
 assert.equal(CHECKBOX_INSTRUCTION,'Check off everything that is part of the story.');
 for(const module of [shortList,tenList]){
  assert.deepEqual(validateSmallModule(module),[]);
  const p=planCheckboxes(module,pdf.title,pdf.puzzle);
  const q=planCheckboxes(module,browser.title,browser.puzzle);
  assert.ok(p&&q);
  assert.deepEqual(p.instructionLines,q.instructionLines);
  assert.deepEqual(p.rows,q.rows);
  assert.equal(p.wordSize,q.wordSize);
  assert.ok(p.instructionLines.length>=2);
  assert.deepEqual(p.instructionLines.map(l=>l.text),
   balancedBankLines(CHECKBOX_INSTRUCTION,SMALL_PRINT_WIDTH-8,pdf.title,p.instructionSize,3));
  assert.deepEqual(p.rows.map(x=>x.text),shuffledWordList(module).map(x=>x.text.toUpperCase()));
  assert.ok(p.rows.every(r=>r.squareX>=0&&r.squareY>p.fieldTop-1));
  assert.ok(p.rows.every(r=>r.squareY+r.squareSize<p.fieldBottom+1));
  assert.ok(p.rows.every(r=>pdf.puzzle(r.text,p.wordSize)<=SMALL_PRINT_WIDTH/2-17));
  const twoColumns=p.rows.some(r=>r.squareX>SMALL_PRINT_WIDTH/2);
  for(let i=0;i<p.rows.length;i++){
   if(twoColumns)
    assert.ok(Math.abs(p.rows[i].squareX-(i%2?SMALL_PRINT_WIDTH/2+2:2))<.001);
   else
    assert.ok(Math.abs(p.rows[i].squareX-p.rows[0].squareX)<.001);
  }
 }
 assert.deepEqual(validateSmallModule({...shortList,correct:'RED SEA\nSTONE'}),[]);
 assert.ok(validateSmallModule({...shortList,correct:'ABCDEFGHIJKLMNOP\nSTONE'}).some(x=>/14 characters/u.test(x)));
});
test('New SVG and PDF renderers use the same two plans and preserve other Small activities',async()=>{
 const [preview,pdf]=await Promise.all([
  readFile(new URL('../src/SmallModulePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/smallPdf.ts',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/case 'first-letters':return <FirstLettersPrintPreview/u);
 assert.match(preview,/case 'checkboxes':return <CheckboxesPrintPreview/u);
 assert.match(pdf,/const plan=planFirstLetters\(module/u);
 assert.match(pdf,/const plan=planCheckboxes\(module/u);
 assert.match(pdf,/case 'who-am-i':return drawWho/u);
 assert.match(preview,/case 'who-am-i':/u);
});
test('First Letter and Checkboxes print correctly in mixed two-sheet folded booklet',async()=>{
 const {files}=await metrics();
 const draft={title:'God Keeps His Promises',scripture:'John 3:16',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{
   '2:top-left-small':short,
   '2:top-right-small':tenList,
   '3:bottom-left-small':long,
   '3:bottom-right-small':shortList,
   '4:bottom-left-small':{...long,reference:'Deuteronomy 6:5',verse:short.verse},
   '4:bottom-right-small':{...tenList,seed:22},
  }};
 const result=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(result.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
