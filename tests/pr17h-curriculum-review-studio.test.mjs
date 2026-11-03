import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseBsbText,getBsbPassage,wordSpans,clipToWords,markSelectedWords,suggestBlankWords} from '../src/review/bsb.ts';
import {listReviewTasks,editAt,applyBsbVerse,checkReviewContent,createApprovedLesson,originalMemoryVerseTranslation,updatedRightsManifest} from '../src/review/model.ts';

const raw=await readFile(new URL('../curriculum/review/ot-031-god-parts-the-red-sea.json',import.meta.url),'utf8');
const original=JSON.parse(raw);
const bsbVerse='Who among the gods is like You, O LORD? Who is like You—majestic in holiness, revered with praises, performing wonders?';
const bible=parseBsbText('Exodus 15:11\t'+bsbVerse+'\nExodus 15:12\tYou stretched out Your right hand, and the earth swallowed them up.\n',false);

test('BSB parser keeps authoritative verse boundaries, punctuation, and partial/multi-verse spans',()=>{
 const single=getBsbPassage(bible,'Exodus 15:11');
 assert.equal(single.text,bsbVerse);
 assert.deepEqual(single.citations,['Exodus 15:11']);
 const both=getBsbPassage(bible,'Exodus 15:11-12');
 assert.equal(both.citations.length,2);
 assert.match(both.text,/wonders\? You stretched out/u);
 const words=wordSpans(both.text);
 assert.equal(clipToWords(both.text,0,wordSpans(bsbVerse).length-1),bsbVerse);
 assert.equal(clipToWords(both.text,wordSpans(bsbVerse).length-3,words.length-1).endsWith('up.'),true);
 assert.throws(()=>getBsbPassage(bible,'Exodus 15:11-14'),/Verse not found/u);
 assert.throws(()=>parseBsbText('Not scripture',false),/No Bible verses/u);
});

test('Review tasks focus on generated and adapted content instead of reapproving source notes',()=>{
 const tasks=listReviewTasks(original);
 assert.equal(tasks.filter(x=>x.group==='Multiple Choice').length,8);
 assert.equal(tasks.filter(x=>x.group==='False facts and sorting').length,11);
 for(const id of ['finish-story','circle-mistakes','bsb-verse','sensitivity','important-idea','checkboxes','odd-words'])
  assert.ok(tasks.some(x=>x.id===id),id);
 assert.equal(tasks.some(x=>x.id==='sn-01'),false);
});

test('Edits retain originals and propagate linked fact and correct-answer changes',()=>{
 const mc=editAt(original,['preparedActivities','multipleChoice',0,'choices',0,'text'],'Beside the Red Sea');
 assert.equal(mc.preparedActivities.multipleChoice[0].correctAnswer,'Beside the Red Sea');
 assert.equal(original.preparedActivities.multipleChoice[0].correctAnswer,'The Red Sea');
 const sortFalse=original.preparedActivities.sortStory.find(x=>x.isTrue===false);
 assert.ok(sortFalse);
 const index=original.facts.findIndex(x=>x.id===sortFalse.factId);
 assert.ok(index>=0);
 const changed=editAt(original,['facts',index,'statement'],'God did not split the sea.');
 assert.equal(changed.preparedActivities.sortStory.find(x=>x.factId===sortFalse.factId).statement,'God did not split the sea.');
 assert.equal(original.facts[index].statement!==changed.facts[index].statement,true);
});

test('BSB approval updates all dependent verses, exact bracket reconstructions, and remains review-only',()=>{
 const before=JSON.stringify(original);
 const p=getBsbPassage(bible,'Exodus 15:11');
 const n=wordSpans(p.text).length;
 const blanks=suggestBlankWords(p.text,5);
 assert.equal(blanks.length,5);
 const marked=markSelectedWords(p.text,blanks);
 assert.equal(marked.replace(/\[([^\[\]]+)\]/gu,'$1'),p.text);
 const output=applyBsbVerse(original,p,0,n-1,blanks,blanks);
 assert.equal(output.lessonDetails.memoryVerse.translation,'BSB');
 assert.equal(output.lessonDetails.memoryVerse.text,p.text);
 for(const key of ['firstLetters','upsideDownVerse','verseCryptogram','spiralVerse','connectVerse'])
  assert.equal(output.preparedActivities[key].verse,p.text,key);
 for(const key of ['finishVerse','unscrambleVerse']){
  assert.equal(output.preparedActivities[key].sourceVerse,p.text,key);
  assert.equal(output.preparedActivities[key].markedVerse.replace(/\[([^\[\]]+)\]/gu,'$1'),p.text,key);
 }
 assert.equal(JSON.stringify(output).includes(original.lessonDetails.memoryVerse.text),false,
  'Do not accidentally export original ESV text in published verse records');
 assert.equal(output.publication.approved,false);
 assert.equal(JSON.stringify(original),before);
 const problems=checkReviewContent(output);
 assert.deepEqual(problems,[],problems.join('\n'));
});

