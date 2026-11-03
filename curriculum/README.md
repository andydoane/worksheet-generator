# Curriculum lesson presets · v1

This directory is **source-preserving curriculum interchange data**, **not** an editable worksheet draft and **not** currently bundled into the live application.

## Version 1 contract

- The machine-readable JSON Schema is [schema/lesson-v1.schema.json](schema/lesson-v1.schema.json). The developer validation command is `npm run validate:curriculum`.
- One lesson per JSON file, with a stable ID such as `ot-031-god-parts-the-red-sea` and `schemaVersion: 1`. A future converter will map source resources to the current 27 Small/Medium/Large module payloads, layouts and PDF generation.
- Preserve **original Story Notes** verbatim, separately from their `cleanText` adaptations, `order`, `emphasizedWords` and source page/section. The same notes may later feed Story Order, Finish the Story, Sort the Story, and drawing prompts.
- Preserve questions, truth-labeled facts, vocabulary, memory-verse wording/translation, shared matching/drawing resources, provenance and optional `preparedActivities`. Content unavailable for a module can be absent, with `moduleReadiness` indicating that it is not ready.
- Every derived text has `origin: "source" | "adapted" | "suggested"`. All intentionally incorrect statements and newly authored distractors require teacher review; maintain the original `reviewFlags` rather than silently discarding them.
- The `moduleReadiness` flags in the submitted Red Sea file are **the conversion author's content-level assessments**. They are **not** guarantees that module validators, solvers, print layout or PDF exports have passed. The actual converter and solver tests belong in later PRs.
- Do not paste the full saved worksheet draft format (`layouts`, `modules`, `activityBorders`, `seed` and page slots) into lesson JSON; worksheet recipes and a converter will add those later.

## Editorial gate — important

The chosen curriculum library will be **built into the public app**, but only **after** the curriculum author reviews and approves newly authored content. Unapproved files live under `curriculum/review/`, outside Vite's `src` and `public` directories, and are not imported by the UI.

Each lesson has a `publication` block:

```json
{
  "status": "pending-teacher-approval",
  "approved": false
}
```

To approve a preset in a later implementation stage, record an explicit `teacherSignoff` with reviewer/date and `resolvedReviewFlagIds` for every `teacher-approval` flag. The validator rejects inconsistent approval states. **Changing one boolean does not bypass the review gate.** Actual bundled-publication checks and catalog entry points will be added with the importer and welcome experience.

Confirm the permissions/attribution requirements for any Bible translation text before distributing publicly. The currently staged Red Sea data contains a short ESV memory verse as quoted by the original curriculum; its inclusion here does not represent a licensing determination.

## First review-stage data package

- [review/ot-031-god-parts-the-red-sea.json](review/ot-031-god-parts-the-red-sea.json): complete, source-preserving lesson conversion supplied by the curriculum conversion chat. Seven original Story Notes, 38 questions, 24 true/false facts, 27 prepared activity categories, and ten review flags.
- [review/ot-031-conversion-report.md](review/ot-031-conversion-report.md): original content-level conversion report.
- [review/ot-031-teacher-review.md](review/ot-031-teacher-review.md): original unresolved curriculum-author checklist.

The original conversion referenced the lesson document filename with a `(1)` suffix; source provenance is preserved rather than silently rewritten.

## PR 17b: core lesson activity converter

`src/lessonActivityConverter.ts` now provides `convertLessonActivities(lesson, {seed})`. It is **not an importer or a public lesson catalog**. Node-side tests load the review-stage source file and run the adapter, but the app does not import or expose the unapproved data.

The adapter returns `candidates` and `diagnostics`, with an independent source ID, teacher-review flag, and actual `ActivityModule` payload per candidate. It supports Story Order, Finish the Story, Multiple Choice, Small True or False, True or False Maze, and Sort the Story. One prepared lesson can contain multiple candidates for the same module type (e.g. eight multiple-choice questions). All are checked with the real module validator, and the app's seeded puzzle renderers remain in charge of shuffling and printing.

Canonical truth data from `facts` powers the three True/False-related adapters. The small True/False activity does not store the correct answer itself, so the converter retains it in the candidate's `answerKey` metadata. The shared `sortStory` statements are verified against their canonical `factId` instead of copying potentially stale truth labels. Any discrepancy or invalid content produces a diagnostic rather than a silent rewrite.

Even if an editorial source later becomes approved, the future public catalog will still need to enforce the full schema/teacher-signoff and licensing gates at registration time. This PR does not publish the Red Sea lesson or revise its historical content-readiness report.

### Converting the next lesson

1. Take its ODT (and ODP if available) to the curriculum conversion chat. Use the same v1 schema and the source-preserving Story Note + question workflow.
2. Return one lesson JSON, a conversion report and an author review list. Keep source-authored text, adaptations and newly suggested content clearly distinguished.
3. Place it in `curriculum/review/` and run `npm run validate:curriculum` and the full `npm test`.
4. Review outstanding teacher flags. Only later add approved lessons to the public catalog, after importer/module-generation/print tests pass.

No welcome screen, lesson importer, worksheet recipes, or auto-prefilled modules are added by this foundational PR.
