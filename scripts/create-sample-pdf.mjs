import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createBookletPdf } from '../src/pdf.ts';
import { DEFAULT_LAYOUTS } from '../src/booklet.ts';

const fontFiles = {
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans: await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf', import.meta.url)),
  zillaSlab: await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf', import.meta.url)),
};

const draft = {
  title: 'David and Goliath',
  scripture: '1 Samuel 17',
  layouts: {
    ...DEFAULT_LAYOUTS,
    2: 'medium-large',
    3: 'small-small-medium-medium',
    4: 'large-medium',
  },
  modules: {
    '1:cover-activity': {
      type: 'finish-story',
      story: '[David] was a young [shepherd]. His brothers were in the [army]. He brought food to them and saw a giant named [Goliath]. David used a [sling] and a [stone]. He trusted in [God] and was not afraid.',
      seed: 1,
    },
    '2:top-medium': {
      type: 'match-words',
      pairs: 'David, Shepherd\nGoliath, Giant\nSaul, King\nSling, Tool',
      seed: 3,
    },
    '3:top-left-small': {
      type: 'draw-picture',
      prompt: 'David with his sling.',
    },
    '3:top-right-small': {
      type: 'draw-picture',
      prompt: 'a large stone.',
    },
  },
};

const bytes = await createBookletPdf(draft, fontFiles);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/sample-bifold-booklet.pdf', bytes);
console.log('Created artifacts/sample-bifold-booklet.pdf (' + bytes.length + ' bytes)');
