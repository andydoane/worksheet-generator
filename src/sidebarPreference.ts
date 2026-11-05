/**
 * Sidebar-only preference; independent of the saved worksheet draft.
 * No storage access occurs at module import time and blocked storage is safe.
 */
export const SIDEBAR_COLLAPSED_KEY='worksheet-studio:sidebar-collapsed:v1';
type PreferenceStorage=Pick<Storage,'getItem'|'setItem'>;

export function sidebarCollapsedFromValue(value:string|null):boolean{
 return value==='collapsed';
}
export function readSidebarCollapsed(storage?:PreferenceStorage):boolean{
 try{return sidebarCollapsedFromValue((storage??window.localStorage).getItem(SIDEBAR_COLLAPSED_KEY));}
 catch{return false;}
}
export function saveSidebarCollapsed(collapsed:boolean,storage?:PreferenceStorage):void{
 try{(storage??window.localStorage).setItem(SIDEBAR_COLLAPSED_KEY,collapsed?'collapsed':'expanded');}
 catch{ /* Browsers may disable persistence; interaction still works in memory. */ }
}
