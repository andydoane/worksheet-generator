import {validateModule} from '../modules.ts';
import {markSelectedWords} from './bsb.ts';

/** Both activities must accept the identical set before a Review Studio
 * shortcut copies it. Finish permits 2–8, Unscramble 4–8; a shared set
 * therefore needs 4–8 independently eligible words.
 *
 * Return diagnostics without modifying the current excerpt or selections.
 */
export function sharedVerseBlankIssues(
 text:string,reference:string,selected:readonly number[],
):string[]{
 const unique=[...new Set(selected)];
 if(unique.length<4||unique.length>8)
  return ['Select 4–8 blank words to use the same choices in both activities.'];
 try{
  const marked=markSelectedWords(text,unique);
  return [...new Set([
   ...validateModule({type:'finish-verse',reference,verse:marked,seed:1}),
   ...validateModule({type:'unscramble-verse',reference,verse:marked,seed:1}),
  ])];
 }catch(error){
  return [error instanceof Error?error.message:'Could not share this selection.'];
 }
}
