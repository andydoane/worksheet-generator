import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const longPrompt='Moses and the people walking across the Red Sea on dry ground as waters stand like walls on each side.';
const checklist={type:'checkboxes',correct:'RED SEA\nDRY LAND\nBURNING BUSH\nTHESSALONIANS\nRIVER BANK',
 incorrect:'PROMISED LAND\nKING DAVID\nGREAT STORM\nBIG FISH\nDESERT ROAD',seed:6};
const longQuestion='Which person trusted the Lord and built a very large boat to keep his family and the animals safe?';
const draft={title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'small-small-medium_medium'},
 modules:{
  '2:top-left-small':{type:'unscramble-words',first:'RED SEA',second:'DRY LAND',seed:3},
  '2:top-right-small':{type:'multiple-choice',question:longQuestion,
   correct:'Noah',wrong1:'Moses',wrong2:'David',seed:2},
  '3:bottom-left-small':{type:'draw-picture',prompt:longPrompt},
  '3:bottom-right-small':checklist,
  '4:top-left-small':{type:'unscramble-words',first:'CROSS RIVER',second:'NOAH',seed:8},
  '4:top-right-small':{type:'draw-picture',prompt:'the people crossing the sea'},
 }};
draft.layouts[4]='small-small-medium-medium';
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr13a-small-finishing.pdf',pdf);
console.log('Created PR 13a sample PDF ('+pdf.length+' bytes)');
