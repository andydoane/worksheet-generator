import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planStory,STORY_BLANK_LENGTH_SCALE,STORY_BODY_WIDTH,STORY_BODY_HEIGHT} from '../src/storyLayout.ts';
import {planCrossword,CROSSWORD_WIDTH,CROSSWORD_HEIGHT} from '../src/crosswordLayout.ts';
import {generateCrossword} from '../src/specialtyModules.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {planActivityBorderFit} from '../src/activityBorders.ts';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {LARGE_EXAMPLES} from '../scripts/pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from '../scripts/pr16d-fixtures.mjs';
import {makeParityDraft} from '../scripts/pr16f-fixtures.mjs';

const near=(a,b,tol=.0001)=>assert.ok(Math.abs(a-b)<=tol,
  'expected '+a+' ≈ '+b+' (± '+tol+')');
async function resources(){
 const paths=[
  'fonts/Nunito-Medium.ttf','fonts/Nunito-Bold.ttf',
  'fonts/Nunito-ExtraBold.ttf','fonts/MouseMemoirs-Regular.ttf',
  'fonts/ZillaSlab-Bold-pdf.ttf',
 ];
 const bytes=await Promise.all(paths.map(name=>readFile(new URL('../'+name,import.meta.url))));
 const [body,bold,bank,title,puzzle]=bytes.map(b=>fontkit.create(b));
 const measured=face=>(text,size)=>face.layout(text).positions.reduce((s,p)=>s+p.xAdvance,0)*size/face.unitsPerEm;
 return {
  metrics:{body:measured(body),bold:measured(bold),bank:measured(bank),title:measured(title),puzzle:measured(puzzle)},
  fonts:{mouseMemoirs:bytes[3],nunitoSans:bytes[0],nunitoSans750:bytes[1],
   nunitoSans900:bytes[2],zillaSlab:bytes[4]},
 };
}
const story=LARGE_EXAMPLES.find(x=>x.type==='finish-story');
const crossword=LARGE_EXAMPLES.find(x=>x.type==='crossword');
const verse=MEDIUM_EXAMPLES.find(x=>x.type==='unscramble-verse');

test('Finish the Story lines are 1.5× their old measured lengths and still fit shared 9–13pt plan',async()=>{
 const {metrics}=await resources();
 assert.equal(STORY_BLANK_LENGTH_SCALE,1.5);
 const cases=[
  'A [W] and an [i] and [Jesus] give different proportional word widths.',
  story.story,
  'God [promised] a [wonderful] [deliverance] to [Israel]. '+
   'The people [trusted] his [goodness] through [difficult] times. '+
   'They [remembered] his [covenant] and [worshipped] the [almighty] Lord [together].',
 ];
 for(const value of cases){
  const plan=planStory(value,metrics.body,STORY_BODY_WIDTH,STORY_BODY_HEIGHT);
  assert.ok(plan,'shared story plan must still fit');
  assert.ok(plan.fontSize>=9&&plan.fontSize<=13,'minimum print font preserved');
  const blanks=plan.placements.filter(p=>p.kind==='blank');
  assert.ok(blanks.length>=3);
  for(const p of blanks){
   const previous=Math.max(16,metrics.body(p.text,plan.fontSize)*1.12);
   near(p.width,previous*1.5);
  }
  for(const p of plan.placements){
   assert.ok(p.x>=0&&p.x+p.width<=STORY_BODY_WIDTH+.0001,
    'story content must wrap rather than run outside its writing zone');
   assert.ok(p.y>=0&&p.y+plan.fontSize<=STORY_BODY_HEIGHT+.0001);
  }
 }
});

