import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shuffledIndices} from '../src/shuffle.ts';
import {
 printedMultipleChoiceAnswer,shuffledChoices,
} from '../src/smallModules.ts';
import {planMultipleChoice} from '../src/smallParityLayout.ts';
import {
 OLD_TESTAMENT_BOOKS,NEW_TESTAMENT_BOOKS,bookFromReference,storyBook,
 storyTestament,storyReference,filterPublicStories,availableStoryBooks,
 groupPublicStories,
} from '../src/storyLibrary.ts';
import {formatVerseDashes} from '../src/versePunctuation.ts';
import {generateCryptogram} from '../src/cryptograms.ts';
import {planFinishVerse} from '../src/finishVerseLayout.ts';
import {planUnscrambleVerse,planUpsideDownVerse} from '../src/verseReconstructionLayout.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';

const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const approved=async name=>JSON.parse(await read('curriculum/approved/'+name+'.lesson.json'));
const ot31=await approved('ot-031-god-parts-the-red-sea');
const ot32=await approved('ot-032-god-provides-in-the-wilderness');
const makeStory=(n,book='Exodus')=>({
 lesson:{
  id:(['Matthew','Mark','Luke','John','Acts'].includes(book)?'nt-':'ot-')+
   String(n).padStart(3,'0')+'-sample',
  lessonDetails:{
   title:'Bible Story '+n,
   scriptureDisplay:book+' '+(n%38+1)+':'+(n%14+1),
   scripturePassages:[book+' '+(n%38+1)],
   memoryVerse:{reference:book+' '+(n%38+1)+':1',text:'Sample'},
  },
 },
 scriptureDistributionCleared:true,
 rightsEvidence:{status:'cleared'},
});
const allFilters={query:'',testament:'all',book:'all'};
const measure=(text,size)=>Array.from(text).length*size*.46;

test('Story catalog recognizes all 66 Bible books with Psalm and Song aliases',()=>{
 assert.equal(OLD_TESTAMENT_BOOKS.length,39);
 assert.equal(NEW_TESTAMENT_BOOKS.length,27);
 assert.equal(bookFromReference('Psalm 136:1a'),'Psalms');
 assert.equal(bookFromReference('Psalms 128:1'),'Psalms');
 assert.equal(bookFromReference('Song of Songs 2:1'),'Song of Solomon');
 assert.equal(bookFromReference('Song of Solomon 2:1'),'Song of Solomon');
 assert.equal(bookFromReference('1 Samuel 17:47'),'1 Samuel');
 assert.equal(bookFromReference('2 Chronicles 7'),'2 Chronicles');
 assert.equal(bookFromReference('3 John 1:4'),'3 John');
 assert.equal(bookFromReference('Some unrecognized passage'),null);
});

test('Story library scales to 123 records with responsive text, book and Testament filtering',()=>{
 const BOOKS=['Genesis','Exodus','1 Samuel','Psalms','Matthew','John','Acts'];
 const stories=Array.from({length:123},(_,i)=>makeStory(i+1,BOOKS[i%BOOKS.length]));
 assert.equal(filterPublicStories(stories,allFilters).length,123);
 const john=filterPublicStories(stories,{...allFilters,book:'John'});
 assert.ok(john.length>10);
 assert.ok(john.every(x=>storyBook(x)==='John'&&storyTestament(x)==='nt'));
 const nt=filterPublicStories(stories,{...allFilters,testament:'nt'});
 assert.ok(nt.length>30&&nt.every(x=>storyTestament(x)==='nt'));
 assert.ok(availableStoryBooks(stories,'ot').every(book=>OLD_TESTAMENT_BOOKS.includes(book)));
 assert.ok(availableStoryBooks(stories,'nt').every(book=>NEW_TESTAMENT_BOOKS.includes(book)));
 const one=filterPublicStories(stories,{...allFilters,query:'story 101'});
 assert.equal(one.length,1);
 assert.equal(one[0].lesson.lessonDetails.title,'Bible Story 101');
 assert.ok(filterPublicStories(stories,{...allFilters,query:'acts 8'}).length>0);
 assert.equal(filterPublicStories(stories,{...allFilters,query:'does-not-exist'}).length,0);
 assert.equal(stories[100].lesson.lessonDetails.title,'Bible Story 101',
  'Search/filter do not reorder or alter source catalog');
});

