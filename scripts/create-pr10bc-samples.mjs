import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const order={type:'story-order',events:
  'Moses called the people to leave Egypt.\nThe Israelites set out on their journey.\nPharaoh sent his soldiers to bring them back.\nThe people stopped at the Red Sea.\nGod made a path through the water.',seed:3};
const sort={type:'sort-story',statements:
  'Moses led the people from Egypt. true\nGod told Moses to stop at the sea. false\nThe people crossed safely on dry ground. true\nPharaoh was happy to let the people go. false\nGod made a path through the sea. true\nThe Israelites stayed in Egypt. false\nMoses trusted the Lord. true\nThe soldiers crossed safely with Israel. false',seed:4};
const story={type:'finish-story',story:
  '[Moses] brought the [people] to the Red [Sea]. God made a [path] through the [water]. The children of [Israel] crossed on [dry] [land]. Then the [sea] covered the [soldiers].',seed:5};
const draw={type:'draw-story',prompts:
  'God speaks to Moses.\nMoses calls the Israelites to leave Egypt and take the first step.\nThey reach the Red Sea and see the water everywhere.\nGod opens a safe path across the sea.',};
const wordSearch={type:'word-search',words:
  'Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover',seed:15};
const draft={
  title:'Crossing the Red Sea',scripture:'Exodus 14',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules:{
    '1:cover-activity':story,
    '2:bottom-large':sort,
    '3:top-large':draw,
    '4:bottom-large':wordSearch,
    '3:bottom-medium':{type:'match-words',pairs:'Moses, Leader\nPharaoh, King\nRed Sea, Water\nIsraelites, People',seed:3},
  },
};
await mkdir('artifacts',{recursive:true});
const bytes=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr10bc-type-and-layout.pdf',bytes);
console.log('Created sample-pr10bc-type-and-layout.pdf ('+bytes.length+' bytes)');
