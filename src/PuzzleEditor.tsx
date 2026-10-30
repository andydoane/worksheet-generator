import { generateMaze, generateWordSearch, type PuzzleModule } from './puzzleEngines.ts';

export default function PuzzleEditor({module,onChange,showSolution}:{module:PuzzleModule;onChange:(patch:Partial<PuzzleModule>)=>void;showSolution:boolean}) {
  if(module.type==='word-search') {
    const errors=module.words.trim()?[]:['Enter words to generate the puzzle.'];
    let info='';
    if(!errors.length){
      try{
        const grid=generateWordSearch(module);
        info=grid.placements.map(p=>p.word+': row '+(p.y+1)+', column '+(p.x+1)+' ('+p.direction+')').join('\n');
      }catch{ /* validation messages appear below the editor */ }
    }
    return <div className="activity-inputs">
      <label htmlFor="search-words">Hidden words (4–10)</label>
      <textarea id="search-words" rows={10} value={module.words}
        onChange={e=>onChange({words:e.target.value})}
        placeholder={'DAVID\nGOLIATH\nSLING\nSTONE\nSHEPHERD\nSAUL'}/>
      <p>One word per line, 2–12 letters. The 12×10 grid uses forward horizontal, vertical and diagonal words. Shuffle to generate a new arrangement.</p>
      {showSolution&&info&&<div className="puzzle-solution-data"><strong>Word positions</strong><pre>{info}</pre></div>}
    </div>;
  }
  let answer='';
  try{
    const maze=generateMaze(module);
    answer='Correct exit: '+maze.correctExit.label+' ('+maze.correctExit.edge+' side), shortest path '+maze.solution.length+' cells.';
  }catch{ /* shown through shared validation */ }
  return <div className="activity-inputs">
    <label htmlFor="maze-statement">True-or-false statement</label>
    <textarea id="maze-statement" rows={4} value={module.statement}
      onChange={e=>onChange({statement:e.target.value})}
      placeholder="God protected Daniel in the lions' den."/>
    <label htmlFor="maze-answer">Correct answer</label>
    <select id="maze-answer" value={module.answer?'true':'false'}
      onChange={e=>onChange({answer:e.target.value==='true'})}>
      <option value="true">True</option><option value="false">False</option>
    </select>
    <p>The maze has a left entrance, a right exit, and a bottom exit. Both paths are reachable; the correct exit depends on your answer.</p>
    {showSolution&&answer&&<p className="puzzle-solution-data">{answer} The highlighted green route is visible only in the editor preview.</p>}
  </div>;
}
