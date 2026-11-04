import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getBsbPassage,parseBsbText,wordSpans} from '../src/review/bsb.ts';
import {
 editUnscramble,chooseUnscramble,repairUnscrambleAnswers,resetMalformedUnscramble,
 unscrambleWords,unscrambleProblems,
 editPixelPhrase,choosePixelPhrase,pixelProblems,pixelPhraseChoices,
} from '../src/review/wordPuzzleEditors.ts';
import {choosePixelShapeId} from '../src/pixelPicture.ts';
import {convertLessonActivities} from '../src/lessonActivityConverter.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {buildReviewPreflight} from '../src/review/preflight.ts';
import {markRequiredTasksReviewed,reviewChecklistCounts} from '../src/review/reviewProgress.ts';
import {listReviewTasks} from '../src/review/model.ts';

const load=async name=>JSON.parse(await readFile(new URL(
 '../curriculum/approved/'+name+'.lesson.json',import.meta.url),'utf8'));
const ot31=await load('ot-031-god-parts-the-red-sea');
const ot32=await load('ot-032-god-provides-in-the-wilderness');
const projectText=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('BSB lookup strips curriculum a/b suffixes without inventing verse-part boundaries',()=>{
 const index=parseBsbText('Psalm 136:1\tGive thanks to the LORD, for He is good.\n'+
  'Psalm 136:2\tGive thanks to the God of gods.\n'+
  'Psalm 136:3\tGive thanks to the Lord of lords.\n',false);
 const full=getBsbPassage(index,'Psalm 136:1');
 assert.deepEqual(getBsbPassage(index,'Psalm 136:1a'),full);
 assert.deepEqual(getBsbPassage(index,'psalm 136:1B'),full);
 assert.deepEqual(getBsbPassage(index,'Psalm 136:1a-2b'),
  getBsbPassage(index,'Psalm 136:1-2'));
 assert.deepEqual(getBsbPassage(index,'Psalm 136:1b-136:2a'),
  getBsbPassage(index,'Psalm 136:1-136:2'));
 assert.equal(full.reference,'Psalm 136:1');
 assert.equal(full.citations.length,1);
 assert.equal(wordSpans(full.text).length>6,true,
  'Teacher can manually select the subsection of the numbered verse');
 assert.throws(()=>getBsbPassage(index,'Psalm 136:1ab'),/Enter a reference/u);
 assert.throws(()=>getBsbPassage(index,'Psalm 136:1a-4b'),/Verse not found/u);
});

