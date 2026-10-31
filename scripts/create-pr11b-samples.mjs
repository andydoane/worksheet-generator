import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const mistakes='The Israelites followed Moses out of Egypt. Pharaoh decided not to chase them. God led them toward the Red Sea, but the people thought they had no way across. Moses waved his staff and the water became a frozen bridge. Everyone crossed on dry ground while the Egyptian chariots waited patiently. God helped his people reach the other side safely. Miriam gathered everyone to sing and thank God for bringing them through the sea. The people sang to thank God for helping them.';
const draft={title:'God Keeps His Promises',scripture:'Exodus 15',
 layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
 modules:{
  '2:top-medium':{type:'finish-verse',reference:'Exodus 15:11',seed:4,
   verse:'[Who] is like you, O [Lord], among the [gods]? Who is like you, [majestic] in holiness, [awesome] in glorious [deeds], doing [wonders]?'},
  '2:middle-medium':{type:'finish-verse',reference:'Isaiah 41:10',seed:5,
   verse:'fear not, for I am with [you]; be not dismayed, for I am your [God]; I will strengthen you, I will [help] you, I will uphold you with my righteous right [hand].'},
  '3:top-medium':{type:'circle-mistakes',count:5,text:mistakes.slice(0,475).padEnd(475,'.')},
  '3:middle-medium':{type:'circle-mistakes',count:3,text:'Daniel lived in Egypt. Daniel prayed to idols. The lions were not hungry.'},
  '4:top-medium':{type:'finish-verse',reference:'John 3:16',seed:3,
   verse:'For [God] so [loved] the [world] that he [gave] his only [Son].'},
 }};
await mkdir('artifacts',{recursive:true});
const result=await createBookletPdf(draft,fonts);
await writeFile('artifacts/sample-pr11b-verse-and-circle.pdf',result);
console.log('Created PR 11b sample ('+result.length+' bytes)');
