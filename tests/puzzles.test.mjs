import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { createBookletPdf } from '../src/pdf.ts';
import { blankModule, moduleForSize, validateModule, readAssignments } from '../src/modules.ts';
import {
  parseSearchWords, generateWordSearch, checkWordSearch, wordSearchCells,
  generateMaze, checkMaze, solveMazePath, validatePuzzle,
  WORD_COLS, WORD_ROWS, MAZE_COLS, MAZE_ROWS, NORTH, EAST, SOUTH, WEST,
} from '../src/puzzleEngines.ts';

const words = 'DAVID\nGOLIATH\nSLING\nSTONE\nSHEPHERD\nSAUL';
const search = { type:'word-search', words, seed:7 };
const mazeModule = { type:'true-false-maze', statement:'God protected Daniel in the lions den.', answer:true, seed:9 };
const fonts = async () => ({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-600.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/NunitoSans-750.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/NunitoSans-900.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});

test('new puzzle definitions appear only in their compatible region sizes', () => {
  assert.equal(moduleForSize('large').filter(x=>x.id==='word-search').length,1);
  assert.equal(moduleForSize('medium').filter(x=>x.id==='true-false-maze').length,1);
  assert.equal(moduleForSize('small').filter(x=>x.id==='word-search'||x.id==='true-false-maze').length,0);
  assert.deepEqual(blankModule('word-search'),{type:'word-search',words:'',seed:1});
  assert.deepEqual(blankModule('true-false-maze'),{type:'true-false-maze',statement:'',answer:true,seed:1});
  const loaded=readAssignments({'1:cover-activity':search,'2:top-medium':mazeModule});
  assert.equal(loaded['1:cover-activity'].type,'word-search');
  assert.equal(loaded['2:top-medium'].type,'true-false-maze');
});

test('word search grid uses 12 columns, 10 rows and places every word forward', () => {
  const result=generateWordSearch(search);
  assert.equal(result.grid.length,WORD_ROWS);
  assert.ok(result.grid.every(row=>row.length===WORD_COLS));
  assert.deepEqual(result.words,parseSearchWords(words));
  assert.equal(result.placements.length,result.words.length);
  assert.equal(checkWordSearch(result),true);
  const selected=wordSearchCells(result);
  assert.ok(selected.size>=12);
  for(const entry of result.placements){
    assert.ok(entry.dx>=0 && (entry.dx!==0 || entry.dy===1),'not a forward direction');
    assert.equal(entry.word.length,parseSearchWords(words).find(w=>w===entry.word)?.length);
    assert.equal(result.grid[entry.y][entry.x],entry.word[0]);
  }
});

test('12-letter word fits horizontally and 10-word input still generates', () => {
  const long={...search,words:'CHRISTIANITY\nGOLIATH\nSAMUEL\nDAVID\nSLING\nSHEPHERD\nSTONE\nSAUL\nGIANT\nARMOR'};
  const result=generateWordSearch(long);
  assert.ok(checkWordSearch(result));
  assert.equal(result.placements.find(p=>p.word==='CHRISTIANITY')?.direction,'right');
  assert.equal(result.placements.length,10);
});

test('word search seed is repeatable and regeneration changes the puzzle', () => {
  const first=generateWordSearch(search);
  assert.deepEqual(first,generateWordSearch({...search}));
  const next=generateWordSearch({...search,seed:8});
  assert.notDeepEqual(next.grid,first.grid);
  assert.ok(checkWordSearch(next));
});
test('invalid or duplicate inputs fail helpfully',()=>{
  assert.ok(validateModule({...search,words:'DAVID\nDAVID\nSLING\nSTONE'}).some(x=>/duplicate/i.test(x)));
  assert.ok(validateModule({...search,words:'ONE\nTWO'}).length>0);
  assert.deepEqual(parseSearchWords('Red Sea\nDry Land\nDAVID\nSTONE'),['REDSEA','DRYLAND','DAVID','STONE']);
  const phrases=generateWordSearch({...search,words:'Red Sea\nDry Land\nDAVID\nSTONE'});
  assert.deepEqual(phrases.labels,['Red Sea','Dry Land','David','Stone']);
  assert.ok(checkWordSearch(phrases));
  assert.ok(validateModule({...search,words:'REDSEA\nRed Sea\nDAVID\nSTONE'}).some(x=>/duplicate/i.test(x)));
  assert.ok(validateModule({...search,words:'ABCDEFGHIJKLM\nDAVID\nSTONE\nSLING'}).length>0);
  assert.ok(validatePuzzle({...mazeModule,statement:''}).length>0);
});

