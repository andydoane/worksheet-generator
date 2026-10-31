import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const one='Moses';
const three='Red Sea\nDry Land\nMoses';
const six='Joseph\nPharaoh\nRed Sea\nDry Land\nPromises\nCourage';
const maxSix='Shepherd\nPassover\nCreation\nJerusalem\nRighteous\nCommanded';
const draft={
 title:'God Guides His People',scripture:'Exodus 14',
 layouts:{2:'medium-medium-small-small',3:'large-medium',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'medium-word-search',words:one,seed:3},
  '2:middle-medium':{type:'medium-word-search',words:three,seed:7},
  '3:top-large':{type:'word-search',words:six,seed:11},
  '3:bottom-medium':{type:'medium-word-search',words:maxSix,seed:12},
  '4:top-medium':{type:'medium-word-search',words:six,seed:17},
  '4:middle-medium':{type:'medium-word-search',words:maxSix,seed:27},
 },
};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr15b-medium-word-search.pdf',pdf);
console.log('Generated PR 15b 9x9 Medium Word Search PDF ('+pdf.length+' bytes)');
