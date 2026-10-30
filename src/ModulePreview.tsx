import { matchRows, parseStory, storyBank, validateModule, type ActivityModule } from './modules';

export default function ModulePreview({ module }: { module: ActivityModule }) {
  const errors = validateModule(module);
  if (errors.length) {
    return (
      <div className="module-preview module-incomplete">
        <strong>{module.type === 'draw-picture' ? 'Draw a Picture' : module.type === 'match-words' ? 'Match the Words' : 'Finish the Story'}</strong>
        <span>Complete this activity in the editor.</span>
      </div>
    );
  }

  if (module.type === 'draw-picture') {
    return (
      <div className="module-preview drawing-module">
        <div className="drawing-box" />
        <div className="drawing-prompt">Draw a picture of {module.prompt.trim()}</div>
      </div>
    );
  }

  if (module.type === 'match-words') {
    const rows = matchRows(module);
    return (
      <div className="module-preview matching-module">
        <div className="module-title">MATCH THE WORDS</div>
        <div className="module-subtitle">Draw a line from each word on the left to its match on the right.</div>
        <div className="match-columns">
          <div>{rows.map((pair, index) => <div key={index} className="match-word">{pair.left}</div>)}</div>
          <div>{rows.map((pair, index) => <div key={index} className="match-word">{pair.right}</div>)}</div>
        </div>
      </div>
    );
  }

  const { parts } = parseStory(module.story);
  const bank = storyBank(module);
  const columns = Math.ceil(bank.length / 2);
  return (
    <div className="module-preview story-module">
      <div className="module-title">FINISH THE STORY</div>
      <div className="story-bank" style={{ gridTemplateColumns: 'repeat(' + columns + ', 1fr)' }}>
        {bank.map((word, index) => <span key={index} className="bank-word">{word}</span>)}
      </div>
      <div className="story-body">
        {parts.map((part, index) => part.kind === 'text'
          ? <span key={index}>{part.text}</span>
          : <span key={index} className="story-blank" style={{ width: Math.max(2.4, Math.min(13, part.word.length * 0.64)) + 'ch' }} aria-label="missing word" />)}
      </div>
    </div>
  );
}
