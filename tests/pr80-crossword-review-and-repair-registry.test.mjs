import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 crosswordPairs,crosswordIssues,crosswordModule,crosswordVocabulary,
 editCrosswordPair,addCrosswordPair,removeCrosswordPair,moveCrosswordPair,
 replaceCrosswordAnswerWithVocabulary,
} from '../src/review/crosswordEditor.ts';
import {MODULE_REPAIR_REGISTRY,repairDestinationForModule} from '../src/review/repairRegistry.ts';
import {buildReviewPreflight,reviewIssueTarget,PREPARED_ACTIVITY_KEYS} from '../src/review/preflight.ts';
import {listReviewTasks} from '../src/review/model.ts';
import {MODULES,validateModule} from '../src/modules.ts';
import {generateCrossword,checkCrossword} from '../src/specialtyModules.ts';
import {buildWorksheetRecipe} from '../src/worksheetRecipes.ts';

const ot31=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json',import.meta.url),'utf8'));
const ot32=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',import.meta.url),'utf8'));
const crossword=crosswordPairs(ot32);

test('Crossword editor validates authentic OT31/OT32 answer and clue banks using the real puzzle engine',()=>{
 for(const lesson of [ot31,ot32]){
  const pairs=crosswordPairs(lesson);
  assert.ok(pairs.length>=6&&pairs.length<=10,lesson.id+' should have a complete crossword');
  assert.deepEqual(crosswordIssues(pairs),[],lesson.id);
  const module=crosswordModule(pairs);
  assert.deepEqual(validateModule(module),[]);
  const grid=generateCrossword(module);
  assert.ok(checkCrossword(grid),lesson.id+' has a valid connected grid');
  assert.equal(grid.placements.length,pairs.length);
 }
});

test('Crossword text edits retain ID and sources as context while requiring renewed teacher review',()=>{
 const saved=JSON.stringify(ot32);
 const pair=crossword[0];
 const edited=editCrosswordPair(ot32,0,'clue','A newly reviewed classroom clue');
 assert.equal(edited.preparedActivities.crossword[0].clue,'A newly reviewed classroom clue');
 assert.equal(edited.preparedActivities.crossword[0].answer,pair.answer);
 assert.equal(edited.preparedActivities.crossword[0].id,pair.id);
 assert.deepEqual(edited.preparedActivities.crossword[0].sourceIds,pair.sourceIds);
 assert.deepEqual(edited.preparedActivities.crossword.slice(1),crossword.slice(1));
 assert.equal(edited.preparedActivities.crossword[0].origin,'suggested');
 assert.equal(edited.preparedActivities.crossword[0].teacherReviewRequired,true);
 assert.equal(JSON.stringify(ot32),saved,'review editing must not mutate approved lessons');
});

test('Crossword add, remove and reorder controls preserve pair relationships and source metadata',()=>{
 const source=JSON.stringify(ot32);
 const withoutLast=removeCrosswordPair(ot32,crossword.length-1);
 assert.equal(crosswordPairs(withoutLast).length,crossword.length-1);
 const added=addCrosswordPair(withoutLast),fresh=crosswordPairs(added).at(-1);
 assert.equal(crosswordPairs(added).length,crossword.length);
 assert.equal(fresh.answer,'');
 assert.equal(fresh.clue,'');
 assert.equal(fresh.origin,'suggested');
 assert.equal(fresh.teacherReviewRequired,true);
 assert.deepEqual(fresh.sourceIds,[]);
 assert.ok(crosswordIssues(crosswordPairs(added)).some(issue=>issue.index===crossword.length-1));
 const moved=moveCrosswordPair(ot32,0,1);
 assert.deepEqual(crosswordPairs(moved)[0],crossword[1]);
 assert.deepEqual(crosswordPairs(moved)[1],crossword[0]);
 assert.throws(()=>moveCrosswordPair(ot32,0,-1),/beyond/u);
 const atSix=structuredClone(ot32);
 atSix.preparedActivities.crossword=atSix.preparedActivities.crossword.slice(0,6);
 assert.throws(()=>removeCrosswordPair(atSix,0),/at least six/u);
 const atTen=structuredClone(ot32);
 while(atTen.preparedActivities.crossword.length<10)
  atTen.preparedActivities.crossword.push({answer:'',clue:''});
 assert.throws(()=>addCrosswordPair(atTen),/maximum of ten/u);
 const noCrossword=structuredClone(ot32);
 delete noCrossword.preparedActivities.crossword;
 assert.equal(crosswordPairs(addCrosswordPair(noCrossword)).length,1,
  'The editor can create a missing prepared crossword without JSON');
 assert.equal(JSON.stringify(ot32),source);
});