test('Human signoff and independent public-domain evidence remain separate',()=>{
 const p=getBsbPassage(bible,'Exodus 15:11'),words=wordSpans(p.text).length;
 const blanks=suggestBlankWords(p.text);
 const work=applyBsbVerse(original,p,0,words-1,blanks,blanks);
 assert.throws(()=>createApprovedLesson(work,'','2026-11-03'),/reviewer/u);
 const approved=createApprovedLesson(work,'Curriculum Author','2026-11-03');
 assert.equal(approved.publication.status,'approved');
 assert.equal(approved.publication.approved,true);
 assert.deepEqual(approved.publication.resolvedReviewFlagIds,['rf-01','rf-02','rf-03','rf-04','rf-05','rf-10']);
 assert.equal(work.publication.approved,false);
 const rights=updatedRightsManifest({schemaVersion:1,lessons:{'other-approved':{status:'cleared'}}},
  work.id,'Curriculum Author','2026-11-03');
 assert.equal(rights.lessons['other-approved'].status,'cleared');
 assert.equal(rights.lessons[work.id].status,'cleared');
 assert.match(rights.lessons[work.id].basis,/berean\.bible\/terms/u);
});

test('Review studio is isolated from the normal public app and only includes approved lesson data',async()=>{
 const [config,html,catalog,workflow]=await Promise.all([
  readFile(new URL('../vite.config.ts',import.meta.url),'utf8'),
  readFile(new URL('../review.html',import.meta.url),'utf8'),
  readFile(new URL('../src/publishedLessonCatalog.ts',import.meta.url),'utf8'),
  readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8'),
 ]);
 assert.match(config,/review\.html/u);
 assert.match(html,/noindex,nofollow/u);
 assert.match(workflow,/npm run prepare:bsb/u);
 assert.match(catalog,/curriculum\/approved/u);
 assert.doesNotMatch(catalog,/import\.meta\.glob\([^\n]*curriculum\/review/u);
});

test('Original curriculum ESV label stays accurate after BSB conversion and old exports',()=>{
 assert.equal(originalMemoryVerseTranslation(original),'ESV');
 const passage=getBsbPassage(bible,'Exodus 15:11');
 const blanks=suggestBlankWords(passage.text);
 const converted=applyBsbVerse(original,passage,0,wordSpans(passage.text).length-1,blanks,blanks);
 assert.equal(converted.lessonDetails.memoryVerse.translation,'BSB');
 assert.equal(converted.lessonDetails.memoryVerse.originalTranslation,'ESV');
 assert.equal(originalMemoryVerseTranslation(converted),'ESV');
 const oldWorkBenchExport=structuredClone(converted);
 delete oldWorkBenchExport.lessonDetails.memoryVerse.originalTranslation;
 assert.equal(originalMemoryVerseTranslation(oldWorkBenchExport),'ESV',
  'Older exported Red Sea lessons already use BSB but originated from ESV');
 assert.equal(originalMemoryVerseTranslation({id:'different-lesson',lessonDetails:{
  memoryVerse:{translation:'BSB',bsbSource:{reference:'John 3:16'}}}}),'not recorded',
  'Do not invent an unknown source translation');
});

test('Review page preserves raw multiline drafts for Odd Words and Checkboxes',async()=>{
 const page=await readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8');
 assert.match(page,/value=\{wordBankDrafts\.oddWords\}/u);
 assert.match(page,/value=\{wordBankDrafts\.checkboxes\}/u);
 assert.match(page,/setWordBankDrafts\(previous=>\(\{\.\.\.previous,\[key\]:value\}\)\)/u);
 assert.match(page,/value\.split\(\/\\r\?\\n\/u\)\.map\(x=>x\.trim\(\)\)\.filter\(Boolean\)/u);
 assert.match(page,/Original curriculum uses \{originalMemoryVerseTranslation\(lesson\)\}/u);
});
