import { shuffledIndices } from './shuffle.ts';

export type CrosswordModule={type:'crossword';entries:string;seed:number};
export type SpiralVerseModule={type:'spiral-verse';reference:string;verse:string};
export type UpsideDownVerseModule={type:'upside-down-verse';reference:string;verse:string};
export type ConnectVerseModule={type:'connect-verse';verse:string;seed:number};
export type ConnectBigIdeaModule={type:'connect-big-idea';idea:string;seed:number};
export type SpecialtyModule=CrosswordModule|SpiralVerseModule|UpsideDownVerseModule|ConnectVerseModule|ConnectBigIdeaModule;
export type SpecialtyId=SpecialtyModule['type'];
export const SPECIALTY_MODULES=[
  {id:'crossword',name:'Crossword',size:'large',description:'A generated crossword with six to ten answer/clue pairs.'},
  {id:'spiral-verse',name:'Spiral Verse',size:'large',description:'Copy the verse onto a large printable spiral line.'},
  {id:'upside-down-verse',name:'Upside Down Verse',size:'medium',description:'Read vertically flipped letters, then write them upright.'},
  {id:'connect-verse',name:'Connect the Verse',size:'medium',description:'Connect scrambled Scripture words in the correct order.'},
  {id:'connect-big-idea',name:'Connect the Big Idea',size:'medium',description:'Connect scattered Big Idea words using the word bank.'},
] as const;

