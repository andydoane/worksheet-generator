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

## PR 17c: worksheet recipes (editorial review only)

`src/worksheetRecipes.ts` declares two named recipes: **Remember the Story** and **Fun & Games**. Their pure builder accepts the output of the schema-v1 lesson data and uses the six validated PR17b core activity types to generate a completely standard, independently editable `StoredDraft` with real booklet page layouts, assignments and lesson text fields. The builder reports the selected question/source IDs, answer keys, review requirements and unfilled spaces separately from the saved-draft payload.

Each recipe uses three Large activities (Story Order, Finish the Story and Sort the Story), one Medium True/False Maze, one Small True/False, and five distinct Small Multiple Choice questions. The two recipes use different layout/priority sequences and different rotating choices, with one remaining Medium slot openly available for customization. No placeholder module masquerades as actual curriculum content.

The entrypoint `buildWorksheetRecipe(lesson, recipeId, {purpose:'editorial-review', seed:1})` **requires explicit review mode**. There is **no public recipe pathway or app UI** in PR17c, no source import from `curriculum/review/` into the deployed bundle, and no browser-draft replacement. Later PRs must enforce the curriculum validation, teacher-approval and Scripture licensing gates *before* registering lessons in a public catalog. Draft construction never implies editorial approval.

The test suite uses the **real, unapproved** Red Sea lesson file, and `npm run sample:pr17c` generates both complete four-page folded-booklet examples as vector PDFs in GitHub Actions. The sample PDFs are for author/print review and are not exposed by the app.

## PR 17d: welcome-first onboarding with explicit publication gate

The app now opens to **Welcome** on every visit, with Start from Scratch, Explore an Example, and Continue Your Worksheet (if a meaningful draft is saved in the existing browser storage). Choose a Bible Story opens a real catalog view; while no lessons are approved it displays a clear awaiting-approval message and options to start blank or explore the built-in example.

The onboarding **example** is *not* a curriculum preset: it creates an editable booklet from the existing form placeholder examples (which were already visible in the app). The Red Sea file under `curriculum/review/` stays **outside the frontend bundle** and is not silently published.

The new `src/publishedLessonCatalog.ts` is an explicit publication registry, initially empty. To register a lesson later, the curriculum author must sign off on the editorial review flags and confirm that distribution rights for the quoted Scripture text are cleared. The registry requires both, and `buildWorksheetRecipe` accepts `{purpose:'published'}` only for signed and approved lesson objects. Publishing also requires a deliberate code change to register the reviewed dataset; no one can expose it merely by editing local browser storage or changing a single JSON approval boolean.

Current worksheet recipe layouts still have one deliberately unfilled Medium activity slot. We plan to revisit both recipe contents and the extra Medium slot after the remaining module converters are ready, not as part of onboarding.

### Converting the next lesson

1. Take its ODT (and ODP if available) to the curriculum conversion chat. Use the same v1 schema and the source-preserving Story Note + question workflow.
2. Return one lesson JSON, a conversion report and an author review list. Keep source-authored text, adaptations and newly suggested content clearly distinguished.
3. Place it in `curriculum/review/` and run `npm run validate:curriculum` and the full `npm test`.
4. Review outstanding teacher flags. Only later add approved lessons to the public catalog, after importer/module-generation/print tests pass.

No welcome screen, lesson importer, worksheet recipes, or auto-prefilled modules are added by this foundational PR.
