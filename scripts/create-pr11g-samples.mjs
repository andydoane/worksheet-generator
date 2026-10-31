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
const short='For God so loved the world that he gave his one and only Son that whoever believes in him shall not perish but have eternal life.';
const idea='The Lord is with us and gives us strength to love our neighbors and help one another every day together.';
const draft={
 title:'God Gives Us Courage',scripture:'Isaiah 41:10',
 layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
 modules:{
  '2:top-medium':{type:'connect-big-idea',idea,seed:3},
  '2:bottom-large':{type:'connect-verse',verse:long,seed:3},
  '3:top-large':{type:'connect-verse',verse:short,seed:9},
  '3:bottom-medium':{type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:7},
  '4:top-medium':{type:'connect-big-idea',idea,seed:12},
  '4:bottom-large':{type:'connect-verse',verse:long,seed:22},
 },
};
await mkdir('artifacts',{recursive:true});
const output=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11g-large-connect-verse.pdf',output);
console.log('Created Large Connect Verse + legacy Medium compatibility sample ('+output.length+' bytes)');
