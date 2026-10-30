import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {cipherSymbol,cipherSymbolSignature,CIPHER_SYMBOL_COUNT} from '../src/cipherSymbols.ts';
import {cryptogramLetters,generateCryptogram,checkCryptogram,cipherTextCharacters,validateCryptogram} from '../src/cryptograms.ts';
import {createBookletPdf} from '../src/pdf.ts';
import {blankModule,moduleForSize,readAssignments,validateModule} from '../src/modules.ts';
import {generateMaze,checkMaze,solveMazePath,MAZE_COLS,MAZE_ROWS,WEST,EAST,SOUTH} from '../src/puzzleEngines.ts';

const verse={type:'verse-cryptogram',reference:'John 3:16',verse:'For God so loved the world that he gave his one and only Son.',seed:2};
const big={type:'big-idea-cryptogram',idea:'God loves us and calls us to love others.',seed:5};
const fonts=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});

test('all 26 selected symbols are unique vector paths, never Unicode or emoji glyphs',()=>{
  assert.equal(CIPHER_SYMBOL_COUNT,26);
  const signs=new Set(),labels=new Set();
  for(let i=0;i<26;i++){
    const symbol=cipherSymbol(i);
    assert.ok(symbol.paths.length>=1);
    assert.ok(symbol.paths.every(p=>p.d.startsWith('M ') && !/[<>]/.test(p.d)));
    signs.add(cipherSymbolSignature(i));
    labels.add(symbol.label);
  }
  assert.equal(signs.size,26);
  assert.equal(labels.size,26);
  assert.equal(cipherSymbol(16).label,'☾');
  assert.throws(()=>cipherSymbol(26),/Unknown/);
});
test('cryptograms use a one-to-one substitution, alphabetized key, and punctuation stays literal',()=>{
  const result=generateCryptogram(verse);
  assert.ok(checkCryptogram(result));
  assert.equal(result.reference,'John 3:16');
  assert.deepEqual(result.key.map(e=>e.letter),cryptogramLetters(verse.verse));
  assert.equal(new Set(Object.values(result.mapping)).size,26);
  const encoded=cipherTextCharacters(result);
  assert.equal(encoded.length,Array.from(verse.verse).length);
  assert.equal(encoded[3].letter,' ');
  assert.equal(encoded[3].symbol,null);
  assert.equal(encoded.at(-1).letter,'.');
  assert.equal(encoded.at(-1).symbol,null);
  const first=encoded.find(x=>x.letter==='F');
  assert.equal(first.symbol,result.mapping.F);
  assert.ok(checkCryptogram(generateCryptogram(big)));
  assert.equal(generateCryptogram(big).reference,null);
});
test('seeds deterministically reassign all symbols with no collisions',()=>{
  const a=generateCryptogram(verse),b=generateCryptogram({...verse,seed:3});
  assert.deepEqual(a,generateCryptogram(verse));
  assert.notDeepEqual(a.mapping,b.mapping);
  assert.deepEqual(a.key.map(x=>x.letter),b.key.map(x=>x.letter));
  assert.ok(checkCryptogram(b));
});
test('both module types register in the expected sizes and survive old saved drafts',()=>{
  assert.equal(moduleForSize('large').filter(x=>x.id==='verse-cryptogram').length,1);
  assert.equal(moduleForSize('medium').filter(x=>x.id==='big-idea-cryptogram').length,1);
  assert.equal(moduleForSize('small').filter(x=>x.id.includes('cryptogram')).length,0);
  assert.equal(blankModule('verse-cryptogram').seed,1);
  assert.equal(blankModule('big-idea-cryptogram').seed,1);
  const saved=readAssignments({'1:cover-activity':verse,'2:top-medium':big,
    '3:top-large':{...verse,seed:'no'}});
  assert.equal(Object.keys(saved).length,2);
  assert.deepEqual(validateModule(verse),[]);
  assert.deepEqual(validateModule(big),[]);
});
test('long, empty, accented and overly complex inputs get readable errors',()=>{
  assert.ok(validateCryptogram({...verse,reference:''}).length);
  assert.ok(validateCryptogram({...big,idea:'A'.repeat(63)}).length);
  assert.ok(validateCryptogram({...big,idea:'God loves café.'}).some(x=>/unaccented/i.test(x)));
  assert.ok(validateCryptogram({...big,idea:'Hi.'}).some(x=>/different letters/i.test(x)));
});
test('maze now starts at bottom IN, with TRUE left and FALSE right and verified paths',()=>{
  const statement='Jesus calmed the storm.';
  const shortest=[];
  for(let seed=0;seed<25;seed++){
    const maze=generateMaze({type:'true-false-maze',statement,answer:true,seed});
    assert.ok(checkMaze(maze));
    assert.equal(maze.entrance.x,Math.floor(MAZE_COLS/2));
    assert.equal(maze.entrance.y,MAZE_ROWS-1);
    assert.equal(maze.walls[maze.entrance.y][maze.entrance.x]&SOUTH,0);
    const trueExit=maze.exits.find(x=>x.label==='TRUE');
    const falseExit=maze.exits.find(x=>x.label==='FALSE');
    assert.equal(trueExit.edge,'left');
    assert.equal(falseExit.edge,'right');
    assert.equal(maze.walls[trueExit.y][trueExit.x]&WEST,0);
    assert.equal(maze.walls[falseExit.y][falseExit.x]&EAST,0);
    const trueRoute=solveMazePath(maze.walls,maze.entrance,trueExit);
    const falseRoute=solveMazePath(maze.walls,maze.entrance,falseExit);
    assert.ok(trueRoute.length>1&&falseRoute.length>1);
    shortest.push(Math.max(trueRoute.length,falseRoute.length));
    assert.deepEqual(maze.solution,trueRoute);
    const no=generateMaze({type:'true-false-maze',statement,answer:false,seed});
    assert.deepEqual(no.walls,maze.walls);
    assert.equal(no.correctExit.label,'FALSE');
    assert.deepEqual(no.solution,falseRoute);
  }
  assert.ok(Math.max(...shortest)<210,'seeded maze candidates should avoid especially long treks');
});
test('cryptogram modules create a two-page vector PDF with existing fonts and layouts',async()=>{
  const draft={
    title:'God Loves Us',scripture:'John 3:16',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{
      '1:cover-activity':verse,
      '2:top-medium':big,
      '3:top-large':{...verse,seed:7},
      '3:bottom-medium':{type:'true-false-maze',statement:'God loves us all.',answer:true,seed:5},
    },
  };
  const bytes=await createBookletPdf(draft,await fonts());
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[792,612],[792,612]]);
  await assert.rejects(async()=>createBookletPdf({...draft,modules:{'2:top-medium':verse}},await fonts()),/wrong size area/);
});