test('BSB lookup and excerpt boundaries start with no selected blanks',async()=>{
 const app=await projectText('src/review/ReviewApp.tsx');
 assert.doesNotMatch(app,/suggestBlankWords/u,
  'No blanket suggestion can silently select words in either activity');
 assert.match(app,/setPassage\(next\);setStart\(0\);setEnd\(tokenCount-1\);\s*setFinish\(\[\]\);setUnscramble\(\[\]\)/u);
 assert.match(app,/setStart\(s\);setEnd\(e\);setFinish\(\[\]\);\s*setUnscramble\(\[\]\)/u);
 assert.match(app,/disabled=\{finish\.length<2\|\|finish\.length>8\|\|\s*unscramble\.length<4\|\|unscramble\.length>8\}/u);
 assert.match(app,/setDisplayReference\(/u);
 assert.match(app,/Psalm 136:1a/u);
});

test('Unscramble accepts custom words and repairs zero- or one-answer lists by typing',()=>{
 const before=JSON.stringify(ot32);
 const noAnswers=structuredClone(ot32);
 noAnswers.preparedActivities.unscrambleWords.answers=[];
 assert.ok(unscrambleProblems(noAnswers).some(x=>x.includes('exactly two')));
 const typed=editUnscramble(noAnswers,1,'WATER');
 assert.deepEqual(unscrambleWords(typed),['','WATER']);
 assert.equal(typed.preparedActivities.unscrambleWords.origin,'suggested');
 assert.equal(typed.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.deepEqual(typed.preparedActivities.unscrambleWords.sourceIds,[]);
 const complete=editUnscramble(typed,0,'ROCK');
 assert.deepEqual(unscrambleWords(complete),['ROCK','WATER']);
 assert.deepEqual(unscrambleProblems(complete),[]);
 const one=structuredClone(ot32);
 one.preparedActivities.unscrambleWords.answers=['MANNA'];
 assert.deepEqual(unscrambleWords(editUnscramble(one,1,'QUAIL')),['MANNA','QUAIL']);
 assert.deepEqual(unscrambleWords(repairUnscrambleAnswers(one)),['MANNA','']);
 const absent=structuredClone(ot32);delete absent.preparedActivities.unscrambleWords;
 assert.deepEqual(unscrambleWords(editUnscramble(absent,0,'MANNA')),['MANNA','']);
 assert.equal(JSON.stringify(ot32),before);
});

test('Three or more Unscramble answers require choosing two without silent data loss',()=>{
 const longer=structuredClone(ot32);
 longer.preparedActivities.unscrambleWords.answers=['MANNA','QUAIL','WATER','ROCK'];
 const original=JSON.stringify(longer);
 assert.ok(unscrambleProblems(longer).some(x=>x.includes('exactly two')));
 assert.throws(()=>editUnscramble(longer,0,'BREAD'),/Choose two different/u);
 assert.throws(()=>repairUnscrambleAnswers(longer),/Choose two different/u);
 assert.throws(()=>repairUnscrambleAnswers(longer,[1,1]),/Choose two different/u);
 const kept=repairUnscrambleAnswers(longer,[2,0]);
 assert.deepEqual(unscrambleWords(kept),['WATER','MANNA']);
 assert.equal(kept.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.deepEqual(kept.preparedActivities.unscrambleWords.sourceIds,[]);
 assert.deepEqual(unscrambleProblems(kept),[]);
 assert.equal(JSON.stringify(longer),original,
  'No extra saved answer can be removed before an explicit repair');
});

test('Malformed Unscramble list has explicit reset, then source vocabulary works',()=>{
 const broken=structuredClone(ot32);
 broken.preparedActivities.unscrambleWords.answers='not an array';
 assert.ok(unscrambleProblems(broken).length);
 assert.throws(()=>editUnscramble(broken,0,'WATER'),/not an array/u);
 const reset=resetMalformedUnscramble(broken);
 assert.deepEqual(unscrambleWords(reset),['','']);
 const chosen=chooseUnscramble(reset,0,'MANNA');
 const complete=chooseUnscramble(chosen,1,'BREAD');
 assert.deepEqual(unscrambleWords(complete),['MANNA','BREAD']);
 assert.deepEqual(unscrambleProblems(complete),[]);
 assert.equal(complete.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.ok(complete.preparedActivities.unscrambleWords.sourceIds.length>0);
 assert.deepEqual(complete.vocabulary,ot32.vocabulary);
 assert.ok(buildReviewPreflight(complete).issues.every(x=>x.taskId!=='unscramble-words'));
});

test('Pixel Picture shape comes from generation seed, not the saved curriculum shapeId',()=>{
 const phrase=ot32.preparedActivities.pixelPicture.phrase;
 const shape1=choosePixelShapeId(1,phrase);
 const shape2=choosePixelShapeId(2,phrase);
 assert.notEqual(shape1,shape2,'successive regeneration must select another silhouette');
 assert.equal(choosePixelShapeId(1,phrase),shape1,'print preview and PDF remain stable');
 const base=convertLessonActivities(ot32,{seed:1}).candidates.find(x=>x.moduleId==='pixel-picture');
 assert.equal(base.module.shapeId,shape1);
 const legacy=structuredClone(ot32);legacy.preparedActivities.pixelPicture.shapeId='not-a-valid-shape';
 assert.deepEqual(pixelProblems(legacy),[]);
 const fromLegacy=convertLessonActivities(legacy,{seed:1}).candidates
  .find(x=>x.moduleId==='pixel-picture');
 assert.equal(fromLegacy.module.shapeId,shape1);
 const regenerated=convertLessonActivities(legacy,{seed:2}).candidates
  .find(x=>x.moduleId==='pixel-picture');
 assert.equal(regenerated.module.shapeId,shape2);
 assert.deepEqual(legacy.preparedActivities.pixelPicture,
  structuredClone(legacy.preparedActivities.pixelPicture),
  'Conversion must not alter the input file');
});

test('Preset 2 uses seeded Pixel Picture and generated draft stays stable',()=>{
 for(const lesson of [ot31,ot32]){
  const a=buildWorksheetRecipe(lesson,'preset-2',{purpose:'published',seed:1});
  const b=buildWorksheetRecipe(lesson,'preset-2',{purpose:'published',seed:2});
  const moduleA=a.draft.modules['2:bottom-medium'];
  const moduleB=b.draft.modules['2:bottom-medium'];
  assert.equal(moduleA.type,'pixel-picture');
  assert.equal(moduleB.type,'pixel-picture');
  assert.equal(moduleA.shapeId,choosePixelShapeId(1,moduleA.phrase));
  assert.equal(moduleB.shapeId,choosePixelShapeId(2,moduleB.phrase));
  assert.notEqual(moduleA.shapeId,moduleB.shapeId);
  assert.deepEqual(
   buildWorksheetRecipe(lesson,'preset-2',{purpose:'published',seed:1}).draft.modules['2:bottom-medium'],
   moduleA,'Same worksheet seed must make the same printable picture');
 }
});

test('Edited Pixel Picture record removes inherited shape but keeps lesson phrase provenance',()=>{
 const selected=pixelPhraseChoices(ot32).find(x=>x.sourceIds.length>0);
 const linked=choosePixelPhrase(ot32,selected.id);
 assert.equal(linked.preparedActivities.pixelPicture.shapeId,undefined);
 assert.deepEqual(linked.preparedActivities.pixelPicture.sourceIds,selected.sourceIds);
 const changed=editPixelPhrase(ot32,'God gave the people manna and water in the wilderness.');
 assert.equal(changed.preparedActivities.pixelPicture.shapeId,undefined);
 assert.equal(changed.preparedActivities.pixelPicture.teacherReviewRequired,true);
 assert.deepEqual(changed.preparedActivities.pixelPicture.sourceIds,[]);
 assert.deepEqual(ot32.lessonDetails,changed.lessonDetails);
});

test('Bulk review acknowledges only required tasks, without granting publication approval',()=>{
 const already=['mc:known','lesson-sources'];
 const marked=markRequiredTasksReviewed(ot32,already);
 const tasks=listReviewTasks(ot32);
 const required=tasks.filter(x=>!x.optional).map(x=>x.id);
 const optional=tasks.filter(x=>x.optional).map(x=>x.id);
 assert.ok(required.every(id=>marked.includes(id)));
 assert.ok(marked.includes('lesson-sources'),'Existing progress is retained');
 assert.ok(optional.some(id=>!marked.includes(id)),
  'Optional repair screens should not be silently marked reviewed');
 const counts=reviewChecklistCounts(ot32,marked);
 assert.deepEqual(counts,{complete:required.length,total:required.length,remaining:0});
 assert.equal(markRequiredTasksReviewed(ot32,marked).length,marked.length);
 assert.equal(ot32.publication.approved,true);
 const draft=structuredClone(ot32);draft.publication.approved=false;
 markRequiredTasksReviewed(draft,[]);
 assert.equal(draft.publication.approved,false,
  'Marking review tasks must not mutate or approve the curriculum');
});

test('Bulk UI requires a warning, acknowledgement, fresh preflight and explicit rights',async()=>{
 const app=await projectText('src/review/ReviewApp.tsx');
 assert.match(app,/I personally reviewed all remaining curriculum items/u);
 assert.match(app,/disabled=\{!bulkReviewAcknowledged\|\|remaining===0\}/u);
 assert.match(app,/window\.confirm\('Confirm that you have personally reviewed/u);
 assert.match(app,/setPreflight\(null\);setRightsConfirmed\(false\)/u);
 assert.match(app,/markRequiredTasksReviewed\(lesson,previous\)/u);
 assert.match(app,/Save review session — preserves edits and checkmarks/u);
 assert.match(app,/preflight\.issues\.length===0/u);
 assert.match(app,/reviewer\.trim\(\)&&signDate&&rightsConfirmed/u);
});

test('Regenerate updates the Pixel Picture silhouette but not the saved curriculum phrase',async()=>{
 const [app,review]=await Promise.all([
  projectText('src/App.tsx'),projectText('src/review/PixelPictureReviewEditor.tsx'),
 ]);
 assert.match(app,/shapeId:choosePixelShapeId\(seed,original\.phrase\)/u);
 assert.match(app,/const seed=original\.seed\+1/u);
 assert.doesNotMatch(review,/<label>Silhouette/u);
 assert.match(review,/Preview another generated silhouette/u);
 assert.match(review,/type:'pixel-picture',phrase,shapeId,seed:previewSeed/u);
});
