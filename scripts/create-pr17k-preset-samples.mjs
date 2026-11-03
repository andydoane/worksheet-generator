/** Three author-approved, full, two-sheet Red Sea booklet samples for PR 17k.
 * The lesson is loaded from curriculum/approved and is never modified.
 * CI uploads the resulting PDFs for teacher review before merging the presets.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {buildWorksheetRecipe,WORKSHEET_RECIPES} from '../src/worksheetRecipes.ts';
import {assemblePublicLessonCatalog} from '../src/publishedLessonCatalog.ts';
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await load('curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json');
const rights=await load('curriculum/approved/rights-manifest.json');
const catalog=assemblePublicLessonCatalog({
 ['../curriculum/approved/'+lesson.id+'.lesson.json']:lesson,
},rights);
if(catalog.length!==1)throw Error('Refusing samples: no independently approved and rights-cleared lesson.');
const fonts={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
for(const preset of WORKSHEET_RECIPES){
 const result=buildWorksheetRecipe(catalog[0].lesson,preset.id,{purpose:'published'});
 if(result.openSlots.length!==0)throw Error(preset.name+' left a blank activity slot.');
 const pdf=await createBookletPdf(result.draft,fonts);
 const filename='artifacts/sample-pr17k-'+preset.id+'-red-sea-bsb.pdf';
 await writeFile(filename,pdf);
 console.log('Wrote '+filename+' ('+pdf.length+' bytes, '+result.selections.length+
  ' independently prepopulated activities, 0 blanks)');
}
