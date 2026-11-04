import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateModule} from '../src/modules.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {buildReviewPreflight,reviewIssueTarget} from '../src/review/preflight.ts';
import {listReviewTasks,checkReviewContent} from '../src/review/model.ts';
import {repairDestinationForModule,MODULE_REPAIR_REGISTRY} from '../src/review/repairRegistry.ts';
import {PIXEL_SHAPES} from '../src/pixelPictureShapes.ts';
import {generatePixelPicture} from '../src/pixelPicture.ts';
import {
 whoAmIChoices,whoAmIProblems,chooseWhoAmI,editWhoAmI,
 unscrambleChoices,unscrambleProblems,unscrambleWords,chooseUnscramble,editUnscramble,
 pixelPhraseChoices,pixelProblems,choosePixelPhrase,editPixelPhrase,
 finishStoryProblems,editFinishStory,
} from '../src/review/wordPuzzleEditors.ts';

const load=async name=>JSON.parse(await readFile(new URL(
 '../curriculum/approved/'+name+'.lesson.json',import.meta.url),'utf8'));
const ot31=await load('ot-031-god-parts-the-red-sea');
const ot32=await load('ot-032-god-provides-in-the-wilderness');

test('Approved lessons begin with printable Who Am I, Unscramble and Pixel Picture data',()=>{
 for(const lesson of [ot31,ot32]){
  assert.deepEqual(whoAmIProblems(lesson),[],lesson.id+' Who Am I');
  assert.deepEqual(unscrambleProblems(lesson),[],lesson.id+' Unscramble');
  assert.deepEqual(pixelProblems(lesson),[],lesson.id+' Pixel');
  assert.deepEqual(finishStoryProblems(lesson),[],lesson.id+' Finish the Story');
  assert.ok(PIXEL_SHAPES.length>=10);
 }
});

