# Curriculum lesson presets · v1

This directory holds **source-preserving curriculum interchange data**, not saved worksheet drafts. Only the signed-off JSON in `curriculum/approved/*.lesson.json` is bundled into the public app after teacher and Scripture-rights review; review-stage files are excluded.

## PR 17o — one-file, self-contained publication for 123 lessons

**Current publishing instructions:** [PUBLISHING.md](PUBLISHING.md). Review Studio now downloads **one approved `<lesson-id>.lesson.json`** with separate, explicitly teacher-confirmed `publication.teacherSignoff` and `publication.scriptureRights`. There is no shared `rights-manifest.json` to import, update or download, and OT31's existing clearance has been copied into its lesson file without changing the human approval basis. The public catalog still auto-discovers only `curriculum/approved/*.lesson.json`; the schema validator, real puzzle audit and runtime app all fail closed if an approved file lacks signoff, rights evidence or verified BSB provenance. Adding the 2nd or 123rd approved lesson requires only one lesson file, not a registry edit; direct-to-main upload or an optional data-only PR are both supported.

## Approved-export audit metadata (Review Studio)

The source-preserving file contains historical converter checks and the **current** teacher approval. Review Studio's approved export now records successful candidate-specific 27/27 preflight in `publication.reviewStudioVerification` separately from the original `validation.checks[]`, whose former failures/NOT RUN reports are retained without falsifying test results. It archives obsolete draft labels and original source notes, updates current activity readiness without pretending standalone generators passed, and records review-flag dispositions. The worksheet uses `preparedActivities.matchWords[]`, while `matchingPairs[]` remains the historical/source candidate pool and must not be overwritten to match it. See the [conversion guide](../docs/CURRICULUM-CONVERSION-GUIDE.md) for the full field contract.

## Finish Story and Medium Solve the Code authoring rules (PR 17n)

Finish the Story allows **6–12 single-word bracketed blanks**, with a prepared paragraph of at most **1,100 characters** and each bracketed answer at most **16 characters**. The teacher may choose any meaningful blanks; the original Story Note emphasized words are **preserved in the source records but are not a required ordered subsequence** in the worksheet. Do not rewrite original Story Notes to satisfy a puzzle. The current Review Studio and its PR 17n regression test enforce this flexible authoring behavior.

The Important Idea in `lessonDetails.bigIdeas[0].text` is the curriculum author's canonical teaching text and **must not be shortened solely for a cryptogram**. `preparedActivities.bigIdeaCryptogram.phrase` (Medium Solve the Code) may independently refer to the original idea, an existing source-backed `keyPhrases[].text` entry or a `preparedActivities.storyOrder[].text` event that fits its limit of 18 distinct unaccented A–Z letters. `preparedActivities.connectBigIdea.phrase` may likewise use a reviewed alternative. Preserve origin and source IDs. A teacher can use Review Studio to select an existing shorter candidate or explicitly add new wording as a flagged suggested candidate.

## Drawing content contract for new lesson conversions (PR 17m)

**Small Draw a Picture and Large Draw the Story deliberately use different kinds of data.** Both continue using schema-v1 `prompt` fields so approved/review-stage JSON and existing worksheet module payloads remain compatible.

- `drawingPrompts[].prompt`: concise, concrete **noun/participial scene phrases** that complete **“Draw a picture of …”**, e.g. `the Israelites walking on dry ground between two walls of water`. **Not** `The Israelites walked on dry ground.`; omitting the period alone does not fix the grammar. No `Draw`/`Sketch` command or ending punctuation. These reusable candidates can populate repeated Small activities with different scenes.
- `preparedActivities.drawPicture.prompt`: the same **scene-phrase** format, preferably an existing approved `drawingPrompts[]` entry. The small module adds `Draw a picture of ` in its measured preview/PDF renderer.
- `preparedActivities.drawStory[].prompt`: **4–6 complete, capitalized narrative sentences**, each with appropriate final punctuation and at most 105 characters. The Large module already says **Draw the Story** and displays captions **directly**. Prefer using the exact approved `preparedActivities.storyOrder[].text` for each pictured event, matching on stable Story Note `sourceIds` and retaining story order; do not replace the full sentences with scene fragments.
- Preserve `origin`, `sourceIds`, teacher-review flags, original Story Notes, chronological order and all Scripture records. Distinct source-linked captions must refer to identifiable events; never fabricate a sentence or silently truncate an overlong one.
- For new curricula, the **Review Studio** has a Drawing activities task with editable fields, source-note comparisons and explicit buttons to normalize legacy Small commands or reuse corresponding Story Order sentences for Large captions. Its preflight rejects incorrect forms. The approved-lesson schema/semantic validator independently rejects malformed drawing text in CI before publication. The original preapproval fixture is intentionally left unchanged as a historical source artifact.

