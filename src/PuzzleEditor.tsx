import {generateMaze, generateWordSearch, parseSearchWords, type PuzzleModule} from './puzzleEngines.ts';
import {samplePlaceholder} from './moduleGuidance.ts';
import {PIXEL_SHAPES} from './pixelPictureShapes.ts';
import {generatePixelPicture,validatePixelPicture} from './pixelPicture.ts';

export default function PuzzleEditor({module,onChange,showSolution}:{module:PuzzleModule;onChange:(patch:Partial<PuzzleModule>)=>void;showSolution:boolean}) {
  if(module.type==='pixel-picture'){
    const errors=validatePixelPicture(module);
    const key=!errors.length?generatePixelPicture(module):null;
    return <div className="activity-inputs">
      <label htmlFor="pixel-phrase">Big Idea or story fact (30–85 characters)</label>
      <textarea id="pixel-phrase" rows={4} value={module.phrase}
        placeholder={samplePlaceholder('pixel-picture','phrase')}
        onChange={e=>onChange({phrase:e.target.value})}/>
      <p className="word-search-count" role="status" aria-live="polite">
        {module.phrase.trim().length} of 30–85 characters · One repeated letter will be hidden everywhere it occurs
      </p>
      <label htmlFor="pixel-shape">Hidden pixel picture</label>
      <select id="pixel-shape" value={module.shapeId} onChange={e=>onChange({shapeId:e.target.value})}>
        {PIXEL_SHAPES.map(shape=><option key={shape.id} value={shape.id}>{shape.name}</option>)}
      </select>
      <p>The generator chooses one letter that repeats in the phrase, preferring an uncommon letter when possible. Every instance of that letter becomes a writing blank. Children fill in that letter, then color squares containing it in the 13×13 grid.</p>
      {showSolution&&key&&<p className="puzzle-solution-data">
        Teacher key (not printed): {key.missingLetters[0]} · {PIXEL_SHAPES.find(shape=>shape.id===module.shapeId)?.name}
      </p>}
    </div>;
  }
  if(module.type==='word-search'||module.type==='medium-word-search') {
    const medium=module.type==='medium-word-search',max=medium?6:12;
    const count=parseSearchWords(module.words).length;
    let info='';
    if(count){
      try{
        const grid=generateWordSearch(module);
        info=grid.placements.map(p=>p.word+': row '+(p.y+1)+', column '+(p.x+1)+' ('+p.direction+')').join('\n');
      }catch{/* input validation displays below */}
    }
    return <div className="activity-inputs">
      <label htmlFor="search-words">Words or phrases ({medium?'1–6':'4–12'})</label>
      <textarea id="search-words" rows={medium?7:12} value={module.words} spellCheck={false}
        placeholder={samplePlaceholder(module.type,'words')}
        onChange={e=>onChange({words:e.target.value})}/>
      <p className="word-search-count" role="status" aria-live="polite">
        {count} of {max} words{count>max?' — over the limit':''}
      </p>
      <p>Type one word or short phrase per line; press Enter for the next entry or paste a list. Spaces appear in the bank, but not in the {medium?'9×9':'12×10'} puzzle. {medium?'Use 2–9 letters per entry after removing spaces.':'Use 2–12 letters per entry after removing spaces.'}</p>
      {showSolution&&info&&<div className="puzzle-solution-data"><strong>Word positions</strong><pre>{info}</pre></div>}
    </div>;
  }
  let answer='';
  try{
    const maze=generateMaze(module);
    answer='Correct exit: '+maze.correctExit.label+' ('+maze.correctExit.edge+' side), shortest path '+maze.solution.length+' cells.';
  }catch{/* input validation displays below */}
  return <div className="activity-inputs">
    <label htmlFor="maze-statement">True-or-false statement (up to 65 characters)</label>
    <textarea id="maze-statement" rows={4} maxLength={65} value={module.statement}
      onChange={e=>onChange({statement:e.target.value})}
      placeholder={samplePlaceholder('true-false-maze','statement')}/>
    <label htmlFor="maze-answer">Correct answer</label>
    <select id="maze-answer" value={module.answer?'true':'false'}
      onChange={e=>onChange({answer:e.target.value==='true'})}>
      <option value="true">True</option><option value="false">False</option>
    </select>
    <p>Follow the arrow into the bottom of the maze. Exit left for TRUE, or right for FALSE. Both routes are reachable; the engine prefers shorter, more balanced paths.</p>
    {showSolution&&answer&&<p className="puzzle-solution-data">{answer} The highlighted green route is visible only in the editor preview.</p>}
  </div>;
}
