import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const verse={type:'verse-cryptogram',reference:'John 3:16',
  verse:'For God so loved the world that he gave his one and only Son.',seed:2};
const idea={type:'big-idea-cryptogram',idea:'God loves us and calls us to love others.',seed:7};
const maze={type:'true-false-maze',statement:'God protected Daniel in the lions den.',answer:true,seed:4};
const first={
  title:'God Loves Everyone',scripture:'John 3:16',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules:{
    '1:cover-activity':verse,
    '2:top-medium':idea,
    '2:bottom-large':{type:'word-search',words:'JESUS\nFATHER\nLOVE\nWORLD\nSAVIOR\nFAITH',seed:7},
    '3:top-large':{...verse,reference:'Romans 8:28',verse:'God works for the good of those who love him.',seed:8},
    '3:bottom-medium':maze,
    '4:top-medium':{...idea,idea:'God is with us through every trial.',seed:14},
    '4:bottom-large':{type:'draw-story',prompts:'Jesus teaches the people.\nJesus helps the sick.\nJesus welcomes the children.\nJesus loves us.',},
  },
};
const second={
  title:'Cipher and Maze Practice',scripture:'Daniel 6',
  layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
  modules:{
    '1:cover-activity':{...verse,seed:31},
    '2:top-medium':{...idea,idea:'God is our help and strength.',seed:33},
    '2:bottom-large':{...verse,seed:32},
    '3:top-medium':{...maze,answer:false,seed:16},
    '3:bottom-large':{...verse,seed:15},
    '4:top-medium':{...idea,seed:43},
    '4:bottom-large':{...verse,seed:41},
  },
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft] of [['sample-cryptograms-and-maze.pdf',first],['sample-cryptogram-regenerations.pdf',second]]){
  const bytes=await createBookletPdf(draft,fonts);
  await writeFile('artifacts/'+name,bytes);
  console.log('Created '+name+' ('+bytes.length+' bytes)');
}
