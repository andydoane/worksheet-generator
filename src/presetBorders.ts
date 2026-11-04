import {DEFAULT_LAYOUTS,getRegions,type LayoutId,type PageNumber} from './booklet.ts';
import {ACTIVITY_BORDER_CATALOG,isActivityBorderId,isActivityBorderReady,
 type ActivityBorderId,type ActivityBorders} from './activityBorders.ts';
import {moduleForSize,slotKey} from './modules.ts';
import type {StoredDraft} from './draftMigration.ts';

/** The placement pattern chooses WHERE borders go; the mode chooses HOW
 * border artwork is assigned. Both are independent of lesson module content.
 */
export type PresetBorderMode='none'|'same'|'mix';
export type PresetBorderSettings={
 mode:PresetBorderMode;
 /** The matching artwork number for Small, Medium, Large and the cover. */
 style:ActivityBorderId;
 /** Stable, positive arrangement number; only Regenerate increments it. */
 seed:number;
};

export const COVER_BORDER_PATTERNS:readonly (readonly string[])[]=[
 ['cover-title'],
 ['cover-activity'],
];

/** Pattern order is positional/reading order within each layout, not activity
 * content order. Every option includes a deliberately balanced subset of
 * regions. The 'one small' LSS/SSL pattern has both left and right options.
 *
 * Count by family: cover 2; M+L / L+M 2; SSMM / MMSS 4;
 * MSSM 5; LSS / SSL 4 = 17 distinct placement designs.
 */
export const PRESET_BORDER_PATTERNS:Record<LayoutId,readonly (readonly string[])[]>={
 'medium-large':[
  ['top-medium'],['bottom-large'],
 ],
 'large-medium':[
  ['bottom-medium'],['top-large'],
 ],
 'small-small-medium-medium':[
  ['top-left-small','bottom-medium'],
  ['top-right-small','bottom-medium'],
  ['top-left-small','middle-medium'],
  ['top-right-small','middle-medium'],
 ],
 'medium-medium-small-small':[
  ['bottom-left-small','middle-medium'],
  ['bottom-right-small','middle-medium'],
  ['bottom-left-small','top-medium'],
  ['bottom-right-small','top-medium'],
 ],
 'medium-small-small-medium':[
  ['top-medium','middle-left-small'],
  ['top-medium','middle-right-small'],
  ['bottom-medium','middle-left-small'],
  ['bottom-medium','middle-right-small'],
  ['top-medium','bottom-medium'],
 ],
 'large-small-small':[
  ['top-large'],
  ['bottom-left-small','bottom-right-small'],
  ['bottom-left-small'],
  ['bottom-right-small'],
 ],
 'small-small-large':[
  ['bottom-large'],
  ['top-left-small','top-right-small'],
  ['top-left-small'],
  ['top-right-small'],
 ],
};

const catalogIds=ACTIVITY_BORDER_CATALOG.medium.map(x=>x.id);
const DEFAULT_STYLE=catalogIds[0];

export function readPresetBorderSettings(value:unknown):PresetBorderSettings|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const x=value as Record<string,unknown>;
 if(x.mode!=='none'&&x.mode!=='same'&&x.mode!=='mix')return undefined;
 const seed=typeof x.seed==='number'&&Number.isSafeInteger(x.seed)&&x.seed>=1&&x.seed<1_000_000_000
  ?x.seed:1;
 const style=isActivityBorderId(x.style)&&x.style!=='none'?x.style:DEFAULT_STYLE;
 return {mode:x.mode,style,seed};
}

function hash(value:string):number{
 let result=2166136261;
 for(let i=0;i<value.length;i++){
  result=Math.imul(result^value.charCodeAt(i),16777619);
 }
 return result>>>0;
}