export function isSpecialtyId(value:unknown):value is SpecialtyId{
  return typeof value==='string'&&SPECIALTY_MODULES.some(x=>x.id===value);
}
export function blankSpecialtyModule(type:SpecialtyId):SpecialtyModule{
  switch(type){
    case 'crossword':return {type,entries:'',seed:1};
    case 'spiral-verse':return {type,reference:'',verse:''};
    case 'upside-down-verse':return {type,reference:'',verse:''};
    case 'connect-verse':return {type,verse:'',seed:1};
    case 'connect-big-idea':return {type,idea:'',seed:1};
  }
}
export function isSpecialtyModule(value:unknown):value is SpecialtyModule{
  if(!value||typeof value!=='object')return false;
  const m=value as Record<string,unknown>;
  if(!isSpecialtyId(m.type))return false;
  switch(m.type){
    case 'crossword':return typeof m.entries==='string'&&Number.isSafeInteger(m.seed)&&Number(m.seed)>=0;
    case 'spiral-verse':
    case 'upside-down-verse':return typeof m.verse==='string'&&typeof m.reference==='string';
    case 'connect-verse':return typeof m.verse==='string'&&Number.isSafeInteger(m.seed)&&Number(m.seed)>=0;
    case 'connect-big-idea':return typeof m.idea==='string'&&Number.isSafeInteger(m.seed)&&Number(m.seed)>=0;
  }
}
export type CrosswordEntry={answer:string;clue:string};
export function parseCrossword(input:string):CrosswordEntry[]{
  return input.split(/\r?\n/u).filter(s=>s.trim()).map(line=>{
    const at=line.indexOf(',');
    return at<0?{answer:line.trim().toUpperCase(),clue:''}:
      {answer:line.slice(0,at).trim().toUpperCase(),clue:line.slice(at+1).trim()};
  });
}
const words=(value:string):string[]=>value.trim().split(/\s+/u).filter(Boolean);
export function parseConnectionWords(text:string):string[]{
  return (text.match(/[\p{L}]+(?:['’-][\p{L}]+)*/gu)??[]).map(w=>w.toUpperCase());
}
export function specialtyText(module:ConnectVerseModule|ConnectBigIdeaModule):string{
  return module.type==='connect-verse'?module.verse:module.idea;
}
export function validateSpecialty(module:SpecialtyModule):string[]{
  switch(module.type){
    case 'crossword':{
      const entries=parseCrossword(module.entries),errors:string[]=[];
      if(entries.length<6||entries.length>10)errors.push('Enter 6–10 answers and clues, one per line.');
      if(entries.some(e=>!/^[A-Z]{3,12}$/.test(e.answer)))errors.push('Crossword answers must be 3–12 letters A–Z, without spaces.');
      if(entries.some(e=>!e.clue||e.clue.length>85))errors.push('Each clue must contain 1–85 characters, following a comma.');
      if(new Set(entries.map(e=>e.answer)).size!==entries.length)errors.push('Crossword answers must be different.');
      return errors;
    }
    case 'spiral-verse':{
      const errs:string[]=[];
      if(!module.reference.trim()||module.reference.length>45)errs.push('Enter a verse reference no longer than 45 characters.');
      if(!module.verse.trim()||module.verse.length>260)errs.push('Enter a verse of 1–260 characters.');
      return errs;
    }
    case 'upside-down-verse':{
      const errs:string[]=[];
      if(!module.reference.trim()||module.reference.length>42)errs.push('Enter a verse reference of 1–42 characters.');
      const letters=(module.verse.toUpperCase().match(/[A-Z]/g)??[]).length;
      if(letters<3||letters>65)errs.push('Use a verse with 3–65 letters for the medium area.');
      if([...module.verse].some(c=>/\p{L}/u.test(c)&&!/[A-Za-z]/.test(c)))
        errs.push('Use unaccented English letters A–Z; punctuation is allowed.');
      return errs;
    }
    case 'connect-verse':
    case 'connect-big-idea':{
      const text=specialtyText(module),list=parseConnectionWords(text);
      const errs:string[]=[];
      if(list.length<4||list.length>12)errs.push('Enter 4–12 words to connect.');
      if(list.some(w=>w.length>12))errs.push('Keep each word at 12 characters or fewer.');
      if(!text.trim()||text.length>125)errs.push('Keep the phrase under 125 characters.');
      if([...text].some(c=>/\p{L}/u.test(c)&&!/[A-Za-z]/.test(c)))
        errs.push('Use unaccented A–Z words for the scattered text.');
      return errs;
    }
  }
}

/* 21×21 placement workspace, cropped to occupied cells for printing. */
const GRID=21;
const ACROSS=1,DOWN=2;
type Direction='across'|'down';
export type CrosswordPlacement={answer:string;clue:string;x:number;y:number;direction:Direction;number:number};
export type CrosswordResult={width:number;height:number;cells:(string|null)[][];numbers:Record<string,number>;placements:CrosswordPlacement[];across:CrosswordPlacement[];down:CrosswordPlacement[]};
type Positioned={entry:CrosswordEntry;x:number;y:number;direction:Direction};
type Option={x:number;y:number;direction:Direction};
export function generateCrossword(module:CrosswordModule):CrosswordResult{
  const errors=validateSpecialty(module);
  if(errors.length)throw Error(errors.join(' '));
  const entries=parseCrossword(module.entries);
  const order=shuffledIndices(entries.length,module.entries,module.seed);
  const sorted=order.map(i=>entries[i]).sort((a,b)=>b.answer.length-a.answer.length);
  const board:(string|null)[][]=Array.from({length:GRID},()=>Array(GRID).fill(null));
  const occupied:number[][]=Array.from({length:GRID},()=>Array(GRID).fill(0));
  const placed:Positioned[]=[];
  let checked=0;
  function attempt(k:number):boolean{
    if(k===sorted.length)return true;
    if(checked>90000)return false;
    const entry=sorted[k],candidates:Option[]=[];
    if(k===0){
      candidates.push({x:Math.floor((GRID-entry.answer.length)/2),y:Math.floor(GRID/2),direction:'across'});
    }else{
      for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
        const c=board[y][x];
        if(c===null)continue;
        for(let i=0;i<entry.answer.length;i++){
          if(entry.answer[i]!==c)continue;
          if(!(occupied[y][x]&ACROSS))candidates.push({x,y:y-i,direction:'down'});
          if(!(occupied[y][x]&DOWN))candidates.push({x:x-i,y,direction:'across'});
        }
      }
    }
    const options=k===0?candidates:
      shuffledIndices(candidates.length,entry.answer+module.entries,module.seed+k*17).map(i=>candidates[i]);
    for(const option of options){
      if(++checked>90000)break;
      const {x,y,direction}=option,dx=direction==='across'?1:0,dy=direction==='down'?1:0;
      const mask=direction==='across'?ACROSS:DOWN;
      const beforeX=x-dx,beforeY=y-dy,afterX=x+dx*entry.answer.length,afterY=y+dy*entry.answer.length;
      if(x<0||y<0||x+dx*(entry.answer.length-1)>=GRID||y+dy*(entry.answer.length-1)>=GRID)continue;
      if(beforeX>=0&&beforeY>=0&&beforeX<GRID&&beforeY<GRID&&board[beforeY][beforeX]!==null)continue;
      if(afterX>=0&&afterY>=0&&afterX<GRID&&afterY<GRID&&board[afterY][afterX]!==null)continue;
      let intersections=0,valid=true;
      const added:{x:number;y:number}[]=[];
      for(let i=0;i<entry.answer.length;i++){
        const cx=x+i*dx,cy=y+i*dy,old=board[cy][cx];
        if(old!==null){
          if(old!==entry.answer[i]||(occupied[cy][cx]&mask)){valid=false;break;}
          intersections++;
        }else{
          const neighbors=direction==='across'?[[cx,cy-1],[cx,cy+1]]:[[cx-1,cy],[cx+1,cy]];
          if(neighbors.some(([nx,ny])=>nx>=0&&ny>=0&&nx<GRID&&ny<GRID&&board[ny][nx]!==null)){valid=false;break;}
          added.push({x:cx,y:cy});
        }
      }
      if(!valid||(k>0&&!intersections))continue;
      for(let i=0;i<entry.answer.length;i++){
        const cx=x+i*dx,cy=y+i*dy;
        board[cy][cx]=entry.answer[i];occupied[cy][cx]|=mask;
      }
      placed.push({entry,...option});
      if(attempt(k+1))return true;
      placed.pop();
      for(let i=0;i<entry.answer.length;i++){
        const cx=x+i*dx,cy=y+i*dy;
        occupied[cy][cx]&=~mask;
        if(!occupied[cy][cx])board[cy][cx]=null;
      }
    }
    return false;
  }
  if(!attempt(0))throw Error('These answers cannot form a connected crossword. Try words with more shared letters.');
  const used=placed.flatMap(p=>Array.from(p.entry.answer,(_,i)=>({
    x:p.x+(p.direction==='across'?i:0),y:p.y+(p.direction==='down'?i:0),
  })));
  const left=Math.min(...used.map(p=>p.x)),right=Math.max(...used.map(p=>p.x));
  const top=Math.min(...used.map(p=>p.y)),bottom=Math.max(...used.map(p=>p.y));
  const starts=[...new Map(placed.map(p=>[p.x+','+p.y,{x:p.x,y:p.y}])).values()]
    .sort((a,b)=>a.y-b.y||a.x-b.x);
  const numbers:Record<string,number>={};
  starts.forEach((p,i)=>{numbers[(p.x-left)+','+(p.y-top)]=i+1;});
  const placements=placed.map(p=>({
    answer:p.entry.answer,clue:p.entry.clue,x:p.x-left,y:p.y-top,
    direction:p.direction,number:numbers[(p.x-left)+','+(p.y-top)],
  }));
  const result:CrosswordResult={
    width:right-left+1,height:bottom-top+1,
    cells:Array.from({length:bottom-top+1},(_,y)=>Array.from({length:right-left+1},(_,x)=>board[y+top][x+left])),
    numbers,placements,
    across:placements.filter(p=>p.direction==='across').sort((a,b)=>a.number-b.number),
    down:placements.filter(p=>p.direction==='down').sort((a,b)=>a.number-b.number),
  };
  if(!checkCrossword(result))throw Error('Crossword validation failed. Please regenerate.');
  return result;
}
export function checkCrossword(result:CrosswordResult):boolean{
  if(result.cells.length!==result.height||result.cells.some(row=>row.length!==result.width))return false;
  if(result.placements.length<6||result.placements.length>10)return false;
  if(!result.across.length||!result.down.length)return false;
  const occupied=new Map<string,number>();
  for(const word of result.placements){
    if(word.number!==result.numbers[word.x+','+word.y])return false;
    const dx=word.direction==='across'?1:0,dy=word.direction==='down'?1:0;
    for(let i=0;i<word.answer.length;i++){
      const x=word.x+i*dx,y=word.y+i*dy;
      if(x<0||y<0||x>=result.width||y>=result.height||result.cells[y][x]!==word.answer[i])return false;
      const key=x+','+y;
      occupied.set(key,(occupied.get(key)??0)+1);
      if(occupied.get(key)!>2)return false;
    }
  }
  if(![...occupied.values()].some(n=>n===2))return false;
  return result.cells.every((row,y)=>row.every((letter,x)=>(letter!==null)===occupied.has(x+','+y)));
}

export function connectPositions(module:ConnectVerseModule|ConnectBigIdeaModule):{word:string;order:number;x:number;y:number;angle:number;jitter:number[]}[]{
  const list=parseConnectionWords(specialtyText(module));
  if(validateSpecialty(module).length)throw Error(validateSpecialty(module).join(' '));
  const cols=3,rows=Math.ceil(list.length/cols);
  const indices=shuffledIndices(list.length,specialtyText(module),module.seed);
  return indices.map((original,slot)=>{
    const x=(slot%cols+.5)/cols,y=(Math.floor(slot/cols)+.5)/rows;
    const w=list[original];
    const n=shuffledIndices(12,w+slot,module.seed);
    return {word:w,order:original,x,y,angle:(n[0]-5.5)*.95,
      jitter:Array.from(w,(_,j)=>(n[j%12]-5.5)*.004)};
  });
}
export function spiralPoints(count=400):{x:number;y:number}[]{
  return Array.from({length:count},(_,i)=>{
    const t=i/(count-1),angle=t*Math.PI*11-Math.PI/2;
    const r=.035+t*.44;
    return {x:.5+Math.cos(angle)*r,y:.5+Math.sin(angle)*r};
  });
}
