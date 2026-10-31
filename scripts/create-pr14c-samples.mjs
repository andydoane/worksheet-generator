import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const four='God loves his children.';
const twenty='The Lord is my shepherd and he guides me through the darkest valley with love and strength each day always';
const thirtyFive='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const draft={
 title:'God Gives Us Courage',scripture:'Isaiah 41:10',
 layouts:{2:'medium-large',3:'large-medium',4:'large-medium'},
 modules:{
  '1:cover-activity':{type:'connect-verse',verse:four,seed:2},
  '2:top-medium':{type:'connect-big-idea',idea:'God guides us with love and strength.',seed:4},
  '2:bottom-large':{type:'connect-verse',verse:twenty,seed:7},
  '3:top-large':{type:'connect-verse',verse:thirtyFive,seed:12},
  '4:top-large':{type:'connect-verse',verse:thirtyFive,seed:19},
 },
};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr14c-connect-verse-boxes.pdf',pdf);
console.log('Generated PR 14c boxed Connect Verse PDF ('+pdf.length+' bytes)');
