import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {balancedBankLines} from '../src/balancedBankLines.ts';
import {planDrawPicture,planSmallUnscramble} from '../src/smallFinishingLayout.ts';
import {planMultipleChoice,SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from '../src/smallParityLayout.ts';
import {planCheckboxes,CHECKBOX_INSTRUCTION} from '../src/smallBalancedLayout.ts';
import {scrambleWord,scramblePhrase,validUnscramblePhrase,validateSmallModule,shuffledWordList} from '../src/smallModules.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';
import {validateModule} from '../src/modules.ts';
import {glyphInkCenter} from '../src/fontInkCenter.ts';
import {createBookletPdf} from '../src/pdf.ts';

const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const data=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const titleFace=fontkit.create(data.mouseMemoirs);
 const result={data,ink:(text,size)=>glyphInkCenter(titleFace,text,size),pdf:{},browser:{}};
 for(const [key,bytes] of [['title',data.mouseMemoirs],['puzzle',data.zillaSlab]]){
  const embedded=await doc.embedFont(bytes,{subset:false}),face=fontkit.create(bytes);
  result.pdf[key]=(text,size)=>embedded.widthOfTextAtSize(text,size);
  result.browser[key]=(text,size)=>face.layout(text).glyphs.reduce((n,g)=>n+g.advanceWidth,0)*size/face.unitsPerEm;
 }
 return result;
}
const longPrompt='Moses and the people walking across the Red Sea on dry ground as waters stand like walls on each side.';
const nearMax='Which person trusted the Lord and built a very large boat to keep his family and the animals safe?';
const checkboxes={type:'checkboxes',correct:'RED SEA\nDRY LAND\nBURNING BUSH\nTHESSALONIANS\nRIVER BANK',
 incorrect:'PROMISED LAND\nKING DAVID\nGREAT STORM\nBIG FISH\nDESERT ROAD',seed:6};