test('true-or-false maze is a fully connected, symmetric 35×14 perfect maze',()=>{
  for(let seed=0;seed<35;seed++){
    const m=generateMaze({...mazeModule,seed});
    assert.equal(m.walls.length,MAZE_ROWS);
    assert.ok(m.walls.every(row=>row.length===MAZE_COLS));
    assert.ok(checkMaze(m));
    assert.equal(m.exits.filter(e=>e.edge==='right'&&e.label==='FALSE').length,1);
    assert.equal(m.exits.filter(e=>e.edge==='left'&&e.label==='TRUE').length,1);
    assert.deepEqual(m.solution,solveMazePath(m.walls,m.entrance,m.correctExit));
    assert.ok(m.solution.length>1);
    assert.equal(m.correctExit.label,'TRUE');
    for(const exit of m.exits)assert.ok(solveMazePath(m.walls,m.entrance,exit).length>0);
    // Interior undirected edge count = cells-1: randomized DFS produced a tree.
    let edges=0;
    for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
      if(x<MAZE_COLS-1&&!(m.walls[y][x]&EAST))edges++;
      if(y<MAZE_ROWS-1&&!(m.walls[y][x]&SOUTH))edges++;
    }
    assert.equal(edges,MAZE_COLS*MAZE_ROWS-1);
    assert.equal(m.walls[m.entrance.y][m.entrance.x]&SOUTH,0);
    assert.equal(m.entrance.x,Math.floor(MAZE_COLS/2));
    assert.equal(m.entrance.y,MAZE_ROWS-1);
    assert.equal(m.exits[0].edge,'left');
  }
});

test('correct answer determines the chosen exit, and each seed is reproducible',()=>{
  const yes=generateMaze(mazeModule);
  const no=generateMaze({...mazeModule,answer:false});
  assert.deepEqual(yes.walls,no.walls);
  assert.notEqual(yes.correctExit.label,no.correctExit.label);
  assert.equal(no.correctExit.label,'FALSE');
  assert.notDeepEqual(yes.correctExit,no.correctExit);
  assert.deepEqual(generateMaze(mazeModule),yes);
  assert.notDeepEqual(generateMaze({...mazeModule,seed:10}).walls,yes.walls);
});
test('solution checker rejects corrupted maze topology and word coordinates',()=>{
  const m=generateMaze(mazeModule);
  const corrupted={...m,walls:m.walls.map(row=>[...row])};
  corrupted.walls[0][0]^=EAST;
  assert.equal(checkMaze(corrupted),false);
  const puzzle=generateWordSearch(search);
  const invalid={...puzzle,placements:puzzle.placements.map((p,i)=>i?{...p}:{...p,x:99})};
  assert.equal(checkWordSearch(invalid),false);
});
test('both puzzles export into the existing 2-page vector PDF',async()=>{
  const draft={
    title:'David and Goliath',scripture:'1 Samuel 17',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{'1:cover-activity':search,'2:top-medium':mazeModule,'3:top-large':{...search,seed:18},
      '4:top-medium':{...mazeModule,answer:false,seed:22}},
  };
  const bytes=await createBookletPdf(draft,await fonts());
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  const bad={...draft,modules:{'2:top-medium':search}};
  await assert.rejects(async()=>createBookletPdf(bad,await fonts()),/wrong size area/);
});


test('twelve entries switch to a three-column printable bank without dropping words',()=>{
  const input='Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover';
  const data=generateWordSearch({...search,words:input,seed:15});
  assert.equal(data.words.length,12);
  assert.deepEqual(data.words.slice(0,2),['REDSEA','DRYLAND']);
  assert.ok(checkWordSearch(data));
});
