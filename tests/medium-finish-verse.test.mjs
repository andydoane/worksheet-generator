import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {planFinishVerse} from '../src/finishVerseLayout.ts';
import {planMistakes} from '../src/mediumParityLayout.ts';
import {parseVerse,validateStoryVerse} from '../src/storyVerseModules.ts';
import {markWordSelection} from '../src/storySelection.ts';
import {createBookletPdf} from '../src/pdf.ts';

const assets=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
const exodus={type:'finish-verse',reference:'Exodus 15:11',seed:4,
 verse:'[Who] is like you, O [Lord], among the [gods]? Who is like you, [majestic] in holiness, [awesome] in glorious [deeds], doing [wonders]?'};
const isaiah={type:'finish-verse',reference:'Isaiah 41:10',seed:3,
 verse:'fear not, for I am with [you]; be not dismayed, for I am your [God]; I will strengthen you, I will [help] you, I will uphold you with my righteous right [hand].'};
const short={type:'finish-verse',reference:'John 3:16',seed:1,
 verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'};
const longMistakes={type:'circle-mistakes',count:5,text:(
 'The Israelites followed Moses out of Egypt. Pharaoh decided not to chase them. '+
 'God led them toward the Red Sea, but the people thought they had no way across. '+
 'Moses waved his staff and the water became a frozen bridge. '+
 'Everyone crossed on dry ground while the Egyptian chariots waited patiently. '+
 'God helped his people reach the other side safely. '+
 'Miriam gathered everyone to sing and thank God for bringing them through the sea. '+
 'The people sang to thank God for helping them.'
).slice(0,475)};
async function widths(){
 const a=await assets(),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const sources={title:a.mouseMemoirs,body:a.nunitoSans,bank:a.nunitoSans900};
 const browser={},pdf={};
 for(const [key,bytes] of Object.entries(sources)){
  const face=fontkit.create(bytes);
  browser[key]=(s,n)=>face.layout(s).glyphs.reduce((p,x)=>p+x.advanceWidth,0)*n/face.unitsPerEm;
  const f=await doc.embedFont(bytes,{subset:false});
  pdf[key]=(s,n)=>f.widthOfTextAtSize(s,n);
 }
 return {browser,pdf};
}
test('Exodus 15:11 and Isaiah 41:10 fit with print-matched text and full-size handwriting boxes',async()=>{
 const {browser,pdf}=await widths();
 for(const module of [short,exodus,isaiah]){
  assert.deepEqual(validateStoryVerse(module),[]);
  const a=planFinishVerse(module,browser),b=planFinishVerse(module,pdf);
  assert.ok(a&&b,'Cannot fit '+module.reference);
  // pdf-lib and fontkit can differ by one floating point ULP; print points
  // agree to the nearest thousandth, far below any visible pixel tolerance.
  // Width accumulation may differ by a handful of thousandths of a point.
  // Validate every glyph position within 0.01pt, far below print resolution.
  const close=(left,right)=>{
   assert.equal(left.length,right.length);
   for(let i=0;i<left.length;i++){
    assert.deepEqual(Object.keys(left[i]),Object.keys(right[i]));
    for(const key of Object.keys(left[i])){
     if(typeof left[i][key]==='number')
      assert.ok(Math.abs(left[i][key]-right[i][key])<=.01,key+' drifted');
     else assert.equal(left[i][key],right[i][key]);
    }
   }
  };
  close(a.words,b.words);
  close(a.bankWords,b.bankWords);
  assert.equal(a.title,'FINISH '+module.reference.toUpperCase());
  assert.ok(a.cell>=12.3);
  assert.ok(a.boxHeight>=12.3);
  assert.equal(a.cell,a.boxHeight,'Handwriting boxes must be square');
  assert.ok(a.lines<=7);
  assert.ok(a.words.every(w=>w.y<170));
  assert.equal(a.words.filter(x=>x.kind==='blank').length,parseVerse(module.verse).answers.length);
  assert.ok(a.bankHeight>=21);
  assert.ok(a.bankWords.every(x=>x.y<a.bankTop+a.bankHeight));
 }
});
test('Blank button marks selected repeated word by offset; no nested blanks',()=>{
 const verse='Who is like you? Who is like you?';
 const first=markWordSelection(verse,0,3);
 assert.equal(first.text,'[Who] is like you? Who is like you?');
 const start=first.text.lastIndexOf('Who');
 const second=markWordSelection(first.text,start,start+3);
 assert.equal(second.text,'[Who] is like you? [Who] is like you?');
 assert.equal(markWordSelection(second.text,1,4),null);
 const selection=markWordSelection('God is here',0,4);
 assert.equal(selection.text,'[God] is here');
});
test('Finish Verse allows fewer blanks and a longer limit; Unscramble retains its rules',()=>{
 assert.deepEqual(validateStoryVerse({...isaiah,verse:'God will [help] and [guide] us.'}),[]);
 assert.ok(validateStoryVerse({...isaiah,verse:'[Only] one blank.'}).length);
 assert.ok(validateStoryVerse({...isaiah,verse:'[a] [b] [c] [d] [e] [f] [g] [h] [i]'}).length);
 assert.ok(validateStoryVerse({...isaiah,verse:'A'.repeat(301)}).length);
 assert.ok(validateStoryVerse({type:'unscramble-verse',reference:'John 3:16',verse:'God [loves] [us].',seed:1}).length);
});
test('Circle of 475 characters is accepted and title plus body form a centered block',async()=>{
 const {browser,pdf}=await widths();
 const m={...longMistakes,text:longMistakes.text.padEnd(475,'.')};
 assert.equal(m.text.length,475);
 assert.deepEqual(validateStoryVerse(m),[]);
 assert.ok(validateStoryVerse({...m,text:m.text+'!'}).length);
 const p=planMistakes(m.text,browser.body),q=planMistakes(m.text,pdf.body);
 assert.ok(p&&q);
 assert.deepEqual(p,q);
 assert.ok(p.titleY>23,'Title should move down when content is short enough');
 assert.ok(p.lines[0].y-p.titleY<30,'No large phantom subtitle gap');
 const top=p.titleY-23,bottom=p.lines.at(-1).y;
 assert.ok(Math.abs(top-(172.8-bottom))<18,'Title and copy should center as one block');
});
test('Long verses and Circle export on two landscape letter sheets',async()=>{
 const draft={title:'Remember God’s Promises',scripture:'Isaiah 41',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':exodus,'2:middle-medium':isaiah,
  '3:top-medium':longMistakes,'3:middle-medium':short,
 }};
 const bytes=await createBookletPdf(draft,await assets());
 const pdf=await PDFDocument.load(bytes);
 assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
