import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const cohort=[...Array.from({length:12},(_,i)=>i+18),31,32,33];
const median=values=>{
 const sorted=[...values].sort((a,b)=>a-b);
 const center=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[center]:(sorted[center-1]+sorted[center])/2;
};

test('Editorial guidance reflects the older 15-lesson historical cohort',async()=>{
 const filenames=await readdir(new URL('../curriculum/approved/',import.meta.url));
 const lessons=await Promise.all(cohort.map(async n=>{
  const prefix='ot-'+String(n).padStart(3,'0')+'-';
  const name=filenames.find(x=>x.startsWith(prefix)&&x.endsWith('.lesson.json'));
  assert.ok(name,'Approved baseline lesson missing: '+prefix);
  return JSON.parse(await read('curriculum/approved/'+name));
 }));
 assert.equal(lessons.length,15);
 const trues=lessons.map(x=>x.facts.filter(f=>f.isTrue===true).length);
 const falses=lessons.map(x=>x.facts.filter(f=>f.isTrue===false).length);
 const prepared=lessons.map(x=>x.preparedActivities.multipleChoice.length);
 const sourceQuestions=lessons.map(x=>x.questions.length);
 const total=trues.map((value,index)=>value+falses[index]);
 assert.equal(trues.reduce((a,b)=>a+b,0),127);
 assert.equal(falses.reduce((a,b)=>a+b,0),107);
 assert.equal(prepared.reduce((a,b)=>a+b,0),98);
 assert.equal(median(trues),8);
 assert.equal(median(falses),7);
 assert.equal(median(total),14);
 assert.equal(median(prepared),6);
 assert.equal(total.filter((count,i)=>count===14&&prepared[i]===6).length,13);
 assert.ok(sourceQuestions.every((count,i)=>count>=prepared[i]),
  'Original source questions should be distinct from the prepared worksheet bank');
});

test('Conversion documentation distinguishes nonbinding targets from original source preservation',async()=>{
 const [guide,readme]=await Promise.all([
  read('docs/CURRICULUM-CONVERSION-GUIDE.md'),read('curriculum/README.md'),
 ]);
 for(const term of [
  'Editorial quantity targets — avoid overproducing worksheet choices',
  'OT18–OT29 and OT31–OT33',
  '| 8.47 | 8 |',
  '| 7.13 | 7 |',
  '| 15.60 | 14 |',
  '| 6.53 | 6 |',
  'Thirteen of the fifteen older lessons contained exactly 14 facts',
  'not a validator restriction',
  'Never add filler',
  'Preserve all original source',
  'Required delivery counts',
  'six high-quality prepared questions',
 ]){
  assert.ok(guide.includes(term),'Manual missing editorial guidance: '+term);
 }
 assert.match(guide,/source-grounded question/u);
 assert.match(guide,/statement and truth value must match its referenced canonical record/u);
 assert.match(guide,/TRUE canonical facts, FALSE canonical facts, prepared Multiple Choice questions/u);
 assert.match(readme,/editorial defaults, not schema minima or hard maxima/u);
 assert.match(readme,/Preserve \*\*all original source questions and their answers/u);
 const pkg=JSON.parse(await read('package.json'));
 assert.equal(pkg.version,'0.16.61');
});
