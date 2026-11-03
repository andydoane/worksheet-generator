import type {LessonWorksheetSource} from './worksheetRecipes.ts';

/**
 * PR 17g: public catalog is a DATA registry, not an editorial shortcut.
 *
 * Vite bundles ONLY curriculum/approved/*.lesson.json. It never glob-imports
 * curriculum/review/. Each added file is accompanied by a separately recorded
 * Scripture-rights decision; CI validates schema, all puzzle engines and both
 * printable recipes before deployment. No curriculum is published by this PR.
 */
export type ScriptureRightsEvidence={
 status:'cleared';
 /** Human-readable permission/public-domain/quotation-policy basis. */
 basis:string;
 reviewedBy:string;
 /** YYYY-MM-DD; recorded approval, not an inferred date. */
 reviewedOn:string;
};
export type CurriculumRightsManifest={
 schemaVersion:1;
 lessons:Record<string,ScriptureRightsEvidence>;
};
export type PublicLessonEntry={
 lesson:LessonWorksheetSource;
 scriptureDistributionCleared:true;
 rightsEvidence:ScriptureRightsEvidence;
};

const hasText=(value:unknown):value is string=>
 typeof value==='string'&&value.trim().length>0;
export function isRightsEvidence(value:unknown):value is ScriptureRightsEvidence{
 if(value===null||typeof value!=='object')return false;
 const record=value as Record<string,unknown>;
 return record.status==='cleared'&&hasText(record.basis)&&
  hasText(record.reviewedBy)&&
  typeof record.reviewedOn==='string'&&
  /^\d{4}-\d{2}-\d{2}$/u.test(record.reviewedOn)&&
  Number.isFinite(Date.parse(record.reviewedOn))&&
  new Date(record.reviewedOn).toISOString().startsWith(record.reviewedOn);
}
export function approvedForPublic(entry:PublicLessonEntry):boolean{
 if(!entry||entry.scriptureDistributionCleared!==true||
  !isRightsEvidence(entry.rightsEvidence))return false;
 const {lesson}=entry;
 if(!lesson||lesson.schemaVersion!==1)return false;
 const pub=lesson.publication;
 if(pub?.status!=='approved'||pub.approved!==true||
  !hasText(pub.teacherSignoff?.reviewer)||
  !hasText(pub.teacherSignoff?.date))return false;
 if(!Array.isArray(lesson.reviewFlags)||!Array.isArray(pub.resolvedReviewFlagIds))return false;
 const resolved=new Set(pub.resolvedReviewFlagIds);
 return lesson.reviewFlags.filter(flag=>flag.type==='teacher-approval')
  .every(flag=>resolved.has(flag.id));
}

/**
 * Pure catalog assembly can be exercised in Node and in the browser. Requiring
 * an exact slug filename and independent permission evidence prevents a file
 * with a plausible title or a single flipped approved flag from going public.
 *
 * CI does deeper full-schema, engine, recipe and manifest validation. This
 * runtime check is a second fail-closed defense, not a substitute for CI.
 */
export function assemblePublicLessonCatalog(
 files:Record<string,unknown>,manifest:unknown,
):readonly PublicLessonEntry[]{
 if(!manifest||typeof manifest!=='object')return [];
 const m=manifest as Partial<CurriculumRightsManifest>;
 if(m.schemaVersion!==1||!m.lessons||typeof m.lessons!=='object'||
  Array.isArray(m.lessons))return [];
 const result:PublicLessonEntry[]=[];
 const seen=new Set<string>();
 for(const [path,data] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
  const basename=path.match(/(?:^|\/)curriculum\/approved\/([a-z0-9]+(?:-[a-z0-9]+)*)\.lesson\.json$/u)?.[1];
  if(!basename||!data||typeof data!=='object'||Array.isArray(data))continue;
  const lesson=data as LessonWorksheetSource;
  if(lesson.id!==basename||seen.has(basename))continue;
  seen.add(basename);
  const rights=m.lessons[basename];
  const entry={
   lesson,scriptureDistributionCleared:true as const,rightsEvidence:rights,
  };
  if(approvedForPublic(entry))result.push(entry);
 }
 return result;
}

// Vite transforms the literal glob calls into bundled imports and provides
// import.meta.env at runtime. Node's native ESM loader has no import.meta.env,
// so regression tests safely see an empty built-in catalog. Do NOT test for
// typeof import.meta.glob here: that function is compile-time-only in Vite
// and need not exist in the browser after the transform.
const lessonFiles:Record<string,unknown>=
 import.meta.env
  ?import.meta.glob('../curriculum/approved/*.lesson.json',{eager:true,import:'default'})
  :{};
const rightsFiles:Record<string,unknown>=
 import.meta.env
  ?import.meta.glob('../curriculum/approved/rights-manifest.json',{eager:true,import:'default'})
  :{};
export const PUBLIC_LESSONS:readonly PublicLessonEntry[]=
 assemblePublicLessonCatalog(lessonFiles,Object.values(rightsFiles)[0]);
