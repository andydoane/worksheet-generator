import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {readAssignments,validateModule} from '../src/modules.ts';
import {
 parseStatements,sortedStoryBank,sortStoryEditorGroups,updateSortStoryGroup,
} from '../src/storyVerseModules.ts';
import {
 planSortStory,SORT_STORY_STROKE,SORT_STORY_WIDTH,SORT_STORY_HEIGHT,
} from '../src/sortStoryLayout.ts';
import {picturePromptSentence,planDrawPicture} from '../src/smallFinishingLayout.ts';
import {fieldExceedsLength} from '../src/fieldLengthFeedback.ts';

const legacy={
 type:'sort-story',seed:8,
 statements:[
  'Daniel prayed to God. true',
  'Daniel stopped praying. false',
  'The king made a law. true',
  'Lions were afraid of the king. false',
  'Daniel trusted God. true',
 ].join('\n'),
};
const dense={
 type:'sort-story',seed:12,
 statements:[
  'Moses asked Pharaoh to let the people go. true',
  'Pharaoh was happy to free the Israelites immediately. false',
  'God led his people away from Egypt toward the Red Sea. true',
  'The people crossed the sea in the kings palace. false',
  'Moses followed the instructions God had given him. true',
  'The Israelites crossed safely through the divided water. true',
  'The Egyptians built a bridge over the sea. false',
  'God watched over the families traveling with Moses. true',
 ].join('\n'),
};
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const files=await fonts();
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const medium=await doc.embedFont(files.nunitoSans,{subset:false});
 const bold=await doc.embedFont(files.nunitoSans750,{subset:false});
 const title=await doc.embedFont(files.mouseMemoirs,{subset:false});
 const face=fontkit.create(files.nunitoSans);
 const boldFace=fontkit.create(files.nunitoSans750);
 const measured=font=> (text,size)=>font.widthOfTextAtSize(text,size);
 const browser=font=> (text,size)=>
  font.layout(text).glyphs.reduce((sum,g)=>sum+g.advanceWidth,0)*size/font.unitsPerEm;
 return {files,title,
  pdf:{body:measured(medium),instruction:measured(bold)},
  browser:{body:browser(face),instruction:browser(boldFace)}};
}
test('Legacy truth-suffixed Sort data survives the two-field editor without conversion',()=>{
 const saved=readAssignments({'2:top-large':legacy});
 assert.deepEqual(saved['2:top-large'],legacy);
 assert.deepEqual(validateModule(legacy),[]);
 const grouped=sortStoryEditorGroups(saved['2:top-large'].statements);
 assert.equal(grouped.trueStatements,'Daniel prayed to God.\nThe king made a law.\nDaniel trusted God.');
 assert.equal(grouped.falseStatements,'Daniel stopped praying.\nLions were afraid of the king.');
 assert.deepEqual(parseStatements(legacy.statements).filter(x=>x.truth).length,3);
 assert.deepEqual(sortedStoryBank(legacy),sortedStoryBank(legacy));
 const updated=updateSortStoryGroup(legacy.statements,false,
  'Daniel stopped praying.\nLions slept all day.');
 assert.deepEqual(parseStatements(updated).filter(row=>row.truth).map(x=>x.text),
  parseStatements(legacy.statements).filter(row=>row.truth).map(x=>x.text));
 assert.equal(parseStatements(updated).length,5);
 assert.equal(validateModule({...legacy,statements:updated}).length,0);
 assert.equal(updateSortStoryGroup(legacy.statements,true,grouped.trueStatements),legacy.statements);
});
test('Grouped statement editor handles additions, deletions, and character feedback',async()=>{
 const deleted=updateSortStoryGroup(legacy.statements,true,'A new true statement.');
 assert.equal(parseStatements(deleted).filter(x=>x.truth).length,1);
 const appended=updateSortStoryGroup(deleted,false,'First false.\nSecond false.\nThird false.');
 assert.equal(parseStatements(appended).filter(x=>!x.truth).length,3);
 assert.equal(validateModule({...legacy,statements:appended}).length,0);
 assert.equal(fieldExceedsLength(legacy,'sv-true-statements','A'.repeat(116)),true);
 assert.equal(fieldExceedsLength(legacy,'sv-false-statements','A'.repeat(115)),false);
 const editor=await readFile(new URL('../src/StoryVerseEditor.tsx',import.meta.url),'utf8');
 assert.match(editor,/id="sv-true-statements"/u);
 assert.match(editor,/id="sv-false-statements"/u);
 assert.doesNotMatch(editor,/id="sv-statements"/u);
});
test('Sort border, dividers, letter boxes and answer boxes share one physical stroke',async()=>{
 const {pdf,browser}=await metrics();
 for(const module of [legacy,dense]){
  for(const seed of [1,8,12]){
   const input={...module,seed};
   assert.deepEqual(validateModule(input),[]);
   const a=planSortStory(input,pdf),b=planSortStory(input,browser);
   assert.ok(a&&b,'Failed to fit '+parseStatements(input.statements).length+' rows');
   assert.equal(a.rows.length,b.rows.length);
   assert.equal(a.instructions.length,b.instructions.length);
   for(let i=0;i<a.rows.length;i++){
    assert.equal(a.rows[i].lines.length,b.rows[i].lines.length);
    assert.equal(a.rows[i].textSize,b.rows[i].textSize);
    for(let j=0;j<a.rows[i].lines.length;j++){
     assert.equal(a.rows[i].lines[j].text,b.rows[i].lines[j].text);
     assert.ok(Math.abs(a.rows[i].lines[j].y-b.rows[i].lines[j].y)<.02);
    }
   }
   assert.equal(a.bank.y,b.bank.y);
   assert.equal(a.bank.height,b.bank.height);
   assert.equal(a.strokeWidth,SORT_STORY_STROKE);
   assert.equal(a.bank.width,SORT_STORY_WIDTH);
   assert.equal(a.rows.length,parseStatements(input.statements).length);
   assert.equal(a.separators.length,a.rows.length-1);
   assert.equal(a.answers.length,2);
   for(const row of a.rows){
    assert.ok(row.letterBox.y>=a.bank.y);
    assert.ok(row.letterBox.y+row.letterBox.height<=a.bank.y+a.bank.height+1e-6);
    assert.ok(row.lines.length>=1);
    assert.ok(row.lines.every(line=>line.x>=0&&line.y>a.bank.y&&line.y<a.bank.y+a.bank.height));
    assert.ok(row.lines.every(line=>pdf.body(line.text,row.textSize)<=SORT_STORY_WIDTH-39+.001));
   }
   for(const answer of a.answers){
    assert.ok(answer.box.y>a.bank.y+a.bank.height);
    assert.ok(answer.box.y+answer.box.height<=SORT_STORY_HEIGHT);
   }
  }
 }
 const preview=await readFile(new URL('../src/SortStoryPrintPreview.tsx',import.meta.url),'utf8');
 const printable=await readFile(new URL('../src/storyVersePdf.ts',import.meta.url),'utf8');
 assert.match(preview,/planSortStory/u);
 assert.match(printable,/planSortStory/u);
 assert.match(preview,/strokeWidth={plan.strokeWidth}/u);
 assert.match(printable,/thickness:stroke/u);
});
test('Draw a Picture adds only missing terminal punctuation without changing saved prompts',async()=>{
 const samples=[
  ['Moses crossing the Red Sea','Draw a picture of Moses crossing the Red Sea.'],
  ['Daniel in the lions den.','Draw a picture of Daniel in the lions den.'],
  ['Why did Jonah run?','Draw a picture of Why did Jonah run?'],
  ['God is with us!','Draw a picture of God is with us!'],
  ['The story ends..."','Draw a picture of The story ends..."'],
 ];
 for(const [input,expected] of samples)assert.equal(picturePromptSentence(input),expected);
 const {files,title}=await metrics();
 for(const prompt of [
  'Moses crossing the Red Sea',
  'Daniel in the lions den.',
  'What happened next?',
  'A faithful shepherd watching over the sheep while a storm approaches the valley near a town at sunset',
 ]){
  assert.ok(prompt.length<=105);
  const measured=planDrawPicture(prompt,(s,size)=>title.widthOfTextAtSize(s,size));
  assert.ok(measured,'Prompt did not fit: '+prompt);
  assert.ok(measured.drawing.height>=70);
  assert.equal(measured.lines.map(x=>x.text).join(' '),picturePromptSentence(prompt));
 }
 const pdf=await PDFDocument.load(await createBookletPdf({
  title:'God Is Faithful',scripture:'Daniel 6',
  layouts:{2:'large-medium',3:'large-medium',4:'medium-medium-small-small'},
  modules:{
   '2:top-large':legacy,'3:top-large':dense,
   '4:bottom-left-small':{type:'draw-picture',prompt:'Daniel and the lions'},
   '4:bottom-right-small':{type:'draw-picture',prompt:'What happens next?'},
  },
 },files));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