function indexFor(seed:number,page:number,layout:string,count:number){
 return ((seed-1+(hash(layout+':'+page)%count))%count+count)%count;
}
function selectedPattern(page:PageNumber,layout:LayoutId,seed:number):readonly string[]{
 const options=page===1?COVER_BORDER_PATTERNS:PRESET_BORDER_PATTERNS[layout];
 return options[indexFor(seed,page,layout,options.length)];
}
function isBorderable(draft:StoredDraft,page:PageNumber,regionId:string,size:'small'|'medium'|'large'){
 const module=draft.modules[slotKey(page,regionId)];
 return !!module&&isActivityBorderReady(module.type)&&
  moduleForSize(size).some(item=>item.id===module.type);
}
function pageBorders(draft:StoredDraft,page:PageNumber,settings:PresetBorderSettings){
 const layout=page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page];
 const selected=selectedPattern(page,layout,settings.seed);
 const regions=getRegions(page,layout);
 const activityBorders:ActivityBorders={};
 let coverBorder:ActivityBorderId='none';
 const offset=(hash(layout+':'+page+':styles')+settings.seed*13)%catalogIds.length;
 let count=0;
 for(const regionId of selected){
  const region=regions.find(r=>r.id===regionId);
  if(!region)continue;
  if(region.kind!=='title'&&!isBorderable(draft,page,region.id,region.size))continue;
  const style=settings.mode==='same'?settings.style:
   catalogIds[(offset+count*7)%catalogIds.length];
  if(region.kind==='title')coverBorder=style;
  else activityBorders[slotKey(page,region.id)]=style;
  count++;
 }
 return {coverBorder,activityBorders};
}

/** Choosing a mode or regenerating explicitly replaces all saved border
 * assignments. The saved concrete assignments are the single source of truth
 * for preview, PDF rendering and manual subsequent overrides.
 */
export function arrangePresetBorders(
 draft:StoredDraft,settings:PresetBorderSettings,
):StoredDraft{
 const selection=readPresetBorderSettings(settings);
 if(!selection)throw Error('Choose a valid preset border mode.');
 const result:StoredDraft={...draft,borderArrangement:selection,
  coverBorder:'none',activityBorders:{}};
 if(selection.mode==='none')return result;
 for(const page of [1,2,3,4] as const){
  const assignments=pageBorders(result,page,selection);
  if(page===1)result.coverBorder=assignments.coverBorder;
  Object.assign(result.activityBorders,assignments.activityBorders);
 }
 return result;
}

/** A change to one page's physical layout updates only that page's automatic
 * placements, leaving user-tweaked borders on other pages unchanged.
 */
export function reflowPresetBordersOnPage(draft:StoredDraft,page:2|3|4):StoredDraft{
 const settings=draft.borderArrangement;
 if(!settings)return draft;
 const retained=Object.fromEntries(Object.entries(draft.activityBorders)
  .filter(([slot])=>!slot.startsWith(page+':'))) as ActivityBorders;
 const result={...draft,activityBorders:retained};
 if(settings.mode!=='none')
  Object.assign(result.activityBorders,pageBorders(result,page,settings).activityBorders);
 return result;
}

/** Carry the selected border mode and style when a user switches the
 * numbered preset or Bible story. Rebuild new-layout placements, never
 * reuse old region keys or carry a teacher's per-slot overrides blindly.
 */
export function carryPresetBorderMode(previous:Pick<StoredDraft,'borderArrangement'>,next:StoredDraft):StoredDraft{
 if(!previous.borderArrangement)return next;
 const selection={...previous.borderArrangement,
  seed:previous.borderArrangement.seed>=999_999_998?1:previous.borderArrangement.seed+1};
 return arrangePresetBorders(next,selection);
}

export function regeneratePresetBorders(draft:StoredDraft):StoredDraft{
 const saved=draft.borderArrangement;
 if(!saved||saved.mode==='none')return draft;
 return arrangePresetBorders(draft,{...saved,seed:saved.seed>=999_999_998?1:saved.seed+1});
}
