import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {createBookletPdf} from '../src/pdf.ts';
import {drawCipherGlyph} from '../src/cryptogramPdf.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const story='God led the Israelites to the Red Sea with a [PILLAR] of cloud by day and a pillar of fire by night. Pharaoh changed his mind. He sent his army to chase after the Israelites. Trapped between the sea and the army, the Israelites asked, "Did you bring us out here to die?" Moses said, "Be still. God will fight for you." God told Moses to hold his [STAFF] over the sea. God sent a wind to [SPLIT] the sea. The people walked across on dry [LAND] between walls of [WATER]. The Egyptians chased after the Israelites. God made them [PANIC] and their chariot wheels jam. Moses reached out his staff. God brought the [waters] down on the entire Egyptian [ARMY].';
const labels=['Red Sea','Dry Land','Moses','Pharaoh','Egypt','Exodus','Manna','Desert','Aaron','Staff','Cloud','Passover'];
const search=(n,seed)=>({type:'word-search',words:labels.slice(0,n).join('\n'),seed});
const cipher={type:'verse-cryptogram',reference:'Exodus 14:14',
  verse:'The LORD will fight for you; you need only to be still.',seed:4};
const short={
 title:'Red Sea Word Searches',scripture:'Exodus 14',
 layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
 modules:{'1:cover-activity':search(4,1),'2:bottom-large':search(8,2),
 '3:bottom-large':search(12,3),'4:bottom-large':cipher},
};
const caption={
 type:'draw-story',prompts:[
 'God sent a pillar of cloud by day to guide the people.',
 'Moses lifted his staff over the sea and waited for God to make a way through it.',
 'The Israelites walked carefully through the sea while the waters stood on both sides.',
 'God brought the sea back into its place, saving the children of Israel from their enemies.',
 ].join('\n'),
};
const storyDraft={
 title:'God Makes a Way',scripture:'Exodus 14',
 layouts:{2:'medium-large',3:'medium-large',4:'medium-large'},
 modules:{'1:cover-activity':{type:'finish-story',story,seed:4},
 '2:bottom-large':caption,'3:bottom-large':search(12,6),'4:bottom-large':cipher},
};
await mkdir('artifacts',{recursive:true});
for(const [name,draft] of [['sample-pr10e-wordbank.pdf',short],['sample-pr10e-red-sea.pdf',storyDraft]]){
 const bytes=await createBookletPdf(draft,fonts);
 await writeFile('artifacts/'+name,bytes);
 console.log('Created '+name+' ('+bytes.length+' bytes)');
}
// Print-scale audit: same vector paths at 10pt in the body and 13pt in the key.
const document=await PDFDocument.create(),page=document.addPage([612,792]);
const labelFont=await document.embedFont(StandardFonts.Helvetica);
page.drawText('CRYPTOGRAM SYMBOL LEGIBILITY - ACTUAL PRINT SIZES',{x:50,y:745,font:labelFont,size:15,color:rgb(.12,.12,.12)});
for(const [row,size] of [[0,10],[1,13]]){
 const top=row?390:638;
 page.drawText(size+' pt symbols',{x:50,y:top+45,font:labelFont,size:12});
 for(let i=0;i<26;i++){
  const x=58+(i%13)*38,y=top-Math.floor(i/13)*64;
  drawCipherGlyph(page,i,x+8,y,size);
  page.drawText(String(i+1).padStart(2,'0'),{x:x+7,y:y-13,font:labelFont,size:9});
 }
}
await writeFile('artifacts/sample-pr10e-symbol-size.pdf',await document.save());
console.log('Created sample-pr10e-symbol-size.pdf');