test('Crossword centers the entire grid plus both clue columns on the vertical axis',async()=>{
 const {metrics}=await resources();
 const dense=generateCrossword(crossword);
 const short={
  type:'crossword',
  entries:[
   'DAVID, Shepherd who trusted God','GOLIATH, Giant defeated by David',
   'SLING, Weapon David used','STONE, What David threw',
   'SHEEP, Animals David watched','SAUL, King of Israel',
  ].join('\n'),seed:4,
 };
 for(const source of [dense,generateCrossword(short)]){
  const plan=planCrossword(source,metrics.body);
  assert.ok(plan,'crossword must fit');
  near(plan.contentTop,CROSSWORD_HEIGHT-plan.contentBottom);
  near(plan.gridTop,plan.contentTop);
  assert.ok(plan.gridTop>=0);
  assert.ok(plan.gridTop+plan.gridHeight<plan.acrossHeader.y);
  assert.ok(plan.gridTop+plan.gridHeight<plan.downHeader.y);
  for(const line of [...plan.acrossRows,...plan.downRows]){
   assert.ok(line.y+plan.clueFontSize*.3<=plan.contentBottom+.0001);
   assert.ok(line.y<=CROSSWORD_HEIGHT);
   assert.ok(line.x>=0&&line.x+metrics.body(line.text,plan.clueFontSize)<=CROSSWORD_WIDTH+.001);
  }
  const fit=planActivityBorderFit('large',{x:0,y:0,width:4.8*72,height:5.2*72});
  assert.ok(fit.scale<1);
  assert.ok(plan.contentTop>=0&&plan.contentBottom<=CROSSWORD_HEIGHT);
 }
});

test('Unscramble heading retains complete Bible-book names with measured fitting',async()=>{
 const {metrics}=await resources();
 const measure={title:metrics.title,body:metrics.body,puzzle:metrics.puzzle};
 const references=[
  '1 Thessalonians 5:18','2 Corinthians 5:17','Deuteronomy 6:5',
  'Ecclesiastes 3:1','Song of Solomon 2:4','Philippians 4:13',
 ];
 for(const reference of references){
  const module={...verse,reference};
  const plan=planUnscrambleVerse(module,measure);
  assert.ok(plan,'full name should fit: '+reference);
  assert.equal(plan.title,'UNSCRAMBLE '+reference.toUpperCase());
  assert.ok(plan.titleSize>=15&&plan.titleSize<=25);
  assert.ok(metrics.title(plan.title,plan.titleSize)<=
   4.6*72-8+.0001,'title must respect the measured width');
  assert.ok(plan.rowCount>=1&&plan.marks.length>0);
 }
 const oldUpside=planUpsideDownVerse({
  type:'upside-down-verse',reference:'1 Thessalonians 5:18',
  verse:'Give thanks in all circumstances.',
 },measure);
 assert.ok(oldUpside);
 assert.match(oldUpside.title,/1 Thess\./,'Upside Down abbreviation stays unchanged');
});

test('Bordered and plain PDFs render all three improved modules without changing draft data',async()=>{
 const {fonts}=await resources();
 const draft=makeParityDraft(6,{allBorderless:true});
 draft.title='God Is With His People Through Every Challenge';
 draft.modules['1:cover-activity']=structuredClone(story);
 draft.modules['4:top-large']=structuredClone(crossword);
 draft.modules['3:top-medium']={...structuredClone(verse),reference:'1 Thessalonians 5:18'};
 const unchanged=structuredClone(draft);
 const plain=await PDFDocument.load(await createBookletPdf(draft,fonts));
 assert.equal(plain.getPageCount(),2);
 assert.deepEqual(draft,unchanged);
 const bordered=structuredClone(draft);
 bordered.activityBorders={
  '1:cover-activity':'border-3',
  '4:top-large':'border-3',
  '3:top-medium':'border-3',
 };
 const files={};
 const slots=getPrintableSheetRegions(bordered).flat();
 for(const [slot,id] of Object.entries(bordered.activityBorders)){
  const area=slots.find(region=>region.bookletPage+':'+region.id===slot);
  assert.ok(area,slot);
  files[slot]=await readFile(new URL('../images/borders/'+area.size+'_border_'+
   id.slice(7)+'.png',import.meta.url));
 }
 const saved=structuredClone(bordered);
 const pdf=await PDFDocument.load(await createBookletPdf(bordered,fonts,undefined,files));
 assert.equal(pdf.getPageCount(),2);
 assert.deepEqual(bordered,saved);
});
