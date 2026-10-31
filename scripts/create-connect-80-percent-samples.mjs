import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const long='Do not be afraid for I am with you do not be dismayed for I am your God I will strengthen you and help you I will uphold you with my righteous right hand today.';
const medium='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const draft={
 title:'God Gives Us Strength',scripture:'Isaiah 41:10',
 layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
 modules:{
  '2:top-medium':{type:'connect-big-idea',idea:'God is with us and gives us strength to love and help others.',seed:4},
  '2:bottom-large':{type:'connect-verse',verse:long,seed:7},
  '3:top-large':{type:'connect-verse',verse:long,seed:21},
  '3:bottom-medium':{type:'connect-big-idea',idea:medium,seed:15},
  '4:top-medium':{type:'connect-big-idea',idea:medium,seed:5},
  '4:bottom-large':{type:'connect-verse',
   verse:'For God so loved the world that he gave his one and only Son that whoever believes in him shall not perish but have eternal life.',seed:12},
 },
};
await mkdir('artifacts',{recursive:true});
const data=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-connect-80-percent-cover.pdf',data);
console.log('Created 80% Connect and centered cover sample ('+data.length+' bytes)');
