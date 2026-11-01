import {LARGE_EXAMPLES} from './pr16e-fixtures.mjs';
import {EXAMPLES as MEDIUM_EXAMPLES} from './pr16d-fixtures.mjs';

/** One complete mixed-mode booklet per border style. Every style is exercised
 * on a Small, Medium, and Large module, while its neighboring activity can be
 * unbordered. The changing fixtures cover all 26 registered types over 11
 * booklets without introducing any new puzzle algorithms. */
export const SMALL_EXAMPLES=[
 {type:'draw-picture',prompt:'David holding five smooth stones before facing Goliath'},
 {type:'multiple-choice',question:'What did David use to defeat the giant when he trusted the Lord?',
  correct:'A small stone and a sling',wrong1:'An enormous sharp sword',
  wrong2:'A heavy protective shield',seed:3},
 {type:'true-false',statement:'The Lord helped David defeat Goliath with a smooth stone.'},
 {type:'first-letters',reference:'1 Samuel 17:47',
  verse:'All those gathered here will know that it is not by sword or spear that the Lord saves for the battle is the Lord'},
 {type:'odd-words',correct:['DAVID','GOLIATH','SHEPHERD','STONE','SLING'].join('\n'),
  incorrect:['PHARAOH','JONAH','RAVEN','CANAAN','MATTHEW'].join('\n'),seed:8},
 {type:'unscramble-words',first:'GOLIATH',second:'SMOOTH ROCK',seed:6},
 {type:'checkboxes',correct:['SLING','STONE','SHEPHERD','GOLIATH','ISRAEL'].join('\n'),
  incorrect:['GARDEN','PHARAOH','TEMPLE','RAINBOW','MANGER'].join('\n'),seed:4},
 {type:'who-am-i',clue:'I trusted God, used a sling and a smooth stone, and defeated a giant before becoming king.',answer:'DAVID'},
];
export const AUDIT_LAYOUTS={
 2:'small-small-medium-medium',
 3:'medium-large',
 4:'large-small-small',
};
export const AUDIT_SLOTS={
 small:['2:top-left-small','2:top-right-small','4:bottom-left-small','4:bottom-right-small'],
 medium:['2:middle-medium','2:bottom-medium','3:top-medium'],
 large:['1:cover-activity','3:bottom-large','4:top-large'],
};
export const ALL_EXAMPLES={
 small:SMALL_EXAMPLES,medium:MEDIUM_EXAMPLES,large:LARGE_EXAMPLES,
};
export function makeParityDraft(index,{allBorderless=false}={}){
 if(!Number.isInteger(index)||index<1||index>11)throw Error('Border style must be 1–11.');
 const modules={},activityBorders={};
 const slots=Object.keys(AUDIT_SLOTS);
 for(const size of slots){
  const list=AUDIT_SLOTS[size],examples=ALL_EXAMPLES[size];
  for(const [position,key] of list.entries()){
   const exampleIndex=(index*3+position)%examples.length;
   modules[key]=structuredClone(examples[exampleIndex]);
   // Every style appears at least once per size, but other activity regions
   // remain borderless and must not inherit styles from their neighbors.
   const bordered=!allBorderless&&((size==='small'&&position===0)||
    (size==='medium'&&position===0)||
    (size==='large'&&(position===0||position===2)));
   if(bordered)activityBorders[key]='border-'+index;
  }
 }
 return {
  title:'God Helps His People',scripture:'1 Samuel 17',
  coverBorder:allBorderless||index%2===0?'none':'border-'+index,
  layouts:{...AUDIT_LAYOUTS},modules,activityBorders,
 };
}
export function auditCoverage(){
 const used={small:new Set(),medium:new Set(),large:new Set()};
 for(let i=1;i<=11;i++){
  const draft=makeParityDraft(i);
  for(const [size,slots]of Object.entries(AUDIT_SLOTS))
   for(const slot of slots)used[size].add(draft.modules[slot].type);
 }
 return Object.fromEntries(Object.entries(used).map(([k,v])=>[k,[...v].sort()]));
}
