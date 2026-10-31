/**
 * Deterministic word-search and maze generators. Pure logic, shared by the
 * browser preview, printable vector PDF and automatic solution checking.
 */
export const WORD_COLS = 12;
export const WORD_ROWS = 10;
export const MEDIUM_WORD_COLS = 9;
export const MEDIUM_WORD_ROWS = 9;
export const MAZE_COLS = 41;
export const MAZE_ROWS = 14;

export type WordSearch = { type: 'word-search'; words: string; seed: number };
export type MediumWordSearch = { type: 'medium-word-search'; words: string; seed: number };
export type TrueFalseMaze = { type: 'true-false-maze'; statement: string; answer: boolean; seed: number };
export type PuzzleModule = WordSearch | MediumWordSearch | TrueFalseMaze;
export type PuzzleId = PuzzleModule['type'];
export const PUZZLE_MODULES = [
  { id: 'word-search', name: 'Word Search', size: 'large', description: 'A 12 × 10 grid with 4–12 words or short phrases.' },
  { id: 'medium-word-search', name: 'Word Search (Medium)', size: 'medium', description: 'A 9 × 9 grid with 1–6 words or short phrases.' },
  { id: 'true-false-maze', name: 'True or False Maze', size: 'medium', description: 'A real 41 × 14 maze with TRUE and FALSE exits.' },
] as const;

const directions = [
  {dx:1,dy:0,name:'right'}, {dx:0,dy:1,name:'down'},
  {dx:1,dy:1,name:'down-right'}, {dx:1,dy:-1,name:'up-right'},
] as const;
export type WordPlacement = { word: string; x: number; y: number; dx: number; dy: number; direction: string };
export type WordSearchGrid = { grid: string[][]; words: string[]; labels:string[]; placements: WordPlacement[]; cols?:number; rows?:number };

