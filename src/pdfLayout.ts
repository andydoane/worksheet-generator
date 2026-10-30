/**
 * Geometry shared by print renderers. Coordinates are bottom-left PDF points.
 * Each section declares its minimum height and permitted growth. Remaining
 * space centers the ENTIRE group rather than leaving it attached to the top.
 */
export type LayoutRect={x:number;y:number;width:number;height:number};
export type StackPart={height:number;maxHeight?:number;grow?:number};
export const MODULE_TITLE_PT=25;
export function centeredBaseline(box:LayoutRect,fontSize:number):number{
  return box.y+(box.height-fontSize)/2+fontSize*.22;
}
export function textCenterX(box:LayoutRect,textWidth:number):number{
  return box.x+(box.width-textWidth)/2;
}
export function measureWrappedLines(text:string,maxWidth:number,measure:(text:string)=>number):string[]|null{
  const words=text.trim().split(/\s+/u).filter(Boolean);
  const rows:string[]=[];let line='';
  for(const word of words){
    if(measure(word)>maxWidth)return null;
    const next=line?line+' '+word:word;
    if(line&&measure(next)>maxWidth){rows.push(line);line=word;}
    else line=next;
  }
  if(line)rows.push(line);
  return rows;
}
export function verticalStack(box:LayoutRect,parts:readonly StackPart[],gap=0):LayoutRect[]{
  if(!parts.length)return [];
  if(gap<0)throw Error('Stack gap must be nonnegative.');
  const min=parts.reduce((sum,p)=>sum+p.height,0)+(parts.length-1)*gap;
  if(min>box.height+.01)throw Error('Activity content does not fit the allotted print height.');
  const heights=parts.map(p=>p.height);
  let spare=box.height-min;
  for(let pass=0;pass<parts.length*2&&spare>.01;pass++){
    const eligible=parts.map((p,i)=>({
      i,capacity:Math.max(0,(p.maxHeight??p.height)-heights[i]),weight:p.grow??0,
    })).filter(p=>p.capacity>.01&&p.weight>0);
    if(!eligible.length)break;
    const weightTotal=eligible.reduce((sum,p)=>sum+p.weight,0);
    let used=0;
    for(const p of eligible){
      const increment=Math.min(p.capacity,spare*p.weight/weightTotal);
      heights[p.i]+=increment;used+=increment;
    }
    spare-=used;
    if(used<.001)break;
  }
  let cursor=box.y+box.height-spare/2;
  return heights.map(height=>{
    cursor-=height;
    const part={x:box.x,y:cursor,width:box.width,height};
    cursor-=gap;
    return part;
  });
}
