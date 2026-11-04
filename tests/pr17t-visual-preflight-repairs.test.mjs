import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildWorksheetRecipe,RecipeContentConflictError} from '../src/worksheetRecipes.ts';
import {
 chooseDistinctPresetWordBanks,contentClaimsForModule,
} from '../src/lessonContentPool.ts';
import {buildReviewPreflight,reviewIssueTarget} from '../src/review/preflight.ts';
import {checkReviewContent,listReviewTasks} from '../src/review/model.ts';
import {
 addSuggestedConnectPhrase,chooseConnectPhrase,connectPhraseChoices,
 connectPhraseProblems,connectPhraseWordCount,writeConnectPhrase,
} from '../src/review/connectPhrase.ts';
import {
 addSearchWord,chooseSourceSearchWord,moveSearchWord,removeSearchWord,
 searchIssues,searchWords,setSearchWord,sourceVocabulary,
} from '../src/review/wordSearchEditor.ts';

const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const ot31=await load('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const ot32=await load('curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json');

test('Connect the Phrase offers source-backed choices, independent of the authored Important Idea',()=>{
 const before=JSON.stringify(ot32);
 const options=connectPhraseChoices(ot32);
 assert.ok(options.some(x=>x.text===ot32.lessonDetails.bigIdeas[0].text));
 const sourceOption=options.find(x=>x.text===ot32.keyPhrases[1].text);
 assert.ok(sourceOption);
 const edited=chooseConnectPhrase(ot32,sourceOption.text);
 assert.equal(edited.preparedActivities.connectBigIdea.phrase,sourceOption.text);
 assert.deepEqual(edited.preparedActivities.connectBigIdea.sourceIds,sourceOption.sourceIds);
 assert.equal(edited.preparedActivities.connectBigIdea.origin,sourceOption.origin);
 assert.equal(edited.lessonDetails.bigIdeas[0].text,ot32.lessonDetails.bigIdeas[0].text);
 assert.deepEqual(edited.preparedActivities.bigIdeaCryptogram,ot32.preparedActivities.bigIdeaCryptogram);
 assert.deepEqual(connectPhraseProblems(sourceOption.text),[]);
 assert.ok(connectPhraseWordCount(sourceOption.text)>=4);
 assert.equal(JSON.stringify(ot32),before,'Review action cannot edit an approved lesson in place');
});

test('Typed Connect the Phrase wording needs explicit suggestion and teacher review',()=>{
 const idea='God faithfully provides help when his people ask.';
 const typed=writeConnectPhrase(ot32,idea);
 const record=typed.preparedActivities.connectBigIdea;
 assert.equal(record.origin,'suggested');
 assert.equal(record.teacherReviewRequired,true);
 assert.deepEqual(record.sourceIds,[]);
 assert.equal(record.source,undefined);
 assert.equal(typed.lessonDetails.bigIdeas[0].text,ot32.lessonDetails.bigIdeas[0].text);
 assert.ok(checkReviewContent(typed).some(x=>x.startsWith('connect-big-idea:')),
  'Unregistered wording must not be silently considered approved');
 assert.deepEqual(connectPhraseProblems(idea),[]);
 const reviewed=addSuggestedConnectPhrase(typed);
 assert.ok(reviewed.keyPhrases.some(x=>x.text===idea&&x.teacherReviewRequired===true));
 assert.ok(!checkReviewContent(reviewed).some(x=>x.startsWith('connect-big-idea:')),
  'A source-linked suggested phrase can be used after explicit review');
 assert.equal(reviewed.preparedActivities.connectBigIdea.teacherReviewRequired,true);
 assert.equal(reviewed.preparedActivities.bigIdeaCryptogram.phrase,
  ot32.preparedActivities.bigIdeaCryptogram.phrase);
 assert.equal(ot32.keyPhrases.some(x=>x.text===idea),false);
 assert.ok(connectPhraseProblems('hello there').length);
 assert.ok(connectPhraseProblems('a '.repeat(70)).length);
 assert.throws(()=>chooseConnectPhrase(ot32,'An unknown phrase'),/source-linked/u);
});

test('Word Search repairs preserve lesson content and mark edited vocabulary as suggested',()=>{
 const original=JSON.stringify(ot32);
 assert.deepEqual(searchIssues(searchWords(ot32,'wordSearch'),'wordSearch'),[]);
 assert.deepEqual(searchIssues(searchWords(ot32,'mediumWordSearch'),'mediumWordSearch'),[]);
 const removed=removeSearchWord(ot32,'wordSearch',0);
 assert.equal(searchWords(removed,'wordSearch').length,11);
 const replaced=setSearchWord(removed,'wordSearch',0,'LOCUSTS');
 assert.equal(searchWords(replaced,'wordSearch')[0],'LOCUSTS');
 assert.equal(replaced.preparedActivities.wordSearch.origin,'suggested');
 assert.equal(replaced.preparedActivities.wordSearch.teacherReviewRequired,true);
 assert.equal(replaced.preparedActivities.wordSearch.source,undefined);
 assert.deepEqual(replaced.preparedActivities.mediumWordSearch,ot32.preparedActivities.mediumWordSearch);
 assert.deepEqual(replaced.vocabulary,ot32.vocabulary);
 const reordered=moveSearchWord(replaced,'wordSearch',0,1);
 assert.equal(searchWords(reordered,'wordSearch')[1],'LOCUSTS');
 const readded=addSearchWord(removed,'wordSearch');
 assert.equal(searchWords(readded,'wordSearch').length,12);
 assert.ok(searchIssues(searchWords(readded,'wordSearch'),'wordSearch')
  .some(x=>x.message.includes('empty')));
 assert.throws(()=>addSearchWord(ot32,'wordSearch'),/already full/u);
 assert.throws(()=>moveSearchWord(ot32,'wordSearch',0,-1),/Cannot move/u);
 const options=sourceVocabulary(ot32,'mediumWordSearch');
 assert.ok(options.some(x=>x.term==='MANNA'));
 assert.ok(options.every(x=>x.term.replace(/ /gu,'').length<=9));
 const sourced=chooseSourceSearchWord(ot32,'mediumWordSearch',0,'MANNA');
 assert.equal(searchWords(sourced,'mediumWordSearch')[0],'MANNA');
 assert.equal(sourced.preparedActivities.mediumWordSearch.teacherReviewRequired,true);
 assert.throws(()=>chooseSourceSearchWord(ot32,'wordSearch',0,'INVENTED'),/no new words/u);
 assert.equal(JSON.stringify(ot32),original);
});

test('Both word-search sizes report missing, duplicate, malformed, and overlong words',()=>{
 assert.ok(searchIssues([],'wordSearch').some(x=>x.message.includes('4–12')));
 assert.ok(searchIssues([],'mediumWordSearch').some(x=>x.message.includes('1–6')));
 const bad=['Manna','MANNA','A','TWO-WORDS','THISISWAYTOOLONG'];
 const issues=searchIssues(bad,'wordSearch');
 for(const fragment of ['repeats','2–12','single spaces','empty']){
  if(fragment==='empty')continue;
  assert.ok(issues.some(x=>x.message.includes(fragment)),fragment);
 }
 assert.ok(searchIssues(['','MANNA'],'mediumWordSearch').some(x=>x.index===0));
});

test('Preset 2 joint selection chooses a nonrepeating pair instead of greedy failure',()=>{
 const candidate=(moduleId,contentId,claims)=>({moduleId,contentId,claims});
 const oddFull=candidate('odd-words','full',['vocab:locusts','vocab:manna','vocab:quail']);
 const oddAlternative=candidate('odd-words','alternative',['vocab:manna','vocab:quail']);
 const searchFull=candidate('word-search','full',['vocab:locusts','vocab:water','vocab:rock']);
 const plan=chooseDistinctPresetWordBanks([oddFull,oddAlternative],[searchFull],new Set());
 assert.equal(plan.odd.contentId,'alternative');
 assert.equal(plan.search.contentId,'full');
 assert.equal(chooseDistinctPresetWordBanks([oddFull],[searchFull],new Set()),undefined);
});

const restrictedVocabulary=(terms)=>{
 const next=structuredClone(ot32);
 next.vocabulary.entries=next.vocabulary.entries.filter(entry=>
  terms.includes(entry.term.toUpperCase()));
 return next;
};
test('Preset 2 recovers from scarce reviewed vocabulary using a shorter search',()=>{
 const before=JSON.stringify(ot32);
 const lesson=restrictedVocabulary([
  'MOSES','AARON','JOSHUA','WILDERNESS','MANNA','QUAIL',
  'WATER','ROCK','STAFF','SABBATH',
 ]);
 assert.equal(lesson.vocabulary.entries.length,10);
 const result=buildWorksheetRecipe(lesson,'preset-2',{purpose:'editorial-review',seed:1});
 assert.equal(result.openSlots.length,0);
 const odd=result.draft.modules['3:top-left-small'];
 const search=result.draft.modules['3:bottom-large'];
 assert.equal(odd.type,'odd-words');
 assert.equal(search.type,'word-search');
 const searchCount=search.words.trim().split('\n').length;
 assert.ok(searchCount>=4&&searchCount<10,'Use a 4–9-word reviewed fallback, not invented vocabulary');
 const overlap=contentClaimsForModule(odd,lesson).filter(x=>
  contentClaimsForModule(search,lesson).includes(x));
 assert.deepEqual(overlap,[],'Repeated printed words are forbidden within the booklet');
 const allowable=new Set(lesson.vocabulary.entries.map(entry=>entry.term.toUpperCase()));
 assert.ok(search.words.split('\n').every(word=>allowable.has(word)));
 assert.equal(JSON.stringify(ot32),before);
});

test('Unavoidable conflicts carry structured module+slot and link directly to Word Search editor',()=>{
 const lesson=restrictedVocabulary(['MANNA','QUAIL','SABBATH','ROCK']);
 assert.equal(lesson.vocabulary.entries.length,4);
 let error;
 try{buildWorksheetRecipe(lesson,'preset-2',{purpose:'editorial-review',seed:1});}
 catch(e){error=e;}
 assert.ok(error instanceof RecipeContentConflictError,String(error));
 assert.equal(error.moduleId,'word-search');
 assert.equal(error.slot,'3:bottom-large');
 assert.equal(error.recipeId,'preset-2');
 assert.ok(error.conflicts.some(x=>x.startsWith('vocab:')));
 const report=buildReviewPreflight(lesson);
 const issue=report.issues.find(x=>x.recipeId==='preset-2'&&x.moduleId==='word-search');
 assert.ok(issue,'Preset conflict should be actionable even with 27/27 content conversions');
 assert.equal(issue.taskId,'word-search');
 assert.equal(issue.fieldId,'review-field-word-search');
 assert.equal(issue.slot,'3:bottom-large');
 assert.ok(issue.conflicts.some(x=>x.startsWith('vocab:')));
 const oldMessage='Preset 2: Preset 2 needs a distinct word-search activity at 3:bottom-large, but all approved alternatives repeat: vocab:locusts.';
 assert.equal(reviewIssueTarget(oldMessage).taskId,'word-search');
 assert.equal(reviewIssueTarget('connect-big-idea: phrase too long').taskId,'connect-phrase');
 assert.equal(reviewIssueTarget('medium-word-search: bad word').taskId,'medium-word-search');
 for(const id of ['connect-phrase','word-search','medium-word-search'])
  assert.ok(listReviewTasks(lesson).some(task=>task.id===id));
});

test('OT31 and OT32 still build all three unchanged approved presets',()=>{
 for(const lesson of [ot31,ot32]){
  for(const id of ['preset-1','preset-2','preset-3']){
   const result=buildWorksheetRecipe(lesson,id,{purpose:'published',seed:1});
   assert.equal(result.openSlots.length,0,lesson.id+' '+id);
  }
 }
});

test('Repair navigation uses visual components and print-matched puzzle previews',async()=>{
 const [app,connect,word]=await Promise.all([
  readFile(new URL('../src/review/ReviewApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/ConnectPhraseReviewEditor.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/review/WordSearchReviewEditor.tsx',import.meta.url),'utf8'),
 ]);
 assert.match(app,/setSelectedId\(issue.taskId\)/u);
 assert.match(app,/setFocusIssueField\(issue.fieldId\)/u);
 assert.match(app,/repairConflictWords/u);
 assert.match(app,/ConnectPhraseReviewEditor lesson=\{lesson\}/u);
 assert.match(app,/WordSearchReviewEditor lesson=\{lesson\} kind="wordSearch"/u);
 assert.match(connect,/ConnectBigIdeaPrintPreview module=/u);
 assert.match(word,/WordSearchPrintPreview module=/u);
 assert.match(word,/MediumWordSearchPrintPreview module=/u);
 assert.match(word,/chooseSourceSearchWord\(/u);
});
