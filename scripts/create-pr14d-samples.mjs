import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const verseShort={type:'unscramble-verse',reference:'John 3:16',seed:3,
 verse:'For [God] so [loved] the [world] that he [gave] his Son.'};
const verseEight={type:'unscramble-verse',reference:'Isaiah 41:10',seed:5,
 verse:'Do not [fear], for I am [with] you; do not be [dismayed], for I am your [God]. I will [empower] you and [help] you; I will [uphold] you with my right [hand].'};
const verseLong={type:'unscramble-verse',reference:'Psalm 46:1–3',seed:11,
 verse:'God is our [refuge] and [strength], an ever-present [help] in [trouble]. Therefore we will not [fear], though the [earth] give way and the mountains [fall] into the heart of the [sea].'};
const words=[
 'God is good.',
 'God calls us to love others.',
 'Jesus gives us hope and teaches us to serve one another.',
 'God gives courage to our hearts and teaches us to help others.',
];
const draft={title:'God Gives Us Strength',scripture:'Isaiah 41:10',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',
  4:'medium-medium-small-small'},
 modules:{
  '1:cover-activity':{type:'connect-verse',verse:'God is always with us.',seed:3},
  '2:top-medium':verseShort,
  '2:middle-medium':{type:'big-idea-cryptogram',idea:words[0],seed:2},
  '3:top-medium':verseEight,
  '3:middle-medium':{type:'big-idea-cryptogram',idea:words[2],seed:7},
  '4:top-medium':verseLong,
  '4:middle-medium':{type:'big-idea-cryptogram',idea:words[3],seed:11},
 }};
await mkdir('artifacts',{recursive:true});
const data=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr14d-adaptive-medium-layouts.pdf',data);
console.log('Generated PR 14d print sample ('+data.length+' bytes)');
