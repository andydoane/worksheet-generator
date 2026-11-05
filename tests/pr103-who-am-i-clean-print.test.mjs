import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {printedWhoAmIClue} from '../src/whoAmIClue.ts';
import {validateModule} from '../src/modules.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';
import {planWhoAmI,WHO_AM_I_LABEL} from '../src/whoAmIPrintLayout.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {createBookletPdf} from '../src/pdf.ts';

const file=path=>readFile(new URL('../'+path,import.meta.url));
const raw='I worked for Pharaoh. Because Joseph took care of things, I did not have to worry. Who am I?';
const printed='I worked for Pharaoh. Because Joseph took care of things, I did not have to worry.';
const long='I was a shepherd boy who trusted God. I stood before a giant with a sling and stone and believed the Lord would help me.';
assert.equal(long.length,120);
const asModule=clue=>({type:'who-am-i',clue,answer:'David'});
const fonts=async()=>({
 mouseMemoirs:await file('fonts/MouseMemoirs-Regular.ttf'),
 nunitoSans:await file('fonts/Nunito-Medium.ttf'),
 nunitoSans750:await file('fonts/Nunito-Bold.ttf'),
 nunitoSans900:await file('fonts/Nunito-ExtraBold.ttf'),
 zillaSlab:await file('fonts/ZillaSlab-Bold-pdf.ttf'),
});

test('Only a separate final Who am I question disappears from the printed clue',()=>{
 const cases=[
  [raw,printed],
  ['I worked for Pharaoh. WHO AM I ?', 'I worked for Pharaoh.'],
  ['I worked for Pharaoh!\nWho am I?', 'I worked for Pharaoh!'],
  ['I worked for Pharaoh — Who am I??', 'I worked for Pharaoh'],
  ['I worked for Pharaoh, who am i?!', 'I worked for Pharaoh'],
  ['I worked for Pharaoh.   Who Am I?  ', 'I worked for Pharaoh.'],
  ['Who am I?', ''],
  ['  WHO AM I ?? ', ''],
  ['I wondered, "Who am I?"','I wondered, "Who am I?"'],
  ['Who am I? I worked for Pharaoh.', 'Who am I? I worked for Pharaoh.'],
  ['They asked who am I?', 'They asked who am I?'],
  ['I worked for Pharaoh. Who is he?', 'I worked for Pharaoh. Who is he?'],
 ];
 for(const [source,expected] of cases)assert.equal(printedWhoAmIClue(source),expected,source);
});

test('Who Am I validation and editor warnings measure printed text, not raw provenance',()=>{
 const withSuffix=long+' Who am I?';
 assert.ok(withSuffix.length>120);
 assert.equal(printedWhoAmIClue(withSuffix),long);
 assert.deepEqual(validateModule(asModule(withSuffix)),[]);
 assert.equal(fieldExceedsLength(asModule(withSuffix),'who-clue',withSuffix),false);
 assert.ok(validateModule(asModule(long+'!')).some(x=>/1–120/u.test(x)));
 assert.equal(fieldExceedsLength(asModule(long+'!'),'who-clue',long+'!'),true);
 assert.ok(validateModule(asModule('Who am I?')).some(x=>/descriptive character clue/u.test(x)));
 assert.ok(validateModule(asModule(' ')).some(x=>/descriptive character clue/u.test(x)));
});

test('The exact normalized clue and one separate label drive print-matched SVG and PDF plans',async()=>{
 const files=await fonts(),doc=await PDFDocument.create();
 doc.registerFontkit(fontkit);
 const pdfFont=await doc.embedFont(files.mouseMemoirs,{subset:false});
 const face=fontkit.create(files.mouseMemoirs);
 const pdf=(value,size)=>pdfFont.widthOfTextAtSize(value,size);
 const browser=(value,size)=>face.layout(value).glyphs.reduce(
  (sum,g)=>sum+g.advanceWidth,0)*size/face.unitsPerEm;
 for(const source of [raw,long+' Who am I?']){
  const original=asModule(source),snapshot=JSON.stringify(original);
  const p=planWhoAmI(original,pdf),q=planWhoAmI(original,browser);
  assert.ok(p&&q,source);
  assert.equal(p.clueLines.map(line=>line.text).join(' '),printedWhoAmIClue(source));
  assert.deepEqual(p.clueLines.map(line=>line.text),q.clueLines.map(line=>line.text));
  assert.equal(p.clueSize,q.clueSize);
  assert.deepEqual(p.answerMarks,q.answerMarks);
  assert.equal(WHO_AM_I_LABEL,'WHO AM I?');
  assert.equal(JSON.stringify(original),snapshot,'Layout must not mutate approved or teacher text');
 }
 assert.equal(planWhoAmI(asModule('Who am I?'),pdf),null);
 const draft={title:'Who Am I demo',scripture:'Genesis 41',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  modules:{'2:top-left-small':asModule(raw),'2:top-right-small':asModule(long+' Who am I?')},
 };
 const booklet=await PDFDocument.load(await createBookletPdf(draft,files));
 assert.deepEqual(booklet.getPages().map(page=>[page.getWidth(),page.getHeight()]),[[792,612],[792,612]]);
});

test('Curriculum conversion preserves the exact original clue and its provenance',async()=>{
 const lesson=JSON.parse(await file('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json'));
 const item=lesson.preparedActivities.whoAmI;
 const preserved=structuredClone(item),all=JSON.stringify(lesson);
 item.clue=raw;
 const unchangedMeta=structuredClone(item);
 const converted=convertLessonActivities(lesson,{seed:1});
 const output=converted.candidates.find(x=>x.moduleId==='who-am-i');
 assert.ok(output,'The approved lesson must contain Who Am I activity data');
 assert.equal(output.module.clue,raw);
 assert.equal(printedWhoAmIClue(output.module.clue),printed);
 assert.deepEqual(item,unchangedMeta,'Conversion must not rewrite the source record');
 assert.deepEqual(Object.keys(item),Object.keys(preserved),'Clue display fix must not alter provenance fields');
 assert.ok(all.includes('"whoAmI"'));
});

test('Shared print layout is still the only renderer for the clue',async()=>{
 const [layout,svg,pdf,feedback]=await Promise.all([
  file('src/whoAmIPrintLayout.ts').then(String),
  file('src/WhoAmIPrintPreview.tsx').then(String),
  file('src/smallPdf.ts').then(String),
  file('src/fieldLengthFeedback.ts').then(String),
 ]);
 assert.match(layout,/printedWhoAmIClue\(module\.clue\)/u);
 assert.match(svg,/planWhoAmI\(module,title\)/u);
 assert.match(pdf,/planWhoAmI\(module,/u);
 assert.match(feedback,/printedWhoAmIClue\(value\)/u);
});
