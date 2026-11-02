import { type SmallModule } from './smallModules.ts';
import {samplePlaceholder} from './moduleGuidance.ts';

type Props = {
  module: SmallModule;
  onChange: (patch: Partial<SmallModule>) => void;
};

export default function SmallModuleEditor({ module, onChange }: Props) {
  switch (module.type) {
    case 'multiple-choice':
      return (
        <div className="activity-inputs">
          <label htmlFor="mc-question">Question</label>
          <textarea id="mc-question" rows={3} value={module.question} onChange={(e) => onChange({ question:e.target.value })} placeholder={samplePlaceholder(module.type,'question')} />
          <label htmlFor="mc-correct">Correct answer</label>
          <input id="mc-correct" value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder={samplePlaceholder(module.type,'correct')} />
          <label htmlFor="mc-wrong1">Incorrect answer 1</label>
          <input id="mc-wrong1" value={module.wrong1} onChange={(e) => onChange({ wrong1:e.target.value })} placeholder={samplePlaceholder(module.type,'wrong1')} />
          <label htmlFor="mc-wrong2">Incorrect answer 2</label>
          <input id="mc-wrong2" value={module.wrong2} onChange={(e) => onChange({ wrong2:e.target.value })} placeholder={samplePlaceholder(module.type,'wrong2')} />
          <p>The three answers will appear with empty checkboxes in a shuffled order.</p>
        </div>
      );
    case 'true-false':
      return (
        <div className="activity-inputs">
          <label htmlFor="tf-statement">True-or-false statement (up to 80 characters)</label>
          <textarea id="tf-statement" rows={4} value={module.statement} onChange={(e) => onChange({ statement:e.target.value })} placeholder={samplePlaceholder(module.type,'statement')} />
          <p>The children circle a thumbs-up or thumbs-down icon. Your original specification doesn't require an answer field yet.</p>
        </div>
      );
    case 'first-letters':
      return (
        <div className="activity-inputs">
          <label htmlFor="fl-reference">Scripture reference</label>
          <input id="fl-reference" value={module.reference} onChange={(e) => onChange({ reference:e.target.value })} placeholder="John 3:16" />
          <label htmlFor="fl-verse">Full verse text</label>
          <textarea id="fl-verse" rows={6} value={module.verse} onChange={(e) => onChange({ verse:e.target.value })} placeholder="For God so loved the world..." />
          <p>The worksheet combines the verse reference with the instructions and prints balanced rows of first letters in Zilla Slab Bold.</p>
        </div>
      );
    case 'odd-words':
      return (
        <div className="activity-inputs">
          <label htmlFor="odd-correct">Words from the story (up to five)</label>
          <textarea id="odd-correct" rows={5} value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder={samplePlaceholder(module.type,'correct')} />
          <label htmlFor="odd-incorrect">Words NOT from the story (up to five)</label>
          <textarea id="odd-incorrect" rows={5} value={module.incorrect} onChange={(e) => onChange({ incorrect:e.target.value })} placeholder={samplePlaceholder(module.type,'incorrect')} />
          <p>Use one entry per line, 6–10 entries total. Phrases such as “red sea” are welcome; each entry may contain up to 12 characters, counting spaces. The worksheet shuffles the entries together.</p>
        </div>
      );
    case 'unscramble-words':
      return (
        <div className="activity-inputs">
          <label htmlFor="un-first">First story answer</label>
          <input id="un-first" value={module.first} onChange={(e) => onChange({ first:e.target.value })} placeholder={samplePlaceholder(module.type,'first')} />
          <label htmlFor="un-second">Second story answer</label>
          <input id="un-second" value={module.second} onChange={(e) => onChange({ second:e.target.value })} placeholder={samplePlaceholder(module.type,'second')} />
          <p>Each answer can contain one word or two words (like “red sea”), with up to 10 letters excluding the space. Each word is scrambled independently; children get a line above every letter.</p>
        </div>
      );
    case 'checkboxes':
      return (
        <div className="activity-inputs">
          <label htmlFor="check-correct">Words from the story (up to five)</label>
          <textarea id="check-correct" rows={5} value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder={samplePlaceholder(module.type,'correct')} />
          <label htmlFor="check-incorrect">Unrelated words (up to five)</label>
          <textarea id="check-incorrect" rows={5} value={module.incorrect} onChange={(e) => onChange({ incorrect:e.target.value })} placeholder={samplePlaceholder(module.type,'incorrect')} />
          <p>Enter one item per line, up to five per list. One or two words per item are allowed (like “dry land”); each item may contain up to 14 characters, counting spaces. Children check only the story items.</p>
        </div>
      );
    case 'who-am-i':
      return (
        <div className="activity-inputs">
          <label htmlFor="who-clue">Character clue (up to 120 characters)</label>
          <textarea id="who-clue" rows={5} value={module.clue} onChange={(e) => onChange({ clue:e.target.value })} placeholder={samplePlaceholder(module.type,'clue')} />
          <label htmlFor="who-answer">Character's name</label>
          <input id="who-answer" value={module.answer} onChange={(e) => onChange({ answer:e.target.value })} placeholder={samplePlaceholder(module.type,'answer')} />
          <p>The clue fits the top portion of the activity. The separate Who Am I? question and a writing line for each answer letter stay clear below.</p>
        </div>
      );
  }
}
