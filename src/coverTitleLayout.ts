/**
 * Shared print-point cover typography for SVG preview and vector PDF.
 * All coordinates are relative to the centered (bordered or plain) text zone,
 * measured from its TOP-left edge. Both renderers use the same static TTFs.
 */
export type TextMeasure=(text:string,size:number)=>number;
export type CoverTextLine={text:string;x:number;y:number;size:number};
export type CoverTextPlan={
  titleLines:CoverTextLine[];
  referenceLines:CoverTextLine[];
  titleSize:number;
  referenceSize:number;
  totalHeight:number;
};
type Fitted={lines:string[];size:number;lineHeight:number;height:number};

/** Preserve the legacy behavior of splitting an unusually long unbroken word. */
function piecesFor(text:string,size:number,maxWidth:number,measure:TextMeasure):string[]{
  const pieces:string[]=[];
  for(const word of text.trim().replace(/\s+/gu,' ').split(' ').filter(Boolean)){
    if(measure(word,size)<=maxWidth){pieces.push(word);continue;}
    let segment='';
    for(const char of word){
      if(segment&&measure(segment+char,size)>maxWidth){
        pieces.push(segment);segment=char;
      }else segment+=char;
    }
    if(segment)pieces.push(segment);
  }
  return pieces;
}
function greedy(pieces:string[],size:number,maxWidth:number,measure:TextMeasure):string[]{
  const lines:string[]=[];let current='';
  for(const word of pieces){
    const candidate=current?current+' '+word:word;
    if(current&&measure(candidate,size)>maxWidth){
      lines.push(current);current=word;
    }else current=candidate;
  }
  if(current)lines.push(current);
  return lines;
}

/** Minimize raggedness without adding lines or shrinking the font.
 * The final line has the same weight, preventing a one-word orphan.
 */
export function balancedCoverTitle(text:string,size:number,maxWidth:number,measure:TextMeasure):string[]{
  const pieces=piecesFor(text,size,maxWidth,measure);
  const baseline=greedy(pieces,size,maxWidth,measure);
  if(baseline.length<=1||pieces.some(piece=>measure(piece,size)>maxWidth))return baseline;
  const memo=new Map<string,{cost:number;lines:string[]}|null>();
  function choose(start:number,remaining:number):{cost:number;lines:string[]}|null{
    if(!remaining)return start===pieces.length?{cost:0,lines:[]}:null;
    const key=start+':'+remaining;
    if(memo.has(key))return memo.get(key)!;
    let best:{cost:number;lines:string[]}|null=null;
    for(let end=start+1;end<=pieces.length-remaining+1;end++){
      const line=pieces.slice(start,end).join(' ');
      const used=measure(line,size);
      if(used>maxWidth+1e-6)break;
      const rest=choose(end,remaining-1);
      if(!rest)continue;
      const remainingWidth=maxWidth-used;
      const cost=remainingWidth*remainingWidth+rest.cost;
      if(!best||cost<best.cost-1e-6)best={cost,lines:[line,...rest.lines]};
    }
    memo.set(key,best);
    return best;
  }
  return choose(0,baseline.length)?.lines??baseline;
}
function fitReference(text:string,width:number,measure:TextMeasure):Fitted|null{
  for(let size=12;size>=8;size-=.5){
    const lines=greedy(piecesFor(text,size,width,measure),size,width,measure);
    if(lines.length<=2&&lines.every(row=>measure(row,size)<=width)){
      const lineHeight=size*1.12;
      return {lines,size,lineHeight,height:lines.length*lineHeight};
    }
  }
  return null;
}
export function planCoverText(
 title:string,reference:string,width:number,height:number,
 measureTitle:TextMeasure,measureReference:TextMeasure,
):CoverTextPlan|null{
  if(width<=0||height<=0)return null;
  const subtitle=fitReference(reference,width,measureReference);
  if(!subtitle)return null;
  const gap=11;
  for(let size=42;size>=14;size--){
    const lines=balancedCoverTitle(title,size,width,measureTitle);
    if(!lines.length||lines.length>3||lines.some(row=>measureTitle(row,size)>width))continue;
    const lineHeight=size*1.12;
    const titleHeight=lines.length*lineHeight;
    const totalHeight=titleHeight+gap+subtitle.height;
    if(totalHeight>height+1e-6)continue;
    const top=(height-totalHeight)/2;
    const titleLines=lines.map((text,i)=>({
      text,x:(width-measureTitle(text,size))/2,
      y:top+size+i*lineHeight,size,
    }));
    const referenceTop=top+titleHeight+gap;
    const referenceLines=subtitle.lines.map((text,i)=>({
      text,x:(width-measureReference(text,subtitle.size))/2,
      y:referenceTop+subtitle.size+i*subtitle.lineHeight,size:subtitle.size,
    }));
    return {titleLines,referenceLines,titleSize:size,referenceSize:subtitle.size,totalHeight};
  }
  return null;
}
