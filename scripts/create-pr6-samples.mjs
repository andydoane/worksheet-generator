import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
  mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
  nunitoSans:await readFile(new URL('../fonts/NunitoSans-600.ttf',import.meta.url)),
  nunitoSans750:await readFile(new URL('../fonts/NunitoSans-750.ttf',import.meta.url)),
  nunitoSans900:await readFile(new URL('../fonts/NunitoSans-900.ttf',import.meta.url)),
  zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const moduleData={
  order:{type:'story-order',events:'The king made a new law.\nDaniel kept praying to God.\nGuards arrested Daniel.\nDaniel was put into the lions den.\nGod sent an angel to protect Daniel.',seed:11},
  sort:{type:'sort-story',statements:'Daniel prayed to God. true\nThe king was a shepherd. false\nDaniel was sent to the lions. true\nDaniel stopped praying. false\nGod sent an angel. true',seed:8},
  draw:{type:'draw-story',prompts:'The king makes a law.\nDaniel prays by his window.\nThe soldiers arrest Daniel.\nDaniel enters the lions den.\nGod sends an angel.'},
  finish:{type:'finish-verse',reference:'John 3:16',verse:'For [God] so [loved] the [world] that he [gave] his one and only [Son].',seed:2},
  unscramble:{type:'unscramble-verse',reference:'John 3:16',verse:'For [God] so [loved] the [world] that he [gave] his one and only [Son].',seed:4},
  mistakes:{type:'circle-mistakes',text:'Daniel lived in Egypt. He worshiped statues. The lions ate Daniel, but the king was pleased.',count:3},
};
const first={
  title:'Daniel in the Lions Den',scripture:'Daniel 6',
  layouts:{2:'medium-large',3:'medium-medium-small-small',4:'large-medium'},
  modules:{
    '1:cover-activity':moduleData.order,
    '2:top-medium':moduleData.finish,
    '2:bottom-large':moduleData.sort,
    '3:top-medium':moduleData.unscramble,
    '3:middle-medium':moduleData.mistakes,
    '4:top-large':moduleData.draw,
    '4:bottom-medium':{type:'match-words',pairs:'Daniel, Prophet\nDarius, King\nLions, Den',seed:1},
  },
};
const second={
  title:'Daniel in the Lions Den',scripture:'Daniel 6',
  layouts:{2:'large-medium',3:'medium-large',4:'medium-large'},
  modules:{
    '1:cover-activity':{...moduleData.draw,prompts:'The king makes a decree.\nDaniel prays.\nA guard sees Daniel.\nDaniel is arrested.'},
    '2:top-large':{...moduleData.order,events:moduleData.order.events+'\nThe king was happy to see Daniel.',seed:4},
    '2:bottom-medium':moduleData.unscramble,
    '3:top-medium':moduleData.finish,
    '3:bottom-large':moduleData.sort,
    '4:top-medium':moduleData.mistakes,
    '4:bottom-large':moduleData.draw,
  },
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft] of [['sample-story-verse-activities.pdf',first],['sample-story-verse-variations.pdf',second]]){
  const data=await createBookletPdf(draft,fonts);
  await writeFile('artifacts/'+name,data);
  console.log('Created '+name+' ('+data.length+' bytes)');
}
