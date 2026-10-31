/** Built-in cover border catalog. Stable numeric IDs are saved in older drafts. */
export const COVER_BORDER_NONE='none';
export const COVER_BORDER_URLS=[
  new URL('../images/borders/medium_border_1.png',import.meta.url).href,
  new URL('../images/borders/medium_border_2.png',import.meta.url).href,
  new URL('../images/borders/medium_border_3.png',import.meta.url).href,
  new URL('../images/borders/medium_border_4.png',import.meta.url).href,
  new URL('../images/borders/medium_border_5.png',import.meta.url).href,
  new URL('../images/borders/medium_border_6.png',import.meta.url).href,
  new URL('../images/borders/medium_border_7.png',import.meta.url).href,
  new URL('../images/borders/medium_border_8.png',import.meta.url).href,
  new URL('../images/borders/medium_border_9.png',import.meta.url).href,
  new URL('../images/borders/medium_border_10.png',import.meta.url).href,
  new URL('../images/borders/medium_border_11.png',import.meta.url).href,
] as const;
export type CoverBorderId='none' | `border-${number}`;
export const COVER_BORDERS=COVER_BORDER_URLS.map((url,index)=>({
 id:`border-${index+1}` as CoverBorderId,
 name:`Border ${index+1}`,
 url,
}));
export function isCoverBorderId(value:unknown):value is CoverBorderId{
 return value==='none'||COVER_BORDERS.some(border=>border.id===value);
}
export function coverBorderUrl(id:CoverBorderId|undefined):string|undefined{
 return COVER_BORDERS.find(border=>border.id===id)?.url;
}
/** All measurements in inches relative to the unpadded 4.8x2.6 cover region. */
export const COVER_BORDER_SAFE_WIDTH=4.3;
export const COVER_BORDER_SAFE_HEIGHT=2.15;