test('Bible book groups use canonical order and keep lesson source ordering within a book',()=>{
 const stories=[
  makeStory(4,'John'),makeStory(3,'Exodus'),makeStory(1,'Genesis'),
  makeStory(2,'Exodus'),makeStory(9,'Psalms'),
 ];
 const groups=groupPublicStories(stories);
 assert.deepEqual(groups.map(g=>g.book),['Genesis','Exodus','Psalms','John']);
 assert.deepEqual(groups.find(g=>g.book==='Exodus').stories.map(e=>e.lesson.id),
  [stories[1].lesson.id,stories[3].lesson.id]);
 assert.equal(storyReference(stories[0]),stories[0].lesson.lessonDetails.scriptureDisplay);
 const alternate=makeStory(50,'Genesis');
 alternate.lesson.lessonDetails.scriptureDisplay='';
 assert.equal(storyBook(alternate),'Genesis',
  'Use an original passage if the main Scripture display is empty');
});

test('Searchable compact picker is shared by Welcome and Change Story',async()=>{
 const [component,welcome,app,css]=await Promise.all([
  read('src/StoryPicker.tsx'),read('src/WelcomeScreen.tsx'),
  read('src/App.tsx'),read('src/layout.css'),
 ]);
 assert.match(welcome,/<StoryPicker stories=\{stories\}/u);
 assert.match(app,/<StoryPicker stories=\{PUBLIC_LESSONS.filter\(approvedForPublic\)\}/u);
 assert.match(component,/type="search"/u);
 assert.match(component,/Old Testament/u);
 assert.match(component,/New Testament/u);
 assert.match(component,/Bible book/u);
 assert.match(component,/groupPublicStories\(filtered\)/u);
 assert.match(component,/role="status" aria-live="polite"/u);
 assert.match(component,/No matching Bible stories/u);
 assert.match(component,/Clear filters/u);
 assert.match(css,/\.story-picker-switch \.story-picker-results/u);
 assert.match(css,/\.story-picker-row/u);
 assert.match(css,/max-height:490px/u);
 assert.match(app,/currentId=\{draft.curriculumLessonId\}/u);
});

test('Multiple Choice removes final periods only at display time',()=>{
 const cases=[
  ['Moses.','Moses'],
  ['God provided manna...','God provided manna'],
  ['  Jesus.  ','Jesus'],
  ['“God provided.”','“God provided”'],
  ["'The Red Sea.'","'The Red Sea'"],
  ['What happened?','What happened?'],
  ['They rejoiced!','They rejoiced!'],
  ['Dr. Luke wrote it.','Dr. Luke wrote it'],
  ['3.14','3.14'],
  ['Wait. Really?','Wait. Really?'],
 ];
 for(const [source,printed] of cases)
  assert.equal(printedMultipleChoiceAnswer(source),printed,source);
});

test('Shuffled choices retain old deterministic order, correctness and canonical values',()=>{
 const module={
  type:'multiple-choice',question:'Who received food?',
  correct:'Moses.',wrong1:'David!',wrong2:'Aaron?',seed:103,
 };
 const original=JSON.stringify(module);
 const originals=[module.correct,module.wrong1,module.wrong2];
 const order=shuffledIndices(3,originals.join('\n'),module.seed);
 const displayed=shuffledChoices(module);
 assert.deepEqual(displayed,order.map(index=>printedMultipleChoiceAnswer(originals[index])));
 assert.deepEqual([...displayed].sort(),['Aaron?','David!','Moses']);
 assert.equal(JSON.stringify(module),original);
 const fit=planMultipleChoice(module,measure,(_text,size)=>size*.35);
 assert.ok(fit,'Print layout can still fit after stripping final period');
 assert.deepEqual(fit.rows.flatMap(row=>row.lines.map(line=>line.text)).sort(),
  [...displayed].sort(),'Preview and PDF plan use the same print-only choices');
 assert.equal(fit.questionLines.map(line=>line.text).join(' '),'Who received food?');
});

