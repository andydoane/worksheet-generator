import {shuffledIndices} from './shuffle.ts';
import {sortedStoryBank,type SortStory} from './storyVerseModules.ts';

/** Stable uploaded square PNGs. Keep filenames and order stable for saved drafts. */
export const SORT_STORY_SYMBOL_URLS=[
 new URL('../images/symbols/symbol__01.png',import.meta.url).href,
 new URL('../images/symbols/symbol__02.png',import.meta.url).href,
 new URL('../images/symbols/symbol__03.png',import.meta.url).href,
 new URL('../images/symbols/symbol__04.png',import.meta.url).href,
 new URL('../images/symbols/symbol__05.png',import.meta.url).href,
 new URL('../images/symbols/symbol__06.png',import.meta.url).href,
 new URL('../images/symbols/symbol__07.png',import.meta.url).href,
 new URL('../images/symbols/symbol__08.png',import.meta.url).href,
 new URL('../images/symbols/symbol__09.png',import.meta.url).href,
 new URL('../images/symbols/symbol__10.png',import.meta.url).href,
 new URL('../images/symbols/symbol__11.png',import.meta.url).href,
 new URL('../images/symbols/symbol__12.png',import.meta.url).href,
 new URL('../images/symbols/symbol__13.png',import.meta.url).href,
 new URL('../images/symbols/symbol__14.png',import.meta.url).href,
 new URL('../images/symbols/symbol__15.png',import.meta.url).href,
 new URL('../images/symbols/symbol__16.png',import.meta.url).href,
 new URL('../images/symbols/symbol__17.png',import.meta.url).href,
 new URL('../images/symbols/symbol__18.png',import.meta.url).href,
 new URL('../images/symbols/symbol__19.png',import.meta.url).href,
 new URL('../images/symbols/symbol__20.png',import.meta.url).href,
 new URL('../images/symbols/symbol__21.png',import.meta.url).href,
 new URL('../images/symbols/symbol__22.png',import.meta.url).href,
 new URL('../images/symbols/symbol__23.png',import.meta.url).href,
 new URL('../images/symbols/symbol__24.png',import.meta.url).href,
 new URL('../images/symbols/symbol__25.png',import.meta.url).href,
 new URL('../images/symbols/symbol__26.png',import.meta.url).href,
 new URL('../images/symbols/symbol__27.png',import.meta.url).href,
 new URL('../images/symbols/symbol__28.png',import.meta.url).href,
 new URL('../images/symbols/symbol__29.png',import.meta.url).href,
 new URL('../images/symbols/symbol__30.png',import.meta.url).href,
] as const;
export const SORT_STORY_SYMBOL_COUNT=SORT_STORY_SYMBOL_URLS.length;

/** A seeded, non-repeating subset. No extra field is needed in saved drafts. */
export function sortStorySymbolIds(module:SortStory):number[]{
 const count=sortedStoryBank(module).length;
 return shuffledIndices(SORT_STORY_SYMBOL_COUNT,module.statements,module.seed)
  .slice(0,count).map(index=>index+1);
}
export function sortStorySymbolUrl(id:number):string{
 if(!Number.isInteger(id)||id<1||id>SORT_STORY_SYMBOL_COUNT)
  throw Error('Unknown Sort the Story symbol '+id);
 return SORT_STORY_SYMBOL_URLS[id-1];
}

/** PDF assets load in both the browser and Node test/sample runners.
 * Vite resolves the static URLs to versioned assets; Node reads file: URLs.
 */
export async function loadSortStorySymbolPng(id:number):Promise<Uint8Array>{
 const url=new URL(sortStorySymbolUrl(id));
 if(url.protocol==='file:'){
  const nodeFs='node:fs/promises';
  const {readFile}=await import(/* @vite-ignore */ nodeFs);
  return new Uint8Array(await readFile(url));
 }
 const response=await fetch(url);
 if(!response.ok)throw Error('Unable to load Sort the Story symbol '+id+'; try exporting again.');
 return new Uint8Array(await response.arrayBuffer());
}
