import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planWhoAmI,WHO_AM_I_CLUE_MAX,WHO_AM_I_LABEL} from '../src/whoAmIPrintLayout.ts';
import {SMALL_PRINT_HEIGHT,SMALL_PRINT_WIDTH} from '../src/smallParityLayout.ts';
import {validateSmallModule,answerCharacters} from '../src/smallModules.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';
import {createBookletPdf} from '../src/pdf.ts';

const short='I climbed a tree so I could see Jesus.';
const medium="I was thrown into a den of lions because I prayed to God each day. He protected me.";
const longest='I was a shepherd boy who trusted God. I stood before a giant with a sling and stone and believed the Lord would help me.';
assert.equal(longest.length,120);
const cases=[
 {type:'who-am-i',clue:short,answer:'Zacchaeus'},
 {type:'who-am-i',clue:medium,answer:'Daniel'},
 {type:'who-am-i',clue:longest,answer:'David'},
 {type:'who-am-i',clue:longest,answer:'John the Baptist'},
 {type:'who-am-i',clue:short,answer:'Mary-Jane'},
];
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function measures(){
 const files=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const pdfFont=await doc.embedFont(files.mouseMemoirs,{subset:false});
 const browserFace=fontkit.create(files.mouseMemoirs);
 return {files,
  pdf:(text,size)=>pdfFont.widthOfTextAtSize(text,size),
  browser:(text,size)=>browserFace.layout(text).glyphs.reduce((s,g)=>s+g.advanceWidth,0)*size/browserFace.unitsPerEm};
}
test('Who Am I clue cap is 120; 121 characters warns in both validation and editor',()=>{
 assert.equal(WHO_AM_I_CLUE_MAX,120);
 for(const sample of cases){
  assert.deepEqual(validateSmallModule(sample),[]);
  assert.equal(fieldExceedsLength(sample,'who-clue',sample.clue),false);
 }
 const invalid={type:'who-am-i',clue:longest+'!',answer:'David'};
 assert.equal(invalid.clue.length,121);
 assert.match(validateSmallModule(invalid).join(' '),/1–120 characters/u);
 assert.equal(fieldExceedsLength(invalid,'who-clue',invalid.clue),true);
 assert.ok(validateSmallModule({...cases[0],answer:'ABCDEFGHIJKLMNOP'}).length);
});
test('Who Am I protects the bottom half from short/maximum-length clues in both outputs',async()=>{
 const {pdf,browser}=await measures();
 for(const sample of cases){
  const a=planWhoAmI(sample,pdf),b=planWhoAmI(sample,browser);
  assert.ok(a&&b,'No fit for '+sample.clue.length+'-character clue '+sample.answer);
  assert.equal(a.clueSize,b.clueSize);
  assert.deepEqual(a.clueLines.map(l=>l.text),b.clueLines.map(l=>l.text));
  assert.ok(Math.abs(a.dividerY-SMALL_PRINT_HEIGHT*.52)<.001);
  assert.equal(a.clueLines.map(l=>l.text).join(' '),sample.clue);
  assert.ok(a.clueSize<=20&&a.clueSize>=10);
  assert.ok(a.clueLines.length>=1&&a.clueLines.length<=7);
  assert.ok(a.clueLines.every(l=>pdf(l.text,a.clueSize)<=SMALL_PRINT_WIDTH-10.9));
  assert.ok(a.clueLines.every(l=>l.y-a.clueSize>=a.clueTop-2&&l.y+a.clueSize*.08<=a.clueBottom+.01));
  assert.ok(a.clueBottom+5<a.questionY-a.questionSize);
  assert.ok(a.questionY>a.dividerY&&a.answerY>a.questionY+19);
  assert.ok(a.answerY<SMALL_PRINT_HEIGHT-8);
  assert.deepEqual(a.answerMarks,b.answerMarks);
  assert.ok(a.answerMarks.every(m=>m.x>=4&&m.endX<=SMALL_PRINT_WIDTH-4&&m.y===a.answerY));
  assert.equal(a.answerMarks.length,answerCharacters(sample.answer).filter(c=>c!==' ').length);
  assert.equal(a.answerMarks.filter(m=>m.kind==='hyphen').length,answerCharacters(sample.answer).filter(c=>c==='-').length);
  assert.ok(a.answerEnd-a.answerStart<=SMALL_PRINT_WIDTH-11.9);
  assert.ok(Math.abs((a.answerStart+a.answerEnd)/2-SMALL_PRINT_WIDTH/2)<.001);
 }
 assert.equal(WHO_AM_I_LABEL,'WHO AM I?');
 assert.equal(planWhoAmI({...cases[2],clue:longest+'!'},pdf),null);
});
test('The longest clue dynamically shrinks relative to the short clue',async()=>{
 const {pdf}=await measures();
 const a=planWhoAmI(cases[0],pdf),b=planWhoAmI(cases[2],pdf);
 assert.ok(a&&b);
 assert.ok(a.clueSize>=b.clueSize);
 assert.ok(a.clueLines.length<=b.clueLines.length);
});
test('Both preview and PDF use measured shared plan with no original overlapping CSS block',async()=>{
 const [preview,pdf,editor]=await Promise.all([
  readFile(new URL('../src/SmallModulePreview.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/smallPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/SmallModuleEditor.tsx',import.meta.url),'utf8'),
 ]);
 assert.match(preview,/case 'who-am-i':return <WhoAmIPrintPreview module=\{module\}/u);
 assert.match(pdf,/const plan=planWhoAmI\(module/u);
 assert.doesNotMatch(pdf,/paragraph\(page,fonts.title,module.clue/u);
 assert.match(editor,/Character clue \(up to 120 characters\)/u);
});
test('Max clues, spaces and hyphens print in a standard folded booklet',async()=>{
 const {files}=await measures();
 const draft={
  title:'God Cares for His People',scripture:'Daniel 6',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{
   '2:top-left-small':cases[0],
   '2:top-right-small':cases[2],
   '3:bottom-left-small':cases[3],
   '3:bottom-right-small':cases[4],
   '4:bottom-left-small':cases[1],
  }};
 const pdf=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
