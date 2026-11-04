import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {generateCryptogram,checkCryptogram} from '../src/cryptograms.ts';
import {
 planVerseCryptogram,LARGE_CIPHER_WIDTH,LARGE_CIPHER_HEIGHT,
 VERSE_CIPHER_MIN_CELL,VERSE_CIPHER_MAX_CELL,
} from '../src/verseCryptogramLayout.ts';
import {planMazePrint} from '../src/mazePrintLayout.ts';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from '../src/mediumParityLayout.ts';
import {createBookletPdf} from '../src/pdf.ts';

const file=path=>readFile(new URL('../'+path,import.meta.url));
const fonts=async()=>({
 mouseMemoirs:await file('fonts/MouseMemoirs-Regular.ttf'),
 nunitoSans:await file('fonts/Nunito-Medium.ttf'),
 nunitoSans750:await file('fonts/Nunito-Bold.ttf'),
 nunitoSans900:await file('fonts/Nunito-ExtraBold.ttf'),
 zillaSlab:await file('fonts/ZillaSlab-Bold-pdf.ttf'),
});
async function widthFunctions(){
 const files=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const medium=await doc.embedFont(files.nunitoSans,{subset:false});
 const bold=await doc.embedFont(files.nunitoSans750,{subset:false});
 return {
  medium:(text,size)=>medium.widthOfTextAtSize(text,size),
  bold:(text,size)=>bold.widthOfTextAtSize(text,size),
 };
}
const psalm={
 type:'verse-cryptogram',reference:'Psalm 128:1',
 verse:'Blessed are all who fear the LORD—who walk in His ways!',seed:2,
};
const lessonPath='curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json';

test('Psalm 128:1 becomes larger with additional whole-word rows',async()=>{
 const {medium}=await widthFunctions(),data=generateCryptogram(psalm);
 const plan=planVerseCryptogram(data,medium);
 assert.ok(plan,'Psalm should fit the large printable region');
 assert.ok(plan.lineCount>=4,'Larger symbol/answer width should use at least four rows');
 assert.ok(plan.cipherCell>=18,'Handwriting cells should grow appreciably beyond 13pt');
 assert.ok(plan.cipherCell<=VERSE_CIPHER_MAX_CELL);
 assert.ok(plan.cipherCell>=VERSE_CIPHER_MIN_CELL);
 assert.equal(psalm.verse,'Blessed are all who fear the LORD—who walk in His ways!',
  'Source wording must not change');
 assert.match(data.text,/LORD — who/);
 assert.ok(plan.lineYs.every(y=>y>plan.referenceY+10&&y<LARGE_CIPHER_HEIGHT));
});

test('Large verse fitter preserves characters, key, full words, and physical bounds',async()=>{
 const {medium}=await widthFunctions();
 const lesson=JSON.parse(await file(lessonPath));
 const approved=lesson.preparedActivities.verseCryptogram;
 const inputs=[
  psalm,
  {type:'verse-cryptogram',reference:approved.reference,verse:approved.verse,seed:7},
  {type:'verse-cryptogram',reference:'John 3:16',
   verse:'For God so loved the world that He gave His one and only Son.',seed:4},
  {type:'verse-cryptogram',reference:'Exodus 14:14',
   verse:'The LORD will fight for you; you need only to be still.',seed:5},
 ];
 for(const input of inputs){
  const data=generateCryptogram(input),plan=planVerseCryptogram(data,medium);
  assert.ok(plan,'Unable to fit '+input.reference);
  assert.ok(checkCryptogram(data));
  assert.equal(plan.keyCells.length,data.key.length);
  assert.equal(plan.lineYs.length,plan.lineCount);
  assert.equal(plan.lineWidths.length,plan.lineCount);
  assert.equal(plan.bodyCells.map(c=>c.char).join(''),
   data.text.replace(/\s+/gu,''),'All non-space verse characters must survive');
  assert.ok(plan.keyCells.every(c=>c.x>=0&&c.x+c.width<=LARGE_CIPHER_WIDTH+.001));
  assert.ok(plan.bodyCells.every(c=>c.x>=0&&
   c.x+c.width<=LARGE_CIPHER_WIDTH+.001&&
   c.lineY+plan.symbolTopOffset+plan.symbolSize<LARGE_CIPHER_HEIGHT));
  assert.ok(plan.lineWidths.every(w=>w<=LARGE_CIPHER_WIDTH-8+.001));
  if(plan.lineCount>1)
   assert.ok(plan.lineStep>=Math.max(28,plan.symbolSize+18)-.001);
  assert.ok(plan.bodyCells.filter(c=>c.symbol!==undefined).every(c=>
   Number.isInteger(c.symbol)&&c.symbol>=0&&c.symbol<26));
 }
});

