import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const modules=[
 {type:'draw-picture',prompt:'Draw David looking at five stones in his hand before meeting Goliath.'},
 {type:'multiple-choice',question:'What did David use to defeat the giant when he trusted in the Lord?',correct:'A small stone and a sling',wrong1:'An enormous sharp sword',wrong2:'A heavy protective shield',seed:3},
 {type:'true-false',statement:'The Lord helped David defeat Goliath with just a smooth stone.'},
 {type:'first-letters',reference:'1 Samuel 17:47',verse:'All those gathered here will know that it is not by sword or spear that the Lord saves for the battle is the Lord'},
 {type:'odd-words',correct:['DAVID','GOLIATH','SHEPHERD','STONE','SLING'].join('\n'),incorrect:['PHARAOH','JONAH','RAVEN','CANAAN','MATTHEW'].join('\n'),seed:8},
 {type:'unscramble-words',first:'GOLIATH',second:'SMOOTH ROCK',seed:6},
 {type:'checkboxes',correct:['SLING','STONE','SHEPHERD','GOLIATH','ISRAEL'].join('\n'),incorrect:['GARDEN','PHARAOH','TEMPLE','RAINBOW','MANGER'].join('\n'),seed:4},
 {type:'who-am-i',clue:'I trusted God, used a sling and a smooth stone, and defeated a giant before becoming king.',answer:'DAVID'},
];
const slots=['2:top-left-small','2:top-right-small','3:top-left-small','3:top-right-small','4:top-left-small','4:top-right-small'];
const images=new Map();
for(const id of [1,6,11])images.set(id,await readFile(new URL('../images/borders/small_border_'+id+'.png',import.meta.url)));
await mkdir('artifacts',{recursive:true});
for(const [name,offset,bordered]of [
 ['sample-pr16c-small-borders-6-types.pdf',0,true],
 ['sample-pr16c-small-borders-writing-checks.pdf',6,true],
 ['sample-pr16c-small-borderless-control.pdf',0,false],
]){
 const draft={title:'David and Goliath',scripture:'1 Samuel 17',
  layouts:{2:'small-small-medium-medium',3:'small-small-medium-medium',4:'small-small-medium-medium'},
  modules:{},activityBorders:{}};
 const assets={};
 const list=offset===0?modules.slice(0,6):modules.slice(6);
 list.forEach((module,index)=>{
  const key=slots[index],num=[1,6,11][index%3];
  draft.modules[key]=module;
  if(bordered){draft.activityBorders[key]='border-'+num;assets[key]=images.get(num);}
 });
 const bytes=await createBookletPdf(draft,fonts,undefined,assets);
 await writeFile('artifacts/'+name,bytes);
 console.log('Wrote artifacts/'+name+' '+bytes.length+' bytes');
}
