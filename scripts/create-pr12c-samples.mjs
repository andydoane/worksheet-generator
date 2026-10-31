import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const firstShort={type:'first-letters',reference:'John 3:16',
 verse:'For God so loved the world that he gave his only Son'};
const firstLong={type:'first-letters',reference:'1 Thessalonians 5:16',
 verse:Array.from({length:75},(_,i)=>['For','God','so','loved','the'][i%5]).join(' ')};
const checksShort={type:'checkboxes',correct:'DAVID\nSTONE',incorrect:'ARK\nBOAT',seed:3};
const checksLong={type:'checkboxes',correct:'THESSALONIANS\nBETHLEHEM\nPROMISE\nSHEPHERD\nGOLIATH',
 incorrect:'RAINBOW\nDESERT\nSAMSON\nWATER\nPHARAOH',seed:7};
const draft={title:'God Loves the World',scripture:'John 3:16',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
 modules:{
  '2:top-left-small':firstShort,'2:top-right-small':checksShort,
  '3:bottom-left-small':firstLong,'3:bottom-right-small':checksLong,
  '4:bottom-left-small':{...firstLong,reference:'Deuteronomy 6:5',verse:firstShort.verse},
  '4:bottom-right-small':{...checksLong,seed:22},
 }};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr12c-small-first-letters-checkboxes.pdf',pdf);
console.log('Created PR 12c sample PDF ('+pdf.length+' bytes)');
