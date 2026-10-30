import { matchRows, parseStory, storyBank, validateModule, MODULES, type ActivityModule } from './modules';
import { isSmallModule } from './smallModules';
import SmallModulePreview from './SmallModulePreview';
import { isStoryVerseModule } from './storyVerseModules';
import StoryVersePreview from './StoryVersePreview';
import { isPuzzleModule } from './puzzleEngines';
import PuzzlePreview from './PuzzlePreview';
import { isCryptogram } from './cryptograms.ts';
import CryptogramPreview from './CryptogramPreview';
import {isSpecialtyModule} from './specialtyModules.ts';
import SpecialtyPreview from './SpecialtyPreview';

export default function ModulePreview({ module, showSolution = false }: { module: ActivityModule; showSolution?: boolean }) {
  const errors = validateModule(module);
  if (errors.length) {
    return (
      <div className="module-preview module-incomplete">
        <strong>{MODULES.find(item => item.id === module.type)?.name ?? 'Activity'}</strong>
        <span>Complete this activity in the editor.</span>
      </div>
    );
  }

  if (isSmallModule(module)) return <SmallModulePreview module={module}/>;
  if (isStoryVerseModule(module)) return <StoryVersePreview module={module}/>;
  if (isPuzzleModule(module)) return <PuzzlePreview module={module} showSolution={showSolution}/>;
  if (isCryptogram(module)) return <CryptogramPreview module={module}/>;
  if (isSpecialtyModule(module)) return <SpecialtyPreview module={module}/>;

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
