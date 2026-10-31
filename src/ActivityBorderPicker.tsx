import {useEffect,useState} from 'react';
import type {RegionSize} from './booklet.ts';
import {
 ACTIVITY_BORDER_CATALOG,ACTIVITY_SAFE_AREAS,ACTIVITY_BORDER_ROTATION_DEGREES,activityBorderUrl,
 type ActivityBorderId,
} from './activityBorders.ts';

/** Compact per-slot border picker. Its choices are locked until the
 * corresponding module's safe-area print layout has passed QA.
 */
export default function ActivityBorderPicker({size,value,enabled,onChange,slotKey}:{
 size:RegionSize;value:ActivityBorderId;enabled:boolean;
 onChange:(id:ActivityBorderId)=>void;slotKey:string;
}){
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[slotKey,size]);
 const chosen=ACTIVITY_BORDER_CATALOG[size].find(border=>border.id===value);
 const image=activityBorderUrl(size,value);
 const portraitArt=ACTIVITY_BORDER_ROTATION_DEGREES[size]===90;
 const aspectRatio=size==='small'?'2.4 / 2.6':size==='large'?'4.8 / 5.2':'4.8 / 2.6';
 return <div className="activity-border-editor">
  <span className="activity-border-heading">Activity border</span>
  <div className="cover-border-choice">
   <div className={'cover-border-current activity-border-current'+(portraitArt?' has-rotated-art':'')} aria-hidden="true" style={{aspectRatio}}>
    {image?<img src={image} alt=""/>:<span>No border</span>}
   </div>
   <div className="cover-border-choice-actions">
    <strong>{chosen?.name??'No border'}</strong>
    <button type="button" className="cover-border-trigger" aria-expanded={open}
     aria-controls="activity-border-gallery" onClick={()=>setOpen(previous=>!previous)}>
     {open?'Close border gallery':enabled?'Choose border':'Preview border styles'}
    </button>
    {enabled&&value!=='none'&&<button type="button" className="cover-border-remove" onClick={()=>onChange('none')}>Remove border</button>}
   </div>
  </div>
  {!enabled&&<p className="activity-border-pending" role="status">
   Activity borders are coming in the next PRs. You can preview the designs now;
   selection unlocks once this module has a print-safe layout.
  </p>}
  {enabled&&<p className="activity-border-pending">
   Printed content fits in {ACTIVITY_SAFE_AREAS[size].width} × {ACTIVITY_SAFE_AREAS[size].height} inches with a border.
  </p>}
  {open&&<div className="cover-border-gallery activity-border-gallery" id="activity-border-gallery"
    role="group" aria-label={size+' activity borders'}>
   <button type="button" className={'cover-border-option'+(value==='none'?' selected':'')}
    aria-pressed={value==='none'} disabled={!enabled}
    onClick={()=>{onChange('none');setOpen(false)}}>
    <span className="cover-border-thumbnail cover-border-no-art" style={{aspectRatio}}>No border</span><span>None</span>
   </button>
   {ACTIVITY_BORDER_CATALOG[size].map(border=><button type="button" key={border.id}
     className={'cover-border-option'+(value===border.id?' selected':'')}
     aria-pressed={value===border.id} disabled={!enabled}
     onClick={()=>{onChange(border.id);setOpen(false)}}>
    <span className={'cover-border-thumbnail activity-border-thumbnail'+(portraitArt?' has-rotated-art':'')} style={{aspectRatio}}>
     <img src={border.url} alt=""/>
    </span>
    <span>{border.name}</span>
   </button>)}
  </div>}
 </div>;
}
