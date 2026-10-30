import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const order={type:'story-order',events:[
  'The shepherd carefully counted all the sheep in the field.',
  'The shepherd discovered that one of his sheep was missing from the flock.',
  'He went out to search the hills and valleys until he found the lost sheep.',
  'The shepherd gently lifted the tired sheep onto his shoulders.',
  'He brought the sheep safely home and asked his friends to celebrate.',
].join('\n'),seed:7};
const sort={type:'sort-story',statements:[
  'The shepherd looked for his lost sheep. true',
  'He decided the lost sheep was not important. false',
  'The shepherd carried his sheep home. true',
  'The shepherd became angry when he found the sheep. false',
  'He called his friends and neighbors together. true',
  'Nobody was happy when the sheep returned. false',
  'The shepherd knew that every sheep mattered. true',
].join('\n'),seed:4};
const draw={type:'draw-story',prompts:[
  'The shepherd counts all his sheep.',
  'He sees that one of them is missing.',
  'He searches for the sheep in the rocky hills.',
  'He carries the sheep safely home.',
].join('\n')};
const drawLong={type:'draw-story',prompts:[
  'The shepherd looks across the meadow and realizes that one sheep is missing.',
  'He carefully searches the hills, calling out for the lost sheep among the rocks and bushes.',
  'The shepherd finds the sheep, gently picks it up, and carries it home on his shoulders.',
  'He gathers his friends and neighbors and celebrates because the lost sheep has been found.',
].join('\n')};
const story={type:'finish-story',story:
  'Jesus told the people a [story] about a [shepherd]. He had one hundred [sheep], but one was [lost]. The shepherd went to [find] it. When he found the sheep, he lifted it onto his [shoulders] and carried it [home]. He invited his [friends] to [celebrate]. Everyone [rejoiced] because the [sheep] had been found. We know that [God] cares for us.',seed:3};
const shortStory={type:'finish-story',story:
  'The good [shepherd] [loved] every [sheep]. One sheep was [lost], so he went to [find] it and bring it [home].',seed:9};
const drafts=[
  {
    title:'The Lost Sheep',scripture:'Luke 15:3-7',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{'1:cover-activity':story,'2:bottom-large':order,
      '3:top-large':sort,'4:bottom-large':draw},
  },
  {
    title:'The Good Shepherd',scripture:'John 10',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{'1:cover-activity':shortStory,'2:bottom-large':sort,
      '3:top-large':drawLong,'4:bottom-large':order},
  },
];
await mkdir('artifacts',{recursive:true});
for(const [i,draft] of drafts.entries()){
  const bytes=await createBookletPdf(draft,fonts);
  const file='artifacts/'+(i?'sample-pr10d-long-captions.pdf':'sample-pr10d-stories.pdf');
  await writeFile(file,bytes);
  console.log(file+': '+bytes.length+' bytes');
}
