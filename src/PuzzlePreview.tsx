import {
  generateMaze, generateWordSearch, wordSearchCells,
  NORTH, EAST, SOUTH, WEST, MAZE_COLS, MAZE_ROWS,
  type PuzzleModule, type MazeGrid,
} from './puzzleEngines.ts';

function MazeDrawing({ maze, showSolution }: {maze:MazeGrid;showSolution:boolean}) {
  const cell=10, left=14, top=8, w=MAZE_COLS*cell, h=MAZE_ROWS*cell;
  const lines:{x1:number;y1:number;x2:number;y2:number;key:string}[]=[];
  for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
    const wall=maze.walls[y][x],x0=left+x*cell,y0=top+y*cell;
    if(wall&NORTH)lines.push({x1:x0,y1:y0,x2:x0+cell,y2:y0,key:x+','+y+'n'});
    if(wall&WEST)lines.push({x1:x0,y1:y0,x2:x0,y2:y0+cell,key:x+','+y+'w'});
    if(x===MAZE_COLS-1&&(wall&EAST))lines.push({x1:x0+cell,y1:y0,x2:x0+cell,y2:y0+cell,key:x+','+y+'e'});
    if(y===MAZE_ROWS-1&&(wall&SOUTH))lines.push({x1:x0,y1:y0+cell,x2:x0+cell,y2:y0+cell,key:x+','+y+'s'});
  }
  const route=maze.solution.map(p=>(left+(p.x+.5)*cell)+','+(top+(p.y+.5)*cell)).join(' ');
  return <svg className="puzzle-maze-svg" viewBox="0 0 410 173" role="img" aria-label={'A 35-column by 14-row maze with labeled TRUE and FALSE exits'}>
    {showSolution&&<polyline points={route} fill="none" stroke="#167856" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
    <g stroke="#252525" strokeWidth="1" fill="none">
      {lines.map(line=><line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}/>)}
    </g>
    <text x="0" y={top+(maze.entrance.y+.5)*cell+3} fontSize="7" fontWeight="700">IN</text>
    {maze.exits.map(exit=><text key={exit.edge} fontSize="10" fontWeight="700"
      x={exit.edge==='right'?left+w+5:left+(exit.x+.5)*cell}
      y={exit.edge==='right'?top+(exit.y+.5)*cell+3:top+h+15}
      textAnchor={exit.edge==='right'?'start':'middle'}>{exit.label}</text>)}
  </svg>;
}
export default function PuzzlePreview({module,showSolution=false}:{module:PuzzleModule;showSolution?:boolean}) {
  if(module.type==='word-search'){
    const puzzle=generateWordSearch(module);
    const selected=showSolution?wordSearchCells(puzzle):new Set<string>();
    return <div className="module-preview puzzle-word-search">
      <div className="module-title">WORD SEARCH</div>
      <div className="puzzle-letter-grid">
        {puzzle.grid.flatMap((row,y)=>row.map((letter,x)=><span key={x+','+y}
          className={selected.has(x+','+y)?'puzzle-found-letter':''}>{letter}</span>))}
      </div>
      <div className="puzzle-search-bank">{puzzle.words.map(w=><span key={w}>{w}</span>)}</div>
    </div>;
  }
  const maze=generateMaze(module);
  return <div className="module-preview puzzle-maze-module">
    <div className="module-title">TRUE OR FALSE TREK!</div>
    <div className="puzzle-maze-subtitle">Exit the maze at the correct answer.</div>
    <div className="puzzle-maze-statement">{module.statement}</div>
    <MazeDrawing maze={maze} showSolution={showSolution}/>
  </div>;
}
