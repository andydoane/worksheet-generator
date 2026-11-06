import type {Lesson} from './model.ts';

/** Evidence is supplied by the browser only after its measured, candidate-specific
 * preflight finished. In particular, legacy calls to createApprovedLesson without
 * this evidence must not claim that a generator or the preflight ran.
 */
export type ApprovedExportPreflight={
 convertedCount:number;
 totalCount:number;
 issues:readonly unknown[];
 checkedAt:string;
};
export type ApprovedExportEvidence={
 preflight?:ApprovedExportPreflight;
 reviewedTaskIds?:readonly string[];
};
const clone=<T,>(value:T):T=>structuredClone(value);
const PRESETS_CHECKED=4;
const MODULES_CHECKED=27;

function verifiedPreflight(evidence:ApprovedExportEvidence):ApprovedExportPreflight|undefined{
 const preflight=evidence.preflight;
 if(!preflight)return undefined;
 if(preflight.convertedCount!==MODULES_CHECKED||
    preflight.totalCount!==MODULES_CHECKED||
    !Array.isArray(preflight.issues)||preflight.issues.length!==0)
  throw Error('Approved export requires a successful 27/27 Review Studio preflight with no issues.');
 const when=preflight.checkedAt;
 if(typeof when!=='string'||!Number.isFinite(Date.parse(when))||
    new Date(when).toISOString()!==when)
  throw Error('Approved export requires the actual completed preflight timestamp.');
 return preflight;
}

/**
 * Keep the conversion-time audit trail intact while giving the approved file
 * a separate, truthful *current* status. Never convert old NOT RUN / failed
 * checks into fabricated PASS results, touch primary content, or silently
 * replace original matching-pair candidates with the printed selections.
 *
 * The upstream caller is still responsible for the signoff/rights checks and
 * final schema validation. This transformation is pure and idempotent.
 */
export function finalizeApprovedMetadata(lesson:Lesson,evidence:ApprovedExportEvidence={}):Lesson{
 const next=clone(lesson);
 const preflight=verifiedPreflight(evidence);
 const reviewed=new Set(evidence.reviewedTaskIds??[]);
 const publication=next.publication??{};
 next.publication=publication;

 if(typeof next.schemaStatus==='string'&&!publication.originalSchemaStatus&&
    !/^approved\b/iu.test(next.schemaStatus))
  publication.originalSchemaStatus=next.schemaStatus;
 next.schemaStatus=preflight?
  'approved; Review Studio 27/27 preflight passed':
  'approved; Review Studio preflight evidence not recorded';

 if(typeof publication.notes==='string'&&!publication.originalConversionNotes&&
    !/^Approved through Review Studio/iu.test(publication.notes))
  publication.originalConversionNotes=publication.notes;
 publication.notes=preflight?
  'Approved through Review Studio after teacher review and a successful 27/27 content/preflight check of four numbered presets. Original conversion notes and checks remain as historical records.':
  'Approved through Review Studio with teacher signoff and BSB rights; independent preflight evidence was not supplied to this export call. Original conversion notes remain historical.';

 // Do not erase that the ORIGINAL curriculum was ESV, or rewrite filenames
 // and primary page/paragraph citations. Preserve the exact draft note first.
 for(const source of next.sourceFiles??[]){
  if(typeof source.note!=='string')continue;
  const stale=/\bBSB selection (?:remains|is|was) pending\b\.?/iu;
  if(!stale.test(source.note))continue;
  if(typeof source.originalConversionNote!=='string')
   source.originalConversionNote=source.note;
  source.note=source.note.replace(stale,
   'BSB selection is documented in the approved lesson’s memoryVerse and publication.scriptureRights.');
 }

 // Imported validation.checks / failed NOT RUN results are *historical*.
 // Only the separately recorded Review Studio result may assert 27/27.
 if(next.validation&&typeof next.validation==='object'){
  const validation=next.validation;
  if(typeof validation.basis==='string'&&!validation.originalBasis&&
     !/^Historical conversion-stage checks/u.test(validation.basis))
   validation.originalBasis=validation.basis;
  validation.basis='Historical conversion-stage checks, not final Review Studio results. '+
   (preflight?'The passing review evidence is at publication.reviewStudioVerification.':
    'No measured Review Studio preflight evidence was supplied to this export call.');
  validation.checksScope='original-conversion-before-teacher-review';
  // Keep checks[], allTextChecksPassed and actualGeneratorTested AS THEY WERE.
 }
 if(preflight){
  publication.reviewStudioVerification={
   source:'Review Studio measured preflight',
   checkedAt:preflight.checkedAt,
   convertedCount:MODULES_CHECKED,
   totalCount:MODULES_CHECKED,
   issueCount:0,
   numberedPresetsChecked:PRESETS_CHECKED,
   scope:'Candidate-specific content conversion, four numbered preset content checks, and measured Connect the Verse fit. Standalone repository commands and independently rendered PDFs are not claimed.',
   matchingWorksheetSource:'preparedActivities.matchWords',
   matchingCandidatePool:'matchingPairs is retained separately as historical/source candidate material',
  };
  // Readiness describes the CURRENT approved content. Archive the original
  // conversion-time entries first, without rewriting old test evidence.
  if(Array.isArray(next.moduleReadiness)){
   if(next.validation&&typeof next.validation==='object'&&
      !Array.isArray(next.validation.originalModuleReadiness))
    next.validation.originalModuleReadiness=clone(next.moduleReadiness);
   for(const item of next.moduleReadiness){
    item.status='READY';
    item.contentValidation='Review Studio preflight: 27/27 content and four preset content checks passed.';
    item.notes='Current approved worksheet passed Review Studio preflight. '+
     'generatorTested retains its original standalone-test meaning; see publication.reviewStudioVerification.';
    // Neither this metadata update nor preflight proves independent
    // per-module generator/PDF tests, so do not flip generatorTested.
   }
  }
 }else{
  // Never preserve earlier verified evidence when approving via a legacy
  // call without a preflight linked to the current lesson.
  delete publication.reviewStudioVerification;
 }

 const resolved=new Set<string>(Array.isArray(publication.resolvedReviewFlagIds)?
  publication.resolvedReviewFlagIds:[]);
 const memory=next.lessonDetails?.memoryVerse;
 const bsbApproved=memory?.translation==='BSB'&&
  publication.scriptureRights?.status==='cleared';
 for(const flag of next.reviewFlags??[]){
  if(flag.type==='scripture-text'&&bsbApproved)resolved.add(flag.id);
  if((flag.type==='content-sensitivity'||flag.type==='sensitivity')&&
     reviewed.has('sensitivity'))resolved.add(flag.id);
 }
 publication.resolvedReviewFlagIds=[...resolved];
 publication.reviewFlagDisposition=(next.reviewFlags??[]).map((flag:any)=>({
  id:flag.id,
  status:resolved.has(flag.id)?'resolved':
   flag.type==='source-inventory'?'historical':
   flag.type==='validation'&&preflight?'partially-verified':'requires-review',
  detail:resolved.has(flag.id)?
   'Resolved by explicit teacher review, BSB choice, or signed approval, as applicable.':
   flag.type==='source-inventory'?
    'Historical record of material supplied; not a task to fabricate missing documents.':
   flag.type==='validation'&&preflight?
    'Review Studio preflight passed; the separate original converter/CI or standalone generator tests are NOT automatically claimed.':
    'Original flag retained; no implicit resolution was recorded.',
 }));
 return next;
}
