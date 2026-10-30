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
      <label id="search-words-label">Words or phrases (4–12)</label>
      <ol className="word-search-editor-list" aria-labelledby="search-words-label">
        {(module.words?module.words.split(/\r?\n/u):['']).map((item,i,all)=><li key={i}>
          <span aria-hidden="true">{i+1}.</span>
          <input aria-label={'Word or phrase '+(i+1)} value={item}
            onChange={e=>onChange({words:all.map((word,j)=>i===j?e.target.value:word).join('\n')})}
            placeholder={i===0?'Red Sea':'Word or phrase'}/>
          <button type="button" aria-label={'Remove entry '+(i+1)}
            disabled={all.length<=1} onClick={()=>onChange({words:all.filter((_,j)=>i!==j).join('\n')})}>×</button>
        </li>)}
      </ol>
      <button type="button" className="word-search-add" disabled={module.words.split(/\r?\n/u).length>=12}
        onClick={()=>onChange({words:(module.words?module.words+'\n':'')})}>+ Add word</button>
      <p>Enter 4–12 entries. Spaces are shown in the word bank but omitted from the 12×10 puzzle (Red Sea becomes REDSEA). Each entry needs 2–12 letters excluding spaces.</p>
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
    <p>The maze starts at IN on the bottom. Exit left for TRUE, or right for FALSE. Both routes are reachable; the engine prefers shorter, more balanced paths.</p>
    {showSolution&&answer&&<p className="puzzle-solution-data">{answer} The highlighted green route is visible only in the editor preview.</p>}
  </div>;
}