## Recommended quantities for prepared lesson content

The [Curriculum Conversion Guide](../docs/CURRICULUM-CONVERSION-GUIDE.md) now documents an audit of 15 older approved lessons (OT18–OT29 and OT31–OT33). The **median was 14 canonical True/False facts and six prepared Multiple Choice questions**. Normally prepare **about 14** distinct useful facts (7–8 TRUE, 6–7 FALSE) and **six** thoughtfully selected worksheet questions. These are **editorial defaults, not schema minima or hard maxima**; do not pad a weak question pool or remove good items to hit a quota. Reserve distinct short canonical fact IDs for Sort the Story, Small True/False and Maze.

Preserve **all original source questions and their answers in `questions[]`**, no matter how many there are. Only the authored candidates in `preparedActivities.multipleChoice[]` normally number six. Include the actual TRUE/FALSE/prepared-question/original-question counts and reasons for deviations in the delivery handoff.

## Version 1 contract

- The machine-readable JSON Schema is [schema/lesson-v1.schema.json](schema/lesson-v1.schema.json). The developer validation command is `npm run validate:curriculum`.
- One lesson per JSON file, with a stable ID such as `ot-031-god-parts-the-red-sea` and `schemaVersion: 1`. The completed curriculum converter maps source resources to all 27 current Small/Medium/Large module payloads and all four numbered worksheet presets.
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

To approve a preset, record an explicit `teacherSignoff` with reviewer/date and `resolvedReviewFlagIds` for every `teacher-approval` flag. The validator rejects inconsistent approval states. **Changing one boolean does not bypass the review gate.** Both the public catalog and GitHub CI enforce those additional approval and rights checks.

Confirm Bible-translation rights separately from teacher review. OT 31 uses the public-domain Berean Standard Bible for its published memory verse. Its original human-reviewed clearance basis, reviewer and date are now stored in **`approved/ot-031-god-parts-the-red-sea.lesson.json` under `publication.scriptureRights`**. No shared rights manifest is required. The historical ESV review fixture is never bundled publicly.

## First published lesson and its historical review fixture

- [approved/ot-031-god-parts-the-red-sea.lesson.json](approved/ot-031-god-parts-the-red-sea.lesson.json): teacher-approved Red Sea curriculum, including all 27 activities and an approved BSB memory verse.
- [../tests/fixtures/ot-031-original-review.json](../tests/fixtures/ot-031-original-review.json): byte-for-byte historical **preapproval** fixture used only by legacy regression tests and editorial sample generators, not by the application.
- [review/ot-031-conversion-report.md](review/ot-031-conversion-report.md): original content-level conversion report.
- [review/ot-031-teacher-review.md](review/ot-031-teacher-review.md): original unresolved curriculum-author checklist.

The original conversion referenced the lesson document filename with a `(1)` suffix; source provenance is preserved rather than silently rewritten.

All following numbered PR sections describe *historical development stages*; earlier remarks saying that the Red Sea lesson was still pending referred to those earlier PRs and no longer describe the current published dataset.

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

## PR 17e: word and visual curriculum adapters

`convertLessonActivities` now supports **ten additional existing module types** directly from the approved-for-extraction (but still **unapproved-for-publication**) `preparedActivities` content in the lesson v1 JSON. New kinds: `draw-picture`, `odd-words`, `unscramble-words`, `checkboxes`, `who-am-i`, `match-words`, `medium-word-search`, `pixel-picture`, `draw-story`, and `word-search`. This brings converter coverage to **16 of the app's 27** modules; the remaining verse and specialty modules are next in the roadmap.

The converter copies authored drawing prompts, matching pairs, character clues and words without silently creating new content. It assembles the existing modules' required newline/comma-separated fields, uses deterministic seeds, carries through original Story Note IDs from vocabulary entries where possible, and flags unrelated/incorrect words generated by the curriculum conversion chat as requiring teacher review. The existing `validateModule` checks every candidate; both word searches and Pixel Picture also undergo their actual puzzle generator/solver preflight to prevent invalid presets.