test('Near-limit verses and 26-letter decoding keys are handled without splitting the key',async()=>{
 const {medium}=await widthFunctions();
 const verse='Give thanks to the LORD, for He is good! His loving devotion endures forever. He led His people through the sea and kept them safe from fear.';
 assert.ok(verse.length<=145);
 const input={type:'verse-cryptogram',reference:'Psalm 136:1',verse,seed:9};
 const data=generateCryptogram(input),plan=planVerseCryptogram(data,medium);
 assert.ok(plan,'A near-limit verse should fit if its words can be placed');
 assert.ok(plan.lineCount>=3);
 const pangram=generateCryptogram({type:'verse-cryptogram',reference:'Psalm 1:1',
  verse:'The quick brown fox jumps over the lazy dog.',seed:11});
 assert.equal(pangram.key.length,26);
 const keyPlan=planVerseCryptogram(pangram,medium);
 assert.ok(keyPlan);
 assert.equal(keyPlan.keyCells.length,26);
 assert.ok(keyPlan.keySymbolSize>0&&keyPlan.keyLetterSize>0);
 assert.deepEqual(plan,planVerseCryptogram(data,medium),'Layout must be deterministic');
 assert.equal(planVerseCryptogram(data,medium,100,140),null,
  'Do not silently clip in an undersized region');
});

test('True or False Trek is fitted with the actual Nunito Bold PDF face',async()=>{
 const {medium,bold}=await widthFunctions();
 const statements=[
  'The Israelites crossed the Red Sea on dry ground.',
  'A statement that is long but still fits the 65-character bound!',
 ];
 for(const statement of statements){
  const plan=planMazePrint(statement,bold);
  assert.ok(plan,'Bold statement should fit: '+statement);
  assert.ok(bold(statement,plan.statementSize)<=MEDIUM_PRINT_WIDTH-10+.001);
  assert.ok(plan.statementSize>=7.1);
  assert.ok(plan.mazeWidth>270&&plan.mazeHeight>0);
  assert.ok(plan.arrowY+plan.arrowSize<MEDIUM_PRINT_HEIGHT);
  assert.ok(plan.mazeTop>plan.statementY+2);
  const old=planMazePrint(statement,medium);
  assert.ok(old);
  assert.ok(plan.statementSize<=old.statementSize+.001,
   'Measured Bold must not be substituted after sizing with Medium');
 }
 const [preview,pdf]=await Promise.all([
  file('src/PuzzlePreview.tsx').then(x=>x.toString()),
  file('src/puzzlePdf.ts').then(x=>x.toString()),
 ]);
 assert.match(preview,/planMazePrint\(module.statement,boldPdf\)/u);
 assert.match(preview,/fontWeight="700" fontSize=\{plan.statementSize\}/u);
 assert.match(pdf,/planMazePrint\(module.statement,\(text,size\)=>textWidth\(fonts.bodyBold,text,size\)/u);
 assert.match(pdf,/center\(page,fonts.bodyBold,module.statement/u);
 assert.match(preview,/fontWeight="500" fontSize="8.7"/u,
  'Instruction remains Medium');
});

test('Large preview and PDF use the same measured scene and not CSS word wrapping',async()=>{
 const [preview,pdf,planner]=await Promise.all([
  file('src/CryptogramPreview.tsx').then(x=>x.toString()),
  file('src/cryptogramPdf.ts').then(x=>x.toString()),
  file('src/verseCryptogramLayout.ts').then(x=>x.toString()),
 ]);
 assert.match(preview,/planVerseCryptogram\(generateCryptogram\(module\),finishBody\)/u);
 assert.match(pdf,/planVerseCryptogram\(/u);
 assert.match(preview,/LARGE_CIPHER_WIDTH/);
 assert.match(preview,/plan.bodyCells.map/);
 assert.match(pdf,/plan.bodyCells/);
 assert.doesNotMatch(preview,/cipher-encoded|cipher-word|cipher-space/u,
  'Large preview must not wrap independently in CSS');
 assert.match(planner,/balancedRows/u);
});

test('Both activities export in a real two-sheet folded PDF',async()=>{
 const source=JSON.parse(await file(lessonPath));
 const crypt=source.preparedActivities.verseCryptogram;
 const maze=source.preparedActivities.trueFalseMaze;
 const modules={
  '2:bottom-large':psalm,
  '3:top-large':{type:'verse-cryptogram',reference:crypt.reference,verse:crypt.verse,seed:7},
  '3:bottom-medium':{
   type:'true-false-maze',statement:maze.statement,answer:maze.isTrue,seed:4},
  '4:top-medium':{
   type:'true-false-maze',statement:'God guided the people through the sea.',answer:true,seed:11},
 };
 const output=await createBookletPdf({
  title:'Exodus Activity Fitting',scripture:'Exodus 14–15',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules,
 },await fonts());
 const pdf=await PDFDocument.load(output);
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(pdf.getPages().map(page=>[page.getWidth(),page.getHeight()]),
  [[792,612],[792,612]]);
});
