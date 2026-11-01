import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {makeParityDraft,auditCoverage,AUDIT_SLOTS} from './pr16f-fixtures.mjs';
import {createBookletPdf} from '../src/pdf.ts';
import {getPrintableSheetRegions} from '../src/pdf.ts';
import {validateModule} from '../src/modules.ts';

const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const assets=new Map();
async function image(size,id){
 const key=size+'/'+id;
 if(!assets.has(key))
  assets.set(key,await readFile(new URL(
   '../images/borders/'+size+'_border_'+id.replace('border-','')+'.png',import.meta.url)));
 return assets.get(key);
}
async function generate(index,{allBorderless=false}={}){
 const draft=makeParityDraft(index,{allBorderless});
 const loaded={};
 for(const [slot,id]of Object.entries(draft.activityBorders)){
  const region=getPrintableSheetRegions(draft).flat().find(item=>item.bookletPage+':'+item.id===slot);
  if(!region)throw Error('Missing print slot '+slot);
  loaded[slot]=await image(region.size,id);
 }
 for(const [slot,entry] of Object.entries(draft.modules)){
  const errors=validateModule(entry);
  if(errors.length)throw Error(slot+' '+entry.type+': '+errors.join('; '));
 }
 const cover= draft.coverBorder==='none'?undefined:await image('medium',draft.coverBorder);
 const bytes=await createBookletPdf(draft,fonts,cover,loaded);
 const filename=allBorderless?'sample-pr16f-borderless-control.pdf':
  'sample-pr16f-style-'+String(index).padStart(2,'0')+'.pdf';
 await writeFile('artifacts/'+filename,bytes);
 return {filename,byteSize:bytes.length,style:index,coverBorder:draft.coverBorder,
  modules:Object.entries(draft.modules).map(([slot,module])=>({
   slot,type:module.type,border:draft.activityBorders[slot]??'none',
  }))};
}
await mkdir('artifacts',{recursive:true});
const results=[];
for(let i=1;i<=11;i++){
 const result=await generate(i);
 results.push(result);
 console.log('Wrote '+result.filename+' ('+result.byteSize+' bytes)');
}
const control=await generate(6,{allBorderless:true});
results.push(control);
console.log('Wrote '+control.filename+' ('+control.byteSize+' bytes)');
const report={
 purpose:'PR16f print parity review: every Small, Medium, Large border style and all 26 module types',
 coverage:auditCoverage(),safeAreasInches:{small:[1.95,2.15],medium:[4.3,2.1],large:[4,4.35]},
 limitations:'Geometry, plan metrics and sample PDF generation are automated. Subjective readability and exact browser raster matching require visual acceptance review.',
 samples:results,
};
await writeFile('artifacts/pr16f-print-audit-manifest.json',JSON.stringify(report,null,2)+'\n');
const markdown=[
 '# PR 16f — Print parity audit samples',
 '',
 'Eleven mixed-mode two-sheet PDF booklets (one per border style), plus an all-borderless control.',
 'Every numbered style appears on a Small, Medium, and Large activity. Adjacent slots intentionally have no border.',
 'Across the set, every current module type appears. Large designs are rotated into portrait.',
 '',
 '| PDF | Cover | Bordered slots | Total assigned slots |',
 '|---|---|---|---|',
 ...results.map(x=>'| '+x.filename+' | '+x.coverBorder+' | '+
  x.modules.filter(m=>m.border!=='none').map(m=>m.slot).join(', ')+' | '+x.modules.length+' |'),
 '',
 'For human review: inspect border clearance, drawing/writing space, small clue and grid-number readability, and verify previews at print size.',
 'The manifest JSON records all module IDs and border assignments; no pixel-level browser screenshot assertion is claimed.',
 '',
];
await writeFile('artifacts/pr16f-print-audit-index.md',markdown.join('\n'));
console.log('PR16f audit manifest: '+Object.values(report.coverage).map(a=>a.length).join('/')+' module types; '+AUDIT_SLOTS.small.length+' Small, '+AUDIT_SLOTS.medium.length+' Medium and '+AUDIT_SLOTS.large.length+' Large slots per booklet');
