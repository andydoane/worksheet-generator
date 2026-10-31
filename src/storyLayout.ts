import {parseStory} from './modules.ts';

/** Shared exact token layout for the PDF and browser Finish the Story.
 * Coordinates use a TOP-left origin and a baseline y measured downward.
 * The caller supplies font metrics: PDFFont in export, Canvas 2D in preview.
 */
export type StoryGlyph={kind:'text'|'blank';text:string;x:number;y:number;width:number};
export type StoryPlan={fontSize:number;placements:StoryGlyph[];rows:number};
type Token={kind:'text'|'blank';value:string};
export function storyTokens(story:string):Token[]{
  const result:Token[]=[];
  for(const part of parseStory(story).parts){
    if(part.kind==='blank')result.push({kind:'blank',value:part.word});
    else for(const text of part.text.match(/\s+|[^\s]+/gu)??[])
      result.push({kind:'text',value:text});
  }
  return result;
}
export function planStory(story:string,measure:(text:string,size:number)=>number,width:number,height:number):StoryPlan|null{
  const tokens=storyTokens(story);
  if(!tokens.length||width<=0||height<=0)return null;
  for(let fontSize=13;fontSize>=9;fontSize-=.5){
    const placements:StoryGlyph[]=[];
    const lineHeight=fontSize*1.58;
    let x=0,y=fontSize*1.1,rows=1;
    let good=true;
    for(const t of tokens){
      const white=t.kind==='text'&&/^\s+$/u.test(t.value);
      const tokenWidth=t.kind==='blank'
        ?Math.max(16,measure(t.value,fontSize)*1.12)
        :measure(white?' ':t.value,fontSize);
      if(white&&x===0)continue;
      if(!white&&tokenWidth>width){good=false;break;}
      if(x+tokenWidth>width&&x>0){
        x=0;y+=lineHeight;rows++;
        if(white)continue;
      }
      if(y>height-3){good=false;break;}
      if(!white)placements.push({kind:t.kind,text:t.value,x,y,width:tokenWidth});
      x+=tokenWidth;
    }
    if(!good||!placements.length)continue;
    const low=Math.min(...placements.map(t=>t.y));
    const high=Math.max(...placements.map(t=>t.y))+fontSize;
    const offset=(height-(high-low))/2-low;
    return {fontSize,rows,placements:placements.map(p=>({...p,y:p.y+offset}))};
  }
  return null;
}
/** Physical PDF story region in points: 4.8×5.2 inches, inset 0.1 inches.
 * Share these dimensions with the browser SVG viewBox to avoid CSS text clipping.
 */
export const STORY_INNER_WIDTH=(4.8-.2)*72;
export const STORY_INNER_HEIGHT=(5.2-.2)*72;
export const STORY_BODY_WIDTH=STORY_INNER_WIDTH-6;
export const STORY_BODY_HEIGHT=STORY_INNER_HEIGHT-42-64-18; // matches modulePdf exactly
export const STORY_BODY_TOP=STORY_INNER_HEIGHT-5-STORY_BODY_HEIGHT;
export const STORY_BANK_TOP=42;
export const STORY_BANK_HEIGHT=64;
