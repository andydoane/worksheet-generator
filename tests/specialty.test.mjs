import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {moduleForSize,blankModule,readAssignments,validateModule} from '../src/modules.ts';
import {
  parseCrossword,generateCrossword,checkCrossword,connectPositions,parseConnectionWords,
  spiralPoints,spiralTurns,validateSpecialty,
} from '../src/specialtyModules.ts';

const entries=[
  'DAVID, Young shepherd who faced a giant',
  'GOLIATH, Giant from Gath',
  'SLING, Weapon David used',
  'STONE, David picked up five',
  'SAUL, King of Israel',
  'SHEEP, Animals David watched',
  'GIANT, Very tall warrior',
  'ISRAEL, Nation David defended',
].join('\n');
const crossword={type:'crossword',entries,seed:4};
const spiral={type:'spiral-verse',reference:'Psalm 23:1',verse:'The Lord is my shepherd; I shall not want.'};
const upside={type:'upside-down-verse',reference:'Psalm 23:1',verse:'The Lord is my shepherd.'};
const connect={type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:7};
const idea={type:'connect-big-idea',idea:'God always cares for his children.',seed:3};
const fontFiles=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});

test('all twenty-six modules are registered, preserving eight small regions',()=>{
  assert.equal(moduleForSize('small').length,8);
  assert.equal(moduleForSize('medium').length,9);
  assert.equal(moduleForSize('large').length,9);
  for(const m of [crossword,spiral,upside,connect,idea]){
    assert.ok(moduleForSize(m.type==='crossword'||m.type==='spiral-verse'||m.type==='connect-verse'?'large':'medium')
      .some(x=>x.id===m.type));
    assert.equal(blankModule(m.type).type,m.type);
    assert.deepEqual(validateModule(m),[],m.type);
  }
  assert.equal(Object.keys(readAssignments({
    '1:cover-activity':crossword,
    '2:top-medium':upside,
    '2:bottom-large':spiral,
    '3:top-medium':connect,
    '4:top-medium':idea,
  })).length,5);
});

test('crossword parser handles comma-separated answers and clue text',()=>{
  const parsed=parseCrossword(entries);
  assert.equal(parsed.length,8);
  assert.equal(parsed[0].answer,'DAVID');
  assert.equal(parsed[0].clue,'Young shepherd who faced a giant');
  assert.ok(validateSpecialty({...crossword,entries:'ONE, clue\nTWO, clue'}).length);
  assert.equal(parseCrossword('Red Sea, Where Moses crossed')[0].answer,'REDSEA');
  assert.deepEqual(validateSpecialty({...crossword,entries:entries.replace('ISRAEL','Red Sea')}),[]);
  assert.ok(validateSpecialty({...crossword,entries:entries.replace('DAVID','DAVI 3D')}).length);
  assert.ok(validateSpecialty({...crossword,entries:entries.replace('GOLIATH, Giant from Gath','DAVID, Duplicate')}).length);
});

test('crosswords are connected, numbered correctly, and show all supplied clues',()=>{
  const grid=generateCrossword(crossword);
  assert.ok(checkCrossword(grid));
  assert.equal(grid.placements.length,8);
  assert.equal(grid.across.length+grid.down.length,8);
  assert.ok(grid.width<=21&&grid.height<=21);
  assert.ok(grid.across.length>0&&grid.down.length>0);
  const parsed=parseCrossword(entries);
  assert.deepEqual(grid.placements.map(x=>x.answer).sort(),parsed.map(x=>x.answer).sort());
  for(const row of grid.placements){
    assert.equal(row.number,grid.numbers[row.x+','+row.y]);
    assert.ok(row.clue);
    assert.ok(row.number>=1);
  }
  const changed={...grid,cells:grid.cells.map(row=>[...row])};
  const position=grid.placements[0];
  changed.cells[position.y][position.x]='X'===changed.cells[position.y][position.x]?'Z':'X';
  assert.equal(checkCrossword(changed),false);
});
test('crossword regeneration is deterministic and preserves all solutions',()=>{
  const initial=generateCrossword(crossword);
  assert.deepEqual(initial,generateCrossword(crossword));
  const again=generateCrossword({...crossword,seed:5});
  assert.ok(checkCrossword(again));
  assert.notDeepEqual(initial.placements,again.placements);
});

test('spiral drawing points cover the interior and form a smooth writing line',()=>{
  const points=spiralPoints(450);
  assert.equal(points.length,450);
  assert.ok(points.every(p=>p.x>=.05&&p.x<=.95&&p.y>=.05&&p.y<=.95));
  assert.ok(points.some(p=>p.x<.2));
  assert.ok(points.some(p=>p.x>.8));
});

test('connecting activities use deterministic positions, nonoverlapping grid slots, and unchanged words',()=>{
  for(const module of [connect,idea]){
    const positions=connectPositions(module);
    assert.deepEqual(positions,connectPositions(module));
    assert.deepEqual(positions.map(x=>x.word).sort(),parseConnectionWords(module.verse??module.idea).sort());
    assert.equal(new Set(positions.map(x=>x.x+','+x.y)).size,positions.length);
    assert.ok(positions.every(p=>Math.abs(p.angle)<8&&p.jitter.length===p.word.length));
    const next=connectPositions({...module,seed:module.seed+1});
    assert.notDeepEqual(next,positions);
  }
});
test('specialty text validations reject unprintable lengths and invalid references',()=>{
  assert.ok(validateModule({...upside,verse:'A'.repeat(161)}).length);
  assert.ok(validateModule({...spiral,reference:''}).length);
  assert.ok(validateModule({...connect,verse:'one two'}).length);
  assert.ok(validateModule({...idea,idea:'Émile went to church with us.'}).length);
});

test('all five specialty activities export to a vector two-sheet booklet',async()=>{
  const draft={
    title:'David and Goliath',scripture:'1 Samuel 17',
    layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
    modules:{
      '1:cover-activity':crossword,
      '2:top-medium':upside,'2:bottom-large':spiral,
      '3:top-medium':connect,'3:bottom-large':{...crossword,seed:11},
      '4:top-medium':idea,'4:bottom-large':spiral,
    },
  };
  const pdf=await PDFDocument.load(await createBookletPdf(draft,await fontFiles()));
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  await assert.rejects(async()=>createBookletPdf({
    ...draft,modules:{'2:top-medium':crossword},
  },await fontFiles()),/wrong size area/);
});


test('spiral length responds to verse length',()=>{
 assert.ok(spiralTurns('Jesus wept.')<spiralTurns('God so loved the world that he gave his one and only Son.'));
 assert.ok(spiralTurns('A'.repeat(260))<=5.5);
 assert.equal(spiralPoints(480,spiralTurns('Jesus wept.')).length,480);
});
test('nine and ten crossword clues remain connected with multi-word normalization',()=>{
 const nine={...crossword,entries:entries+'\nRED SEA, Where Israel crossed\nMANGER, Where baby Jesus lay'};
 const parsed=parseCrossword(nine.entries);
 assert.equal(parsed[8].answer,'REDSEA');
 assert.equal(parsed.length,10);
 assert.deepEqual(validateSpecialty(nine),[]);
 const generated=generateCrossword(nine);
 assert.ok(checkCrossword(generated));
 assert.equal(generated.placements.length,10);
 assert.ok(generated.width<=21&&generated.height<=21);
});
