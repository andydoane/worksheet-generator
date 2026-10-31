import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {STORY_INNER_WIDTH,STORY_INNER_HEIGHT,STORY_BANK_TOP,STORY_BANK_HEIGHT,STORY_BODY_TOP,STORY_BODY_WIDTH,STORY_BODY_HEIGHT,planStory} from '../src/storyLayout.ts';
import {CIPHER_WORD_GAP,cryptogramBodyGeometry} from '../src/cryptogramPdf.ts';
import {generateCryptogram} from '../src/cryptograms.ts';
import {parseCrossword,generateCrossword,checkCrossword,spiralPoints,spiralFirstWord,spiralTurns} from '../src/specialtyModules.ts';
const fonts=async()=>({
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
const redSea='God led the Israelites to the Red Sea with a [PILLAR] of cloud by day and a pillar of fire by night. Pharaoh changed his mind. He sent his army to chase after the Israelites. Trapped between the sea and the army, the Israelites asked, "Did you bring us out here to die?" Moses said, "Be still. God will fight for you." God told Moses to hold his [STAFF] over the sea. God sent a wind to [SPLIT] the sea. The people walked across on dry [LAND] between walls of [WATER]. The Egyptians chased after the Israelites. God made them [PANIC] and their chariot wheels jam. Moses reached out his staff. God brought the [waters] down on the entire Egyptian [ARMY].';
const entries=[
 'DAVID, Young shepherd who faced a giant',
 'GOLIATH, Giant from Gath',
 'SLING, Weapon David used',
 'STONE, David picked up five',
 'SAUL, King of Israel',
 'SHEEP, Animals David watched',
 'GIANT, Very tall warrior',
 'ISRAEL, Nation David defended',
 'RED SEA, Where Moses and the Israelites crossed',
 'MANGER, Bed for baby Jesus',
].join('\n');
test('one physical SVG scene contains the story bank and paragraph with no overlap',async()=>{
 assert.equal(STORY_INNER_WIDTH,331.2);
 assert.equal(STORY_INNER_HEIGHT,360);
 assert.equal(STORY_BODY_WIDTH,325.2);
 assert.equal(STORY_BODY_TOP,119);
 assert.equal(STORY_BODY_HEIGHT,236);
 assert.ok(STORY_BODY_TOP>STORY_BANK_TOP+STORY_BANK_HEIGHT);
 const f=fontkit.create(await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)));
 const measure=(text,size)=>f.layout(text).positions.reduce((sum,p)=>sum+p.xAdvance,0)*size/f.unitsPerEm;
 const plan=planStory(redSea,measure,STORY_BODY_WIDTH,STORY_BODY_HEIGHT);
 assert.ok(plan,'The complete Red Sea passage should fit with fontkit glyph widths');
 assert.equal(plan.placements.filter(p=>p.kind==='blank').at(-1).text,'ARMY');
 assert.ok(plan.placements.every(p=>STORY_BODY_TOP+p.y<STORY_INNER_HEIGHT));
});
test('crossword phrases normalize without creating a second disconnected puzzle',()=>{
 const parsed=parseCrossword(entries);
 assert.equal(parsed[8].answer,'REDSEA');
 const puzzle=generateCrossword({type:'crossword',entries,seed:4});
 assert.ok(checkCrossword(puzzle));
 assert.equal(puzzle.placements.length,10);
 assert.ok(puzzle.placements.some(p=>p.answer==='REDSEA'));
 assert.ok(puzzle.width<=21&&puzzle.height<=21);
});
test('spiral starts outside, changes length for short verses and identifies first word',()=>{
 const short='Jesus wept.',long='The Lord is my shepherd, I shall not want. He leads me beside quiet waters and restores my soul.';
 assert.ok(spiralTurns(short)<spiralTurns(long));
 assert.equal(spiralFirstWord('  The Lord is my shepherd.'),'The');
 const a=spiralPoints(800,spiralTurns(short)),b=spiralPoints(800,spiralTurns(long));
 assert.equal(a.length,800);
 assert.notDeepEqual(a[200],b[200]);
 assert.ok(Math.hypot(a.at(-1).x-.5,a.at(-1).y-.5)>.4);
});
test('cryptogram preserves punctuation and adds double-space word separation',()=>{
 assert.equal(CIPHER_WORD_GAP,16);
 const data=generateCryptogram({type:'verse-cryptogram',reference:'Exodus 14:14',
  verse:'Be still, and know!',seed:4});
 assert.ok(data.text.includes(',')&&data.text.includes('!'));
 assert.ok(cryptogramBodyGeometry(5,220,18));
});
test('long story, 10-clue crossword and long spiral export to printable booklet',async()=>{
 const result=await createBookletPdf({
  title:'God Makes a Way',scripture:'Exodus 14',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{
   '1:cover-activity':{type:'finish-story',story:redSea,seed:2},
   '2:top-large':{type:'crossword',entries,seed:4},
   '3:top-large':{type:'spiral-verse',reference:'Psalm 23:1-2',
     verse:'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures; he leads me beside still waters.'},
   '4:top-large':{type:'verse-cryptogram',reference:'Exodus 14:14',
     verse:'The Lord will fight for you; you need only to be still!',seed:7},
  },
 },await fonts());
 const doc=await PDFDocument.load(result);
 assert.equal(doc.getPageCount(),2);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
