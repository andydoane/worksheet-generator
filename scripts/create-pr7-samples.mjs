import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const wordSearch={type:'word-search',words:'DAVID\nGOLIATH\nSLING\nSTONE\nSHEPHERD\nSAUL\nARMOR\nGIANT',seed:7};
const maze={type:'true-false-maze',statement:'David trusted God when facing Goliath.',answer:true,seed:9};
const first={
  title:'David and Goliath',scripture:'1 Samuel 17',
  layouts:{2:'medium-large',3:'large-medium',4:'medium-large'},
  modules:{
    '1:cover-activity':wordSearch,
    '2:top-medium':maze,
    '2:bottom-large':{type:'story-order',events:'David tended the sheep.\nHe heard Goliath challenge Israel.\nDavid chose five smooth stones.\nDavid defeated Goliath with a sling.\nThe Israelites praised God.',seed:3},
    '3:top-large':{...wordSearch,words:'DANIEL\nPRAYER\nLIONS\nDARIUS\nANGEL\nFAITH',seed:12},
    '3:bottom-medium':{...maze,statement:'Daniel stopped praying to God.',answer:false,seed:3},
    '4:top-medium':{type:'match-words',pairs:'David, Shepherd\nGoliath, Giant\nSaul, King\nSling, Tool',seed:7},
    '4:bottom-large':{type:'draw-story',prompts:'David watches his sheep.\nDavid speaks to Saul.\nDavid picks up stones.\nDavid faces Goliath.',},
  },
};
const second={
  title:'True or False Trek',scripture:'Daniel 6',
  layouts:{2:'medium-large',3:'medium-large',4:'large-medium'},
  modules:{
    '1:cover-activity':{...wordSearch,seed:51},
    '2:top-medium':{...maze,statement:'The lions ate Daniel in the den.',answer:false,seed:22},
    '2:bottom-large':{type:'finish-story',story:'The king sent [Daniel] into the den of [lions]. Daniel kept [praying] to [God] each [day]. An [angel] protected him.',seed:2},
    '3:top-medium':{...maze,statement:'God sent an angel to protect Daniel.',answer:true,seed:91},
    '3:bottom-large':{...wordSearch,seed:90},
    '4:top-large':{...wordSearch,seed:88},
    '4:bottom-medium':{...maze,answer:true,seed:99},
  },
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft] of [['sample-word-search-maze.pdf',first],['sample-puzzle-regenerations.pdf',second]]){
  const bytes=await createBookletPdf(draft,fonts);
  await writeFile('artifacts/'+name,bytes);
  console.log('Created '+name+' ('+bytes.length+' bytes)');
}
