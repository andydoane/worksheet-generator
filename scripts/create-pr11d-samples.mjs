import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const draft={title:'The Lord Gives Courage',scripture:'Daniel 6',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'true-false-maze',
   statement:'God gave Daniel courage when the hungry lions approached him.',answer:true,seed:7},
  '2:middle-medium':{type:'unscramble-verse',reference:'1 Thessalonians 5:16',seed:4,
   verse:'[Rejoice] [always], [pray] without [ceasing].'},
  '3:top-medium':{type:'true-false-maze',
   statement:'Daniel was punished because he stopped praying to the Lord.',answer:false,seed:8},
  '3:middle-medium':{type:'unscramble-verse',reference:'John 3:16',seed:9,
   verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'},
  '4:top-medium':{type:'true-false-maze',
   statement:'The Lord heard Daniel pray even when the king forbade it!',answer:true,seed:12},
  '4:middle-medium':{type:'unscramble-verse',reference:'Isaiah 41:10',seed:6,
   verse:'[Fear] not, for I am [with] you; I will [help] you, I will [uphold] you.'},
 }};
await mkdir('artifacts',{recursive:true});
const bytes=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11d-maze-and-unscramble.pdf',bytes);
console.log('Generated PR 11d print booklet ('+bytes.length+' bytes)');
