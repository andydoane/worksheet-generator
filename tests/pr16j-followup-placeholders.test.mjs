import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MODULES,blankModule,validateModule} from '../src/modules.ts';
import {MODULE_GUIDANCE,samplePlaceholder,isAutofilledModule,newModuleWithExample} from '../src/moduleGuidance.ts';
import {sortStoryEditorGroups} from '../src/storyVerseModules.ts';
import {migrateDraftValue} from '../src/draftMigration.ts';
import {loadSortStorySymbolPng,sortStorySymbolUrl} from '../src/sortStorySymbols.ts';

test('All manual examples are placeholders, never saved input or ready-to-print data',()=>{
 let examples=0;
 for(const {id} of MODULES){
  const sample=MODULE_GUIDANCE[id].sample;
  const blank=blankModule(id);
  assert.equal(blank.type,id);
  if(!sample){
   assert.equal(isAutofilledModule(id),true);
   assert.equal(samplePlaceholder(id,'verse'),'');
   assert.equal(samplePlaceholder(id,'idea'),'');
   continue;
  }
  examples++;
  assert.equal(isAutofilledModule(id),false);
  const values=sample;
  for(const [field,value] of Object.entries(values)){
   if(field==='type'||typeof value!=='string')continue;
   assert.ok(value.length>0,'empty sample field: '+id+' '+field);
   assert.equal(samplePlaceholder(id,field),value,'sample copy changed: '+id+' '+field);
   assert.equal(blank[field],'',
    'sample should not fill real field: '+id+' '+field);
  }
  assert.ok(validateModule(blank).length>0,'blank input must not count as complete: '+id);
  assert.deepEqual(validateModule(newModuleWithExample(id)),[],
   'placeholder content should be a genuinely useful example: '+id);
 }
 assert.equal(examples,17);
});
test('Story Order displays five chronological Red Sea events without saving or printing them',()=>{
 const sample=samplePlaceholder('story-order','events');
 assert.equal(sample.split('\n').length,5);
 assert.match(sample,/pillar of cloud/u);
 assert.match(sample,/Pharaoh sent his soldiers/u);
 const blank=blankModule('story-order');
 assert.equal(blank.events,'');
 assert.ok(validateModule(blank).length);
 const stored=migrateDraftValue({modules:{'2:top-large':blank}});
 assert.equal(stored.modules['2:top-large'].events,'');
 assert.equal(JSON.stringify(stored).includes('pillar of cloud'),false);
});
test('Sort Story shows true/false placeholders independently, not stored statements',()=>{
 const example=samplePlaceholder('sort-story','statements');
 const groups=sortStoryEditorGroups(example);
 assert.equal(groups.trueStatements.split('\n').length,3);
 assert.equal(groups.falseStatements.split('\n').length,3);
 assert.ok(groups.trueStatements.includes('God guided'));
 assert.ok(groups.falseStatements.includes('Pharaoh'));
 assert.equal(blankModule('sort-story').statements,'');
});
test('Theme verse and big idea autofill remains in the app and never uses gray sample replacements',async()=>{
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 for(const id of ['first-letters','finish-verse','unscramble-verse','spiral-verse',
  'upside-down-verse','connect-verse','verse-cryptogram','connect-big-idea','big-idea-cryptogram']){
  assert.equal(MODULE_GUIDANCE[id].sample,undefined);
  assert.equal(isAutofilledModule(id),true);
 }
 assert.match(app,/previous\.verseReference/u);
 assert.match(app,/previous\.verseText/u);
 assert.match(app,/previous\.bigIdea/u);
 assert.match(app,/else if \(type\) modules\[activeKey\] = blankModule\(type\)/u);
 assert.doesNotMatch(app,/modules\[activeKey\] = newModuleWithExample\(type\)/u);
 assert.match(app,/only your text is saved or printed/u);
});
test('All manual editor input fields use centralized example placeholders in the UI',async()=>{
 const paths=['App.tsx','SmallModuleEditor.tsx','StoryVerseEditor.tsx',
  'PuzzleEditor.tsx','SpecialtyEditor.tsx'];
 const texts=await Promise.all(paths.map(name=>
  readFile(new URL('../src/'+name,import.meta.url),'utf8')));
 for(let i=0;i<paths.length;i++)assert.match(texts[i],/samplePlaceholder\(/u,paths[i]);
 const app=texts[0],small=texts[1],story=texts[2],puzzles=texts[3],special=texts[4];
 for(const type of ['draw-picture','match-words','finish-story'])assert.match(app,
  new RegExp("samplePlaceholder\\('"+type+"'"),type);
 for(const field of ['question','correct','wrong1','wrong2','statement','incorrect',
  'first','second','clue','answer'])assert.match(small,
  new RegExp("samplePlaceholder\\(module.type,'"+field+"'\\)"),field);
 for(const type of ['sort-story','story-order','draw-story','circle-mistakes'])assert.match(story,
  new RegExp("samplePlaceholder\\('"+type+"'"),type);
 assert.match(puzzles,/samplePlaceholder\(module.type,'words'\)/u);
 assert.match(puzzles,/samplePlaceholder\('true-false-maze','statement'\)/u);
 assert.match(special,/samplePlaceholder\('crossword','entries'\)/u);
 assert.match(story,/sortStoryEditorGroups\(samplePlaceholder\('sort-story','statements'\)\)\.trueStatements/u);
 assert.match(story,/sortStoryEditorGroups\(samplePlaceholder\('sort-story','statements'\)\)\.falseStatements/u);
 const css=await readFile(new URL('../src/layout.css',import.meta.url),'utf8');
 assert.match(css,/\.activity-editor \.activity-inputs textarea::placeholder/u);
 assert.match(css,/color: #88938f/u);
});
test('Existing saved user content, including former seeded sample text, remains untouched',()=>{
 const older=newModuleWithExample('story-order');
 const changed={...older,events:'My own first event.\nMy own second event.',seed:9};
 const saved=migrateDraftValue({title:'Current Draft',modules:{
  '2:top-large':changed,'3:top-large':older,
  '4:top-large':newModuleWithExample('sort-story'),
 }});
 assert.deepEqual(saved.modules['2:top-large'],changed);
 assert.deepEqual(saved.modules['3:top-large'],older);
 assert.equal(saved.modules['4:top-large'].statements,
  samplePlaceholder('sort-story','statements'));
});
test('The uploaded replacement symbol is accepted regardless of square resolution',async()=>{
 let firstWidth=null;
 let differentSizes=false;
 for(let id=1;id<=30;id++){
  const bytes=await loadSortStorySymbolPng(id);
  assert.deepEqual(Array.from(bytes.slice(0,8)),[137,80,78,71,13,10,26,10]);
  const data=new DataView(bytes.buffer,bytes.byteOffset+16,8);
  const width=data.getUint32(0),height=data.getUint32(4);
  assert.equal(width,height,'symbol '+id+' must be square');
  assert.ok(width>=120,'symbol '+id+' needs 120px or greater');
  if(firstWidth!==null&&width!==firstWidth)differentSizes=true;
  if(firstWidth===null)firstWidth=width;
  assert.match(sortStorySymbolUrl(id),/symbol__\d{2}\.png/u);
 }
 assert.ok(differentSizes,'mixed-size symbol replacements should remain covered by this test');
});
