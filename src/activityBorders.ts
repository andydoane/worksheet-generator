import {BOOKLET,type RegionSize} from './booklet.ts';
import {COVER_BORDERS,type CoverBorderId} from './coverBorders.ts';
import type {ModuleId} from './modules.ts';

/** Stable border IDs shared with the cover; each size has its own artwork. */
export type ActivityBorderId=CoverBorderId;
export type ActivityBorders=Record<string,ActivityBorderId>;
const SMALL_BORDER_URLS=[
  new URL('../images/borders/small_border_1.png',import.meta.url).href,
  new URL('../images/borders/small_border_2.png',import.meta.url).href,
  new URL('../images/borders/small_border_3.png',import.meta.url).href,
  new URL('../images/borders/small_border_4.png',import.meta.url).href,
  new URL('../images/borders/small_border_5.png',import.meta.url).href,
  new URL('../images/borders/small_border_6.png',import.meta.url).href,
  new URL('../images/borders/small_border_7.png',import.meta.url).href,
  new URL('../images/borders/small_border_8.png',import.meta.url).href,
  new URL('../images/borders/small_border_9.png',import.meta.url).href,
  new URL('../images/borders/small_border_10.png',import.meta.url).href,
  new URL('../images/borders/small_border_11.png',import.meta.url).href,
] as const;
const LARGE_BORDER_URLS=[
  new URL('../images/borders/large_border_1.png',import.meta.url).href,
  new URL('../images/borders/large_border_2.png',import.meta.url).href,
  new URL('../images/borders/large_border_3.png',import.meta.url).href,
  new URL('../images/borders/large_border_4.png',import.meta.url).href,
  new URL('../images/borders/large_border_5.png',import.meta.url).href,
  new URL('../images/borders/large_border_6.png',import.meta.url).href,
  new URL('../images/borders/large_border_7.png',import.meta.url).href,
  new URL('../images/borders/large_border_8.png',import.meta.url).href,
  new URL('../images/borders/large_border_9.png',import.meta.url).href,
  new URL('../images/borders/large_border_10.png',import.meta.url).href,
  new URL('../images/borders/large_border_11.png',import.meta.url).href,
] as const;
export const ACTIVITY_BORDER_CATALOG={
 small:SMALL_BORDER_URLS.map((url,index)=>({id:`border-${index+1}` as ActivityBorderId,name:`Border ${index+1}`,url})),
 medium:COVER_BORDERS,
 large:LARGE_BORDER_URLS.map((url,index)=>({id:`border-${index+1}` as ActivityBorderId,name:`Border ${index+1}`,url})),
};
export const ACTIVITY_SAFE_AREAS={
 small:{width:1.95,height:2.15},
 medium:{width:4.3,height:2.1},
 large:{width:4,height:4.35},
} as const;

/** PR 16b is infrastructure only. Enable module IDs individually after
 * their preview, PDF, and worst-case density tests pass in PRs 16c–16e.
 */
export const BORDER_READY_MODULES:readonly ModuleId[]=[];
export function isActivityBorderReady(moduleId:ModuleId|undefined):boolean{
 return moduleId!==undefined&&BORDER_READY_MODULES.includes(moduleId);
}
export function isActivityBorderId(value:unknown):value is ActivityBorderId{
 return value==='none'||ACTIVITY_BORDER_CATALOG.medium.some(border=>border.id===value);
}
export function activityBorderUrl(size:RegionSize,id:ActivityBorderId|undefined):string|undefined{
 return ACTIVITY_BORDER_CATALOG[size].find(border=>border.id===id)?.url;
}
/** Accept only known saved slot keys and border IDs, without tying styling to
 * module payloads. An absent/invalid choice means 'none'.
 */
export function readActivityBorders(value:unknown):ActivityBorders{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const valid:ActivityBorders={};
 for(const [key,id] of Object.entries(value))
  if(/^[1-4]:[a-z0-9-]+$/.test(key)&&isActivityBorderId(id)&&id!=='none')
   valid[key]=id;
 return valid;
}
export function setActivityBorder(
 previous:ActivityBorders,key:string,id:ActivityBorderId,
):ActivityBorders{
 const next={...previous};
 if(id==='none')delete next[key];
 else next[key]=id;
 return next;
}
export type PrintRect={x:number;y:number;width:number;height:number};
export type ActivityPrintViewport={artwork:PrintRect;content:PrintRect;bordered:boolean};
/** Shared print-point viewport, with y measured from PDF's bottom.
 * The PNG always occupies the full slot. The inner content rectangle is
 * centered; borderless mode preserves the original 0.1-inch padding.
 * No activity renderer is switched to this until it is certified as ready.
 */
export function planActivityPrintViewport(size:RegionSize,rect:PrintRect,bordered:boolean):ActivityPrintViewport{
 const standard={width:rect.width-BOOKLET.padding*144,height:rect.height-BOOKLET.padding*144};
 const safe=bordered?ACTIVITY_SAFE_AREAS[size]:{
  width:standard.width/72,height:standard.height/72,
 };
 const width=safe.width*72,height=safe.height*72;
 if(width<=0||height<=0||width>rect.width+.001||height>rect.height+.001)
  throw Error('Activity border content zone does not fit its region.');
 return {
  artwork:{...rect},
  content:{x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height},
  bordered,
 };
}
