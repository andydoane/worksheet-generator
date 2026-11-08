import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planUpsideDownVerse,planUnscrambleVerse} from '../src/verseReconstructionLayout.ts';
import {spiralWritingPoints,spiralPoints,spiralTurns} from '../src/specialtyModules.ts';
import {MEDIUM_PRINT_HEIGHT,MEDIUM_PRINT_WIDTH} from '../src/mediumParityLayout.ts';
import {createBookletPdf} from '../src/pdf.ts';

const bytes=path=>readFile(new URL('../'+path,import.meta.url));
async function measuredFonts(){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [title,body,puzzle]=await Promise.all([
  'MouseMemoirs-Regular.ttf','Nunito-Medium.ttf','ZillaSlab-Bold-pdf.ttf',
 ].map(async file=>doc.embedFont(await bytes('fonts/'+file),{subset:false})));
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
const longVerse={type:'upside-down-verse',reference:'Isaiah 41:10',
 verse:'fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'};

test('Short Upside Down title has 120% row pitch before the first verse rule',async()=>{
 const metrics=await measuredFonts();
 for(const module of [romans,jeremiah]){
  const p=planUpsideDownVerse(module,metrics);
  assert.ok(p,module.reference+' must print');
  const first=Math.min(...p.marks.map(mark=>mark.y));
  const gap=first-p.titleY;
  assert.ok(gap<=p.lineStep*1.2+.001,'Title gap cannot exceed target');
  assert.ok(gap>=p.lineStep*1.2-.01,
   module.reference+': short verse with free height should get full 20% extra baseline spacing');
  assert.ok(p.titleY-p.titleSize*.8>=4-.001);
  const last=Math.max(...p.marks.map(mark=>mark.y));
  assert.ok(last+p.glyphOffset+p.invertedFontSize+2<=MEDIUM_PRINT_HEIGHT-4+.001);
  const visibleTop=p.titleY-p.titleSize*.8;
  const visibleBottom=last+p.glyphOffset+p.invertedFontSize*.82+2;
  assert.ok(Math.abs((visibleTop+visibleBottom)/2-MEDIUM_PRINT_HEIGHT/2)<2.1,
   'Title and verse should still be visually centered as one unit');
 }
});

test('Crowded Upside Down verse keeps legibility and skips unprintable title spacing',async()=>{
 const metrics=await measuredFonts();
 const before=JSON.stringify(longVerse);
 const p=planUpsideDownVerse(longVerse,metrics);
 assert.ok(p,'The long verse must remain printable');
 const first=Math.min(...p.marks.map(mark=>mark.y));
 const last=Math.max(...p.marks.map(mark=>mark.y));
 const titleGap=first-p.titleY;
 assert.ok(titleGap>=19-.001,'Never shrink original title-to-rule gap');
 assert.ok(titleGap<=p.lineStep*1.2+.001);
 assert.ok(p.rowCount>=4);
 assert.ok(p.rowWidths.every(width=>width<=MEDIUM_PRINT_WIDTH-8+.001));
 assert.ok(last+p.glyphOffset+p.invertedFontSize+2<=MEDIUM_PRINT_HEIGHT-4+.001);
 assert.equal(JSON.stringify(longVerse),before);
 const unscramble={type:'unscramble-verse',reference:'Psalm 46:1',
  verse:'For [God] is our [refuge] and [strength], an ever-[present] help in trouble.',seed:8};
 const separate=planUnscrambleVerse(unscramble,metrics);
 assert.ok(separate);
 assert.ok(Math.abs(Math.min(...separate.marks.map(x=>x.y))-separate.titleY-
  (53-25))<.001,'Unscramble keeps its independent 28pt title offset');
});

test('Every Spiral Verse begins at 9 o\'clock regardless of added turns',()=>{
 const verses=[
  'Jesus wept.',
  'The Lord is my shepherd; I shall not want.',
  'for all have sinned and fall short of the glory of God,',
  'A'.repeat(150),
  'B'.repeat(260),
 ];
 const turnCounts=new Set();
 for(const verse of verses){
  const turns=spiralTurns(verse);
  turnCounts.add(turns);
  const points=spiralWritingPoints(verse,800);
  const original=spiralPoints(800,turns).reverse();
  assert.equal(points.length,800);
  assert.ok(Math.abs(points[0].x-.055)<1e-9,'Start must be at outer left');
  assert.ok(Math.abs(points[0].y-.5)<1e-9,'Start must be level with center');
  assert.ok(points[8].y>points[0].y,'The outside entrance should turn downward');
  assert.ok(points.every(p=>p.x>=.05-1e-9&&p.x<=.95+1e-9&&
   p.y>=.05-1e-9&&p.y<=.95+1e-9));
  for(const index of [0,20,80,300,799]){
   const p=points[index],prior=original[index];
   assert.ok(Math.abs(Math.hypot(p.x-.5,p.y-.5)-
    Math.hypot(prior.x-.5,prior.y-.5))<1e-10,
   'Rotation must not change the writing path radius');
  }
  for(const index of [1,80,400,799]){
   const old=Math.hypot(original[index].x-original[index-1].x,
    original[index].y-original[index-1].y);
   const rotated=Math.hypot(points[index].x-points[index-1].x,
    points[index].y-points[index-1].y);
   assert.ok(Math.abs(old-rotated)<1e-10,
    'Rotation must preserve total writing-track length and smoothness');
  }
  assert.deepEqual(spiralWritingPoints(verse,800),points,'Spiral must be deterministic');
 }
 assert.ok(turnCounts.size>=4,'Fixtures must cover materially different turn counts');
});

test('Preview and PDF both use the 9 o\'clock spiral and the same Upside Down planner',async()=>{
 const [preview,pdf,reconstructionPreview,reconstructionPdf]=await Promise.all([
  bytes('src/SpecialtyPreview.tsx').then(String),
  bytes('src/specialtyPdf.ts').then(String),
  bytes('src/VerseReconstructionPreview.tsx').then(String),
  bytes('src/verseReconstructionPdf.ts').then(String),
 ]);
 assert.match(preview,/spiralWritingPoints\(module\.verse\)/u);
 assert.match(pdf,/spiralWritingPoints\(module\.verse\)/u);
 assert.match(reconstructionPreview,/planUpsideDownVerse\(module,metrics\)/u);
 assert.match(reconstructionPdf,/planUpsideDownVerse\(module,metrics,b\.width,b\.height\)/u);
 const data={
  mouseMemoirs:await bytes('fonts/MouseMemoirs-Regular.ttf'),
  nunitoSans:await bytes('fonts/Nunito-Medium.ttf'),
  nunitoSans750:await bytes('fonts/Nunito-Bold.ttf'),
  nunitoSans900:await bytes('fonts/Nunito-ExtraBold.ttf'),
  zillaSlab:await bytes('fonts/ZillaSlab-Bold-pdf.ttf'),
 };
 const draft={title:'Verse Spacing',scripture:'Romans 3 and Jeremiah 32',
  layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
  modules:{
   '2:top-medium':romans,
   '2:bottom-large':{type:'spiral-verse',reference:'Psalm 23:1',
    verse:'The LORD is my shepherd; I shall not want.'},
   '3:top-medium':jeremiah,
   '3:bottom-large':{type:'spiral-verse',reference:'Romans 3:23',
    verse:'for all have sinned and fall short of the glory of God,'},
   '4:top-medium':longVerse,
   '4:bottom-large':{type:'spiral-verse',reference:'Psalm 119:105',
    verse:'Your word is a lamp to my feet and a light to my path.'},
  }};
 const pdfBytes=await createBookletPdf(draft,data);
 const document=await PDFDocument.load(pdfBytes);
 assert.equal(document.getPageCount(),2,'Both modules must still export on two folded sheets');
});
