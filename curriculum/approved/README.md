# Approved Bible lessons — publication checklist

This folder is the only source of public built-in lesson JSON files.
God Parts the Red Sea (OT 31) is the first approved lesson, after curriculum-author
signoff and a separately recorded Berean Standard Bible public-domain rights review.

## Adding an approved lesson (data-only PR)

1. Extract and review the ODT/ODP using curriculum schema v1. Keep pending
   lessons in curriculum/review/ together with their review report/checklist.
   Run npm run validate:library to check the actual engines and recipes.
2. Obtain curriculum-author approval for proposed material. Record a signed-off
   publication status of approved, an approved boolean, teacherSignoff with
   reviewer/date, and resolvedReviewFlagIds covering every teacher-approval
   flag. Never invent or self-sign this information.
3. Separately verify Scripture translation distribution permissions for the
   exact text and intended use. In rights-manifest.json, add a lesson entry
   recording status=cleared, the explicit permission/quotation-policy basis,
   reviewedBy, and reviewedOn (ISO date). A bare boolean is insufficient.
4. Move (not copy) the signed-off JSON file into this directory as
   <lesson-id>.lesson.json, matching its internal ID exactly. No unapproved
   lesson file may be copied into frontend source or public directories.
5. Run npm test, npm run validate:library, and npm run build.
   The report uses the real validators, puzzle engines and named recipe builder,
   comparing actual module readiness against the content-level author notes.
   Outputs: artifacts/curriculum-readiness-report.json and .md.
6. Open a data-only pull request. GitHub CI must pass. After merge/deploy, the
   Vite catalog automatically discovers this directory's *.lesson.json files,
   without a custom code change for each additional lesson.

## Fail-closed rules

- Review-stage curriculum is never imported into the deployed frontend.
- Unsigned/unapproved lessons, unmatched file IDs, and lessons with no separately
  documented Scripture rights decision cannot become public entries.
- Both currently named recipes must build. All prepared content must pass its
  existing module validation and applicable real puzzle-engine checks.
- Modules absent from the lesson are reported as MISSING, not fabricated.
  Invalid prepared activities fail approved-library CI.
- Duplicate IDs across review/approved and orphan rights records fail CI.
- Technical readiness is not teacher approval or permission to distribute
  translation excerpts.

## Current state

One approved lesson: `ot-031-god-parts-the-red-sea.lesson.json`, using Exodus 15:11
from the public-domain Berean Standard Bible. The original review-stage dataset is
retained only as the historical fixture `tests/fixtures/ot-031-original-review.json`
for regression tests; it is not a public lesson and is not scanned for publication.