test('Crossword highlights invalid fields and distinguishes disconnected grids from text errors',()=>{
 const invalid=structuredClone(crossword);
 invalid[0].answer='';
 invalid[1].answer=invalid[2].answer.toLowerCase();
 invalid[3].answer='PUNCTUATION!';
 invalid[4].clue='A clue, with a comma';
 invalid[5].clue='C'.repeat(86);
 const issues=crosswordIssues(invalid);
 for(const kind of ['enter an answer','duplicates entry','3–12 A–Z','cannot contain commas','1–85 characters'])
  assert.ok(issues.some(issue=>issue.message.includes(kind)),kind+': '+JSON.stringify(issues));
 assert.ok(issues.some(issue=>issue.index===2&&issue.field==='answer'));
 assert.ok(issues.some(issue=>issue.index===4&&issue.field==='clue'));
 const disconnected=['ABC','DEF','GHI','JKL','MNO','PQR'].map((answer,index)=>({
  answer,clue:'Clue '+(index+1),
 }));
 const placement=crosswordIssues(disconnected);
 assert.equal(placement.length,1);
 assert.equal(placement[0].kind,'layout');
 assert.match(placement[0].message,/cannot form one connected crossword/u);
 assert.match(placement[0].message,/source-backed word/u);
 assert.ok(crosswordIssues(crossword.slice(0,5)).some(issue=>issue.kind==='count'));
});

test('Source-linked crossword replacements do not retain a misleading old clue',()=>{
 const options=crosswordVocabulary(ot32);
 assert.ok(options.length>6);
 assert.ok(options.every(item=>item.term.replace(/ /gu,'').length>=3));
 const originalAnswer=crossword[0].answer.replace(/\s+/gu,'').toUpperCase();
 const used=new Set(crossword.map(p=>p.answer.replace(/\s+/gu,'').toUpperCase()));
 const alternative=options.find(x=>!used.has(x.term.replace(/\s+/gu,'')));
 assert.ok(alternative,'fixture has other approved vocabulary');
 const chosen=replaceCrosswordAnswerWithVocabulary(ot32,0,alternative.term);
 const row=crosswordPairs(chosen)[0];
 assert.equal(row.answer,alternative.term);
 assert.equal(row.clue,'','the teacher must supply a new clue for the replacement answer');
 assert.deepEqual(row.sourceIds,alternative.sourceIds);
 assert.equal(row.origin,'suggested');
 assert.equal(row.teacherReviewRequired,true);
 assert.equal(row.source,undefined);
 assert.deepEqual(chosen.lessonDetails,ot32.lessonDetails);
 assert.ok(crosswordIssues(crosswordPairs(chosen)).some(x=>x.index===0&&x.field==='clue'));
 assert.throws(()=>replaceCrosswordAnswerWithVocabulary(ot32,0,'FABRICATED'),/source-linked/u);
 const duplicate=options.find(x=>used.has(x.term.replace(/\s+/gu,''))&&x.term.replace(/\s+/gu,'')!==originalAnswer);
 if(duplicate)assert.throws(()=>replaceCrosswordAnswerWithVocabulary(ot32,0,duplicate.term),/already used/u);
});

