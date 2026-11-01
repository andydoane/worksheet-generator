import {BOOKLET,type RegionSize} from './booklet.ts';
import {COVER_BORDERS,type CoverBorderId} from './coverBorders.ts';
import type {ModuleId} from './modules.ts';
import {SMALL_MODULES} from './smallModules.ts';
import {MODULES} from './modules.ts';

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
/** Large source PNGs are landscape 5.2x4.8 artwork stored sideways.
 * Rotate them 90 degrees when placing them on a portrait 4.8x5.2 slot;
 * never stretch or warp them to compensate.
 */
export const ACTIVITY_BORDER_ROTATION_DEGREES={
 small:0,medium:0,large:90,
} as const;
export const ACTIVITY_SAFE_AREAS={
 small:{width:1.95,height:2.15},
 medium:{width:4.3,height:2.1},
 large:{width:4,height:4.35},
} as const;

/** PR 16d enables all Small and Medium module types. Large remains
 * gated pending its own preview, PDF, and density checks.
 * The Medium list is derived from the registered module catalog so a new
 * module cannot accidentally gain an unchecked layout without a test.
 */
export const BORDER_READY_MODULES:readonly ModuleId[]=[
 'draw-picture',...SMALL_MODULES.map(item=>item.id),
 ...MODULES.filter(item=>item.size==='medium').map(item=>item.id),
];
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
export type ActivityPrintViewport={artwork:PrintRect;content:PrintRect;bordered:boolean;artworkRotationDegrees:0|90};
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
  bordered,artworkRotationDegrees:ACTIVITY_BORDER_ROTATION_DEGREES[size],
 };
}

/** A uniform *isotropic* transformation maps the legacy measured Small
 * interior into its centered bordered safe zone. Both browser viewBox and
 * PDF CTM consume the same 2.2x2.4 source and 1.95x2.15 target. This keeps
 * the existing robust line breaks, handwritten cells, square checkboxes,
 * and font proportions without introducing separate puzzle algorithms.
 */
export function planSmallBorderFit(region:PrintRect){
 return planActivityBorderFit('small',region);
}
/** Apply the *same* centered isotropic fit to every Medium print scene.
 * Its source is the original 4.6 × 2.4in measured layout, not a redesigned
 * puzzle; its target is the 4.3 × 2.1in artwork safe area. The height is
 * limiting (87.5% scale), leaving extra clearance on each side.
 */
export function planMediumBorderFit(region:PrintRect){
 return planActivityBorderFit('medium',region);
}
export function planActivityBorderFit(size:RegionSize,region:PrintRect){
 const viewport=planActivityPrintViewport(size,region,true);
 const source=planActivityPrintViewport(size,region,false).content;
 const scale=Math.min(viewport.content.width/source.width,viewport.content.height/source.height);
 const sourceCenterX=source.x+source.width/2,sourceCenterY=source.y+source.height/2;
 const destinationCenterX=viewport.content.x+viewport.content.width/2;
 const destinationCenterY=viewport.content.y+viewport.content.height/2;
 return {scale,translateX:destinationCenterX-sourceCenterX*scale,
  translateY:destinationCenterY-sourceCenterY*scale,source,viewport,
  fittedWidth:source.width*scale,fittedHeight:source.height*scale};
}
