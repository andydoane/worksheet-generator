import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const statements=[
 'Jesus rose from the dead.',
 'God helped Moses lead his people through the sea and safely into the dry land...',
 'The people saw the sea part and walked across on dry land because God helped.',
 'God helped Moses lead the people safely across the sea.',
 'When Moses held up his staff, the sea opened and the people crossed safely.',
 'The Israelites walked through the sea with water piled up on either side.',
];
const draft={title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'small-small-medium-medium'},
 modules:{
  '2:top-left-small':{type:'true-false',statement:statements[0]},
  '2:top-right-small':{type:'true-false',statement:statements[1]},
  '3:bottom-left-small':{type:'true-false',statement:statements[2]},
  '3:bottom-right-small':{type:'true-false',statement:statements[3]},
  '4:top-left-small':{type:'true-false',statement:statements[4]},
  '4:top-right-small':{type:'true-false',statement:statements[5]},
 },
};
await mkdir('artifacts',{recursive:true});
const bytes=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr12b-small-true-false.pdf',bytes);
console.log('Created PR 12b True or False sample ('+bytes.length+' bytes)');
