/**
 * PR17f review-only fixture: all eleven newly adapted modules distributed over
 * two valid four-page booklet drafts. Not part of the published lesson catalog.
 */
import {EMPTY_DRAFT} from '../src/draftMigration.ts';
import {getRegions,DEFAULT_LAYOUTS} from '../src/booklet.ts';
import {moduleForSize,validateModule} from '../src/modules.ts';
import {convertLessonActivities,findLessonCandidate} from '../src/lessonActivityConverter.ts';

export const VERSE_SPECIALTY_REVIEW_PLANS=[
 {
  id:'scripture-puzzles',
  layouts:{2:'small-small-medium-medium',3:'large-small-small',4:'large-small-small'},
  entries:[
   [1,'cover-activity','crossword'],
   [2,'top-left-small','first-letters'],
   [2,'top-right-small','multiple-choice','mc-01'],
   [2,'middle-medium','finish-verse'],
   [2,'bottom-medium','unscramble-verse'],
   [3,'top-large','spiral-verse'],
   [3,'bottom-left-small','who-am-i'],
   [3,'bottom-right-small','checkboxes'],
   [4,'top-large','verse-cryptogram'],
   [4,'bottom-left-small','odd-words'],
   [4,'bottom-right-small','true-false'],
  ],
 },
 {
  id:'meaning-and-memory',
  layouts:{2:'small-small-medium-medium',3:'small-small-medium-medium',4:'large-small-small'},
  entries:[
   [1,'cover-activity','connect-verse'],
   [2,'top-left-small','multiple-choice','mc-02'],
   [2,'top-right-small','draw-picture'],
   [2,'middle-medium','circle-mistakes'],
   [2,'bottom-medium','big-idea-cryptogram'],
   [3,'top-left-small','unscramble-words'],
   [3,'top-right-small','true-false'],
   [3,'middle-medium','upside-down-verse'],
   [3,'bottom-medium','connect-big-idea'],
   [4,'top-large','story-order'],
   [4,'bottom-left-small','who-am-i'],
   [4,'bottom-right-small','checkboxes'],
  ],
 },
];

export function makeVerseSpecialtyReviewDraft(lesson,plan,seed=1){
 if(lesson.publication?.approved!==false)
  throw Error('Expected review-stage curriculum for sample generation.');
 const converted=convertLessonActivities(lesson,{seed});
 if(converted.diagnostics.length)
  throw Error('Invalid converter candidates: '+JSON.stringify(converted.diagnostics));
 const draft={
  ...structuredClone(EMPTY_DRAFT),
  title:lesson.lessonDetails.title,
  scripture:lesson.lessonDetails.scriptureDisplay,
  bigIdea:lesson.lessonDetails.bigIdeas[0].text,
  verseReference:lesson.lessonDetails.memoryVerse.reference,
  verseText:lesson.lessonDetails.memoryVerse.text,
  layouts:structuredClone(plan.layouts),
 };
 const used=new Set();
 for(const [page,regionId,moduleId,contentId=moduleId] of plan.entries){
  const key=page+':'+regionId;
  if(used.has(key))throw Error('Duplicate review slot '+key);
  used.add(key);
  const region=getRegions(page,page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page])
   .find(r=>r.id===regionId);
  if(!region||region.kind!=='activity')
   throw Error('Missing review activity region '+key);
  if(!moduleForSize(region.size).some(x=>x.id===moduleId))
   throw Error('Wrong module size at '+key+' for '+moduleId);
  const candidate=findLessonCandidate(converted,moduleId,contentId);
  if(!candidate)throw Error('Missing candidate '+contentId);
  const errors=validateModule(candidate.module);
  if(errors.length)throw Error(contentId+': '+errors.join(' '));
  draft.modules[key]=structuredClone(candidate.module);
 }
 // No placeholder may be left on any page of the sample booklet.
 for(const page of [1,2,3,4]){
  for(const region of getRegions(page,page===1?DEFAULT_LAYOUTS[2]:draft.layouts[page])){
   if(region.kind==='activity'&&!draft.modules[page+':'+region.id])
    throw Error('Unfilled review slot '+page+':'+region.id);
  }
 }
 return draft;
}
