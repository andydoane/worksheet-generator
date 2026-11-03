/** Review-only PR 17c samples. Neither this script nor the review-stage lesson
 * JSON is included in the live app's source graph or published preset catalog.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {WORKSHEET_RECIPES,buildWorksheetRecipe} from '../src/worksheetRecipes.ts';
import {validateLesson} from './validate-curriculum.mjs';

const lesson=JSON.parse(await readFile(new URL(
 '../tests/fixtures/ot-031-original-review.json',import.meta.url),'utf8'));
const schema=JSON.parse(await readFile(new URL(
 '../curriculum/schema/lesson-v1.schema.json',import.meta.url),'utf8'));
const errors=validateLesson(lesson,schema);
if(errors.length)throw Error('Review lesson validation failed: '+errors.join('; '));
if(lesson.publication?.approved!==false)throw Error('Expected unapproved review-stage lesson.');
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
for(const recipe of WORKSHEET_RECIPES){
 const output=buildWorksheetRecipe(lesson,recipe.id,{purpose:'editorial-review',seed:1});
 const bytes=await createBookletPdf(output.draft,fonts);
 const path='artifacts/sample-pr17c-red-sea-'+recipe.id+'.pdf';
 await writeFile(path,bytes);
 console.log('Wrote '+path+' ('+bytes.length+' bytes): '+
  output.selections.length+' populated slots, '+output.openSlots.length+
  ' available for customization; teacher approval pending');
}
