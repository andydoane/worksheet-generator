import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const wordSearch={type:'word-search',words:'Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover',seed:15};
const cryptogram={type:'verse-cryptogram',reference:'John 3:16',
  verse:'For God so loved the world that he gave his one and only Son.',seed:8};
const story={type:'finish-story',story:'[Moses] led the [people] across the [Red] Sea. God made [dry] ground. [Pharaoh] and his [army] could not catch them.',seed:2};
const order={type:'story-order',events:'Moses spoke to Pharaoh.\nThe Israelites walked out of Egypt.\nThey camped beside the Red Sea.\nGod parted the waters and made dry ground.\nThe people walked safely between the walls of water.',seed:3};
const sort={type:'sort-story',statements:'Moses led the Israelites. true\nPharaoh wanted to let the Israelites go. false\nThe Israelites crossed on dry land. true\nThe sea stayed closed the whole time. false\nGod helped his people escape. true',seed:4};
const draw={type:'draw-story',prompts:'God speaks to Moses.\nMoses talks to Pharaoh.\nThe people reach the Red Sea.\nGod opens a path through the sea.',};
const drafts=[
  {title:'Crossing the Red Sea',scripture:'Exodus 14',
    layouts:{2:'medium-large',3:'medium-large',4:'large-medium'},
    modules:{'1:cover-activity':wordSearch,
      '2:bottom-large':order,
      '3:bottom-large':sort,
      '4:top-large':draw,
    }},
  {title:'God Makes a Way',scripture:'Exodus 14',
    layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
    modules:{'1:cover-activity':cryptogram,
      '2:bottom-large':story,
      '3:top-large':wordSearch,
      '4:bottom-large':order,
    }},
];
await mkdir('artifacts',{recursive:true});
for(const [i,draft] of drafts.entries()){
  const bytes=await createBookletPdf(draft,fonts);
  const name=i?'sample-large-polish-cryptogram.pdf':'sample-large-polish-wordsearch.pdf';
  await writeFile('artifacts/'+name,bytes);
  console.log('Created '+name+' ('+bytes.length+' bytes)');
}
