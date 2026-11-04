/** Printable OT32 samples with the fullest reviewed banks for PR 17q.
 * GitHub Actions uploads all three complete booklet PDFs for visual review.
 * Never modify or reconstruct approved teacher-authored curriculum.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from '../src/worksheetRecipes.ts';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';

const lesson=JSON.parse(await readFile(
 new URL('../curriculum/approved/ot-032-god-provides-in-the-wilderness.lesson.json',import.meta.url),
 'utf8'));
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
});
if(catalog.length!==1)throw Error('OT32 must have teacher approval and independent Scripture-rights clearance.');
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
for(const preset of WORKSHEET_RECIPES){
 const built=buildWorksheetRecipe(catalog[0].lesson,preset.id,{purpose:'published',seed:1});
 if(built.openSlots.length)throw Error(preset.id+' has '+built.openSlots.length+' empty regions.');
 const pdf=await createBookletPdf(built.draft,fonts);
 const path='artifacts/sample-pr17q-ot32-'+preset.id+'-full-banks.pdf';
 await writeFile(path,pdf);
 console.log('Wrote '+path+' ('+pdf.length+' bytes, '+built.selections.length+' modules).');
}
