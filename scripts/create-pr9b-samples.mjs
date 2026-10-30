import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const crossword={type:'crossword',entries:[
  'DAVID, Young shepherd who faced a giant',
  'GOLIATH, Giant from Gath',
  'SLING, Weapon David used',
  'STONE, David picked up five',
  'SAUL, King of Israel',
  'SHEEP, Animals David watched',
  'GIANT, Very tall warrior',
  'ISRAEL, Nation David defended',
].join('\n'),seed:4};
const spiral={type:'spiral-verse',reference:'Psalm 23:1',verse:'The Lord is my shepherd; I shall not want.'};
const upside={type:'upside-down-verse',reference:'Psalm 23:1',verse:'The Lord is my shepherd.'};
const connect={type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:7};
const idea={type:'connect-big-idea',idea:'God always cares for his children.',seed:3};
const first={
  title:'David and Goliath',scripture:'1 Samuel 17',
  layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
  modules:{
    '1:cover-activity':crossword,
    '2:top-medium':upside,'2:bottom-large':spiral,
    '3:top-medium':connect,'3:bottom-large':{...crossword,seed:6},
    '4:top-medium':idea,'4:bottom-large':spiral,
  },
};
const second={
  title:'Words of Faith',scripture:'Psalm 23',
  layouts:{2:'large-medium',3:'medium-large',4:'large-medium'},
  modules:{
    '1:cover-activity':{...crossword,seed:9},
    '2:top-large':spiral,'2:bottom-medium':idea,
    '3:top-medium':{...upside,reference:'John 11:35',verse:'Jesus wept.'},
    '3:bottom-large':{...crossword,seed:15},
    '4:top-large':spiral,
    '4:bottom-medium':{...connect,seed:11},
  },
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft] of [['sample-crossword-specialty.pdf',first],['sample-specialty-variations.pdf',second]]){
  const bytes=await createBookletPdf(draft,fonts);
  await writeFile('artifacts/'+name,bytes);
  console.log('Created '+name+' ('+bytes.length+' bytes)');
}
