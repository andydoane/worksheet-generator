import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const crossword=[
 'DAVID, Young shepherd who faced a giant',
 'GOLIATH, Giant from Gath',
 'SLING, Weapon David used',
 'STONE, David picked up five',
 'SAUL, King of Israel',
 'SHEEP, Animals David watched',
 'GIANT, Very tall warrior',
 'ISRAEL, Nation David defended',
 'RED SEA, Where the Israelites crossed',
 'MANGER, Bed for baby Jesus',
].join('\n');
const short='David\nGoliath\nSling\nStone';
const full='Red Sea\nDry Land\nMoses\nPharaoh\nEgypt\nExodus\nManna\nDesert\nAaron\nStaff\nCloud\nPassover';
const draft={title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
 modules:{
  '1:cover-activity':{type:'crossword',entries:crossword,seed:4},
  '2:top-large':{type:'word-search',words:short,seed:7},
  '3:top-large':{type:'word-search',words:full,seed:15},
  '4:top-large':{type:'crossword',entries:crossword,seed:8},
 }};
await mkdir('artifacts',{recursive:true});
const data=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr14b-title-free-large-puzzles.pdf',data);
console.log('Generated PR 14b print review ('+data.length+' bytes)');