test('Em dashes receive exactly one missing space on either side without rewriting source',()=>{
 const text='Blessed are all who fear the LORD—who walk in His ways!';
 const before=text;
 const formatted='Blessed are all who fear the LORD — who walk in His ways!';
 assert.equal(formatVerseDashes(text),formatted);
 assert.equal(formatVerseDashes('LORD — who'),'LORD — who');
 assert.equal(formatVerseDashes('LORD— who'),'LORD — who');
 assert.equal(formatVerseDashes('LORD —who'),'LORD — who');
 assert.equal(formatVerseDashes('[LORD]—[who]'),'[LORD] — [who]');
 assert.equal(formatVerseDashes('LORD\n—who'),'LORD\n— who');
 assert.equal(formatVerseDashes('no em dash here'),'no em dash here');
 assert.equal(formatVerseDashes(formatVerseDashes(text)),formatted);
 assert.equal(text,before);
});

test('Verse Cryptogram formats the printed verse but preserves original validator limits',()=>{
 const module={
  type:'verse-cryptogram',reference:'Psalm 128:1',
  verse:'Blessed are all who fear the LORD—who walk in His ways!',seed:2,
 };
 const source=JSON.stringify(module);
 const cipher=generateCryptogram(module);
 assert.equal(cipher.text,formatVerseDashes(module.verse));
 assert.ok(cipher.key.length>=3);
 assert.equal(cipher.mapping.L,cipher.mapping.L);
 assert.equal(JSON.stringify(module),source);
 const idea={
  type:'big-idea-cryptogram',idea:'God—our great provider',seed:2,
 };
 assert.equal(generateCryptogram(idea).text,'God—our great provider',
  'Solve the Code is not a verse and retains its authored wording');
});

test('Verse reconstruction and Finish the Verse plan the formatted words without source changes',()=>{
 const finish={
  type:'finish-verse',reference:'Psalm 128:1',
  verse:'Blessed are [those]—who [walk] in His ways.',seed:1,
 };
 const source=JSON.stringify(finish);
 const metrics={title:measure,body:measure,bank:measure,puzzle:measure};
 const fitted=planFinishVerse(finish,metrics);
 assert.ok(fitted);
 assert.ok(fitted.words.some(word=>word.text==='—'));
 assert.ok(fitted.words.some(word=>word.kind==='blank'&&word.text==='walk'));
 assert.equal(JSON.stringify(finish),source);
 const unscramble={
  type:'unscramble-verse',reference:'Psalm 128:1',
  verse:'[Blessed] are all [who] fear the [LORD]—who [walk] in His ways.',seed:1,
 };
 const uns=planUnscrambleVerse(unscramble,metrics);
 assert.ok(uns,'Shared reconstruction planner fits a dash-separated verse');
 const upside={
  type:'upside-down-verse',reference:'Psalm 128:1',
  verse:'Blessed are all who fear the LORD—who walk in His ways.',
 };
 const up=planUpsideDownVerse(upside,metrics);
 assert.ok(up,'Upside Down verse still fits after display-only punctuation spacing');
 assert.equal(upside.verse,'Blessed are all who fear the LORD—who walk in His ways.');
});

test('All verse-specific renderer paths share print formatter, while canonical BSB comparison stays exact',async()=>{
 const names=[
  'src/finishVerseLayout.ts','src/verseReconstructionLayout.ts',
  'src/connectVerseLayout.ts','src/specialtyPdf.ts',
  'src/SpecialtyPreview.tsx','src/cryptograms.ts',
 ];
 for(const path of names)
  assert.match(await read(path),/formatVerseDashes/u,path);
 const converter=await read('src/lessonActivityConverter.ts');
 assert.match(converter,/entry.reference!==memory.reference/u);
 assert.match(converter,/entry.verse:entry.sourceVerse/u);
 assert.doesNotMatch(converter,/formatVerseDashes/u,
  'Approved BSB source and converter consistency checks must stay unchanged');
});

test('Approved OT31/OT32 curriculum and all three preset builders remain unchanged',()=>{
 for(const source of [ot31,ot32]){
  const before=JSON.stringify(source);
  assert.deepEqual(buildReviewPreflight(source).issues,[]);
  for(const preset of ['preset-1','preset-2','preset-3']){
   const {openSlots}=buildWorksheetRecipe(source,preset,{purpose:'published',seed:1});
   assert.deepEqual(openSlots,[],source.id+' '+preset);
  }
  assert.equal(JSON.stringify(source),before,
   'No text or source validation may modify approved curricula');
 }
});