test('Who Am I selection copies original character name and clue with matching source IDs',()=>{
 const before=JSON.stringify(ot32);
 const choice=whoAmIChoices(ot32).find(x=>x.description==='Aaron');
 assert.ok(choice);
 const next=chooseWhoAmI(ot32,choice.id);
 assert.equal(next.preparedActivities.whoAmI.answer,'Aaron');
 assert.equal(next.preparedActivities.whoAmI.clue,choice.text);
 assert.deepEqual(next.preparedActivities.whoAmI.sourceIds,choice.sourceIds);
 assert.equal(next.preparedActivities.whoAmI.origin,choice.origin);
 assert.deepEqual(whoAmIProblems(next),[]);
 assert.deepEqual(next.characters,ot32.characters);
 assert.deepEqual(next.lessonDetails,ot32.lessonDetails);
 assert.equal(JSON.stringify(ot32),before);
});
test('Teacher-written Who Am I clue and answer require review; changed identity clears old source links',()=>{
 const rewritten=editWhoAmI(ot32,'clue','I helped Moses during the battle. Who am I?');
 assert.equal(rewritten.preparedActivities.whoAmI.origin,'suggested');
 assert.equal(rewritten.preparedActivities.whoAmI.teacherReviewRequired,true);
 assert.deepEqual(rewritten.preparedActivities.whoAmI.sourceIds,
  ot32.preparedActivities.whoAmI.sourceIds,'clue rewrite keeps contextual references');
 const changed=editWhoAmI(rewritten,'answer','Aaron');
 assert.deepEqual(changed.preparedActivities.whoAmI.sourceIds,[],
  'do not attribute a changed answer to the original character');
 assert.deepEqual(whoAmIProblems(changed),[]);
 assert.deepEqual(ot32.characters,structuredClone(ot32).characters);
 assert.throws(()=>chooseWhoAmI(ot32,'not-a-character'),/existing reviewed/u);
 const invalid=editWhoAmI(ot32,'clue','A'.repeat(130));
 assert.ok(whoAmIProblems(invalid).some(x=>x.includes('120')));
});
test('Unscramble selects valid lesson vocabulary without inventing content',()=>{
 const before=JSON.stringify(ot32);
 assert.equal(unscrambleWords(ot32).length,2);
 const options=unscrambleChoices(ot32);
 assert.ok(options.some(x=>x.term==='BREAD'));
 assert.ok(options.some(x=>x.term==='MANNA'));
 assert.ok(options.every(x=>validateModule({type:'unscramble-words',
  first:x.term,second:'MOSES',seed:1}).length===0));
 const next=chooseUnscramble(ot32,0,'BREAD');
 assert.equal(unscrambleWords(next)[0],'BREAD');
 assert.equal(next.preparedActivities.unscrambleWords.origin,'suggested');
 assert.equal(next.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 const vocabulary=ot32.vocabulary.entries.find(x=>x.term==='Bread');
 assert.ok(next.preparedActivities.unscrambleWords.sourceIds.includes(vocabulary.sourceIds[0]));
 assert.deepEqual(next.vocabulary,ot32.vocabulary);
 assert.deepEqual(unscrambleProblems(next),[]);
 assert.equal(JSON.stringify(ot32),before);
 assert.throws(()=>chooseUnscramble(ot32,0,'INVENTED'),/vocabulary word/u);
});
test('Unscramble supports teacher-authored answers but rejects duplicates and invalid scrambles',()=>{
 const edited=editUnscramble(ot32,0,'THANKS');
 assert.equal(unscrambleWords(edited)[0],'THANKS');
 assert.equal(edited.preparedActivities.unscrambleWords.origin,'suggested');
 assert.equal(edited.preparedActivities.unscrambleWords.teacherReviewRequired,true);
 assert.deepEqual(edited.preparedActivities.unscrambleWords.sourceIds,[]);
 const duplicates=editUnscramble(ot32,0,unscrambleWords(ot32)[1]);
 assert.ok(unscrambleProblems(duplicates).some(x=>x.includes('different answers')));
 const impossible=editUnscramble(ot32,0,'AAAA');
 assert.ok(unscrambleProblems(impossible).some(x=>x.includes('3–10')));
 const missing=structuredClone(ot32);
 delete missing.preparedActivities.unscrambleWords;
 assert.ok(unscrambleProblems(missing).length);
 const repaired=editUnscramble(missing,0,'MANNA');
 assert.equal(unscrambleWords(repaired).length,2);
});
test('Pixel Picture chooses source phrase and preserves corresponding provenance',()=>{
 const before=JSON.stringify(ot32);
 const options=pixelPhraseChoices(ot32);
 assert.ok(options.length>0);
 const phrase=options.find(x=>x.sourceIds?.length>0);
 assert.ok(phrase);
 const next=choosePixelPhrase(ot32,phrase.id);
 assert.equal(next.preparedActivities.pixelPicture.phrase,phrase.text);
 assert.deepEqual(next.preparedActivities.pixelPicture.sourceIds,phrase.sourceIds);
 assert.deepEqual(pixelProblems(next),[]);
 assert.equal(generatePixelPicture({
  type:'pixel-picture',phrase:phrase.text,shapeId:'star',seed:1,
 }).grid.length,13);
 assert.equal(JSON.stringify(ot32),before);
});
test('Pixel Picture stores only the phrase, not a fixed silhouette, and preserves curricular sources',()=>{
 const custom='God gave his people food and water in the desert.';
 const revised=editPixelPhrase(ot32,custom);
 assert.equal(revised.preparedActivities.pixelPicture.phrase,custom);
 assert.equal(revised.preparedActivities.pixelPicture.origin,'suggested');
 assert.equal(revised.preparedActivities.pixelPicture.teacherReviewRequired,true);
 assert.deepEqual(revised.preparedActivities.pixelPicture.sourceIds,[]);
 assert.deepEqual(pixelProblems(revised),[]);
 assert.equal(revised.preparedActivities.pixelPicture.shapeId,undefined,
  'editing clears old curriculum-saved silhouettes');
 assert.deepEqual(revised.lessonDetails,ot32.lessonDetails);
 assert.ok(pixelProblems(editPixelPhrase(ot32,'Short phrase')).some(x=>x.includes('30–85')));
 const legacy=structuredClone(ot32);
 legacy.preparedActivities.pixelPicture.shapeId='not-an-existing-shape';
 assert.deepEqual(pixelProblems(legacy),[],
  'old file picture choices no longer control whether a phrase is valid');
 const missing=structuredClone(ot32);
 delete missing.preparedActivities.pixelPicture;
 const created=editPixelPhrase(missing,custom);
 assert.equal(created.preparedActivities.pixelPicture.shapeId,undefined);
 assert.deepEqual(pixelProblems(created),[]);
});

test('Finish the Story can be fully rewritten without matching original emphasized notes',()=>{
 const before=JSON.stringify(ot32);
 const text='God [HELPED] his people on the [ROAD]. He gave them [FOOD] when they '+
  'were [HUNGRY], [WATER] when they were thirsty, and [COURAGE] when they were afraid.';
 const edited=editFinishStory(ot32,text);
 assert.equal(edited.preparedActivities.finishStory.markedParagraph,text);
 assert.equal(edited.preparedActivities.finishStory.origin,'suggested');
 assert.equal(edited.preparedActivities.finishStory.teacherReviewRequired,true);
 assert.deepEqual(edited.preparedActivities.finishStory.sourceIds,
  ot32.preparedActivities.finishStory.sourceIds,'retain Story Notes as optional context');
 assert.deepEqual(edited.storyNotes,ot32.storyNotes,'canonical source must not change');
 assert.deepEqual(finishStoryProblems(edited),[]);
 assert.deepEqual(checkReviewContent(edited).filter(x=>x.startsWith('finish-story:')),[]);
 assert.equal(JSON.stringify(ot32),before);
});
test('Finish the Story still enforces brackets, answer words, blank count and story length',()=>{
 const few=editFinishStory(ot32,'God [GAVE] [THEM] [FOOD] [AND] [WATER].');
 assert.ok(finishStoryProblems(few).some(x=>x.includes('6–12')));
 const malformed=editFinishStory(ot32,'God [GAVE [THEM] [SOME] [GOOD] [FOOD] [AND] [WATER].');
 assert.ok(finishStoryProblems(malformed).some(x=>x.includes('bracket')));
 const long=editFinishStory(ot32,'Text '.repeat(230)+'[ONE] [TWO] [THREE] [FOUR] [FIVE] [SIX].');
 assert.ok(finishStoryProblems(long).some(x=>x.includes('1,100')));
 const missing=structuredClone(ot32);delete missing.preparedActivities.finishStory;
 assert.equal(editFinishStory(missing,'God [GAVE] [THEM] [FOOD] [AND] [WATER] [TODAY].')
  .preparedActivities.finishStory.origin,'suggested');
});
test('All four module preflight repairs open the right persistent visual editor',()=>{
 const routes=[
  ['who-am-i','whoAmI','who-am-i','review-field-who-am-i'],
  ['unscramble-words','unscrambleWords','unscramble-words','review-field-unscramble-words'],
  ['pixel-picture','pixelPicture','pixel-picture','review-field-pixel-picture'],
  ['finish-story','finishStory','finish-story','review-field-finish-story'],
 ];
 for(const [moduleId,key,taskId,fieldId] of routes){
  const route=repairDestinationForModule(moduleId,false);
  assert.equal(route.taskId,taskId);
  assert.equal(route.fieldId,fieldId);
  assert.equal(route.editor,'visual');
  assert.equal(route.handlesMissing,true);
  assert.equal(MODULE_REPAIR_REGISTRY[moduleId].taskId,taskId);
  assert.ok(listReviewTasks(ot32).some(item=>item.id===taskId));
  const direct=reviewIssueTarget(moduleId+': invalid');
  assert.equal(direct.taskId,taskId);
  assert.equal(direct.fieldId,fieldId);
  const missing=structuredClone(ot32);
  delete missing.preparedActivities[key];
  const preflight=buildReviewPreflight(missing);
  assert.ok(preflight.issues.some(issue=>issue.moduleId===moduleId&&
   issue.taskId===taskId&&issue.fieldId===fieldId),
   moduleId+' missing content should be visually repairable');
 }
});
test('All three new visual editors and freer story editor show print-matched previews',async()=>{
 const [app,who,unscramble,pixel,story,workflow]=await Promise.all([
  'src/review/ReviewApp.tsx','src/review/WhoAmIReviewEditor.tsx',
  'src/review/UnscrambleReviewEditor.tsx','src/review/PixelPictureReviewEditor.tsx',
  'src/review/FinishStoryReviewEditor.tsx','.github/workflows/pages.yml',
 ].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
 for(const name of ['WhoAmIReviewEditor','UnscrambleReviewEditor',
  'PixelPictureReviewEditor','FinishStoryReviewEditor'])
  assert.ok(app.includes('<'+name));
 assert.match(who,/<SmallModulePreview module=/u);
 assert.match(unscramble,/<SmallModulePreview module=/u);
 assert.match(pixel,/<PixelPicturePrintPreview module=/u);
 assert.match(story,/<ModulePreview module=\{module\}/u);
 assert.match(app,/setSelectedId\(issue.taskId\)/u);
 assert.match(app,/setFocusIssueField\(issue.fieldId\)/u);
 assert.doesNotMatch(workflow,/Generate sample PDFs|Upload sample PDF for review/u);
 assert.match(workflow,/npm run test/u);
 assert.match(workflow,/Upload site artifact/u,
  'Pages deployment must still upload the production build');
});
test('OT31 and OT32 still populate all three unchanged numbered presets',()=>{
 for(const lesson of [ot31,ot32]){
  for(const recipe of ['preset-1','preset-2','preset-3']){
   const out=buildWorksheetRecipe(lesson,recipe,{purpose:'published',seed:1});
   assert.equal(out.openSlots.length,0,lesson.id+' '+recipe);
  }
 }
});
