/** PR17d print-review sample for the public onboarding "Explore an Example".
 * This uses only the existing module input examples; unapproved curriculum
 * never enters this script or the production JavaScript bundle.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {exampleWorksheetDraft} from '../src/welcomeFlow.ts';
const files={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
const draft=exampleWorksheetDraft();
await mkdir('artifacts',{recursive:true});
const pdf=await createBookletPdf(draft,files);
const path='artifacts/sample-pr17d-onboarding-example.pdf';
await writeFile(path,pdf);
console.log('Wrote '+path+' ('+pdf.length+' bytes; '+Object.keys(draft.modules).length+' filled activity slots)');
