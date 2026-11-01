/** Paired print-audit booklets for PR16h, with identical module data. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {makeParityDraft} from './pr16f-fixtures.mjs';
import {LARGE_EXAMPLES} from './pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from './pr16d-fixtures.mjs';
import {getPrintableSheetRegions,createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const draft=makeParityDraft(6,{allBorderless:true});
draft.title='The Lord Strengthens His People in Every Trial';
draft.scripture='1 Thessalonians 5:18';
draft.modules['1:cover-activity']=structuredClone(LARGE_EXAMPLES.find(x=>x.type==='finish-story'));
draft.modules['4:top-large']=structuredClone(LARGE_EXAMPLES.find(x=>x.type==='crossword'));
draft.modules['3:top-medium']={...structuredClone(MEDIUM_EXAMPLES.find(x=>x.type==='unscramble-verse')),
 reference:'1 Thessalonians 5:18'};
await mkdir('artifacts',{recursive:true});
for(const mode of ['plain','bordered']){
 const sample=structuredClone(draft);
 const assets={};
 if(mode==='bordered'){
  sample.activityBorders={'1:cover-activity':'border-3',
   '4:top-large':'border-3','3:top-medium':'border-3'};
  const slots=getPrintableSheetRegions(sample).flat();
  for(const [slot,id] of Object.entries(sample.activityBorders)){
   const region=slots.find(p=>p.bookletPage+':'+p.id===slot);
   if(!region)throw Error('Missing slot: '+slot);
   assets[slot]=await readFile(new URL('../images/borders/'+region.size+'_border_'+
    id.slice(7)+'.png',import.meta.url));
  }
 }
 const bytes=await createBookletPdf(sample,fonts,undefined,assets);
 const name='artifacts/sample-pr16h-'+mode+'.pdf';
 await writeFile(name,bytes);
 console.log('Wrote '+name+' ('+bytes.length+' bytes)');
}
