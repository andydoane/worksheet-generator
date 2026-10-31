import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const draft={title:'God Is Faithful',scripture:'Isaiah 41',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'finish-verse',reference:'Exodus 15:11',seed:4,
   verse:'[Who] is like you, O [Lord], among the [gods]? Who is like you, [majestic] in holiness, [awesome] in glorious [deeds], doing [wonders]?'},
  '2:middle-medium':{type:'finish-verse',reference:'Isaiah 41:10',seed:3,
   verse:'fear not, for I am with [you]; be not dismayed, for I am your [God]; I will strengthen you, I will [help] you, I will uphold you with my righteous right [hand].'},
  '3:top-medium':{type:'finish-verse',reference:'John 3:16',seed:1,
   verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'},
  '3:middle-medium':{type:'unscramble-verse',reference:'Isaiah 41:10',seed:5,
   verse:'God is [with] us, and we are [not] [afraid!] of his [strength].'},
  '4:top-medium':{type:'upside-down-verse',reference:'Isaiah 41:10',
   verse:'fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'},
  '4:middle-medium':{type:'upside-down-verse',reference:'1 Thessalonians 5:16',
   verse:'Rejoice always, pray without ceasing.'},
 },
};
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11c-followup-fitted-verses.pdf',pdf);
console.log('Generated PR 11c follow-up sample ('+pdf.length+' bytes)');
