import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {LARGE_EXAMPLES} from './pr16e-fixtures.mjs';
import {createBookletPdf} from '../src/pdf.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';

const fontFiles={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const moduleIds=new Set(moduleForSize('large').map(m=>m.id));
for(const module of LARGE_EXAMPLES){
 if(!moduleIds.has(module.type))throw Error('Unregistered Large type '+module.type);
 const errors=validateModule(module);
 if(errors.length)throw Error(module.type+': '+errors.join(' '));
}
const slots=['1:cover-activity','2:top-large','3:top-large','4:top-large'];
const styles=[1,6,11,3];
const assetBytes=new Map();
for(const number of styles)assetBytes.set(number,
 await readFile(new URL('../images/borders/large_border_'+number+'.png',import.meta.url)));
await mkdir('artifacts',{recursive:true});
async function sample(name,modules,bordered){
 const draft={title:'God Guides His People',scripture:'1 Samuel 17 and Exodus 14',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{},activityBorders:{}},assets={};
 for(const [index,module] of modules.entries()){
  const slot=slots[index],style=styles[index];
  draft.modules[slot]=module;
  if(bordered){
   draft.activityBorders[slot]='border-'+style;
   assets[slot]=assetBytes.get(style);
  }
 }
 const bytes=await createBookletPdf(draft,fontFiles,undefined,assets);
 await writeFile('artifacts/'+name,bytes);
 console.log('Wrote artifacts/'+name+' ('+bytes.length+' bytes)');
}
await sample('sample-pr16e-large-borders-story-and-drawing.pdf',
 [LARGE_EXAMPLES[0],LARGE_EXAMPLES[3],LARGE_EXAMPLES[4],LARGE_EXAMPLES[2]],true);
await sample('sample-pr16e-large-borders-grids-and-scripture.pdf',
 [LARGE_EXAMPLES[1],LARGE_EXAMPLES[5],LARGE_EXAMPLES[7],LARGE_EXAMPLES[6]],true);
await sample('sample-pr16e-large-borders-connect-and-mixed.pdf',
 [LARGE_EXAMPLES[8],LARGE_EXAMPLES[2],LARGE_EXAMPLES[1],LARGE_EXAMPLES[0]],true);
await sample('sample-pr16e-large-borderless-control.pdf',
 [LARGE_EXAMPLES[0],LARGE_EXAMPLES[1],LARGE_EXAMPLES[2],LARGE_EXAMPLES[5]],false);
