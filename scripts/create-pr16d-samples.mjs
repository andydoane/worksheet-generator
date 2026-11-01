import {EXAMPLES} from './pr16d-fixtures.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const slots=['2:top-medium','2:middle-medium','3:top-medium','3:middle-medium','4:top-medium','4:middle-medium'];
const layouts={2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'};
const ids=[1,6,11,3,8,10];
const images=new Map();
for(const n of ids)images.set(n,await readFile(new URL('../images/borders/medium_border_'+n+'.png',import.meta.url)));
const valid=new Set(moduleForSize('medium').map(m=>m.id));
for(const item of EXAMPLES){
 if(!valid.has(item.type))throw Error('Not a Medium module '+item.type);
 const errors=validateModule(item);
 if(errors.length)throw Error(item.type+': '+errors.join(' '));
}
await mkdir('artifacts',{recursive:true});
async function make(name,examples,bordered){
 const draft={title:'David and Goliath',scripture:'1 Samuel 17',layouts,
  modules:{},activityBorders:{}},assets={};
 examples.forEach((item,i)=>{
  const key=slots[i],n=ids[i];
  draft.modules[key]=item;
  if(bordered){draft.activityBorders[key]='border-'+n;assets[key]=images.get(n);}
 });
 const bytes=await createBookletPdf(draft,fonts,undefined,assets);
 const file='artifacts/'+name;
 await writeFile(file,bytes);
 console.log('Wrote '+file+' ('+bytes.length+' bytes)');
}
await make('sample-pr16d-medium-borders-search-matching-verse.pdf',
 [EXAMPLES[0],EXAMPLES[1],EXAMPLES[2],EXAMPLES[3],EXAMPLES[4],EXAMPLES[5]],true);
await make('sample-pr16d-medium-borders-maze-cryptogram-reconstruction.pdf',
 [EXAMPLES[6],EXAMPLES[7],EXAMPLES[8],EXAMPLES[0],EXAMPLES[1],EXAMPLES[3]],true);
await make('sample-pr16d-medium-borderless-control.pdf',
 [EXAMPLES[0],EXAMPLES[1],EXAMPLES[2],EXAMPLES[3],EXAMPLES[4],EXAMPLES[5]],false);
