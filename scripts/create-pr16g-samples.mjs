import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {makeParityDraft} from './pr16f-fixtures.mjs';
import {LARGE_EXAMPLES} from './pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from './pr16d-fixtures.mjs';
import {SMALL_EXAMPLES} from './pr16f-fixtures.mjs';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const plain=makeParityDraft(6,{allBorderless:true});
plain.title='God Keeps His Promises to All His People in Every Generation';
plain.scripture='Genesis 12:1–9';
plain.modules['2:top-left-small']=structuredClone(SMALL_EXAMPLES[0]);
plain.modules['2:middle-medium']=structuredClone(MEDIUM_EXAMPLES[0]);
plain.modules['3:bottom-large']=structuredClone(LARGE_EXAMPLES[1]);
const decorated=structuredClone(plain);
decorated.coverBorder='border-1';
decorated.activityBorders={
 '2:top-left-small':'border-10',
 '2:middle-medium':'border-6',
 '3:bottom-large':'border-11',
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft]of [['borderless',plain],['bordered',decorated]]){
 const images={};
 for(const [slot,id] of Object.entries(draft.activityBorders)){
  const region=getPrintableSheetRegions(draft).flat().find(item=>
   item.bookletPage+':'+item.id===slot);
  if(!region)throw Error('Unknown activity border slot '+slot);
  images[slot]=await readFile(new URL(
   '../images/borders/'+region.size+'_border_'+id.slice(7)+'.png',import.meta.url));
 }
 const cover=draft.coverBorder==='none'?undefined:
  await readFile(new URL('../images/borders/medium_border_1.png',import.meta.url));
 const bytes=await createBookletPdf(draft,fonts,cover,images);
 const filename='artifacts/sample-pr16g-'+name+'.pdf';
 await writeFile(filename,bytes);
 console.log('Wrote '+filename+' ('+bytes.length+' bytes)');
}
