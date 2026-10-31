import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const longQuestion={type:'multiple-choice',
 question:'Which person trusted the Lord and built a very large boat to keep his family and the animals safe?',
 correct:'Noah, who trusted God and saved his family',
 wrong1:'David, the boy who played a beautiful harp',
 wrong2:'Moses, who led his people into the desert',seed:8};
const shorter={type:'multiple-choice',question:'Who built the ark?',
 correct:'Noah',wrong1:'Moses',wrong2:'David',seed:5};
const tenWords={type:'odd-words',
 correct:'RAINBOW\nANIMALS\nWATERS\nNOAH\nDOVE',
 incorrect:'GOLIATH\nPHARAOH\nSOLDIER\nPILGRIM\nSLING',seed:13};
const sixWords={type:'odd-words',
 correct:'BOAT\nRAIN\nDOVE',incorrect:'GOLIATH\nSWORD\nSLING',seed:5};
const draft={title:'God Keeps His Promises',scripture:'Genesis 6–9',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
 modules:{
  '2:top-left-small':longQuestion,'2:top-right-small':tenWords,
  '3:bottom-left-small':shorter,'3:bottom-right-small':sixWords,
  '4:bottom-left-small':{type:'unscramble-words',first:'NOAH',second:'RAINBOW',seed:5},
  '4:bottom-right-small':{...tenWords,seed:20},
 }};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr12a-small-parity.pdf',pdf);
console.log('Created PR 12a small print comparison ('+pdf.length+' bytes)');
