import type {ActivityModule} from './modules.ts';
import {linesFromInput,parseStatements} from './storyVerseModules.ts';
import {parsePairs} from './modules.ts';
import {parseCrossword} from './specialtyModules.ts';
import {parseSearchWords} from './puzzleEngines.ts';

/** Contextual editor hints; core PDF validation remains unchanged. */
export function explainActivityError(module:ActivityModule,error:string):string{
 if(module.type==='story-order'&&error.startsWith('Enter 5–8')){
  const n=linesFromInput(module.events).length;
  return n<5?'You have '+n+' story events. Add '+(5-n)+' more to reach 5 (one event per line).'
   :'You have '+n+' story events. Remove '+(n-8)+' to stay within 8.';
 }
 if(module.type==='sort-story'){
  if(error.startsWith('Enter 4–8')){
   const n=parseStatements(module.statements).length;
   return 'You have '+n+' statements. Use 4–8 total, with at least one TRUE and one FALSE.';
  }
  if(error.startsWith('End every line')){
   const bad=module.statements.split(/\r?\n/u).findIndex(s=>s.trim()&&!/^(.*?)\s+(true|false)\s*$/iu.test(s));
   if(bad>=0)return 'Line '+(bad+1)+': end the statement with true or false (example: God saved them. true).';
  }
 }
 if(module.type==='match-words'&&error.startsWith('Each pair must')){
  const bad=parsePairs(module.pairs).findIndex(pair=>!pair.left||!pair.right);
  if(bad>=0)return 'Pair '+(bad+1)+': add both sides separated by a comma (example: Moses, Leader).';
 }
 if(module.type==='crossword'){
  if(error.startsWith('Enter 6–10')){
   const n=parseCrossword(module.entries).length;
   return 'You have '+n+' crossword entries. Enter 6–10 ANSWER, clue pairs.';
  }
  if(error.startsWith('Each clue must')){
   const bad=module.entries.split(/\r?\n/u).filter(s=>s.trim()).findIndex(s=>{
    const at=s.indexOf(',');
    return at<0||!s.slice(at+1).trim()||s.slice(at+1).trim().length>85;
   });
   if(bad>=0)return 'Crossword entry '+(bad+1)+': add a clue after the comma (ANSWER, clue).';
  }
 }
 if((module.type==='word-search'||module.type==='medium-word-search')&&error.startsWith('Enter ')){
  const count=parseSearchWords(module.words).length;
  return 'You have '+count+' search words. '+error;
 }
 return error;
}
