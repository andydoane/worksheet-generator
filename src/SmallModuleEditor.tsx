import { type SmallModule } from './smallModules.ts';

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
          <textarea id="mc-question" rows={3} value={module.question} onChange={(e) => onChange({ question:e.target.value })} placeholder="How did Jesus die?" />
          <label htmlFor="mc-correct">Correct answer</label>
          <input id="mc-correct" value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder="On a cross" />
          <label htmlFor="mc-wrong1">Incorrect answer 1</label>
          <input id="mc-wrong1" value={module.wrong1} onChange={(e) => onChange({ wrong1:e.target.value })} placeholder="Old age" />
          <label htmlFor="mc-wrong2">Incorrect answer 2</label>
          <input id="mc-wrong2" value={module.wrong2} onChange={(e) => onChange({ wrong2:e.target.value })} placeholder="Disease" />
          <p>The three answers will appear with empty checkboxes in a shuffled order.</p>
        </div>
      );
    case 'true-false':
      return (
        <div className="activity-inputs">
          <label htmlFor="tf-statement">True-or-false statement</label>
          <textarea id="tf-statement" rows={4} value={module.statement} onChange={(e) => onChange({ statement:e.target.value })} placeholder="Jesus rose from the dead." />
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
          <p>The worksheet prints the reference and only the first letter of each word in Zilla Slab Bold.</p>
        </div>
      );
    case 'odd-words':
      return (
        <div className="activity-inputs">
          <label htmlFor="odd-correct">Words from the story (up to five)</label>
          <textarea id="odd-correct" rows={5} value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder={'BOAT\nWATER\nRAINBOW\nNOAH\nDOVE'} />
          <label htmlFor="odd-incorrect">Words NOT from the story (up to five)</label>
          <textarea id="odd-incorrect" rows={5} value={module.incorrect} onChange={(e) => onChange({ incorrect:e.target.value })} placeholder={'SAMSON\nHAT\nDAVID'} />
          <p>Use one word per line, 6–10 words total. The worksheet shuffles all the words together.</p>
        </div>
      );
    case 'unscramble-words':
      return (
        <div className="activity-inputs">
          <label htmlFor="un-first">First story word</label>
          <input id="un-first" value={module.first} onChange={(e) => onChange({ first:e.target.value })} placeholder="NOAH" />
          <label htmlFor="un-second">Second story word</label>
          <input id="un-second" value={module.second} onChange={(e) => onChange({ second:e.target.value })} placeholder="ARK" />
          <p>Both words are scrambled, with individual writing lines above their letters.</p>
        </div>
      );
    case 'checkboxes':
      return (
        <div className="activity-inputs">
          <label htmlFor="check-correct">Words from the story (up to five)</label>
          <textarea id="check-correct" rows={5} value={module.correct} onChange={(e) => onChange({ correct:e.target.value })} placeholder={'BOAT\nRAINBOW\nWATER'} />
          <label htmlFor="check-incorrect">Unrelated words (up to five)</label>
          <textarea id="check-incorrect" rows={5} value={module.incorrect} onChange={(e) => onChange({ incorrect:e.target.value })} placeholder={'ROAD\nTEMPLE\nSODOM'} />
          <p>Each word gets an empty checkbox; children check only items that relate to the lesson.</p>
        </div>
      );
    case 'who-am-i':
      return (
        <div className="activity-inputs">
          <label htmlFor="who-clue">Character clue</label>
          <textarea id="who-clue" rows={5} value={module.clue} onChange={(e) => onChange({ clue:e.target.value })} placeholder="I was thrown into the lions' den for praying to God." />
          <label htmlFor="who-answer">Character's name</label>
          <input id="who-answer" value={module.answer} onChange={(e) => onChange({ answer:e.target.value })} placeholder="DANIEL" />
          <p>The answer stays hidden, but children get one writing line per letter.</p>
        </div>
      );
  }
}
