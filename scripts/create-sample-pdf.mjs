import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createBookletPdf } from '../src/pdf.ts';

const fontFiles = {
  mouseMemoirs: await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab: await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf', import.meta.url)),
};

const layouts = {
  2: 'small-small-medium-medium',
  3: 'large-small-small',
  4: 'large-small-small',
};
const base = {
  title: 'David and Goliath',
  scripture: '1 Samuel 17',
  layouts,
  modules: {
    '1:cover-activity': {
      type: 'finish-story',
      story: '[David] was a young [shepherd]. His brothers were in the [army]. He brought food to them and saw a giant named [Goliath]. David used a [sling] and a [stone]. He trusted in [God] and was not afraid.',
      seed: 1,
    },
    '2:middle-medium': {
      type: 'match-words',
      pairs: 'David, Shepherd\nGoliath, Giant\nSaul, King\nSling, Tool',
      seed: 3,
    },
  },
};

const first = {
  ...base,
  modules: {
    ...base.modules,
    '2:top-left-small': {
      type:'multiple-choice', question:'What did David use to defeat Goliath?',
      correct:'A sling', wrong1:'A sword', wrong2:'A spear', seed:2,
    },
    '2:top-right-small': { type:'true-false', statement:'David trusted God even when facing a giant.' },
    '3:bottom-left-small': {
      type:'first-letters',
      reference:'1 Samuel 17:47',
      verse:'The battle is the Lord’s and he will give all of you into our hands',
    },
    '3:bottom-right-small': {
      type:'odd-words',
      correct:'David\nGoliath\nSling\nStone\nSaul',
      incorrect:'Noah\nArk\nSamson',
      seed:4,
    },
    '4:bottom-left-small': { type:'unscramble-words', first:'DAVID', second:'STONE', seed:5 },
    '4:bottom-right-small': {
      type:'checkboxes',
      correct:'DAVID\nSLING\nSTONE\nGOLIATH',
      incorrect:'ARK\nRAINBOW\nFLOOD\nDOVE', seed:6,
    },
  },
};

const second = {
  ...base,
  modules: {
    ...base.modules,
    '2:top-left-small': {
      type:'who-am-i',
      clue:'I was thrown into the lions den because I prayed to God.',
      answer:'DANIEL',
    },
    '2:top-right-small': { type:'draw-picture', prompt:'David holding his sling.' },
  },
};

await mkdir('artifacts', {recursive:true});
for(const [file, draft] of [
  ['sample-bifold-booklet.pdf', first],
  ['sample-small-modules-b.pdf', second],
]) {
  const bytes = await createBookletPdf(draft, fontFiles);
  await writeFile('artifacts/'+file, bytes);
  console.log('Created artifacts/'+file+' ('+bytes.length+' bytes)');
}
