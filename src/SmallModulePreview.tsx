import {
  answerCharacters, scrambleWord, shuffledChoices, shuffledWordList, verseInitials,
  type SmallModule,
} from './smallModules.ts';

const THUMB_POINTS = '4,12 10,12 10,7 16,1 19,1 20,4 18,10 26,10 28,13 25,25 22,28 11,28 10,25 4,25';
function Thumb({ up }: { up: boolean }) {
  return (
    <span className="small-thumb" aria-label={up ? 'Thumbs up' : 'Thumbs down'}>
      <svg viewBox="0 0 32 32" role="img" aria-hidden="true">
        <g transform={up ? undefined : 'translate(32 32) rotate(180)'}>
          <polygon points={THUMB_POINTS} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <line x1="10" y1="12" x2="10" y2="25" stroke="currentColor" strokeWidth="2" />
        </g>
      </svg>
      <span>{up ? 'TRUE' : 'FALSE'}</span>
    </span>
  );
}

export default function SmallModulePreview({ module }: { module: SmallModule }) {
  switch (module.type) {
    case 'multiple-choice':
      return (
        <div className="module-preview small-preview small-choice">
          <div className="small-question">{module.question}</div>
          <div className="small-answer-list">
            {shuffledChoices(module).map((choice, i) =>
              <div className="small-check-row" key={i}><span className="small-square" />{choice}</div>)}
          </div>
        </div>
      );
    case 'true-false':
      return (
        <div className="module-preview small-preview small-true-false">
          <div className="small-heading">TRUE OR FALSE?</div>
          <div className="small-statement">{module.statement}</div>
          <div className="small-thumbs"><Thumb up /><Thumb up={false}/></div>
        </div>
      );
    case 'first-letters': {
      const letters = verseInitials(module.verse);
      const chunks = letters.match(/.{1,16}/g) ?? [];
      return (
        <div className="module-preview small-preview small-first-letter">
          <div className="small-instruction">Try to say the verse using only the first letters.</div>
          <div className="small-zilla small-reference">{module.reference.toUpperCase()}</div>
          <div className="small-zilla small-initials">{chunks.map((chunk, i) => <div key={i}>{chunk}</div>)}</div>
        </div>
      );
    }
    case 'odd-words':
      return (
        <div className="module-preview small-preview small-odd-words">
          <div className="small-instruction">Scribble out the words that don't match the story.</div>
          <div className="small-word-grid">
            {shuffledWordList(module).map(({text}, i) => <span className="small-zilla" key={i}>{text.toUpperCase()}</span>)}
          </div>
        </div>
      );
    case 'unscramble-words':
      return (
        <div className="module-preview small-preview small-unscramble">
          <div className="small-heading">UNSCRAMBLE THE WORDS!</div>
          {[module.first, module.second].map((word, index) =>
            <div className="small-scramble-row" key={index}>
              {Array.from(scrambleWord(word, module.seed + index * 101)).map((letter, i) =>
                <span className="small-scramble-cell" key={i}><i/><b>{letter}</b></span>)}
            </div>)}
        </div>
      );
    case 'checkboxes':
      return (
        <div className="module-preview small-preview small-checklist">
          <div className="small-instruction">Check off everything that is part of the story.</div>
          <div className="small-word-grid">
            {shuffledWordList(module).map(({text},i) =>
              <span key={i} className="small-check-row"><span className="small-square"/><span className="small-zilla">{text.toUpperCase()}</span></span>)}
          </div>
        </div>
      );
    case 'who-am-i':
      return (
        <div className="module-preview small-preview small-who">
          <div className="small-clue">{module.clue}</div>
          <div className="small-heading">WHO AM I?</div>
          <div className="small-answer-blanks">
            {answerCharacters(module.answer).map((char, i) => char === ' '
              ? <span className="small-blank-space" key={i}/>
              : char === '-'
                ? <span key={i} className="small-hyphen">-</span>
                : <span key={i} className="small-letter-blank"/>)}
          </div>
        </div>
      );
  }
}
