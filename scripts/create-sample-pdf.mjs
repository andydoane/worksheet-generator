import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createBookletPdf } from '../src/pdf.ts';
import { DEFAULT_LAYOUTS } from '../src/booklet.ts';

const fontFiles = {
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans: await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf', import.meta.url)),
};

const draft = {
  title: 'David and Goliath',
  scripture: '1 Samuel 17',
  layouts: {
    ...DEFAULT_LAYOUTS,
    2: 'large-small-small',
    3: 'small-small-medium-medium',
    4: 'medium-small-small-medium',
  },
};

const bytes = await createBookletPdf(draft, fontFiles);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/sample-bifold-booklet.pdf', bytes);
console.log('Created artifacts/sample-bifold-booklet.pdf (' + bytes.length + ' bytes)');
