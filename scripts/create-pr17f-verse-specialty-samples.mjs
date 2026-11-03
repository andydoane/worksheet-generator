/**
 * PR17f: review-only, full Red Sea verse/specialty samples. These files are
 * uploaded as CI artifacts, never registered in the public story catalog.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {validateLesson} from './validate-curriculum.mjs';
import {VERSE_SPECIALTY_REVIEW_PLANS,makeVerseSpecialtyReviewDraft} from './pr17f-review-fixtures.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await readJson('tests/fixtures/ot-031-original-review.json');
const schema=await readJson('curriculum/schema/lesson-v1.schema.json');
const issues=validateLesson(lesson,schema);
if(issues.length)throw Error('Invalid review lesson: '+issues.join('; '));
if(lesson.publication?.approved!==false)
 throw Error('PDF fixtures must not publish unreviewed curriculum');
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
for(const plan of VERSE_SPECIALTY_REVIEW_PLANS){
 const draft=makeVerseSpecialtyReviewDraft(lesson,plan);
 const bytes=await createBookletPdf(draft,fonts);
 const path='artifacts/sample-pr17f-red-sea-'+plan.id+'.pdf';
 await writeFile(path,bytes);
 console.log('Wrote '+path+' ('+bytes.length+' bytes; '+
  Object.keys(draft.modules).length+' populated regions; teacher review pending)');
}
