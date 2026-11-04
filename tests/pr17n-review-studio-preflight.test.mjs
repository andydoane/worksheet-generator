import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 checkReviewContent,chooseSolveCodePhrase,
 listReviewTasks,solveCodeChoices,
} from '../src/review/model.ts';
import {buildReviewPreflight,PREPARED_ACTIVITY_KEYS,reviewIssueTarget} from '../src/review/preflight.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {validateModule} from '../src/modules.ts';
import {cryptogramLetters} from '../src/cryptograms.ts';

const approved=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json',import.meta.url),
 'utf8'));

const emphasized=['FOOD','BREAD','QUAIL','SAVE','REST','ROCK','STAFF'];
const ot32MarkedStory=
 'After leaving Egypt, the Israelites complained that there was no [FOOD] in the desert. '+
 'God promised Moses [BREAD] from heaven. That night, [QUAIL] came, and white flakes '+
 'called [MANNA] appeared. Moses told the people not to [SAVE] it. God gave twice as '+
 'much manna on day six so they could [REST]. Moses struck a [ROCK], and God gave them '+
 'water. Moses raised his [STAFF] in battle.';

function scenario(){
 const lesson=structuredClone(approved);
 // OT32-derived regression scenario: keep the unapproved second-lesson JSON
 // out of this public repository; model only its three failing conditions.
 for(const [i,note] of lesson.storyNotes.entries())
  note.emphasizedWords=i<emphasized.length?[emphasized[i]]:[];
 lesson.preparedActivities.finishStory.markedParagraph=ot32MarkedStory;
 lesson.lessonDetails.bigIdeas[0].text=
  'Before you complain, remember what God has done for you.';
 lesson.preparedActivities.bigIdeaCryptogram.phrase=lesson.lessonDetails.bigIdeas[0].text;
 lesson.preparedActivities.connectBigIdea.phrase=lesson.lessonDetails.bigIdeas[0].text;
 lesson.keyPhrases.push({
  id:'kp-ot32-review',text:'Remember God’s help before you complain.',
  origin:'adapted',sourceIds:['sn-01','sn-06'],
 });
 return lesson;
}

test('Finish the Story accepts teacher-authored blanks unrelated to original emphasized Story Note words',()=>{
 const source=scenario();
 const before=JSON.stringify(source);
 assert.deepEqual(checkReviewContent(source).filter(x=>x.includes('Finish the Story')),[]);
 const authored=structuredClone(source);
 authored.preparedActivities.finishStory.markedParagraph=
  'God [LED] his people through the [DESERT]. The people [COMPLAINED] and '+
  'asked for [FOOD]. God gave them [MANNA] and [WATER]. They learned to [TRUST] him.';
 assert.deepEqual(validateModule({
  type:'finish-story',story:authored.preparedActivities.finishStory.markedParagraph,seed:1,
 }),[]);
 assert.deepEqual(checkReviewContent(authored).filter(x=>
  x.includes('Finish the Story')||x.startsWith('finish-story:')),[],
  'New approved wording does not need to reproduce source emphasis or order');
 const extra=structuredClone(authored);
 extra.preparedActivities.finishStory.markedParagraph+=' [ONE] [TWO] [THREE] [FOUR] [FIVE].';
 assert.equal([...extra.preparedActivities.finishStory.markedParagraph.matchAll(/\\[([^\\[\\]]+)\\]/gu)].length,12);
 assert.deepEqual(validateModule({type:'finish-story',
  story:extra.preparedActivities.finishStory.markedParagraph,seed:1}),[]);
 const thirteen=structuredClone(extra);
 thirteen.preparedActivities.finishStory.markedParagraph+=' [TODAY].';
 assert.ok(checkReviewContent(thirteen).some(x=>x.includes('6–12')),
  'Printable generator maximum remains enforced');
 assert.equal(JSON.stringify(source),before,'Validation never rewrites canonical sources');
});

test('No original emphasized words are needed, but malformed/oversized blanks still fail',()=>{
 const lesson=scenario();
 const missing=structuredClone(lesson);
 missing.preparedActivities.finishStory.markedParagraph=
  'We [SAW] [GOOD] [HELP] [FROM] [OUR] [GOD].';
 assert.deepEqual(checkReviewContent(missing).filter(x=>x.startsWith('finish-story:')),[]);
 const invalid=structuredClone(lesson);
 invalid.preparedActivities.finishStory.markedParagraph='[ONLY] [FIVE] [BLANKS] [IN] [THIS].';
 assert.ok(checkReviewContent(invalid).some(x=>x.includes('6–12')));
 const tooLong=structuredClone(lesson);
 tooLong.preparedActivities.finishStory.markedParagraph=
  'We saw '+('many '.repeat(230))+'[GOD] [GAVE] [THEM] [FOOD] [AND] [WATER].';
 assert.ok(checkReviewContent(tooLong).some(x=>x.includes('1,100')));
});

test('OT32-sized important idea is a single actionable cryptogram issue, not two duplicate failures',()=>{
 const lesson=scenario();
 assert.equal(cryptogramLetters(lesson.lessonDetails.bigIdeas[0].text).length,20);
 assert.equal(cryptogramLetters('Remember God’s help before you complain.').length,18);
 const report=buildReviewPreflight(lesson);
 assert.equal(report.convertedCount,26);
 assert.equal(report.totalCount,27);
 assert.equal(report.issues.length,1,report.issues.map(x=>x.message).join('\n'));
 assert.equal(report.issues[0].taskId,'solve-code');
 assert.equal(report.issues[0].fieldId,'review-field-solve-code');
 assert.match(report.issues[0].message,/maximum 18/u);
 assert.equal(report.issues.some(x=>x.message.includes('Only 26/27')),false,
  'Coverage is summary data, not a duplicate clickable error');
 const converted=convertLessonActivities(lesson);
 assert.ok(!converted.candidates.some(x=>x.moduleId==='big-idea-cryptogram'));
 assert.ok(listReviewTasks(lesson).some(x=>x.id==='solve-code'));
});

