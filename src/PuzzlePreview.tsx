import {useEffect,useState} from 'react';
import {mediumWidths} from './MediumPrintPreview.tsx';
import WordSearchPrintPreview from './WordSearchPrintPreview.tsx';
import MediumWordSearchPrintPreview from './MediumWordSearchPrintPreview.tsx';
import {MEDIUM_PRINT_WIDTH,MEDIUM_PRINT_HEIGHT} from './mediumParityLayout.ts';
import {planMazePrint,MAZE_ARROW_PATH,MAZE_ARROW_VIEW_SIZE,type MazePrintPlan} from './mazePrintLayout.ts';
import {
  generateMaze,
  NORTH, EAST, SOUTH, WEST, MAZE_COLS, MAZE_ROWS,
  type PuzzleModule, type MazeGrid,
} from './puzzleEngines.ts';

function MazeDrawing({maze,showSolution,plan,statement}:{
 maze:MazeGrid;showSolution:boolean;plan:MazePrintPlan;statement:string;
}){
 const {mazeLeft:left,mazeTop:top,cell,mazeWidth:w,mazeHeight:h}=plan;
 const walls:{x1:number;y1:number;x2:number;y2:number;key:string}[]=[];
 for(let y=0;y<MAZE_ROWS;y++)for(let x=0;x<MAZE_COLS;x++){
  const wall=maze.walls[y][x],x0=left+x*cell,y0=top+y*cell;
  if(wall&NORTH)walls.push({x1:x0,y1:y0,x2:x0+cell,y2:y0,key:x+','+y+'n'});
  if(wall&WEST)walls.push({x1:x0,y1:y0,x2:x0,y2:y0+cell,key:x+','+y+'w'});
  if(x===MAZE_COLS-1&&(wall&EAST))walls.push({x1:x0+cell,y1:y0,x2:x0+cell,y2:y0+cell,key:x+','+y+'e'});
  if(y===MAZE_ROWS-1&&(wall&SOUTH))walls.push({x1:x0,y1:y0+cell,x2:x0+cell,y2:y0+cell,key:x+','+y+'s'});
 }
 const route=maze.solution.map(p=>(left+(p.x+.5)*cell)+','+(top+(p.y+.5)*cell)).join(' ');
 const arrowScale=plan.arrowSize/MAZE_ARROW_VIEW_SIZE;
 return <svg className="medium-print-svg" viewBox={'0 0 '+MEDIUM_PRINT_WIDTH+' '+MEDIUM_PRINT_HEIGHT}
   role="img" aria-label="True or false maze, 41 columns and 14 rows">
   <text x={MEDIUM_PRINT_WIDTH/2} y={plan.titleY} textAnchor="middle"
    fontFamily="Mouse Memoirs" fontSize="25" fill="#222">TRUE OR FALSE TREK!</text>
   <text x={MEDIUM_PRINT_WIDTH/2} y={plan.subtitleY} textAnchor="middle"
    fontFamily="Nunito" fontWeight="500" fontSize="8.7" fill="#222">Exit the maze at the correct answer.</text>
   <text x={MEDIUM_PRINT_WIDTH/2} y={plan.statementY} textAnchor="middle"
    fontFamily="Nunito" fontWeight="500" fontSize={plan.statementSize} fill="#222">{statement}</text>
   {showSolution&&<polyline points={route} fill="none" stroke="#167856"
     strokeWidth={Math.max(1.5,cell*.38)} strokeLinecap="round" strokeLinejoin="round"/>}
   <g stroke="#222" strokeWidth=".68" fill="none">
    {walls.map(line=><line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}/>)}
   </g>
   {maze.exits.map(exit=>{
    const x=exit.edge==='left'?plan.exitLeftX:plan.exitRightX;
    const center=top+(exit.y+.5)*cell;
    return <g key={exit.edge}>{Array.from(exit.label).map((letter,i)=>
      <text key={i} x={x} y={center+(i-1.5)*plan.exitLetterPitch+plan.exitLabelSize*.35}
        fontFamily="Nunito" fontWeight="700" fontSize={plan.exitLabelSize}
        textAnchor="middle" fill="#222">{letter}</text>)}</g>;
   })}
   <path d={MAZE_ARROW_PATH}
     transform={'translate('+plan.arrowX+' '+plan.arrowY+') scale('+arrowScale+')'}
     fill="#222" stroke="#222" strokeWidth=".12"/>
  </svg>;
}
function MazePrintPreview({module,showSolution}:{
 module:Extract<PuzzleModule,{type:'true-false-maze'}>;showSolution:boolean;
}){
 const [plan,setPlan]=useState<MazePrintPlan|null|false>(null);
 useEffect(()=>{
  let active=true;setPlan(null);
  void mediumWidths().then(({finishBody})=>{
   if(active)setPlan(planMazePrint(module.statement,finishBody)??false);
  }).catch(()=>{if(active)setPlan(false);});
  return ()=>{active=false;};
 },[module.statement]);
 const maze=generateMaze(module);
 return <div className="module-preview medium-print-layout puzzle-maze-module">
  {plan===null?<div className="medium-print-loading">Preparing print-matched maze…</div>:
   plan===false?<div className="medium-print-loading">The statement cannot fit on one line.</div>:
   <MazeDrawing maze={maze} showSolution={showSolution} plan={plan} statement={module.statement}/>}
 </div>;
}
export default function PuzzlePreview({module,showSolution=false,bordered=false}:{module:PuzzleModule;showSolution?:boolean;bordered?:boolean}) {
  if(module.type==='word-search')return <WordSearchPrintPreview module={module} showSolution={showSolution} bordered={bordered}/>;
  if(module.type==='medium-word-search')return <MediumWordSearchPrintPreview module={module} showSolution={showSolution} bordered={bordered}/>;
  return <MazePrintPreview module={module} showSolution={showSolution}/>;
}
