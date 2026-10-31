import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {crosswordBlackCells} from '../src/crosswordLayout.ts';
import {generateCrossword,checkCrossword} from '../src/specialtyModules.ts';

const cells=[
  [null,null,null,null,null],
  [null,null,'A',null,null],
  [null,'B',null,'C',null],
  [null,null,'D',null,null],
  [null,null,null,null,null],
];

test('Only empty cells enclosed on all four sides turn black',()=>{
 const puzzle={width:5,height:5,cells:cells.map(row=>[...row])};
 assert.deepEqual(crosswordBlackCells(puzzle),[{x:2,y:2}]);
 assert.equal(puzzle.cells[2][2],null,'Detection must not modify the answer grid');
 puzzle.cells[1][2]=null; // An opening at the top breaks the false square.
 assert.deepEqual(crosswordBlackCells(puzzle),[]);
 puzzle.cells[1][2]='A';
 puzzle.cells[2][2]='E'; // A real answer square must remain white.
 assert.deepEqual(crosswordBlackCells(puzzle),[]);
});

test('Black fill detection never changes crossword letters or their numbering',()=>{
 const entries=[
  'DAVID, Young shepherd who faced a giant',
  'GOLIATH, Giant from Gath',
  'SLING, Weapon David used',
  'STONE, David picked up five',
  'SAUL, King of Israel',
  'SHEEP, Animals David watched',
  'GIANT, Very tall warrior',
  'ISRAEL, Nation David defended',
  'RED SEA, Where Moses crossed',
  'MANGER, Bed for baby Jesus',
 ].join('\n');
 const puzzle=generateCrossword({type:'crossword',entries,seed:4});
 const before=JSON.stringify(puzzle);
 const black=crosswordBlackCells(puzzle);
 assert.equal(JSON.stringify(puzzle),before);
 assert.ok(checkCrossword(puzzle));
 assert.ok(black.every(({x,y})=>puzzle.cells[y][x]===null));
 assert.ok(black.every(({x,y})=>!puzzle.numbers[x+','+y]));
});

test('Crossword black cells and blank spiral are consistent in preview and export',async()=>{
 const preview=await readFile(new URL('../src/SpecialtyPreview.tsx',import.meta.url),'utf8');
 const pdf=await readFile(new URL('../src/specialtyPdf.ts',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/layout.css',import.meta.url),'utf8');
 assert.match(preview,/crosswordBlackCells\(puzzle\)\.map/u);
 assert.match(pdf,/for\(const \{x,y\} of crosswordBlackCells\(puzzle\)\)/u);
 assert.doesNotMatch(preview,/spiralFirstWord|starter word at the outside/u);
 assert.doesNotMatch(pdf,/spiralFirstWord|page\.drawText\(first/u);
 assert.match(pdf,/centered\(page,fonts\.bank,module\.reference/u);
 assert.match(pdf,/rows\.forEach\(\(text,i\)=>centered\(page,fonts\.bodyBold/u);
 assert.match(css,/\.spiral-bank strong \{font-weight:800;\}/u);
});