**No new content has been bundled into the live UI.** The public lesson catalog remains empty until teacher signoff and Scripture licensing clearance; `curriculum/review/` stays outside the frontend bundle. Neither existing `Remember the Story` nor `Fun & Games` recipe is changed here. Their intentional unfilled Medium slots can be populated when the wider module support is complete and the author approves the editorial choices.

The GitHub Actions `sample-bifold-booklet` review artifact gains `sample-pr17e-red-sea-word-visual-showcase.pdf`, a four-page booklet with **12 fully populated regions** covering all ten new adapters and two original modules. This sample is editorial QA, not a public preset.

## PR 17f: full 27-module verse and specialty adapter coverage

`convertLessonActivities(lesson, {seed})` can now convert prepared content for **all 27 existing module kinds**. The eleven final mappings add First Letters, Finish Verse, Unscramble Verse, Circle the Mistakes, Big Idea Cryptogram, Upside Down Verse, Connect Big Idea, Verse Cryptogram, Crossword, Spiral Verse and Connect Verse.

This is a data-to-existing-module extension, **not a rewrite of existing module behavior**. Each candidate uses the existing `ActivityModule` type and validator. Source memory verse wording and reference are checked for exact matches, including reconstruction of bracketed verse blanks; source Big Ideas are also checked. Crossword entries must actually generate a connected grid preserving all clues, cryptograms must pass the real cipher validator, and connector/spiral paths must be generateable. Invalid content is reported as a diagnostic, never silently edited.

`ConvertedActivity.sourceLocations` holds the original ODT page and paragraph location when a verse or Important Idea module has no Story Note ID. `mistakeCorrections` separately preserves the Circle the Mistakes review answers and supporting IDs, **without altering the module's printable text/count payload**. All generated mistake content remains marked for the author's approval.

The original Red Sea curriculum remains **review-stage**, excluded from the public UI. Do not add it to `src/publishedLessonCatalog.ts` until teacher signoff and Scripture distribution clearance. The existing *Remember the Story* and *Fun & Games* booklet recipes intentionally retain their empty Medium regions until the user and assistant review the final content mix later.

For independent print/visual QA, `npm run sample:pr17f` produces two complete four-page folded booklets in the GitHub Actions `sample-bifold-booklet` artifact: `sample-pr17f-red-sea-scripture-puzzles.pdf` and `sample-pr17f-red-sea-meaning-and-memory.pdf`. The sample builds and tests use the real review-stage JSON only on the Node side.

## PR 17g: scalable curriculum registration and QA reports

The curriculum library has a separate approved-data directory documented at [approved/README.md](approved/README.md). Historically PR17g used a separate rights manifest. **That legacy process was replaced in PR17o:** an approved lesson is added as **one self-contained JSON file** `approved/<lesson-id>.lesson.json`, with its own verified `publication.scriptureRights`. Vite auto-discovers only approved lesson data. The public registry refuses any lesson missing actual teacher signoff, resolved teacher-approval flags or separately documented Scripture translation rights clearance.

`npm run validate:library` is a real readiness audit, not a cosmetic JSON check. It scans every lesson in `review/` and `approved/`, runs schema validation, attempts real 27-module conversion, checks resulting payloads against original module validators and applicable puzzle solvers (Crossword, cryptogram, word search, maze, Pixel Picture, verse and specialty activities), and tests both named booklet recipes. It creates human-readable and machine-readable reports under `artifacts/curriculum-readiness-report.{md,json}`. Reports distinguish author-reported content readiness from tested technical readiness and publication clearance.

Review-stage data may be incomplete; invalid/missing modules are reported but never published. Approved files cannot pass CI without consistent signoff/rights evidence and working named recipes; any prepared-but-invalid activity blocks release. Missing optional module categories are transparently marked missing. Duplicate review/approved IDs are errors; individual missing or invalid Scripture clearance records block publication.

The Red Sea lesson is still under `review/` and not public. Technical module readiness never constitutes teacher approval or permission to distribute Scripture quotations.

The Crossword across/down clue imbalance is explicitly deferred to a separate UI/algorithm bug fix after the curriculum work.

### Converting the next lesson

1. Take its ODT (and ODP if available) to the curriculum conversion chat. Use the same v1 schema and the source-preserving Story Note + question workflow.
2. Return one lesson JSON, a conversion report and an author review list. Keep source-authored text, adaptations and newly suggested content clearly distinguished.
3. Place it in `curriculum/review/` and run `npm run validate:curriculum` and the full `npm test`.
4. Review outstanding teacher flags. Only later add approved lessons to the public catalog, after importer/module-generation/print tests pass.