export function isPuzzleId(value:unknown):value is PuzzleId {
  return value === 'word-search' || value === 'medium-word-search' || value === 'true-false-maze';
}
export function blankPuzzleModule(type:PuzzleId):PuzzleModule {
  if(type==='word-search'||type==='medium-word-search')return {type,words:'',seed:1};
  return {type,statement:'',answer:true,seed:1};
}
export function isPuzzleModule(raw:unknown):raw is PuzzleModule {
  if(!raw || typeof raw!=='object')return false;
  const m=raw as Record<string,unknown>;
  if(!Number.isSafeInteger(m.seed)||Number(m.seed)<0)return false;
  return m.type==='word-search'||m.type==='medium-word-search' ? typeof m.words==='string'
    : m.type==='true-false-maze' && typeof m.statement==='string' && typeof m.answer==='boolean';
}
/** Save user-facing labels independently of the grid's A–Z sequences. */
export function parseSearchEntries(text:string):{label:string;word:string}[]{
  return text.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean).map(label=>({
    label:label.toLowerCase().replace(/\b[a-z]/g,ch=>ch.toUpperCase()),
    word:label.toUpperCase().replace(/\s+/gu,''),
  }));
}
export function parseSearchWords(text:string):string[]{
  return parseSearchEntries(text).map(e=>e.word);
}
export function validatePuzzle(module:PuzzleModule):string[]{
  if(module.type==='word-search'||module.type==='medium-word-search'){
    const medium=module.type==='medium-word-search';
    const entries=parseSearchEntries(module.words),words=entries.map(e=>e.word);
    const errors:string[]=[];
    if(words.length<(medium?1:4)||words.length>(medium?6:12))
      errors.push(medium?'Enter 1–6 words or short phrases, one per line.':'Enter 4–12 words or short phrases, one per line.');
    if(entries.some(e=>!(/^[A-Z]+(?: [A-Z]+)*$/u.test(e.label.toUpperCase())))) errors.push('Use only letters A–Z and single spaces between words.');
    if(words.some(w=>w.length<2||w.length>(medium?9:12)))
      errors.push(medium?'Each word must contain 2–9 letters after removing spaces.':'Each word must contain 2–12 letters.');
    if(new Set(words).size!==words.length)errors.push('Use different words; duplicate entries would be confusing.');
    return errors;
  }
  const t=module.statement.trim();
  return (!t || t.length>65) ? ['Enter a true-or-false statement of 1–65 characters.'] : [];
}
function randomStream(text:string,seed:number):()=>number{
  let state=(seed>>>0)^2166136261;
  for(const ch of text){state^=ch.charCodeAt(0);state=Math.imul(state,16777619);}
  state >>>= 0;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
function shuffle<T>(items:T[],random:()=>number):T[]{
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

/**
 * Backtracking guarantees a word isn't omitted if a valid packing exists
 * within the search cap. Only forward directions are used. Grid and word
 * placements are independent from other modules' random seeds.
 */
export function generateWordSearch(module:WordSearch|MediumWordSearch):WordSearchGrid {
  const problems=validatePuzzle(module);
  if(problems.length)throw Error(problems.join(' '));
  const entries=parseSearchEntries(module.words), words=entries.map(x=>x.word);
  const medium=module.type==='medium-word-search';
  const cols=medium?MEDIUM_WORD_COLS:WORD_COLS,rows=medium?MEDIUM_WORD_ROWS:WORD_ROWS;
  const rng=randomStream(words.join('|'),module.seed);
  const board:(string|null)[][]=Array.from({length:rows},()=>Array(cols).fill(null));
  const placements:WordPlacement[]=[];
  const sorted=[...words].sort((a,b)=>b.length-a.length);
  let attempts=0;
  function place(index:number):boolean {
    if(index===sorted.length)return true;
    if(attempts>65000)return false;
    const word=sorted[index];
    const candidates:Omit<WordPlacement,'word'>[]=[];
    for(const dir of directions)for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const lastX=x+(word.length-1)*dir.dx,lastY=y+(word.length-1)*dir.dy;
      if(lastX>=0&&lastX<cols&&lastY>=0&&lastY<rows){
        candidates.push({x,y,dx:dir.dx,dy:dir.dy,direction:dir.name});
      }
    }
    for(const candidate of shuffle(candidates,rng)){
      attempts++;
      if(attempts>65000)break;
      const fresh:[number,number][]=[];
      let fits=true;
      for(let i=0;i<word.length;i++){
        const x=candidate.x+i*candidate.dx,y=candidate.y+i*candidate.dy;
        const existing=board[y][x];
        if(existing!==null&&existing!==word[i]){fits=false;break;}
        if(existing===null)fresh.push([x,y]);
      }
      if(!fits)continue;
      // Write from the word index; also works for rising diagonals.
      for(let i=0;i<word.length;i++)board[candidate.y+i*candidate.dy][candidate.x+i*candidate.dx]=word[i];
      placements.push({word,...candidate});
      if(place(index+1))return true;
      placements.pop();
      for(const [x,y] of fresh)board[y][x]=null;
    }
    return false;
  }
  if(!place(0))throw Error('Could not fit these words in a '+cols+'×'+rows+' search. Try shorter words or a different list.');
  const grid=board.map(row=>row.map(letter=>letter??String.fromCharCode(65+Math.floor(rng()*26))));
  const result:WordSearchGrid={grid,words,labels:entries.map(x=>x.label),
    placements:words.map(word=>placements.find(p=>p.word===word)!),
    ...(medium?{cols,rows}:{})};
  if(!checkWordSearch(result))throw Error('Word-search solution validation failed. Please regenerate.');
  return result;
}
export function checkWordSearch(result:WordSearchGrid):boolean{
  const cols=result.cols??WORD_COLS,rows=result.rows??WORD_ROWS;
  if(!((cols===WORD_COLS&&rows===WORD_ROWS)||
       (cols===MEDIUM_WORD_COLS&&rows===MEDIUM_WORD_ROWS)))return false;
  if(result.grid.length!==rows||result.grid.some(row=>row.length!==cols))return false;
  if(result.placements.length!==result.words.length || result.labels.length!==result.words.length)return false;
  for(const p of result.placements){
    if(!directions.some(d=>d.dx===p.dx&&d.dy===p.dy))return false;
    if(!result.words.includes(p.word))return false;
    for(let i=0;i<p.word.length;i++){
      const x=p.x+i*p.dx,y=p.y+i*p.dy;
      if(x<0||y<0||x>=cols||y>=rows||result.grid[y][x]!==p.word[i])return false;
    }
  }
  return true;
}
export function wordSearchCells(result:WordSearchGrid):Set<string>{
  const cells=new Set<string>();
  for(const p of result.placements)for(let i=0;i<p.word.length;i++){
    cells.add((p.x+i*p.dx)+','+(p.y+i*p.dy));
  }
  return cells;
}

/** Wall bitmasks NORTH=1, EAST=2, SOUTH=4, WEST=8. */
export const NORTH=1,EAST=2,SOUTH=4,WEST=8;
type MazeExit = {x:number;y:number;edge:'left'|'right';label:'TRUE'|'FALSE'};
export type MazePoint={x:number;y:number};
export type MazeGrid={
  walls:number[][];
  entrance:MazePoint;
  exits:[MazeExit,MazeExit];
  correctExit:MazeExit;
  solution:MazePoint[];
};
const dirs=[
  {dx:0,dy:-1,from:NORTH,to:SOUTH},
  {dx:1,dy:0,from:EAST,to:WEST},
  {dx:0,dy:1,from:SOUTH,to:NORTH},
  {dx:-1,dy:0,from:WEST,to:EAST},
] as const;
function inside(x:number,y:number):boolean{return x>=0&&y>=0&&x<MAZE_COLS&&y<MAZE_ROWS;}
function same(a:MazePoint,b:MazePoint):boolean{return a.x===b.x&&a.y===b.y;}
export function solveMazePath(walls:number[][],start:MazePoint,end:MazePoint):MazePoint[] {
  if(walls.length!==MAZE_ROWS||walls.some(row=>row.length!==MAZE_COLS))return [];
  const queue:MazePoint[]=[start],previous=new Map<string,string|null>();
  const key=(p:MazePoint)=>p.x+','+p.y;
  previous.set(key(start),null);
  for(let head=0;head<queue.length;head++){
    const current=queue[head];
    if(same(current,end))break;
    for(const d of dirs){
      if(walls[current.y][current.x]&d.from)continue;
      const next={x:current.x+d.dx,y:current.y+d.dy};
      if(!inside(next.x,next.y)||previous.has(key(next)))continue;
      previous.set(key(next),key(current));queue.push(next);
    }
  }
  if(!previous.has(key(end)))return [];
  const path:MazePoint[]=[];
  let cursor:string|null=key(end);
  while(cursor!==null){
    const [x,y]=cursor.split(',').map(Number);path.push({x,y});
    cursor=previous.get(cursor)??null;
  }
  return path.reverse();
}
/**
 * Keep the 41×14 randomized depth-first corridor generator, but move the
 * entry to the bottom center and make left=TRUE, right=FALSE. To avoid a
 * very long child-sized trek, select the best of 24 deterministic maze
 * candidates, preferring short and reasonably balanced exit routes.
 */
export function generateMaze(module:TrueFalseMaze):MazeGrid {
  const errors=validatePuzzle(module);
  if(errors.length)throw Error(errors.join(' '));
  const entrance={x:Math.floor(MAZE_COLS/2),y:MAZE_ROWS-1};
  const exits:[MazeExit,MazeExit]=[
    {x:0,y:Math.floor(MAZE_ROWS/2),edge:'left',label:'TRUE'},
    {x:MAZE_COLS-1,y:Math.floor(MAZE_ROWS/2),edge:'right',label:'FALSE'},
  ];
  let bestWalls:number[][]|null=null;
  let bestScore=Infinity;
  for(let trial=0;trial<24;trial++){
    const rng=randomStream(module.statement,module.seed*101+trial*871);
    const walls:number[][]=Array.from({length:MAZE_ROWS},()=>Array(MAZE_COLS).fill(15));
    const visited:boolean[][]=Array.from({length:MAZE_ROWS},()=>Array(MAZE_COLS).fill(false));
    const stack:MazePoint[]=[entrance];visited[entrance.y][entrance.x]=true;
    while(stack.length){
      const here=stack[stack.length-1];
      const options=dirs.filter(d=>{
        const x=here.x+d.dx,y=here.y+d.dy;
        return inside(x,y)&&!visited[y][x];
      });
      if(!options.length){stack.pop();continue;}
      const d=options[Math.floor(rng()*options.length)];
      const next={x:here.x+d.dx,y:here.y+d.dy};
      walls[here.y][here.x]&=~d.from;
      walls[next.y][next.x]&=~d.to;
      visited[next.y][next.x]=true;stack.push(next);
    }
    walls[entrance.y][entrance.x]&=~SOUTH;
    walls[exits[0].y][exits[0].x]&=~WEST;
    walls[exits[1].y][exits[1].x]&=~EAST;
    const leftLength=solveMazePath(walls,entrance,exits[0]).length;
    const rightLength=solveMazePath(walls,entrance,exits[1]).length;
    const score=Math.max(leftLength,rightLength)*3+
      Math.abs(leftLength-rightLength)+
      (leftLength+rightLength)*.15;
    if(score<bestScore){bestScore=score;bestWalls=walls;}
  }
  if(!bestWalls)throw Error('Could not build a valid maze.');
  const correctExit=exits.find(e=>(e.label==='TRUE')===module.answer)!;
  const solution=solveMazePath(bestWalls,entrance,correctExit);
  const result={walls:bestWalls,entrance,exits,correctExit,solution};
  if(!checkMaze(result))throw Error('Maze connectivity check failed. Regenerate the puzzle.');
  return result;
}

export function checkMaze(maze:MazeGrid):boolean {
  const {walls,entrance,exits,correctExit,solution}=maze;
  if(walls.length!==MAZE_ROWS||walls.some(row=>row.length!==MAZE_COLS))return false;
  const expectedEntrance={x:Math.floor(MAZE_COLS/2),y:MAZE_ROWS-1};
  if(!same(entrance,expectedEntrance) || (walls[entrance.y][entrance.x]&SOUTH)!==0)return false;
  if(exits.length!==2||
     !exits.some(e=>e.edge==='left'&&e.label==='TRUE'&&e.x===0)||
     !exits.some(e=>e.edge==='right'&&e.label==='FALSE'&&e.x===MAZE_COLS-1))return false;
  if(!exits.some(e=>same(e,correctExit)&&e.label===correctExit.label))return false;
  for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
    const cell=walls[y][x];
    if(!Number.isInteger(cell)||cell<0||cell>15)return false;
    for(const d of dirs){
      const nx=x+d.dx,ny=y+d.dy;
      if(!inside(nx,ny))continue;
      if(Boolean(cell&d.from)!==Boolean(walls[ny][nx]&d.to))return false;
    }
    // Exactly three boundary openings: entrance + two labeled exits.
    if(y===0 && !(cell&NORTH) ||
       y===MAZE_ROWS-1 && !(cell&SOUTH) && !same({x,y},entrance) ||
       x===0 && !(cell&WEST) && !exits.some(e=>e.edge==='left'&&e.x===x&&e.y===y) ||
       x===MAZE_COLS-1 && !(cell&EAST) && !exits.some(e=>e.edge==='right'&&e.x===x&&e.y===y))return false;
  }
  for(const exit of exits){
    const boundary=exit.edge==='left'?WEST:EAST;
    if(walls[exit.y][exit.x]&boundary)return false;
    if(!solveMazePath(walls,entrance,exit).length)return false;
  }
  const actual=solveMazePath(walls,entrance,correctExit);
  return actual.length===solution.length&&actual.every((p,i)=>same(p,solution[i]));
}
