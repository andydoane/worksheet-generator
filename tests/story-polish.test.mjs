import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument,PDFDict,PDFName} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {balancedLines} from '../src/storyVersePdf.ts';
import {measureWrappedLines,verticalStack,MODULE_TITLE_PT} from '../src/pdfLayout.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {boxGrid} from '../src/storyVerseModules.ts';

const font=(weight)=>readFile(new URL('../fonts/Nunito-'+weight+'.ttf',import.meta.url));
const fonts=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await font('Medium'),
  nunitoSans750:await font('Bold'),
  nunitoSans900:await font('ExtraBold'),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});
const sortInstruction='Sort the letters into TRUE or FALSE. Circle the incorrect words in false statements.';
test('Sort the Story subtitle uses measured balanced wrapping rather than an orphan line',async()=>{
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const bold=await doc.embedFont(await font('Bold'),{subset:false});
  const width=317,size=9.4;
  const wrap=measureWrappedLines(sortInstruction,width,text=>bold.widthOfTextAtSize(text,size));
  const balanced=balancedLines(sortInstruction,bold,size,width);
  assert.ok(balanced&&balanced.length>=2);
  assert.equal(balanced.join(' '),sortInstruction);
  const spread=rows=>{
    const sizes=rows.map(text=>bold.widthOfTextAtSize(text,size));
    return Math.max(...sizes)-Math.min(...sizes);
  };
  assert.ok(spread(balanced)<=spread(wrap)+.01);
  assert.ok(balanced.every(line=>bold.widthOfTextAtSize(line,size)<=width));
});
test('Nunito Medium, Bold and ExtraBold are separate physical faces',async()=>{
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  for(const style of ['Medium','Bold','ExtraBold']){
    const face=await doc.embedFont(await font(style),{subset:false});
    assert.match(face.name,/Nunito/i);
    assert.ok(face.widthOfTextAtSize('Jesus teaches the children.',12)>50);
    doc.addPage([612,792]).drawText('Jesus teaches the children.',{font:face,size:12,x:40,y:700});
  }
  const loaded=await PDFDocument.load(await doc.save());
  const names=loaded.context.enumerateIndirectObjects()
    .filter(([,obj])=>obj instanceof PDFDict)
    .map(([,obj])=>obj.get(PDFName.of('BaseFont'))?.toString()??'');
  assert.ok(['Medium','Bold','ExtraBold'].every(style=>names.some(name=>name.includes(style))),
    'Expected all three Nunito weight names: '+names.join(', '));
});
test('short and maximum story/card examples print in existing four-page layout',async()=>{
  const s={
    type:'finish-story',seed:1,
    story:'[Jesus] told a [story]. He loved the [children]. His [friends] [listened] and [learned].',
  };
  const order={
    type:'story-order',seed:9,
    events:'Jesus sat near the lake.\nThe people gathered to hear his teaching.\nJesus spoke about the kingdom of God.\nHis followers asked him questions.\nThe people listened carefully.',
  };
  const sort={
    type:'sort-story',seed:4,
    statements:'Jesus taught the people. true\nJesus never told stories. false\nThe crowd listened to Jesus. true\nThe disciples had never met Jesus. false\nJesus used stories to teach. true',
  };
  const prompts={
    type:'draw-story',
    prompts:'Jesus sits by the lake.\nThe people come to listen.\nJesus tells them a story.\nThe disciples ask questions.',
  };
  assert.equal(boxGrid(prompts).cols,2);
  const bytes=await createBookletPdf({
    title:'The Teacher Jesus',scripture:'Matthew 13',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{'1:cover-activity':s,'2:bottom-large':sort,'3:top-large':prompts,'4:bottom-large':order},
  },await fonts());
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(page=>[page.getWidth(),page.getHeight()]),[[792,612],[792,612]]);
  const stack=verticalStack({x:0,y:0,width:300,height:320},[{height:110,maxHeight:210,grow:1}],0);
  assert.ok(stack[0].y>=0&&stack[0].height<=320);
  assert.equal(MODULE_TITLE_PT,25);
});
