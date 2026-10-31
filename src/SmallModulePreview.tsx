import {
  scrambleWord,
  type SmallModule,
} from './smallModules.ts';
import {MultipleChoicePrintPreview,OddWordsPrintPreview} from './SmallParityPreview.tsx';
import TrueFalsePrintPreview from './TrueFalsePrintPreview.tsx';
import {FirstLettersPrintPreview,CheckboxesPrintPreview} from './SmallBalancedPreview.tsx';
import WhoAmIPrintPreview from './WhoAmIPrintPreview.tsx';

export default function SmallModulePreview({ module }: { module: SmallModule }) {
  switch (module.type) {
    case 'multiple-choice':return <MultipleChoicePrintPreview module={module}/>;
    case 'true-false':return <TrueFalsePrintPreview module={module}/>;
    case 'first-letters':return <FirstLettersPrintPreview module={module}/>;
    case 'odd-words':return <OddWordsPrintPreview module={module}/>;
    case 'unscramble-words':
      return (
        <div className="module-preview small-preview small-unscramble">
          <div className="small-heading">UNSCRAMBLE THE WORDS</div>
          {[module.first, module.second].map((word, index) =>
            <div className="small-scramble-row" key={index}>
              {Array.from(scrambleWord(word, module.seed + index * 101)).map((letter, i) =>
                <span className="small-scramble-cell" key={i}><i/><b>{letter}</b></span>)}
            </div>)}
        </div>
      );
    case 'checkboxes':return <CheckboxesPrintPreview module={module}/>;
    case 'who-am-i':return <WhoAmIPrintPreview module={module}/>;
  }
}
