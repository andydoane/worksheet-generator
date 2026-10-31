import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {planFinishVerse} from '../src/finishVerseLayout.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {shortenBibleReference,verseGlyphs,letterOnly,validBracketedAnswer} from '../src/versePunctuation.ts';
import {verseScrambles,validateStoryVerse,parseVerse} from '../src/storyVerseModules.ts';
import {validateSpecialty} from '../src/specialtyModules.ts';
import {createBookletPdf} from '../src/pdf.ts';
const files=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
async function metrics(){
 const assets=await files(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const body=await doc.embedFont(assets.nunitoSans,{subset:false});
 const title=await doc.embedFont(assets.mouseMemoirs,{subset:false});
 const bank=await doc.embedFont(assets.nunitoSans900,{subset:false});
 const puzzle=await doc.embedFont(assets.zillaSlab,{subset:false});
 return {title:(s,n)=>title.widthOfTextAtSize(s,n),
  body:(s,n)=>body.widthOfTextAtSize(s,n),
  bank:(s,n)=>bank.widthOfTextAtSize(s,n),
  puzzle:(s,n)=>puzzle.widthOfTextAtSize(s,n)};
}
const exodus={type:'finish-verse',reference:'Exodus 15:11',seed:4,
 verse:'[Who] is like you, O [Lord], among the [gods]? Who is like you, [majestic] in holiness, [awesome] in glorious [deeds], doing [wonders]?'};
const isaiah={type:'finish-verse',reference:'Isaiah 41:10',seed:3,
 verse:'fear not, for I am with [you]; be not dismayed, for I am your [God]; I will strengthen you, I will [help] you, I will uphold you with my righteous right [hand].'};
const unscramble={type:'unscramble-verse',reference:'Psalm 46:1',seed:5,
 verse:"For [God's] people, he [called] [Moses;] to the [sea?] and [saved!] them."};
const question={type:'unscramble-verse',reference:'John 3:16',seed:4,
 verse:'For [GODS?] so [loved], the [world!] with [grace] today.'};
const upside={type:'upside-down-verse',reference:'Exodus 15:11',
 verse:"GOD'S WORD! Who is like you, O Lord, among the gods? Who is like you, majestic in holiness, awesome in glorious deeds, doing wonders?"};
const longUpside={type:'upside-down-verse',reference:'Isaiah 41:10',
 verse:'fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'};
test('punctuation parser keeps apostrophes and terminal marks out of answer slots',()=>{
 assert.equal(letterOnly("GOD'S WORD!"),'GODSWORD');
 assert.deepEqual(verseGlyphs("GOD'S!").map(x=>x.kind),
  ['letter','letter','letter','punctuation','letter','punctuation']);
 assert.ok(validBracketedAnswer("GOD'S?"));
 assert.ok(!validBracketedAnswer('EXTRAORDINARY!'));
 for(const m of [unscramble,question]){
  assert.deepEqual(validateStoryVerse(m),[]);
  const scrambles=verseScrambles(m);
  assert.equal(scrambles.length,parseVerse(m.verse).answers.length);
  scrambles.forEach((s,i)=>assert.equal(s.length,letterOnly(parseVerse(m.verse).answers[i]).length));
 }
});
test('Unscramble uses independent main answer and scrambled lines in both renderers',async()=>{
 const m=await metrics();
 for(const item of [unscramble,question]){
  const p=planUnscrambleVerse(item,m);
  assert.ok(p,'No plan for '+item.reference);
  assert.ok(p.rowCount>=1&&p.rowCount<=4);
  assert.ok(p.marks.every(mark=>mark.x>=0&&mark.x<331.2));
  const lines=p.marks.filter(mark=>mark.kind==='letter');
  assert.ok(lines.every(mark=>mark.scramble&&mark.scramble.length===1));
  const punctuation=p.marks.filter(mark=>mark.kind==='punctuation').map(mark=>mark.text);
  assert.ok(punctuation.some(x=>['?','!', ';',"'"].includes(x)));
  assert.equal(new Set(p.marks.map(mark=>mark.y)).size,p.rowCount);
  assert.ok(p.lineStep>=29,'All scrambled glyphs have their own row below blanks');
 }
});
test('Upside Down uses combined title, abbreviations, and unflipped punctuation',async()=>{
 const m=await metrics();
 for(const module of [upside,longUpside]){
  assert.deepEqual(validateSpecialty(module),[]);
  const p=planUpsideDownVerse(module,m);
  assert.ok(p,'Long verse should fit without clipping');
  assert.equal(p.title,module.reference+' – Upside Down');
  assert.ok(p.rowCount<=6);
  assert.ok(p.marks.some(mark=>mark.kind==='letter'&&mark.upside));
  assert.ok(p.marks.some(mark=>mark.kind==='punctuation'&&mark.text==='!')||module===longUpside);
  assert.ok(p.marks.every(mark=>mark.y+p.glyphOffset+p.fontSize<173));
  assert.ok(p.lineStep>=p.glyphOffset+p.fontSize+1.5,
   'An inverted word must not collide with the following answer line');
 }
 const names={
  'Song of Solomon 2:1':'Song 2:1','1 Thessalonians 5:16':'1 Thess. 5:16',
  '2 Thessalonians 3:1':'2 Thess. 3:1','New Testament':'NT',
  '1 Corinthians 13:4':'1 Cor. 13:4','2 Corinthians 5:7':'2 Cor. 5:7',
  '1 Chronicles 4:10':'1 Chron. 4:10','2 Chronicles 7:14':'2 Chron. 7:14',
  'Ecclesiastes 3:1':'Eccl. 3:1','Lamentations 3:22':'Lam. 3:22',
  'Deuteronomy 6:4':'Deut. 6:4','Philippians 4:13':'Phil. 4:13',
  'Colossians 3:23':'Col. 3:23','Revelation 21:4':'Rev. 21:4',
  'Leviticus 19:18':'Lev. 19:18','Zephaniah 3:17':'Zeph. 3:17',
  'Zechariah 4:6':'Zech. 4:6'};
 for(const [input,expected] of Object.entries(names))assert.equal(shortenBibleReference(input),expected);
});
test('Finish balances and centers rows, lowers bank text and draws genuine squares',async()=>{
 const m=await metrics();
 for(const module of [isaiah,exodus]){
  const p=planFinishVerse(module,m);
  assert.ok(p);
  assert.equal(p.cell,p.boxHeight);
  const byRow=new Map();
  for(const word of p.words){
   const row=byRow.get(word.y)??[];row.push(word);byRow.set(word.y,row);
  }
  const widths=[];
  for(const words of byRow.values()){
   const start=words[0].x,end=words.at(-1).x+words.at(-1).width;
   widths.push(end-start);
   assert.ok(Math.abs((start+end)/2-331.2/2)<.01);
  }
  assert.ok(widths.every(w=>w>70));
  assert.ok(p.bankWords.every(b=>b.y>p.bankTop+14),'Bank words are lowered inside box');
 }
});
test('Letter reconstruction and square blanks export on two landscape sheets',async()=>{
 const draft={title:'God is Faithful',scripture:'Isaiah 41',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
    '2:top-medium':unscramble,'2:middle-medium':upside,
    '3:top-medium':longUpside,'3:middle-medium':isaiah,
    '4:top-medium':exodus,'4:middle-medium':question,
  }};
 const pdf=await PDFDocument.load(await createBookletPdf(draft,await files()));
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
