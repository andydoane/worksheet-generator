import {type SmallModule} from './smallModules.ts';
import {MultipleChoicePrintPreview,OddWordsPrintPreview} from './SmallParityPreview.tsx';
import TrueFalsePrintPreview from './TrueFalsePrintPreview.tsx';
import {FirstLettersPrintPreview,CheckboxesPrintPreview} from './SmallBalancedPreview.tsx';
import WhoAmIPrintPreview from './WhoAmIPrintPreview.tsx';
import {SmallUnscramblePrintPreview} from './SmallFinishingPreview.tsx';

export default function SmallModulePreview({ module }: { module: SmallModule }) {
  switch (module.type) {
    case 'multiple-choice':return <MultipleChoicePrintPreview module={module}/>;
    case 'true-false':return <TrueFalsePrintPreview module={module}/>;
    case 'first-letters':return <FirstLettersPrintPreview module={module}/>;
    case 'odd-words':return <OddWordsPrintPreview module={module}/>;
    case 'unscramble-words':return <SmallUnscramblePrintPreview module={module}/>;
    case 'checkboxes':return <CheckboxesPrintPreview module={module}/>;
    case 'who-am-i':return <WhoAmIPrintPreview module={module}/>;
  }
}
