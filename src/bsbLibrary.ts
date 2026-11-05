import {parseBsbText,type BsbIndex,type Passage} from './review/bsb.ts';

/** One committed, publisher-sourced Bible file is shared by the public picker and Review Studio.
 * The deploy must never replace this approved snapshot by fetching live text.
 */
export const BSB_ASSET_PATH='bible/bsb.txt';
export const BSB_SOURCE_URL='https://bereanbible.com/bsb.txt';
export const BSB_TERMS_URL='https://berean.bible/terms.htm';
export type BsbSelection=Passage&{translation:'BSB';isExcerpt:boolean};

const pending=new Map<string,Promise<BsbIndex>>();
export function bsbAssetUrl(baseUrl:string):string{
 return baseUrl.replace(/\/?$/u,'/')+BSB_ASSET_PATH;
}
export function loadBsbIndex(baseUrl:string):Promise<BsbIndex>{
 const url=bsbAssetUrl(baseUrl),cached=pending.get(url);
 if(cached)return cached;
 const load=fetch(url).then(response=>{
  if(!response.ok)throw Error('The locally hosted BSB text is unavailable (HTTP '+response.status+').');
  return response.text();
 }).then(raw=>parseBsbText(raw,true)).catch(error=>{
  pending.delete(url);throw error;
 });
 pending.set(url,load);
 return load;
}
export function bsbChapters(index:BsbIndex,book:string):number[]{
 const result=new Set<number>();
 for(const key of Object.keys(index.verses)){
  if(!key.startsWith(book+' '))continue;
  const match=key.slice(book.length+1).match(/^(\d+):\d+$/u);
  if(match)result.add(Number(match[1]));
 }
 return [...result].sort((a,b)=>a-b);
}
export function bsbVerses(index:BsbIndex,book:string,chapter:number):number[]{
 const result:number[]=[];
 const prefix=book+' '+chapter+':';
 for(const key of Object.keys(index.verses)){
  if(!key.startsWith(prefix))continue;
  const verse=Number(key.slice(prefix.length));
  if(Number.isSafeInteger(verse)&&verse>0)result.push(verse);
 }
 return result.sort((a,b)=>a-b);
}
