import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const four='God guides his people.';
const twelve='God is with us and gives us courage to love one another.';
const twenty='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const verse='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const draft={
 title:'God Guides Us',scripture:'Isaiah 41:10',
 layouts:{2:'medium-large',3:'medium-medium-small-small',4:'medium-large'},
 modules:{
  '2:top-medium':{type:'connect-big-idea',idea:four,seed:2},
  '2:bottom-large':{type:'connect-verse',verse,seed:11},
  '3:top-medium':{type:'connect-big-idea',idea:twenty,seed:5},
  '3:middle-medium':{type:'connect-big-idea',idea:twelve,seed:9},
  '4:top-medium':{type:'connect-big-idea',idea:twenty,seed:21},
  '4:bottom-large':{type:'connect-verse',verse:'God is with us and gives us strength to care for others.',seed:8},
 },
};
await mkdir('artifacts',{recursive:true});
const data=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr15a-connect-phrase-boxes.pdf',data);
console.log('Generated PR 15a Connect the Phrase + Verse PDF ('+data.length+' bytes)');
