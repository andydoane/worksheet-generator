import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const odd={type:'odd-words',
 correct:'red sea\ndry land\nburning bush\nnoah\nrainbow',
 incorrect:'pharaoh\ngoliath\nsoldier\nsling\nsand',seed:3};
const draft={title:'The Lord Protects Us',scripture:'Exodus 14',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
 modules:{
  '2:top-left-small':{type:'multiple-choice',question:'Who was kind?',
   correct:'Andy',wrong1:'Moses',wrong2:'David',seed:2},
  '2:top-right-small':odd,
  '3:bottom-left-small':{type:'multiple-choice',
   question:'Which person trusted the Lord and built a very large boat to keep his family and the animals safe?',
   correct:'Noah, who trusted God and saved his family',
   wrong1:'David, the boy who played a beautiful harp',
   wrong2:'Moses, who led his people into the desert',seed:8},
  '3:bottom-right-small':{...odd,seed:19},
  '4:bottom-left-small':{type:'multiple-choice',question:'Who came?',
   correct:'ANDY',wrong1:'Noah',wrong2:'Paul',seed:5},
  '4:bottom-right-small':{type:'multiple-choice',question:'Choose an answer.',
   correct:'Yes',wrong1:'No',wrong2:'Maybe',seed:3},
 },
};
await mkdir('artifacts',{recursive:true});
const output=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr12a-followup.pdf',output);
console.log('Created Small PR 12a follow-up PDF ('+output.length+' bytes)');
