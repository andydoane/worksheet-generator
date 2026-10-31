import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {DEFAULT_LAYOUTS} from '../src/booklet.ts';
const files={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
for(const number of [1,6,11]){
 const borderPng=await readFile(new URL('../images/borders/medium_border_'+number+'.png',import.meta.url));
 const draft={title:number===11?'David and Goliath: Trusting the Lord':'Jesus Loves the Little Children',
  scripture:'1 Samuel 17:45–47',coverBorder:'border-'+number,
  layouts:{...DEFAULT_LAYOUTS},modules:{}};
 const bytes=await createBookletPdf(draft,files,borderPng);
 const path='artifacts/sample-pr16a-cover-border-'+number+'.pdf';
 await writeFile(path,bytes);
 console.log('Wrote '+path+' ('+bytes.length+' bytes)');
}
