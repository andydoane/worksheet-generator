import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const short='Daniel lived in Egypt. Daniel prayed to idols. The lions were not hungry.';
const long=[
 'God led the Israelites out of Egypt and through the wilderness.',
 'Moses told the people that Pharaoh would not follow them, but the Egyptians pursued.',
 'The people were afraid and wanted to return to Egypt.',
 'The sea opened only after everyone built boats to cross.',
 'They walked through the sea on dry ground, and God protected them from the army.',
].join(' ');
const match3='Moses, Leader\nPharaoh, King\nIsraelites, People';
const match6=[
 'Israelites, People of Israel',
 'Pharaoh, King of Egypt',
 'Moses, Faithful leader',
 'Miriam, Sister of Moses',
 'Red Sea, Sea of deliverance',
 'Wilderness, Desert journey',
].join('\n');
const draft={
 title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'match-words',pairs:match3,seed:1},
  '2:middle-medium':{type:'circle-mistakes',text:short,count:3},
  '3:top-medium':{type:'match-words',pairs:match6,seed:4},
  '3:middle-medium':{type:'circle-mistakes',text:long,count:5},
  '4:top-medium':{type:'match-words',pairs:match6,seed:8},
  '4:middle-medium':{type:'circle-mistakes',text:short+' '+short,count:4},
 },
};
await mkdir('artifacts',{recursive:true});
const data=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11a-medium-matching-and-circling.pdf',data);
console.log('Created PR 11a sample ('+data.length+' bytes)');
