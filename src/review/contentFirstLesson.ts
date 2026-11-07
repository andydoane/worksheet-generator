import type {Lesson} from './model.ts';

/**
 * The published lesson is a library of teacher-approved, potentially PRINTABLE
 * content, not a copy of the original curriculum's document audit trail.
 *
 * These pools supply genuine alternatives in lessonContentPool.ts, so keep
 * them: facts, vocabulary, characters, drawingPrompts, matchingPairs,
 * keyPhrases, and preparedActivities. Only remove non-printing original
 * document collections and their citation pointers.
 *
 * This projection is pure: a saved Review Studio work session retains its
 * input untouched. Legacy approved files remain readable as they were.
 */
const printablePools=[
 'vocabulary','facts','characters','drawingPrompts','matchingPairs','keyPhrases',
] as const;

const provenanceKeys=new Set([
 'source','sourceIds','sourceQuestionIds','verificationSource',
]);

function withoutProvenance(value:unknown):unknown{
 if(Array.isArray(value))return value.map(withoutProvenance);
 if(value&&typeof value==='object'){
  return Object.fromEntries(Object.entries(value).filter(([key])=>
   !provenanceKeys.has(key)).map(([key,child])=>[key,withoutProvenance(child)]));
 }
 return value;
}

export function contentFirstLesson(lesson:Lesson):Lesson{
 const source=lesson??{};
 const result:Lesson={
  schemaVersion:source.schemaVersion,
  id:source.id,
  curriculum:withoutProvenance(source.curriculum),
  lessonDetails:withoutProvenance(source.lessonDetails),
  preparedActivities:withoutProvenance(source.preparedActivities??{}),
 };
 for(const key of printablePools)
  if(source[key]!==undefined)result[key]=withoutProvenance(source[key]);

 // These are the publication credentials and actual Review Studio preflight,
 // not conversion-stage estimates, draft status strings or source citations.
 const publication=source.publication??{};
 result.publication={
  status:publication.status??'pending-teacher-approval',
  approved:publication.approved===true,
  ...(publication.teacherSignoff?{teacherSignoff:structuredClone(publication.teacherSignoff)}:{}),
  ...(publication.scriptureRights?{scriptureRights:structuredClone(publication.scriptureRights)}:{}),
  ...(publication.reviewStudioVerification?
   {reviewStudioVerification:structuredClone(publication.reviewStudioVerification)}:{}),
 };
 return result;
}
