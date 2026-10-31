import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fontFiles={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const story='God led the Israelites to the Red Sea with a [PILLAR] of cloud by day and a pillar of fire by night. Pharaoh changed his mind. He sent his army to chase after the Israelites. Trapped between the sea and the army, the Israelites asked, "Did you bring us out here to die?" Moses said, "Be still. God will fight for you." God told Moses to hold his [STAFF] over the sea. God sent a wind to [SPLIT] the sea. The people walked across on dry [LAND] between walls of [WATER]. The Egyptians chased after the Israelites. God made them [PANIC] and their chariot wheels jam. Moses reached out his staff. God brought the [waters] down on the entire Egyptian [ARMY].';
const entries=[
 'DAVID, Young shepherd who faced a giant',
 'GOLIATH, Giant from Gath',
 'SLING, Weapon David used',
 'STONE, David picked up five',
 'SAUL, King of Israel',
 'SHEEP, Animals David watched',
 'GIANT, Very tall warrior',
 'ISRAEL, Nation David defended',
 'RED SEA, Where Moses and the Israelites crossed',
 'MANGER, Bed for baby Jesus',
].join('\n');
const verse='The Lord is my shepherd; I shall not want. He makes me lie down in green pastures; he leads me beside still waters.';
const crypto={type:'verse-cryptogram',reference:'Exodus 14:14',
 verse:'The Lord will fight for you; you need only to be still!',seed:7};
const set=[
 {title:'God Parts the Red Sea',scripture:'Exodus 13-14',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{
   '1:cover-activity':{type:'finish-story',story,seed:2},
   '2:top-large':{type:'crossword',entries,seed:4},
   '3:top-large':{type:'spiral-verse',reference:'Psalm 23:1-2',verse},
   '4:top-large':crypto,
  }},
 {title:'Words of Faith',scripture:'Psalm 23',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{
   '1:cover-activity':{type:'crossword',entries,seed:11},
   '2:top-large':{type:'spiral-verse',reference:'John 11:35',verse:'Jesus wept.'},
   '3:top-large':{type:'spiral-verse',reference:'Psalm 23:1-2',verse},
   '4:top-large':{...crypto,verse:'Be still, and know that I am God!',seed:13},
  }},
];
await mkdir('artifacts',{recursive:true});
for(let i=0;i<set.length;i++){
 const bytes=await createBookletPdf(set[i],fontFiles);
 const file='artifacts/'+(i?'sample-pr10f-crossword-spiral.pdf':'sample-pr10f-redsea-cryptogram.pdf');
 await writeFile(file,bytes);
 console.log(file+' '+bytes.length+' bytes');
}
