/** PR17e: 12-slot print-review booklet exercising all 10 new activity adapters,
 * plus two existing core candidates. This remains an editorial review sample.
 * No unapproved lesson data is imported into the deployed application.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBookletPdf} from '../src/pdf.ts';
import {convertLessonActivities,findLessonCandidate} from '../src/lessonActivityConverter.ts';
import {EMPTY_DRAFT} from '../src/draftMigration.ts';
import {getRegions,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';
import {validateLesson} from './validate-curriculum.mjs';
const readJson=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const lesson=await readJson('tests/fixtures/ot-031-original-review.json');
const schema=await readJson('curriculum/schema/lesson-v1.schema.json');
const errors=validateLesson(lesson,schema);
if(errors.length)throw Error('Invalid curriculum source: '+errors.join('; '));
if(lesson.publication?.approved)throw Error('Expected unapproved editorial source');
const result=convertLessonActivities(lesson,{seed:1});
if(result.diagnostics.length)throw Error('Converter diagnostics: '+JSON.stringify(result.diagnostics));
const draft={
 ...structuredClone(EMPTY_DRAFT),
 title:lesson.lessonDetails.title,
 scripture:lesson.lessonDetails.scriptureDisplay,
 bigIdea:lesson.lessonDetails.bigIdeas?.[0]?.text??'',
 verseReference:lesson.lessonDetails.memoryVerse.reference,
 verseText:lesson.lessonDetails.memoryVerse.text,
 layouts:{2:'small-small-medium-medium',3:'small-small-medium-medium',4:'large-small-small'},
};
const entries=[
 [1,'cover-activity','word-search'],
 [2,'top-left-small','draw-picture'],
 [2,'top-right-small','odd-words'],
 [2,'middle-medium','match-words'],
 [2,'bottom-medium','pixel-picture'],
 [3,'top-left-small','unscramble-words'],
 [3,'top-right-small','checkboxes'],
 [3,'middle-medium','medium-word-search'],
 [3,'bottom-medium','true-false-maze'],
 [4,'top-large','draw-story'],
 [4,'bottom-left-small','who-am-i'],
 [4,'bottom-right-small','multiple-choice','mc-01'],
];
for(const [page,regionId,moduleId,candidateId] of entries){
 const candidate=findLessonCandidate(result,moduleId,candidateId??moduleId);
 if(!candidate)throw Error('Missing prepared candidate '+moduleId);
 const region=getRegions(page,page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page])
  .find(r=>r.id===regionId);
 if(!region||!moduleForSize(region.size).some(m=>m.id===moduleId))
  throw Error('Incompatible region '+page+':'+regionId+' for '+moduleId);
 if(validateModule(candidate.module).length)
  throw Error('Invalid candidate '+moduleId);
 draft.modules[page+':'+regionId]=structuredClone(candidate.module);
}
const files={
 mouseMemoirs:await readFile(new URL('../fonts/MouseMemoirs-Regular.ttf',import.meta.url)),
 nunitoSans:await readFile(new URL('../fonts/Nunito-Medium.ttf',import.meta.url)),
 nunitoSans750:await readFile(new URL('../fonts/Nunito-Bold.ttf',import.meta.url)),
 nunitoSans900:await readFile(new URL('../fonts/Nunito-ExtraBold.ttf',import.meta.url)),
 zillaSlab:await readFile(new URL('../fonts/ZillaSlab-Bold-pdf.ttf',import.meta.url)),
};
await mkdir('artifacts',{recursive:true});
const path='artifacts/sample-pr17e-red-sea-word-visual-showcase.pdf';
const bytes=await createBookletPdf(draft,files);
await writeFile(path,bytes);
console.log('Wrote '+path+' ('+bytes.length+' bytes, '+entries.length+
 ' full activity regions; teacher approval remains pending)');