test('Crossword errors and absent prepared records route to the permanent visual repair editor',()=>{
 const target=reviewIssueTarget('crossword: Crossword grid cannot be generated with all authored entries.');
 assert.equal(target.taskId,'crossword');
 assert.equal(target.fieldId,'review-field-crossword');
 assert.equal(target.moduleId,'crossword');
 assert.ok(listReviewTasks(ot32).some(task=>task.id==='crossword'));
 const broken=structuredClone(ot32);
 broken.preparedActivities.crossword[0].answer='ZZZ';
 const report=buildReviewPreflight(broken);
 assert.ok(report.issues.some(issue=>issue.moduleId==='crossword'&&
  issue.taskId==='crossword'&&issue.fieldId==='review-field-crossword'));
 const missing=structuredClone(ot32);
 delete missing.preparedActivities.crossword;
 assert.ok(buildReviewPreflight(missing).issues.some(issue=>
  issue.moduleId==='crossword'&&issue.taskId==='crossword'&&
  issue.fieldId==='review-field-crossword'));
});

test('Repair registry has an explicit, focusable strategy for every one of 27 modules',()=>{
 const ids=MODULES.map(x=>x.id).sort();
 assert.deepEqual(Object.keys(MODULE_REPAIR_REGISTRY).sort(),ids);
 assert.deepEqual(Object.keys(PREPARED_ACTIVITY_KEYS).sort(),ids);
 for(const id of ids){
  const destination=repairDestinationForModule(id);
  assert.ok(destination.taskId&&destination.fieldId,id+' has no repair path');
  assert.ok(['visual','scripture','advanced'].includes(destination.editor));
  const issue=reviewIssueTarget(id+': failed');
  assert.equal(issue.taskId,destination.taskId,id+' task differs from registry');
  assert.equal(issue.fieldId,destination.fieldId,id+' field differs from registry');
  assert.equal(issue.moduleId,id);
  const without=repairDestinationForModule(id,false);
  assert.equal(without.handlesMissing||without.editor==='advanced',true,
   id+' missing prepared content must be repairable or route to isolated JSON');
  if(destination.editor!=='advanced'&&!destination.handlesMissing)
   assert.equal(without.editor,'advanced',id+' needs a safe fallback if prepared content is missing');
 }
 assert.equal(repairDestinationForModule('crossword',false).taskId,'crossword');
 assert.equal(repairDestinationForModule('story-order',false).taskId,'module:story-order');
});

test('Review Studio mounts real Crossword inputs, advance fallback and actual printable preview',async()=>{
 const [app,form,registry]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/CrosswordReviewEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/repairRegistry.ts',import.meta.url),'utf8'),
 ]);
 assert.match(app,/active\.id==='crossword'/u);
 assert.match(app,/<CrosswordReviewEditor lesson=\{lesson\}/u);
 assert.match(app,/setSelectedId\(issue\.taskId\)/u);
 assert.match(app,/setFocusIssueField\(issue\.fieldId\)/u);
 assert.match(form,/id="review-field-crossword"/u);
 assert.match(form,/editCrosswordPair\(lesson,i,'answer'/u);
 assert.match(form,/editCrosswordPair\(lesson,i,'clue'/u);
 assert.match(form,/replaceCrosswordAnswerWithVocabulary/u);
 assert.match(form,/<SpecialtyPreview module=\{crosswordModule\(entries\)\}/u);
 assert.match(form,/Apply crossword JSON/u);
 assert.match(registry,/MODULE_REPAIR_REGISTRY:Record<ModuleId,RepairDestination>/u);
});

test('Approved OT31 and OT32 still generate all three numbered presets',()=>{
 for(const lesson of [ot31,ot32]){
  for(const id of ['preset-1','preset-2','preset-3']){
   const out=buildWorksheetRecipe(lesson,id,{purpose:'published',seed:1});
   assert.equal(out.openSlots.length,0,lesson.id+' '+id);
  }
 }
});
