import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const crossword={type:'crossword',seed:4,entries:[
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
].join('\n')};
const long={type:'spiral-verse',reference:'Romans 8:35',
 verse:'Who shall separate us from the love of Christ? Shall trouble or hardship or persecution or famine or nakedness or danger or sword?'};
const short={type:'spiral-verse',reference:'John 11:35',verse:'Jesus wept.'};
const finish={type:'finish-verse',reference:'Psalm 23:1',
 verse:'The [Lord] is my [shepherd] I [shall] not [want].',seed:4};
const scramble={type:'unscramble-verse',reference:'Psalm 23:1',
 verse:'The [Lord] is my [shepherd] I [shall] not [want].',seed:5};
const mistakes={type:'circle-mistakes',count:3,
 text:'Daniel lived in Egypt. Daniel prayed to idols. The lions were not hungry.'};
const bigIdea={type:'big-idea-cryptogram',idea:'God loves us and guides our steps.',seed:5};
const maze={type:'true-false-maze',statement:'God protected Daniel in the lions den.',answer:true,seed:6};
const upside={type:'upside-down-verse',reference:'Psalm 23:1',verse:'The Lord is my shepherd.'};
const connect={type:'connect-verse',verse:'The Lord is my shepherd I lack nothing.',seed:7};
const connectIdea={type:'connect-big-idea',idea:'God always cares for his children.',seed:3};
const match={type:'match-words',pairs:'Moses, Leader\nPharaoh, King\nIsraelites, People\nRed Sea, Water',seed:3};
const drafts=[
 {title:'Words of Faith',scripture:'Romans 8',
  layouts:{2:'large-medium',3:'large-medium',4:'large-medium'},
  modules:{
    '1:cover-activity':crossword,
    '2:top-large':long,'2:bottom-medium':finish,
    '3:top-large':{...crossword,seed:7},'3:bottom-medium':mistakes,
    '4:top-large':short,'4:bottom-medium':bigIdea,
  }},
 {title:'God Makes a Way',scripture:'Exodus 14',
  layouts:{2:'medium-medium-small-small',3:'medium-medium-small-small',4:'medium-medium-small-small'},
  modules:{
    '1:cover-activity':crossword,
    '2:top-medium':scramble,'2:middle-medium':connectIdea,
    '3:top-medium':connect,'3:middle-medium':upside,
    '4:top-medium':match,'4:middle-medium':maze,
  }},
];
await mkdir('artifacts',{recursive:true});
for(const [i,draft] of drafts.entries()){
 const bytes=await createBookletPdf(draft,fonts);
 const name=i?'artifacts/sample-pr10g-medium-font-audit.pdf':'artifacts/sample-pr10g-crossword-and-spiral.pdf';
 await writeFile(name,bytes);
 console.log('Created '+name+' ('+bytes.length+' bytes)');
}