test('A source-linked 18-letter phrase makes all 27 modules convert, preserving the canonical Idea and other puzzle',()=>{
 const lesson=scenario(),before=JSON.stringify(lesson);
 const alternative='Remember God’s help before you complain.';
 const choices=solveCodeChoices(lesson);
 assert.ok(choices.some(x=>x.text===alternative));
 assert.ok(choices.some(x=>x.text===lesson.lessonDetails.bigIdeas[0].text));
 const fixed=chooseSolveCodePhrase(lesson,alternative);
 assert.equal(fixed.preparedActivities.bigIdeaCryptogram.phrase,alternative);
 assert.equal(fixed.lessonDetails.bigIdeas[0].text,lesson.lessonDetails.bigIdeas[0].text);
 assert.equal(fixed.preparedActivities.connectBigIdea.phrase,lesson.preparedActivities.connectBigIdea.phrase);
 assert.equal(fixed.preparedActivities.bigIdeaCryptogram.origin,'adapted');
 assert.deepEqual(fixed.preparedActivities.bigIdeaCryptogram.sourceIds,['sn-01','sn-06']);
 assert.deepEqual(checkReviewContent(fixed),[]);
 const report=buildReviewPreflight(fixed);
 assert.equal(report.convertedCount,27);
 assert.deepEqual(report.issues,[]);
 assert.ok(convertLessonActivities(fixed).candidates.some(x=>x.moduleId==='big-idea-cryptogram'));
 assert.equal(JSON.stringify(lesson),before,'Picking an alternative cannot change reviewed lesson input');
 assert.throws(()=>chooseSolveCodePhrase(fixed,'A completely invented phrase.'),/Choose the original/u);
 assert.throws(()=>chooseSolveCodePhrase(fixed,lesson.lessonDetails.bigIdeas[0].text),
  /maximum 18/u);
});

test('Review preflight checks all three printable presets after 27 activity conversions',()=>{
 const ready=buildReviewPreflight(approved);
 assert.equal(ready.convertedCount,27);
 assert.deepEqual(ready.issues,[],'Approved OT31 can build all three real presets');
 const noTitle=structuredClone(approved);
 noTitle.lessonDetails.title='';
 const report=buildReviewPreflight(noTitle);
 assert.equal(report.convertedCount,27,
  'Activity conversion alone cannot certify a complete printable worksheet');
 assert.deepEqual(report.issues.map(issue=>issue.message.split(':')[0]),
  ['Preset 1','Preset 2','Preset 3']);
 assert.ok(report.issues.every(issue=>issue.fieldId==='review-general-details'));
});

test('All 27 converter module diagnostics map to an available prepared field and focusable editor',()=>{
 assert.equal(Object.keys(PREPARED_ACTIVITY_KEYS).length,27);
 for(const [id,key] of Object.entries(PREPARED_ACTIVITY_KEYS)){
  assert.ok(key,id);
  const issue=reviewIssueTarget(id+': Example validation failure');
  assert.ok(issue.taskId,id+' missing task destination');
  assert.ok(issue.fieldId,id+' missing focus destination');
  assert.equal(issue.moduleId,id);
 }
 assert.equal(reviewIssueTarget('Finish the Story must retain the emphasized words').taskId,'finish-story');
 assert.equal(reviewIssueTarget('Multiple Choice mc-04 has invalid choices').taskId,'mc:mc-04');
 assert.equal(reviewIssueTarget('Empty fact: tf-03').taskId,'fact:tf-03');
 assert.equal(reviewIssueTarget('drawingPrompts[1]: invalid').fieldId,'review-field-drawing-1');
 assert.equal(reviewIssueTarget('preparedActivities.drawStory[3]: invalid').fieldId,'review-field-large-drawing-3');
 assert.equal(reviewIssueTarget('Select and approve a Berean Standard Bible memory verse.').taskId,'bsb-verse');
 assert.equal(reviewIssueTarget('crossword: No solution').taskId,'crossword');
});

test('Review Studio renders interactive issue cards, isolated source-linked Solve Code editor, and general module fallback',async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/review.css',import.meta.url),'utf8'),
 ]);
 assert.match(page,/buildReviewPreflight\(lesson\)/u);
 assert.match(page,/preflight\.issues\.map/u);
 assert.match(page,/setSelectedId\(issue\.taskId\)/u);
 assert.match(page,/setFocusIssueField\(issue\.fieldId\)/u);
 assert.match(page,/scrollIntoView/u);
 assert.match(page,/target\.focus/u);
 assert.match(page,/id="review-field-solve-code"/u);
 assert.match(page,/solveCodeChoices\(lesson\)/u);
 assert.match(page,/chooseSolveCodePhrase\(lesson,text\)/u);
 assert.match(page,/lesson\.lessonDetails\.bigIdeas/u);
 assert.match(page,/id="review-module-json"/u);
 assert.match(page,/applyModuleJson/u);
 assert.match(page,/convertedCount/u);
 assert.match(css,/review-issue-link/u);
});
