import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {makeParityDraft} from './pr16f-fixtures.mjs';
import {LARGE_EXAMPLES} from './pr16e-fixtures.mjs';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const base=makeParityDraft(6,{allBorderless:true});
base.title='God Teaches His People to Trust in Him';
base.scripture='Exodus 14';
base.modules['1:cover-activity']=structuredClone(LARGE_EXAMPLES.find(x=>x.type==='sort-story'));
base.modules['4:top-large']=structuredClone(LARGE_EXAMPLES.find(x=>x.type==='spiral-verse'));
base.modules['3:bottom-large']=structuredClone(LARGE_EXAMPLES.find(x=>x.type==='crossword'));
await mkdir('artifacts',{recursive:true});
for(const mode of ['plain','bordered']){
 const draft=structuredClone(base),artwork={};
 if(mode==='bordered'){
  draft.activityBorders={'1:cover-activity':'border-3',
   '4:top-large':'border-3','3:bottom-large':'border-3'};
  const regions=getPrintableSheetRegions(draft).flat();
  for(const [slot,id] of Object.entries(draft.activityBorders)){
   const area=regions.find(x=>x.bookletPage+':'+x.id===slot);
   if(!area)throw Error('Missing slot '+slot);
   artwork[slot]=await readFile(new URL('../images/borders/'+area.size+
    '_border_'+id.slice(7)+'.png',import.meta.url));
  }
 }
 const bytes=await createBookletPdf(draft,fonts,undefined,artwork);
 const name='artifacts/sample-pr16i-'+mode+'.pdf';
 await writeFile(name,bytes);
 console.log('Wrote '+name+' ('+bytes.length+' bytes)');
}
