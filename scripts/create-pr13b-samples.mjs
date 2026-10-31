import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const sample='The Lord God is a mighty Savior';
const short='God saves his people';
const middle='God is with us and gives strength and hope to his children';
const long='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const draft={title:'God Is Our Savior',scripture:'Exodus 14',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'connect-big-idea',idea:sample,seed:3},
  '2:middle-medium':{type:'connect-big-idea',idea:sample,seed:19},
  '3:top-medium':{type:'connect-big-idea',idea:short,seed:6},
  '3:middle-medium':{type:'connect-big-idea',idea:long,seed:11},
  '4:top-medium':{type:'big-idea-cryptogram',idea:'God saves his people.',seed:9},
  '4:middle-medium':{type:'big-idea-cryptogram',idea:'Moses crossed the Red Sea.',seed:14},
 }};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr13b-coverage-solve-code.pdf',pdf);
console.log('Generated PR 13b sample ('+pdf.length+' bytes)');
