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
 'God calls us to love others.',
 'Jesus gives us hope and teaches us to serve one another.',
 'God gives courage to our hearts and teaches us to help others.',
 'God leads us with wisdom and invites us to show love to all.',
];
const draft={title:'God Gives Us Courage',scripture:'Isaiah 41',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'big-idea-cryptogram',idea:ideas[0],seed:1},
  '2:middle-medium':{type:'big-idea-cryptogram',idea:ideas[1],seed:2},
  '3:top-medium':{type:'big-idea-cryptogram',idea:ideas[2],seed:3},
  '3:middle-medium':{type:'big-idea-cryptogram',idea:ideas[3],seed:4},
  '4:top-medium':{type:'big-idea-cryptogram',idea:ideas[2],seed:6},
  '4:middle-medium':{type:'big-idea-cryptogram',idea:ideas[0],seed:7},
 },
};
await mkdir('artifacts',{recursive:true});
const output=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11e-big-idea-cryptogram.pdf',output);
console.log('Created PR 11e review PDF ('+output.length+' bytes)');