test('Unscramble accepts one or two words up to ten letters excluding the separator',()=>{
 for(const text of ['NOAH','red sea','DRY LAND','CROSS RIVER','of the']){
  assert.equal(validUnscramblePhrase(text),true,text);
 }
 for(const text of ['a sea','SEA A','RED  SEA','RED SEA GATE','CROSS RIVERS','AAAA','red  land']){
  assert.equal(validUnscramblePhrase(text),false,text);
 }
 const mod={type:'unscramble-words',first:'red sea',second:'dry land',seed:5};
 assert.deepEqual(validateSmallModule(mod),[]);
 assert.ok(validateSmallModule({...mod,first:'RED SEA GATE'}).length);
 for(const [phrase,seed]of [['RED SEA',5],['DRY LAND',9],['CROSS RIVER',25]]){
  const scrambled=scramblePhrase(phrase,seed);
  const pieces=scrambled.split(' '),input=phrase.split(' ');
  assert.equal(pieces.length,2);
  for(let i=0;i<2;i++){
   assert.notEqual(pieces[i],input[i]);
   assert.deepEqual([...pieces[i]].sort(),[...input[i]].sort());
   assert.equal(pieces[i],scrambleWord(input[i],seed+i*97));
  }
  assert.equal(scramblePhrase(phrase,seed),scrambled);
 }
 assert.equal(fieldExceedsLength(mod,'un-first','CROSS RIVER'),false);
 assert.equal(fieldExceedsLength(mod,'un-first','CROSS RIVERS'),true);
});
test('Phrase-aware Unscramble blanks only appear for letters and match PDF/browser',async()=>{
 const m=await metrics();
 for(const module of [
  {type:'unscramble-words',first:'NOAH',second:'ARK',seed:2},
  {type:'unscramble-words',first:'RED SEA',second:'CROSS RIVER',seed:3},
  {type:'unscramble-words',first:'DRY LAND',second:'OF THE',seed:9},
 ]){
  assert.deepEqual(validateSmallModule(module),[]);
  const a=planSmallUnscramble(module,m.pdf.puzzle);
  const b=planSmallUnscramble(module,m.browser.puzzle);
  assert.ok(a&&b);
  assert.deepEqual(a,b);
  assert.equal(a.rows.length,2);
  for(let i=0;i<2;i++){
   const answer=module[i===0?'first':'second'];
   const letters=answer.replace(/ /gu,'').length;
   const row=a.rows[i];
   assert.equal(row.letters.length,letters);
   assert.equal(row.letters.map(x=>x.char).join(''),scramblePhrase(answer,module.seed+i*101).replace(/ /gu,''));
   assert.ok(row.letters.every(x=>x.lineStart<x.lineEnd&&x.lineY<x.y));
   assert.ok(row.letters.every(x=>x.lineStart>=3&&x.lineEnd<=SMALL_PRINT_WIDTH-3));
   assert.ok(row.letters.every(x=>x.y<SMALL_PRINT_HEIGHT-4));
   if(answer.includes(' ')){
    const index=answer.indexOf(' ');
    assert.ok(row.letters[index].lineStart-row.letters[index-1].lineEnd>9);
   }
  }
 }
});
test('Multiple Choice balances the measured question without shifting its answer rows',async()=>{
 const m=await metrics();
 for(const question of ['Who built the ark?',nearMax]){
  const module={type:'multiple-choice',question,correct:'Noah',wrong1:'Moses',wrong2:'David',seed:3};
  const p=planMultipleChoice(module,m.pdf.title,m.ink);
  const q=planMultipleChoice(module,m.browser.title,m.ink);
  assert.ok(p&&q);
  assert.deepEqual(p.questionLines,q.questionLines);
  assert.equal(p.questionLines.map(l=>l.text).join(' '),question);
  assert.deepEqual(p.questionLines.map(l=>l.text),
   balancedBankLines(question,SMALL_PRINT_WIDTH-5,m.pdf.title,p.questionSize,3));
  assert.ok(p.rows.every(row=>row.squareX>=0&&row.squareY>=0));
 }
});
test('Draw a Picture balances instruction and protects the drawing box in preview and PDF',async()=>{
 const m=await metrics();
 for(const prompt of ['Noah and the ark',longPrompt]){
  assert.deepEqual(validateModule({type:'draw-picture',prompt}),[]);
  const p=planDrawPicture(prompt,m.pdf.title),q=planDrawPicture(prompt,m.browser.title);
  assert.ok(p&&q);
  assert.deepEqual(p,q);
  assert.equal(p.lines.map(l=>l.text).join(' '),'Draw a picture of '+prompt);
  assert.deepEqual(p.lines.map(l=>l.text),
   balancedBankLines('Draw a picture of '+prompt,SMALL_PRINT_WIDTH,m.pdf.title,p.fontSize,3));
  assert.ok(p.lines.length>=1&&p.lines.length<=3);
  assert.ok(p.drawing.height>=70);
  assert.ok(p.lines.every(l=>l.y-p.fontSize>p.drawing.height));
  assert.ok(p.lines.every(l=>m.pdf.title(l.text,p.fontSize)<=SMALL_PRINT_WIDTH+.01));
  assert.ok(p.lines.at(-1).y<SMALL_PRINT_HEIGHT);
 }
});
test('Checkboxes supports multiword entries within 14 characters with no column spill',async()=>{
 const m=await metrics();
 assert.deepEqual(validateSmallModule(checkboxes),[]);
 assert.ok(validateSmallModule({...checkboxes,correct:'RED SEA CROSSING'}).some(x=>/14 characters/u.test(x)));
 assert.ok(validateSmallModule({...checkboxes,correct:'RED  SEA'}).length);
 assert.equal(fieldExceedsLength(checkboxes,'check-correct','BURNING BUSH'),false);
 assert.equal(fieldExceedsLength(checkboxes,'check-correct','CROSSING THE SEA'),true);
 const p=planCheckboxes(checkboxes,m.pdf.title,m.pdf.puzzle);
 const q=planCheckboxes(checkboxes,m.browser.title,m.browser.puzzle);
 assert.ok(p&&q);
 assert.deepEqual(p,q);
 assert.deepEqual(p.rows.map(r=>r.text),shuffledWordList(checkboxes).map(r=>r.text.toUpperCase()));
 assert.deepEqual(p.instructionLines.map(l=>l.text),
  balancedBankLines(CHECKBOX_INSTRUCTION,SMALL_PRINT_WIDTH-8,m.pdf.title,p.instructionSize,3));
 const oneColumn=p.rows.every(row=>row.squareX===2);
 const width=(oneColumn?SMALL_PRINT_WIDTH:SMALL_PRINT_WIDTH/2);
 assert.ok(p.rows.every(row=>row.x+m.pdf.puzzle(row.text,p.wordSize)<=row.squareX+width-3));
 assert.ok(p.rows.every(row=>row.squareY>=p.fieldTop&&row.squareY+row.squareSize<p.fieldBottom));
});
test('Integrated booklet prints all four new Small layouts without changing sheet geometry',async()=>{
 const {data}=await metrics();
 const draft={title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'small-small-medium-medium'},
 modules:{
  '2:top-left-small':{type:'unscramble-words',first:'RED SEA',second:'DRY LAND',seed:3},
  '2:top-right-small':{type:'multiple-choice',question:nearMax,correct:'Noah',wrong1:'Moses',wrong2:'David',seed:2},
  '3:bottom-left-small':{type:'draw-picture',prompt:longPrompt},
  '3:bottom-right-small':checkboxes,
  '4:top-left-small':{type:'unscramble-words',first:'CROSS RIVER',second:'NOAH',seed:8},
  '4:top-right-small':{type:'draw-picture',prompt:'the people crossing the sea'},
 }};
 const output=await PDFDocument.load(await createBookletPdf(draft,data));
 assert.deepEqual(output.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
