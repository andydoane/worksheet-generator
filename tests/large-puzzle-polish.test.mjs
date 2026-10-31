import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {planStory,STORY_BODY_WIDTH,STORY_BODY_HEIGHT} from '../src/storyLayout.ts';
import {cryptogramBodyGeometry,drawCipherGlyph} from '../src/cryptogramPdf.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {cipherSymbol,CIPHER_SYMBOL_COUNT,cipherSymbolSignature} from '../src/cipherSymbols.ts';

export const redSeaStory='God led the Israelites to the Red Sea with a [PILLAR] of cloud by day and a pillar of fire by night. Pharaoh changed his mind. He sent his army to chase after the Israelites. Trapped between the sea and the army, the Israelites asked, "Did you bring us out here to die?" Moses said, "Be still. God will fight for you." God told Moses to hold his [STAFF] over the sea. God sent a wind to [SPLIT] the sea. The people walked across on dry [LAND] between walls of [WATER]. The Egyptians chased after the Israelites. God made them [PANIC] and their chariot wheels jam. Moses reached out his staff. God brought the [waters] down on the entire Egyptian [ARMY].';
const fonts=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
test('the exact Red Sea story is measured and fully placed, including final ARMY blank',async()=>{
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const face=await doc.embedFont((await fonts()).nunitoSans,{subset:false});
 const plan=planStory(redSeaStory,(text,size)=>face.widthOfTextAtSize(text,size),STORY_BODY_WIDTH,STORY_BODY_HEIGHT);
 assert.ok(plan,'Full passage should fit the large printable area');
 assert.ok(plan.fontSize>=9&&plan.fontSize<=13);
 assert.equal(plan.placements.filter(x=>x.kind==='blank').length,8);
 assert.equal(plan.placements.filter(p=>p.kind==='blank').at(-1).text,'ARMY');
 assert.ok(plan.placements.every(p=>p.x>=0&&p.x+p.width<=STORY_BODY_WIDTH+.01));
 assert.ok(plan.placements.every(p=>p.y>=0&&p.y<=STORY_BODY_HEIGHT));
});
test('short Finish the Story paragraphs are vertically centered within the body area',async()=>{
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const face=await doc.embedFont((await fonts()).nunitoSans,{subset:false});
 const short='The [people] walked on [dry] [land] between [walls] of [water] and praised [God].';
 const p=planStory(short,(text,size)=>face.widthOfTextAtSize(text,size),STORY_BODY_WIDTH,STORY_BODY_HEIGHT);
 assert.ok(p);assert.equal(p.fontSize,13);
 assert.ok(Math.min(...p.placements.map(x=>x.y))>STORY_BODY_HEIGHT*.25);
});
test('cryptogram rows use a 28pt or larger pitch, and center the ink as a group',()=>{
 const g=cryptogramBodyGeometry(6,264,29);
 assert.ok(g);assert.ok(g.step>=28);
 assert.ok(g.firstY<=264-20);
 assert.ok(g.firstY-(6-1)*g.step>=29);
 const one=cryptogramBodyGeometry(1,264,29);
 assert.ok(one);assert.equal(one.step,0);
 assert.equal(cryptogramBodyGeometry(15,180,29),null);
});
test('all 26 cipher glyphs remain distinct vectors and draw at two real print sizes',async()=>{
 const document=await PDFDocument.create(),page=document.addPage([612,792]);
 assert.equal(CIPHER_SYMBOL_COUNT,26);
 const signatures=new Set();
 for(let i=0;i<26;i++){
   const symbol=cipherSymbol(i);
   assert.ok(symbol.paths.every(p=>p.d.startsWith('M ')));
   signatures.add(cipherSymbolSignature(i));
   drawCipherGlyph(page,i,40+(i%13)*38,610-Math.floor(i/13)*65,10);
   drawCipherGlyph(page,i,40+(i%13)*38,410-Math.floor(i/13)*65,13);
 }
 assert.equal(signatures.size,26);
 assert.ok((await document.save()).length>1000);
});
test('Red Sea story, 12-word bank and verse cryptogram export on the booklet',async()=>{
 const draft={title:'Crossing the Red Sea',scripture:'Exodus 14',
   layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
   modules:{
    '1:cover-activity':{type:'finish-story',story:redSeaStory,seed:4},
    '2:bottom-large':{type:'word-search',words:'Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover',seed:8},
    '3:bottom-large':{type:'verse-cryptogram',reference:'Exodus 14:14',
      verse:'The LORD will fight for you; you need only to be still.',seed:7},
    '4:bottom-large':{type:'draw-story',prompts:'God led his people.\nMoses raised his staff.\nThe people crossed the sea.\nGod kept everyone safe.'},
   }};
 const data=await createBookletPdf(draft,await fonts());
 const doc=await PDFDocument.load(data);
 assert.equal(doc.getPageCount(),2);
 assert.deepEqual(doc.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
});
