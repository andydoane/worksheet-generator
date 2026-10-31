import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {MODULES,blankModule,isActivityModule,matchRows,moduleForSize,readAssignments,validateModule} from '../src/modules.ts';
import {derangedIndices} from '../src/shuffle.ts';
import {
  STORY_VERSE_MODULES,boxGrid,linesFromInput,mistakesTitle,orderedStoryEvents,
  parseStatements,parseVerse,sortedStoryBank,verseBank,verseScrambles,
} from '../src/storyVerseModules.ts';

const fonts=async()=>({
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
});

const order={type:'story-order',events:[
  'The king made a new law.',
  'Daniel continued praying.',
  'The guards arrested Daniel.',
  'Daniel was taken to the lions.',
  'God sent an angel to protect Daniel.',
].join('\n'),seed:2};
const sorted={type:'sort-story',statements:[
  'Daniel prayed to God. true',
  'Daniel stopped praying. false',
  'The king made a law. true',
  'An angel opened the lions mouths. false',
  'Daniel trusted God. true',
].join('\n'),seed:3};
const drawing={type:'draw-story',prompts:[
  'The king makes a law.',
  'Daniel prays to God.',
  'Daniel is taken to the lions.',
  'God sends his angel.',
  'The lions do not hurt Daniel.',
].join('\n')};
const marked='For [God] so [loved] the [world] that he [gave] his one and only [Son].';
const finish={type:'finish-verse',reference:'John 3:16',verse:marked,seed:4};
const unscramble={type:'unscramble-verse',reference:'John 3:16',verse:marked,seed:5};
const mistakes={type:'circle-mistakes',count:3,text:'Daniel lived in Egypt. He prayed to idols. The lions swallowed Daniel, but the king was glad.'};
const all=[order,sorted,drawing,finish,unscramble,mistakes];

test('six story and verse modules are size-filtered and survive draft loading',()=>{
  assert.equal(STORY_VERSE_MODULES.length,6);
  assert.equal(moduleForSize('large').length,9);
  assert.equal(moduleForSize('medium').length,9);
  assert.equal(moduleForSize('small').length,8);
  const slots={};
  all.forEach((m,i)=>{
    assert.ok(MODULES.some(d=>d.id===m.type));
    assert.equal(blankModule(m.type).type,m.type);
    assert.ok(isActivityModule(m));
    assert.deepEqual(validateModule(m),[],m.type);
    slots['2:slot-'+i]=m;
  });
  assert.equal(Object.keys(readAssignments(slots)).length,6);
});

test('Story Order reproducibly shuffles chronology without dropping events',()=>{
  const entries=linesFromInput(order.events);
  const actual=orderedStoryEvents(order);
  assert.deepEqual(actual,orderedStoryEvents(order));
  assert.deepEqual([...actual].sort(),[...entries].sort());
  assert.notDeepEqual(actual,entries);
  assert.ok(validateModule({...order,events:entries.slice(0,3).join('\n')}).length>0);
});
test('Sort the Story preserves truth values and letters belong to shuffled rows',()=>{
  const items=parseStatements(sorted.statements);
  assert.equal(items.filter(x=>x.truth).length,3);
  const shuffled=sortedStoryBank(sorted);
  assert.deepEqual(shuffled,sortedStoryBank(sorted));
  assert.deepEqual([...shuffled].sort((a,b)=>a.text.localeCompare(b.text)),
    [...items].sort((a,b)=>a.text.localeCompare(b.text)));
  assert.ok(validateModule({...sorted,statements:'This was true.\nThe other was false.'}).length);
});
test('Draw the Story switches 2×2 and 3×2 grid at five entries',()=>{
  assert.equal(boxGrid({type:'draw-story',prompts:'One\nTwo\nThree\nFour'}).cols,2);
  assert.equal(boxGrid(drawing).cols,3);
  assert.ok(validateModule({...drawing,prompts:'One\nTwo'}).length);
});
test('bracketed words become PDF answer boxes or scrambled words, never plain text',()=>{
  const parsed=parseVerse(marked);
  assert.deepEqual(parsed.answers,['God','loved','world','gave','Son']);
  assert.equal(parsed.malformed,false);
  assert.deepEqual([...verseBank(finish)].sort(),[...parsed.answers].sort());
  assert.deepEqual(verseScrambles(unscramble),verseScrambles(unscramble));
  verseScrambles(unscramble).forEach((x,i)=>assert.notEqual(x,parsed.answers[i].toUpperCase()));
  assert.ok(validateModule({...finish,verse:'For [God] so loved world'}).length>0);
  assert.ok(validateModule({...unscramble,verse:'For [God] so [loved] [world] [gave] [bad] [extra] [seven] [eight] [nine]'}).length>0);
  assert.equal(parseVerse('For [God] [bad').malformed,true);
});
test('Circle the Mistakes renders a number-based title and validates count',()=>{
  assert.equal(mistakesTitle(3),'CIRCLE ALL THREE MISTAKES!');
  assert.ok(validateModule({...mistakes,count:0}).length);
  assert.ok(validateModule({...mistakes,text:''}).length);
});
test('Match the Words now uses derangements: no answer remains on its original row',()=>{
  for(let n=3;n<=6;n++){
    for(let seed=0;seed<40;seed++){
      const indices=derangedIndices(n,'DAVID, GOLIATH, SAUL, JESUS',seed);
      assert.deepEqual([...indices].sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i));
      assert.ok(indices.every((x,i)=>x!==i),'fixed point for '+n+','+seed);
    }
  }
  const module={type:'match-words',pairs:'Paul, Pharisee\nPeter, Fisherman\nJesus, Savior',seed:12};
  const rows=matchRows(module);
  assert.ok(rows.every((r,i)=>r.right!==['Pharisee','Fisherman','Savior'][i]));
});
test('all six activities render into a two-page landscape vector PDF',async()=>{
  const draft={
    title:'Daniel in the Lions Den',scripture:'Daniel 6',
    layouts:{2:'medium-large',3:'medium-medium-small-small',4:'large-medium'},
    modules:{
      '1:cover-activity':order,
      '2:top-medium':finish,
      '2:bottom-large':sorted,
      '3:top-medium':unscramble,
      '3:middle-medium':mistakes,
      '4:top-large':drawing,
      '4:bottom-medium':{type:'match-words',pairs:'Daniel, Prophet\nDarius, King\nLions, Den',seed:4},
    },
  };
  const bytes=await createBookletPdf(draft,await fonts());
  const pdf=await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.deepEqual(pdf.getPages().map(x=>[x.getWidth(),x.getHeight()]),[[792,612],[792,612]]);
});
test('bad category sizes and invalid verse input cause useful PDF export errors',async()=>{
  const draft={
    title:'Test',scripture:'John 3:16',
    layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
    modules:{'2:top-medium':order},
  };
  await assert.rejects(async()=>createBookletPdf(draft,await fonts()),/wrong size area/);
  await assert.rejects(async()=>createBookletPdf({...draft,modules:{'2:top-medium':{...unscramble,verse:'No [brackets]'}}},await fonts()),/4–8/);
});
