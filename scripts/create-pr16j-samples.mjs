/** Physical print review of PR16j editable samples and borderless, larger Sort symbols. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBookletPdf,getPrintableSheetRegions} from '../src/pdf.ts';
import {makeParityDraft} from './pr16f-fixtures.mjs';
import {newModuleWithExample} from '../src/moduleGuidance.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const base=makeParityDraft(6,{allBorderless:true});
base.title='God Makes a Way Through the Red Sea';
base.scripture='Exodus 14';
base.modules['1:cover-activity']=newModuleWithExample('sort-story');
base.modules['4:top-large']=newModuleWithExample('story-order');
base.modules['3:bottom-large']=newModuleWithExample('crossword');
await mkdir('artifacts',{recursive:true});
for(const mode of ['plain','bordered']){
 const draft=structuredClone(base),images={};
 if(mode==='bordered'){
  draft.activityBorders={
   '1:cover-activity':'border-3','4:top-large':'border-3','3:bottom-large':'border-3'};
  const regions=getPrintableSheetRegions(draft).flat();
  for(const [slot,id] of Object.entries(draft.activityBorders)){
   const region=regions.find(r=>r.bookletPage+':'+r.id===slot);
   if(!region)throw Error('No physical region for '+slot);
   images[slot]=await readFile(new URL('../images/borders/'+region.size+'_border_'+
    id.slice(7)+'.png',import.meta.url));
  }
 }
 const bytes=await createBookletPdf(draft,fonts,undefined,images);
 const filename='artifacts/sample-pr16j-'+mode+'.pdf';
 await writeFile(filename,bytes);
 console.log('Wrote '+filename+' ('+bytes.length+' bytes)');
}
