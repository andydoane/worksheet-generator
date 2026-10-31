import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const longest='I was a shepherd boy who trusted God. I stood before a giant with a sling and stone and believed the Lord would help me.';
const modules=[
 {type:'who-am-i',clue:'I climbed a tree so I could see Jesus.',answer:'Zacchaeus'},
 {type:'who-am-i',clue:longest,answer:'David'},
 {type:'who-am-i',clue:"I was thrown into a den of lions because I prayed to God each day. He protected me.",answer:'Daniel'},
 {type:'who-am-i',clue:longest,answer:'John the Baptist'},
 {type:'who-am-i',clue:'I helped spread the good news to many cities.',answer:'Mary-Jane'},
 {type:'who-am-i',clue:'I built a boat to save my family and animals from the flood.',answer:'Noah'},
];
const draft={title:'God Helps His People',scripture:'Daniel 6',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'small-small-medium-medium'},
 modules:{
  '2:top-left-small':modules[0],
  '2:top-right-small':modules[1],
  '3:bottom-left-small':modules[2],
  '3:bottom-right-small':modules[3],
  '4:top-left-small':modules[4],
  '4:top-right-small':modules[5],
 }};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr12d-small-who-am-i.pdf',pdf);
console.log('Created Small Who Am I short/120-char/multiword sample ('+pdf.length+' bytes)');
