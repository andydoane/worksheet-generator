import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const short=[
 'Daniel prayed to God. true',
 'Daniel stopped praying. false',
 'The king made a law. true',
 'Lions were afraid of the king. false',
].join('\n');
const full=[
 'Moses asked Pharaoh to let the people go. true',
 'Pharaoh was happy to free the Israelites immediately. false',
 'God led his people away from Egypt toward the Red Sea. true',
 'The people crossed the sea in the kings palace. false',
 'Moses followed the instructions God had given him. true',
 'The Israelites crossed safely through the divided water. true',
 'The Egyptians built a bridge over the sea. false',
 'God watched over the families traveling with Moses. true',
].join('\n');
const draft={
 title:'God Leads His People',scripture:'Exodus 14',
 layouts:{2:'large-medium',3:'large-medium',4:'medium-medium-small-small'},
 modules:{
  '2:top-large':{type:'sort-story',statements:short,seed:3},
  '3:top-large':{type:'sort-story',statements:full,seed:11},
  '4:bottom-left-small':{type:'draw-picture',prompt:'Daniel praying beside the open window'},
  '4:bottom-right-small':{type:'draw-picture',prompt:'What might happen next?'},
 },
};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr14a-sort-story-picture.pdf',pdf);
console.log('Generated PR 14a sample ('+pdf.length+' bytes)');
