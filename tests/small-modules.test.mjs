import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { createBookletPdf } from '../src/pdf.ts';
import { MODULES, blankModule, moduleForSize, readAssignments, validateModule } from '../src/modules.ts';
import {
  SMALL_MODULES, answerCharacters, isSmallModule, scrambleWord,
  shuffledChoices, shuffledWordList, verseInitials, wordLines,
} from '../src/smallModules.ts';

const fontFiles = async () => ({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});

const multiple = {
  type:'multiple-choice',
  question:'How did Jesus die?',
  correct:'On a cross', wrong1:'Old age', wrong2:'Disease',seed:2,
};
const odd = {type:'odd-words',correct:'BOAT\nWATER\nRAINBOW\nNOAH',incorrect:'HAT\nDAVID\nSAMSON',seed:7};
const checks = {type:'checkboxes',correct:'DAVID\nSTONE\nSLING',incorrect:'ARK\nRAINBOW\nBOAT',seed:9};
const first = {type:'first-letters',reference:'John 3:16',verse:'For God so loved the world that he gave his one and only Son'};
const who = {type:'who-am-i',clue:'I was thrown into the lions den because I prayed to God.',answer:'Daniel'};
const all = [
  multiple,
  {type:'true-false',statement:'Jesus rose from the dead.'},
  first, odd,
  {type:'unscramble-words',first:'NOAH',second:'ARK',seed:3},
  checks, who,
];

test('all eight small module IDs are offered, while existing module sizes are untouched', () => {
  assert.equal(SMALL_MODULES.length,7);
  assert.equal(moduleForSize('small').length,8);
  assert.deepEqual(moduleForSize('medium').map(x=>x.id),['match-words','finish-verse','unscramble-verse','circle-mistakes','true-false-maze','big-idea-cryptogram']);
  assert.deepEqual(moduleForSize('large').map(x=>x.id),['finish-story','story-order','sort-story','draw-story','word-search','verse-cryptogram']);
  for(const module of all){
    assert.ok(MODULES.some((x)=>x.id===module.type&&x.size==='small'));
    assert.equal(blankModule(module.type).type,module.type);
    assert.ok(isSmallModule(module));
    assert.deepEqual(validateModule(module),[],module.type);
  }
  assert.equal(moduleForSize('small').filter(x=>x.id==='draw-picture').length,1);
});

test('old and new draft assignments survive parsing and invalid entries are dropped',()=>{
  const loaded=readAssignments({
    '3:bottom-left-small':first,
    '3:bottom-right-small':odd,
    '1:cover-activity':{type:'finish-story',story:'[David] [trusted] [in] [God] [while] [fighting].',seed:1},
    '2:top-left-small':{type:'multiple-choice',question:'ok',correct:'a',wrong1:'b',wrong2:'c',seed:'oops'},
  });
  assert.equal(Object.keys(loaded).length,3);
  assert.equal(loaded['3:bottom-left-small'].type,'first-letters');
});

test('multiple choice choices are shuffled deterministically without losing correct answer',()=>{
  const list=shuffledChoices(multiple);
  assert.deepEqual([...list].sort(),['On a cross','Old age','Disease'].sort());
  assert.deepEqual(list,shuffledChoices(multiple));
  assert.notDeepEqual(list,['On a cross','Old age','Disease']);
  assert.ok(validateModule({...multiple,wrong1:'On a cross'}).length);
});
test('first letter challenge preserves uppercase initials and reference separately',()=>{
  assert.equal(verseInitials('For God so loved the world.'),'FGSLTW');
  assert.equal(verseInitials("Don't give up"),'DGU');
  assert.equal(verseInitials(first.verse).length,first.verse.split(' ').length);
  assert.ok(validateModule({...first,verse:'Hi there'}).length>0);
});

test('odd-word and checkbox banks retain known answers through stable shuffling',()=>{
  for(const activity of [odd,checks]){
    const shuffled=shuffledWordList(activity);
    assert.deepEqual(shuffled,shuffledWordList(activity));
    assert.equal(shuffled.filter(x=>x.belongs).length,wordLines(activity.correct).length);
    assert.equal(shuffled.filter(x=>!x.belongs).length,wordLines(activity.incorrect).length);
    assert.deepEqual(shuffled.map(x=>x.text).sort(),[...wordLines(activity.correct),...wordLines(activity.incorrect)].sort());
  }
  assert.ok(validateModule({...odd,incorrect:'HAT'}).length);
  assert.ok(validateModule({...checks,incorrect:'DAVID'}).length);
});

test('unscrambles never return the original word, including words with repeated letters',()=>{
  for(const word of ['NOAH','ARK','GOD','LETTER','JESUS','NOON','ABBA']){
    for(let seed=0;seed<20;seed++){
      const result=scrambleWord(word,seed);
      assert.notEqual(result,word,'failed to scramble '+word);
      assert.deepEqual([...result].sort(),[...word].sort());
      assert.equal(result,scrambleWord(word,seed));
    }
  }
  assert.ok(validateModule({type:'unscramble-words',first:'AAA',second:'ARK',seed:1}).length);
});

test('Who Am I generates letter-for-letter answer blanks',()=>{
  assert.deepEqual(answerCharacters('Mary Jane'),[...'MARY JANE']);
  assert.equal(answerCharacters(who.answer).length,6);
  assert.ok(validateModule({...who,answer:'A'.repeat(20)}).length);
});

test('all seven activities export into vector PDF without affecting imposition', async()=>{
  const draft={
    title:'David and Goliath',scripture:'1 Samuel 17',
    layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
    modules:{
      '2:top-left-small':all[0],
      '2:top-right-small':all[1],
      '3:bottom-left-small':all[2],
      '3:bottom-right-small':all[3],
      '4:bottom-left-small':all[4],
      '4:bottom-right-small':all[5],
    },
  };
  const bytes=await createBookletPdf(draft,await fontFiles());
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(x=>[x.getWidth(),x.getHeight()]),[[792,612],[792,612]]);

  const withWho={...draft,modules:{'2:top-left-small':all[6]}};
  const second=await createBookletPdf(withWho,await fontFiles());
  assert.equal((await PDFDocument.load(second)).getPageCount(),2);
});
test('wrong-size assignment is rejected rather than silently clipped',async()=>{
  const draft={
    title:'Test',scripture:'John 3:16',
    layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
    modules:{'2:top-medium':multiple},
  };
  await assert.rejects(async()=>createBookletPdf(draft,await fontFiles()),/wrong size area/);
});
