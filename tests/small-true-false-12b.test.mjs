import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planTrueFalse,TRUE_FALSE_MAX_CHARACTERS,TRUE_FALSE_TITLE,THUMB_VIEW_SIZE} from '../src/trueFalsePrintLayout.ts';
import {THUMB_UP_PATH,THUMB_DOWN_PATH,THUMB_SOURCE_VIEW,THUMB_DOWN_PATH_X_OFFSET,THUMB_CIRCLE_RADIUS} from '../src/thumbArtwork.ts';
import {SMALL_PRINT_WIDTH,SMALL_PRINT_HEIGHT} from '../src/smallParityLayout.ts';
import {validateSmallModule} from '../src/smallModules.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';
import {createBookletPdf} from '../src/pdf.ts';

const phrases=[
 'Jesus rose from the dead.',
 'God helped Moses lead the people safely across the sea.',
 'The people saw the sea part and walked across on dry land because God helped.',
 'When Moses held up his staff, the sea opened and the people crossed safely.',
];
const exact80='God helped Moses lead his people through the sea and safely into the dry land...';
assert.equal(exact80.length,80);
const files=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function widths(){
 const data=await files(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const f=fontkit.create(data.mouseMemoirs);
 const face=await doc.embedFont(data.mouseMemoirs,{subset:false});
 return {
  data,
  pdf:(s,n)=>face.widthOfTextAtSize(s,n),
  browser:(s,n)=>f.layout(s).glyphs.reduce((t,g)=>t+g.advanceWidth,0)*n/f.unitsPerEm,
 };
}
test('80-character limit, 81-character error, and immediate field highlight stay in sync',()=>{
 assert.equal(TRUE_FALSE_MAX_CHARACTERS,80);
 for(const text of [...phrases,exact80]){
  assert.ok(text.length<=80);
  assert.deepEqual(validateSmallModule({type:'true-false',statement:text}),[]);
  assert.equal(fieldExceedsLength({type:'true-false',statement:text},'tf-statement',text),false);
 }
 const over=exact80+'!';
 assert.equal(over.length,81);
 assert.match(validateSmallModule({type:'true-false',statement:over}).join(' '),/80 characters/u);
 assert.equal(fieldExceedsLength({type:'true-false',statement:over},'tf-statement',over),true);
});
test('Short, long and exact-80 statements fit above the two square icons with no overlap',async()=>{
 const m=await widths();
 let smallest=Infinity;
 for(const text of [...phrases,exact80]){
  const p=planTrueFalse(text,m.pdf);
  const q=planTrueFalse(text,m.browser);
  assert.ok(p&&q,'Could not fit '+text);
  assert.equal(p.statementSize,q.statementSize);
  assert.deepEqual(p.statementLines,q.statementLines);
  assert.equal(p.titleSize,23);
  assert.equal(TRUE_FALSE_TITLE,'TRUE OR FALSE?');
  assert.deepEqual(p.thumbs,q.thumbs);
  assert.deepEqual(p.statementLines.map(l=>l.text).join(' '),text);
  assert.ok(p.statementSize>=10.5&&p.statementSize<=18);
  smallest=Math.min(smallest,p.statementSize);
  const bottoms=p.statementLines.map(l=>l.y+p.statementSize*.18);
  const last=Math.max(...bottoms);
  assert.ok(last<=p.statementBottom+.001);
  assert.ok(last+5<p.thumbs[0].y);
  assert.ok(p.statementLines[0].y-p.statementSize>p.titleY+3);
  assert.ok(p.statementLines.every(l=>m.pdf(l.text,p.statementSize)<SMALL_PRINT_WIDTH-7));
  for(const thumb of p.thumbs){
   assert.equal(thumb.size,42);
   assert.ok(thumb.x>=0&&thumb.x+thumb.size<=SMALL_PRINT_WIDTH);
   assert.ok(thumb.y>=p.statementBottom+5);
   assert.ok(thumb.y+thumb.size+4<thumb.labelY);
   assert.ok(thumb.labelY<SMALL_PRINT_HEIGHT);
  }
  assert.equal(p.thumbs[0].label,'TRUE');
  assert.equal(p.thumbs[1].label,'FALSE');
  assert.ok(p.thumbs[0].x+p.thumbs[0].size<p.thumbs[1].x);
 }
 assert.ok(smallest<18,'At least one longer statement should use adaptive shrink-to-fit');
 assert.equal(planTrueFalse(exact80+'!',m.pdf),null);
});
test('SVG paths in vector PDF are exactly the uploaded thumb silhouettes',async()=>{
 const [up,down,pdfCode,previewCode]=await Promise.all([
  readFile(new URL('../images/thumbs_up.svg',import.meta.url),'utf8'),
  readFile(new URL('../images/thumbs_down.svg',import.meta.url),'utf8'),
  readFile(new URL('../src/smallPdf.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/TrueFalsePrintPreview.tsx',import.meta.url),'utf8'),
 ]);
 function path(svg,id){
  const m=svg.match(new RegExp(`<path\\b[^>]*\\sd="([^"]+)"[^>]*\\bid="${id}"`));
  assert.ok(m,'Missing exact source path '+id);
  return m[1].replace(/\s+/gu,' ').trim();
 }
 assert.equal(THUMB_UP_PATH,path(up,'path1'));
 assert.equal(THUMB_DOWN_PATH,path(down,'path3'));
 assert.equal(THUMB_VIEW_SIZE,THUMB_SOURCE_VIEW);
 assert.equal(THUMB_DOWN_PATH_X_OFFSET,28.222776);
 assert.ok(THUMB_CIRCLE_RADIUS>11);
 assert.match(pdfCode,/page\.drawSvgPath\(i===0\?THUMB_UP_PATH:THUMB_DOWN_PATH/u);
 assert.match(pdfCode,/page\.drawEllipse\(/u);
 assert.match(previewCode,/images\/thumbs_up\.svg/u);
 assert.match(previewCode,/images\/thumbs_down\.svg/u);
 assert.match(previewCode,/planTrueFalse\(module\.statement,title\)/u);
});
test('Mixed short, long and exactly 80 characters export to standard two-sheet booklet',async()=>{
 const data=await files(),draft={
  title:'God Delivers His People',scripture:'Exodus 14',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{
   '2:top-left-small':{type:'true-false',statement:phrases[0]},
   '2:top-right-small':{type:'true-false',statement:exact80},
   '3:bottom-left-small':{type:'true-false',statement:phrases[1]},
   '3:bottom-right-small':{type:'true-false',statement:phrases[2]},
   '4:bottom-left-small':{type:'true-false',statement:phrases[3]},
  },
 };
 const bytes=await createBookletPdf(draft,data);
 const pdf=await PDFDocument.load(bytes);
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
