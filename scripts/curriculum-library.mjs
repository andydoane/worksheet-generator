/**
 * PR17g — deterministic curriculum library QA and readiness reports.
 *
 * Scans review and approved JSON, validates v1 schemas, runs the REAL module
 * validators and puzzle engines, then verifies both current booklet recipes.
 * Review-stage content can be incomplete and is reported without publication.
 * Approved content fails CI unless every prepared module, required recipe and
 * the lesson's own explicitly confirmed Scripture-rights record is valid.
 */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLesson} from './validate-curriculum.mjs';
import {
 CORE_LESSON_MODULE_IDS,WORD_VISUAL_LESSON_MODULE_IDS,
 VERSE_SPECIALTY_LESSON_MODULE_IDS,convertLessonActivities,
} from '../src/lessonActivityConverter.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';
import {generateWordSearch,checkWordSearch,generateMaze,checkMaze} from '../src/puzzleEngines.ts';
import {generatePixelPicture} from '../src/pixelPicture.ts';
import {generateCryptogram,checkCryptogram} from '../src/cryptograms.ts';
import {generateCrossword,checkCrossword,connectPositions,spiralWritingPoints} from '../src/specialtyModules.ts';
import {parseVerse,verseBank,verseScrambles} from '../src/storyVerseModules.ts';
import {WORKSHEET_RECIPES,buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {approvedForPublic,isRightsEvidence} from '../src/publishedLessonCatalog.ts';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const ALL_MODULE_IDS=Object.freeze([
 ...CORE_LESSON_MODULE_IDS,...WORD_VISUAL_LESSON_MODULE_IDS,
 ...VERSE_SPECIALTY_LESSON_MODULE_IDS,
]);
const missingDiagnostic=(text)=>/^No prepared /u.test(text);
/** Probe actual puzzle generation and solution checking without mutating input. */
export function checkPrintableCandidate(module){
 const problems=validateModule(module);
 if(problems.length)return problems;
 try{
  switch(module.type){
   case 'word-search':
   case 'medium-word-search':{
    const result=generateWordSearch(module);
    if(!checkWordSearch(result))throw Error('Word Search solution failed.');
    break;
   }
   case 'true-false-maze':{
    const maze=generateMaze(module);
    if(!checkMaze(maze))throw Error('Maze solution failed.');
    break;
   }
   case 'pixel-picture':{
    const picture=generatePixelPicture(module);
    if(!picture.grid.length||!picture.missingPositions.length)
     throw Error('Pixel Picture has no grid or letters to fill.');
    break;
   }
   case 'big-idea-cryptogram':
   case 'verse-cryptogram':
    if(!checkCryptogram(generateCryptogram(module)))
     throw Error('Cryptogram solution failed.');
    break;
   case 'crossword':
    if(!checkCrossword(generateCrossword(module)))
     throw Error('Crossword grid/answer key failed.');
    break;
   case 'connect-verse':
   case 'connect-big-idea':
    if(connectPositions(module).length<4)
     throw Error('Connection path has too few words.');
    break;
   case 'spiral-verse':
    if(spiralWritingPoints(module.verse,60).length!==60)
     throw Error('Spiral handwriting path could not be generated.');
    break;
   case 'finish-verse':{
    if(parseVerse(module.verse).malformed||verseBank(module).length<2)
     throw Error('Invalid bracketed Finish the Verse answer bank.');
    break;
   }
   case 'unscramble-verse':{
    if(parseVerse(module.verse).malformed||verseScrambles(module).length<4)
     throw Error('Invalid Unscramble the Verse word bank.');
    break;
   }
  }
 }catch(error){
  problems.push(error instanceof Error?error.message:String(error));
 }
 return problems;
}
function categorizedDiagnostics(messages){
 return messages.length&&messages.every(missingDiagnostic)?'missing':'invalid';
}
export function assessCurriculumLesson(lesson,schema,{source='review'}={}){
 const rightsEvidence=lesson?.publication?.scriptureRights;
 const schemaErrors=validateLesson(lesson,schema);
 const result={
  id:lesson?.id??'(invalid lesson)',title:lesson?.lessonDetails?.title??'(untitled)',
  source,publicationStatus:lesson?.publication?.status??'(unreported)',
  schemaErrors,
  moduleReadiness:[],recipeReadiness:[],
  teacherReviewFlagsOutstanding:[],
  rightsCleared:isRightsEvidence(rightsEvidence),
  eligibleForPublication:false,
 };
 const pending=new Set(lesson?.publication?.resolvedReviewFlagIds??[]);
 result.teacherReviewFlagsOutstanding=(lesson?.reviewFlags??[])
  .filter(flag=>flag.type==='teacher-approval'&&!pending.has(flag.id))
  .map(flag=>flag.id);
 if(schemaErrors.length){
  result.moduleReadiness=ALL_MODULE_IDS.map(moduleId=>({
   moduleId,contentStatus:'not-checked',technicalStatus:'not-checked',
   candidateCount:0,teacherReviewCount:0,diagnostics:['Schema invalid'],
  }));
  return result;
 }
 let conversion;
 try{conversion=convertLessonActivities(lesson,{seed:1});}
 catch(error){
  result.schemaErrors.push('Converter threw unexpectedly: '+String(error));
  return result;
 }
 const readinessById=new Map((lesson.moduleReadiness??[]).map(x=>[x.moduleId,x]));
 for(const moduleId of ALL_MODULE_IDS){
  const candidates=conversion.candidates.filter(x=>x.moduleId===moduleId);
  const messages=conversion.diagnostics.filter(x=>x.moduleId===moduleId)
   .map(x=>x.message);
  const expectedSize=moduleForSize('small').some(x=>x.id===moduleId)?'small':
   moduleForSize('medium').some(x=>x.id===moduleId)?'medium':'large';
  for(const candidate of candidates){
   if(!moduleForSize(expectedSize).some(x=>x.id===moduleId))
    messages.push('Module has an unsupported region size.');
   const issues=checkPrintableCandidate(candidate.module);
   messages.push(...issues.map(x=>candidate.contentId+': '+x));
  }
  const technicalStatus=messages.length?categorizedDiagnostics(messages):
   candidates.length?'ready':'missing';
  result.moduleReadiness.push({
   moduleId,contentStatus:readinessById.get(moduleId)?.status??'NOT_REPORTED',
   technicalStatus,candidateCount:candidates.length,
   teacherReviewCount:candidates.filter(x=>x.teacherReviewRequired).length,
   diagnostics:messages,
  });
 }
 for(const recipe of WORKSHEET_RECIPES){
  try{
   const built=buildWorksheetRecipe(lesson,recipe.id,{purpose:'editorial-review',seed:1});
   result.recipeReadiness.push({
    recipeId:recipe.id,ready:true,
    selectedModules:built.selections.length,openSlots:built.openSlots.length,
    diagnostics:[],
   });
  }catch(error){
   result.recipeReadiness.push({
    recipeId:recipe.id,ready:false,selectedModules:0,openSlots:0,
    diagnostics:[error instanceof Error?error.message:String(error)],
   });
  }
 }
 result.eligibleForPublication=source==='approved'&&
  approvedForPublic({
   lesson,scriptureDistributionCleared:true,rightsEvidence,
  })&&
  result.schemaErrors.length===0&&
  result.moduleReadiness.every(x=>x.technicalStatus!=='invalid')&&
  result.recipeReadiness.every(x=>x.ready);
 return result;
}
function mdCell(value){return String(value).replace(/\|/gu,'\\|').replace(/\r?\n/gu,' ');}
export function renderCurriculumReadinessMarkdown(report){
 const out=[
  '# Curriculum library readiness',
  '',
  'Generated by the current app validators, real puzzle engines and booklet recipe builder.',
  'A lesson in review is **not public**, even when all 27 activity types are technically ready.',
  '',
  '## Library checks',
  '',
  '| Check | Status |',
  '| --- | --- |',
  ...report.errors.map(error=>'| '+mdCell(error.code)+' | FAIL — '+mdCell(error.message)+' |'),
  '| Public lesson files | '+report.lessons.filter(x=>x.source==='approved').length+' |',
  '| Review lesson files | '+report.lessons.filter(x=>x.source==='review').length+' |',
 ];
 for(const lesson of report.lessons){
  const ready=lesson.moduleReadiness.filter(x=>x.technicalStatus==='ready').length;
  out.push('','## '+mdCell(lesson.title)+' — '+mdCell(lesson.id),'',
   '**Source:** '+lesson.source+' · **Publication field:** '+lesson.publicationStatus+
   ' · **Technically ready:** '+ready+'/27 · **Public eligible:** '+
   (lesson.eligibleForPublication?'yes':'no'),
   '',
   '**Teacher-approval flags unresolved:** '+
    (lesson.teacherReviewFlagsOutstanding.join(', ')||'none')+
    ' · **Scripture rights evidence:** '+(lesson.rightsCleared?'cleared':'not cleared'),
   '');
  if(lesson.schemaErrors.length){
   out.push('### Schema issues','',...lesson.schemaErrors.map(x=>'- '+x),'');
  }
  out.push('| Module | Source content status | Actual technical status | Candidates | Needs teacher review |',
   '| --- | --- | --- | ---: | ---: |',
   ...lesson.moduleReadiness.map(x=>'| '+mdCell(x.moduleId)+' | '+
    mdCell(x.contentStatus)+' | '+x.technicalStatus+' | '+x.candidateCount+
    ' | '+x.teacherReviewCount+' |'),
   '',
   '### Named worksheet recipes','',
   ...lesson.recipeReadiness.map(x=>'- **'+x.recipeId+'**: '+
    (x.ready?'ready ('+x.selectedModules+' modules, '+x.openSlots+' open regions)':
     'not ready — '+x.diagnostics.join(' '))),
   '');
  const problems=lesson.moduleReadiness.filter(x=>x.diagnostics.length);
  if(problems.length)out.push('### Technical diagnostics','',
   ...problems.map(x=>'- **'+x.moduleId+'**: '+x.diagnostics.join(' | ')), '');
 }
 return out.join('\n')+'\n';
}
async function getJson(path){
 try{return {data:JSON.parse(await readFile(path,'utf8')),error:null};}
 catch(error){return {data:null,error:String(error)};}
}
async function listFiles(dir){
 try{return await readdir(dir);}
 catch(error){if(error.code==='ENOENT')return [];throw error;}
}
export async function inspectCurriculumLibrary({root=ROOT,writeReports=false}={}){
 const curriculum=join(root,'curriculum');
 const reviewDir=join(curriculum,'review'),approvedDir=join(curriculum,'approved');
 const schemaResult=await getJson(join(curriculum,'schema','lesson-v1.schema.json'));
 if(schemaResult.error)throw Error('Curriculum schema is unavailable: '+schemaResult.error);
 const errors=[],lessons=[],seen=new Map();
 for(const [source,dir] of [['review',reviewDir],['approved',approvedDir]]){
  const names=await listFiles(dir);
  for(const name of names.sort()){
   if(name.endsWith('.md'))continue;
   if(!name.endsWith('.json'))continue;
   if(source==='approved'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*\.lesson\.json$/u.test(name)){
    errors.push({code:'approved-filename',message:'Approved file must use <lesson-id>.lesson.json: '+name});
    continue;
   }
   const parsed=await getJson(join(dir,name));
   if(parsed.error){
    errors.push({code:'json-parse',message:name+': '+parsed.error});
    continue;
   }
   const lesson=parsed.data;
   const id=lesson?.id;
   if(typeof id!=='string'){
    errors.push({code:'lesson-id',message:name+': lesson.id missing'});
    continue;
   }
   if(source==='approved'&&name!==id+'.lesson.json')
    errors.push({code:'filename-id',message:name+': filename must match lesson ID '+id});
   // A pending review copy may coexist with the final approved file. Only
   // approved lessons are bundled publicly; retaining a draft must not make
   // a one-file publication fail. Duplicates within a stage remain errors.
   const seenKey=source+':'+id;
   if(seen.has(seenKey))
    errors.push({code:'duplicate-id',message:id+' occurs in '+seen.get(seenKey)+' and '+source+'/'+name});
   else seen.set(seenKey,source+'/'+name);
   const rights=lesson?.publication?.scriptureRights;
   const report=assessCurriculumLesson(lesson,schemaResult.data,{source});
   lessons.push(report);
   if(report.schemaErrors.length)
    errors.push({code:'schema',message:id+': '+report.schemaErrors.join('; ')});
   if(source==='review'&&lesson.publication?.approved===true)
    errors.push({code:'review-stage',message:id+' is approved but still in review/; move it after approval'});
   if(source==='approved'){
    if(!isRightsEvidence(rights))
     errors.push({code:'rights-clearance',message:id+' requires an explicit Scripture-rights record in publication.scriptureRights'});
    if(!approvedForPublic({lesson,scriptureDistributionCleared:true,rightsEvidence:rights}))
     errors.push({code:'teacher-signoff',message:id+' lacks valid signed-off curriculum approval or clearance'});
    for(const bad of report.moduleReadiness.filter(x=>x.technicalStatus==='invalid')){
     errors.push({code:'invalid-module',message:id+' / '+bad.moduleId+': '+bad.diagnostics.join('; ')});
    }
    for(const recipe of report.recipeReadiness.filter(x=>!x.ready))
     errors.push({code:'recipe-not-ready',message:id+' / '+recipe.recipeId+': '+recipe.diagnostics.join('; ')});
    if(!report.eligibleForPublication)
     errors.push({code:'not-publishable',message:id+' cannot safely enter the public catalog'});
   }
  }
 }
 const result={schemaVersion:1,lessons,errors,passed:errors.length===0};
 if(writeReports){
  const artifacts=join(root,'artifacts');
  await mkdir(artifacts,{recursive:true});
  await writeFile(join(artifacts,'curriculum-readiness-report.json'),
   JSON.stringify(result,null,2)+'\n');
  await writeFile(join(artifacts,'curriculum-readiness-report.md'),
   renderCurriculumReadinessMarkdown(result));
 }
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await inspectCurriculumLibrary({writeReports:true});
 for(const lesson of report.lessons){
  const count=lesson.moduleReadiness.filter(x=>x.technicalStatus==='ready').length;
  console.log((lesson.schemaErrors.length?'FAIL':'PASS')+' '+lesson.id+
   ': '+count+'/27 technically ready; '+lesson.source+'; publication '+lesson.publicationStatus);
 }
 console.log('Written artifacts/curriculum-readiness-report.{json,md}');
 for(const error of report.errors)console.error('FAIL '+error.code+': '+error.message);
 if(!report.passed)process.exitCode=1;
}
