import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const ideas=[
 'God loves us and calls us to help others.',
 'God gives us courage to care for our neighbors every day.',
 'God is with us and gives us strength to love and help people.',
 'The Lord is with us and gives us strength to love our neighbors and help one another every day together.',
];
const draft={
 title:'God Calls Us to Love',scripture:'John 13',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'connect-big-idea',idea:ideas[0],seed:1},
  '2:middle-medium':{type:'connect-big-idea',idea:ideas[1],seed:4},
  '3:top-medium':{type:'connect-big-idea',idea:ideas[2],seed:8},
  '3:middle-medium':{type:'connect-big-idea',idea:ideas[3],seed:5},
  '4:top-medium':{type:'connect-big-idea',idea:ideas[3],seed:21},
  '4:middle-medium':{type:'connect-big-idea',idea:ideas[0],seed:13},
 },
};
await mkdir('artifacts',{recursive:true});
const result=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11f-connect-big-idea.pdf',result);
console.log('Created PR 11f scatter sample ('+result.length+' bytes)');
