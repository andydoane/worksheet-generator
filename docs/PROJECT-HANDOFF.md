# Worksheet Studio — Living Project Handoff

> **Snapshot, not source of truth.** This document is a starting point for future ChatGPT conversations and contributors, **not** a replacement for the current GitHub repository, tests, CI results, or the owner's newest instructions. The project changes frequently. Verify `main`, open issues/PRs, and recent Actions runs before making recommendations, editing code, or declaring work complete. Do not assume a roadmap item is still open because it appears below.

**Last checked against `main`:** 2026-11-05 (`main` version `0.16.55` after merged PR #103; this PR proposes `0.16.56`)  
**Package version represented by this change:** `0.16.56`  
**Repository:** https://github.com/andydoane/worksheet-generator  
**Worksheet Studio:** https://andydoane.github.io/worksheet-generator/  
**Curriculum Review Studio:** https://andydoane.github.io/worksheet-generator/review.html  
**Curriculum converter reference:** [Curriculum conversion guide](CURRICULUM-CONVERSION-GUIDE.md)

## 1. Product and users

Worksheet Studio helps teachers create attractive, printable Bible lesson activity booklets without needing design or programming expertise. A teacher chooses a **published, approved Bible story** and **Preset 1, 2, 3, or Build My Own**, edits the lesson content and selected activities, previews the result, and exports a folded four-page booklet. PDF output uses two landscape letter-size sheets arranged for folding. There are **27 registered activity types**, spanning small, medium, and large printable regions.

The numbered presets are curated starting arrangements, **not immutable templates**. Teachers may replace activities, change borders and layouts, or customize the canonical **Big Idea** and **Memory Verse**. The application historically stores **one active browser-local worksheet draft**, not a permanent document for each preset. Story/preset switching must not silently replace a teacher's work. For the *same* story, switching presets or Build My Own preserves the chosen Big Idea and Memory Verse and safely regenerates linked activities; changing stories deliberately loads the destination story's defaults. Validations and print-fit checks must succeed **before** replacing the draft.

**Curriculum Review Studio** is a separate interface for preparing individual lesson JSON files from actual source documents. It lets a teacher inspect source-backed and suggested activities, make corrections in visual editors, choose and verify a Berean Standard Bible (BSB) verse, resolve review flags, run schema/converter/preset preflight, and perform the final rights and teacher publication signoff. Review Studio can download working JSON, saved review sessions, and finally an approved lesson JSON. **Saved review sessions preserve review checkmarks; ordinary working JSON is not a substitute for that session state.** Review Studio does **not** publish to GitHub by itself.

## 2. Guardrails — preserve these in every change

- **Teachers should not have to understand JSON or puzzle-engine details.** Prefer clear controls, actionable validation messages, fast editing, and safe defaults.
- **Never silently discard user edits or source alternatives.** Protect stored drafts, linked content, review progress, and pending changes; a failed change must leave the original intact. A teacher may keep an individually edited module independent from canonical lesson content.
- **Never silently rewrite original Story Notes, questions, source citations, Scripture wording, or approved curriculum** to force an activity to pass. Distinguish verbatim source, faithful adaptation, and suggested material; preserve actual source IDs and provenance.
- **Never invent teacher review, signoff, Scripture-rights clearance, BSB verification, document page numbers, or test results.** Being inside `curriculum/approved/` is not enough to publish: the lesson must have its own valid teacher signoff and rights evidence and pass schema/semantic/library checks.
- **Use real printable layout measurements**, not arbitrary character counts alone, wherever physical fit is at issue. Keep SVG browser preview, PDF, and shared validators in agreement; avoid changing established booklet geometry casually.
- **Protect backward compatibility** for saved browser drafts and saved review sessions. Check invalid input, valid input, preservation/migration, and non-destructive failure in regression tests.
- **Approved curriculum is canonical; teacher customization belongs in the worksheet draft.** Review Studio preparing content, approving it, and publishing it are distinct actions.

### BSB and attribution

A versioned local BSB copy is in `public/bible/bsb.txt` with `public/bible/bsb.sha256`, loaded through `src/bsbLibrary.ts` / `src/review/bsb.ts`. The official source is https://berean.bible/downloads.htm. Prefer that verified local text during normal use, preserve the exact chosen quotation and reference, and accurately label custom text from other translations. Confirm copyright/rights requirements before publishing. Never modify the canonical Bible wording to make a puzzle fit.

## 3. Current architecture and where to look

| Area | Key files / directories |
| --- | --- |
| Main teacher interface, switching, saved drafts | `src/App.tsx`, `src/lessonQuickSwitch.ts`, `src/draftMigration.ts` |
| Presets and linked lesson content | `src/worksheetRecipes.ts`, `src/lessonContentSync.ts`, `src/lessonContentLinks.ts`, `src/lessonContentLimits.ts`, `src/LessonContentDialog.tsx` |
| Activities and printing | `src/modules.ts`, `src/smallModules.ts`, `src/storyVerseModules.ts`, `src/specialtyModules.ts`, `src/pdf.ts` and the dedicated `*Layout.ts` / `*PrintPreview.tsx` files |
| Review Studio interface and editing | `src/review/ReviewApp.tsx`, `src/review/model.ts`, `src/review/repairRegistry.ts` and `src/review/*Editor.tsx` |
| Review/preflight/schema | `src/review/preflight.ts`, `src/review/schemaPreflight.ts`, `src/lessonSchemaValidation.ts`, `curriculum/schema/lesson-v1.schema.json` |
| Curriculum publishing | `curriculum/approved/`, `curriculum/PUBLISHING.md`, [conversion guide](CURRICULUM-CONVERSION-GUIDE.md) |
| Local Scripture | `public/bible/bsb.txt`, `public/bible/bsb.sha256`, `src/bsbLibrary.ts` |
| Automated checks and deployment | `tests/*.test.mjs`, `scripts/`, `.github/workflows/pages.yml` |

Stack: **React, TypeScript, Vite, SVG previews, pdf-lib, fontkit, Node's test runner, JSON Schema/semantic validation, GitHub Actions, and GitHub Pages.** Check `package.json` for current dependencies and scripts; Node tests use `--experimental-strip-types`, so check compatibility when editing TypeScript used directly from Node.

Useful repository checks:

```sh
npm test
npm run check
npm run build
npm run validate:curriculum
npm run validate:library
npm run verify:bsb
```

The full `npm test` script also validates curriculum and the approved library; run the complete suite rather than relying only on a targeted test. Report **exactly which commit** and workflow were checked. Green automated CI does not replace hands-on browser/PDF testing.

## 4. Curriculum preparation, approval, and publishing

1. Use the actual source lesson documents and the [authoritative curriculum conversion guide](CURRICULUM-CONVERSION-GUIDE.md). That guide, the **current** schema, and validators—not this handoff—define exact JSON fields, module IDs, and per-activity limits. Keep source wording, citation locations, adaptations, suggestions, and review flags distinct.
2. Import unapproved JSON (or a saved review session) into [Review Studio](https://andydoane.github.io/worksheet-generator/review.html). Inspect activities and original source content, use visual repair editors, select a verified BSB verse, review marked items, and run preflight. Preflight checks the **same structural lesson schema as CI**, activity conversion/validators, and the three numbered presets. A `27/27` count alone is not publication approval.
3. Complete separate **teacher signoff** and **Scripture-rights acknowledgement** with real, independently verified evidence. The final approved JSON is revalidated *after* inserting signoff fields. Download the approved `<lesson-id>.lesson.json`; do not manually flip approval flags.
4. **For ordinary teacher-approved curriculum files, the owner prefers the simple direct-to-`main` GitHub upload:** `curriculum/approved/` → **Add file → Upload files → Commit directly to main**, then check Actions. A data-only PR is an optional safer alternative, **not a prerequisite**. This preference is intentionally different from app code changes.
5. Never upload unapproved drafts/sessions as if they were approved lessons; never publish merely because an unapproved file passes schema validation. See [publishing instructions](../curriculum/PUBLISHING.md).

## 5. How the owner and ChatGPT collaborate

For a proposed change, explain it plainly, inspect the current implementation, identify side effects (saved drafts, approved curriculum, print fit, reviewer state), and divide work into **focused, manageable PRs**. The owner normally wants the assistant to implement the agreed change through the connected GitHub repository, not merely describe a patch.

**For application code/bug-fix PRs:**

1. Refresh `main`, recent commits and merged/open PRs, open issues, `package.json` version, and relevant Actions. Confirm the requested feature is not already implemented. Read relevant source and tests before changing anything.
2. Create a **feature branch from current `main`**. Implement narrowly, preserving approved content and existing behavior.
3. Add regression tests and update this handoff's **Current work and upcoming plans** table and version/verification details in the **same PR**. Update other sections when architecture or workflow changes.
4. Bump package version consistently for code releases, run the full test suite, type-check, BSB integrity check, curriculum/library validation, and production build; investigate unrelated failures rather than blaming the last PR.
5. Push commits, open a **draft PR** while CI runs, fix failures and re-check the **final commit**, then mark it **ready for review** when green.
6. Give the owner the **PR link, change summary, final CI run/results, and a short manual testing checklist**. **Leave the PR unmerged.** The owner normally does the final hands-on test and merge; never auto-merge without an explicit request.

**For direct-to-main approved lesson uploads:** follow the teacher's streamlined [publishing workflow](../curriculum/PUBLISHING.md). They are **not** required to open a PR, update this handoff, or learn branching. Avoid introducing documentation gates that block these uploads.

## 6. Recent milestones (not an exhaustive PR history)

| Merged PR | Durable outcome |
| --- | --- |
| [#90](https://github.com/andydoane/worksheet-generator/pull/90) | Pinned local BSB text and shared verse-picker foundation |
| [#91–#94](https://github.com/andydoane/worksheet-generator/pull/94) | Canonical Big Idea / Memory Verse synchronization, safe editing dialogs, preservation across preset changes, print-aware limits |
| [#96](https://github.com/andydoane/worksheet-generator/pull/96) | Review Studio Multiple Choice display ordering, Unscramble defaults, and shared verse blanks |
| [#97](https://github.com/andydoane/worksheet-generator/pull/97) | Crossword editor typing stays responsive; costly grid checks/preview debounced while preflight remains authoritative |
| [#98](https://github.com/andydoane/worksheet-generator/pull/98) | Fixed approved OT18/OT20/OT21 metadata/schema errors without changing lesson content |
| [#99](https://github.com/andydoane/worksheet-generator/pull/99) | Shared structural schema validation in Review Studio and CI, confirmed metadata repairs, final approved-download gate, conversion guide, direct-to-main publishing instructions |
| [#102](https://github.com/andydoane/worksheet-generator/pull/102) | Measured Large Connect the Verse word boxes replace the 12-letter cap; OT19 “understanding” now passes when the printed layout fits, with preview/PDF regression coverage |
| [#103](https://github.com/andydoane/worksheet-generator/pull/103) | Who Am I suppresses a redundant standalone final question only in the measured SVG/PDF display; original teacher and curriculum wording remain untouched |

The living handoff was introduced in [PR #101](https://github.com/andydoane/worksheet-generator/pull/101); its README link, PR checklist and freshness tests make this guide easier to discover and maintain.

Do not infer current merge status from this table; verify in GitHub. If a future PR changes one of these behaviors, update the *current* explanation instead of endlessly appending release notes.

## 7. Current work and upcoming plans

**Status last checked:** 2026-11-05, against `main` after PR #103 merged and GitHub Actions passed; there were no open issues or PRs before this sidebar change. Refresh GitHub before acting; this table is a snapshot of the new PR in progress.

| Status at last check | Item | Next action or caveat |
| --- | --- | --- |
| **Merged** | [#99 — schema validation & conversion guide](https://github.com/andydoane/worksheet-generator/pull/99) | Apply the new Review Studio approval/schema safeguards to future lessons; watch for teacher feedback |
| **Merged** | [#97 — Crossword editing responsiveness](https://github.com/andydoane/worksheet-generator/pull/97) | Verify hands-on behavior if new feedback arrives; do not reimplement it |
| **Merged; #95 closed** | [#102 — measured Connect the Verse fit](https://github.com/andydoane/worksheet-generator/pull/102) ([issue #95](https://github.com/andydoane/worksheet-generator/issues/95)) | Real PDF-matched Large word-box validation accepts OT19 `understanding` when it fits; teacher confirmed the fix works. Keep Scripture text untouched and preserve the fit checks |
| **Merged** | [#101 — living project handoff](https://github.com/andydoane/worksheet-generator/pull/101) ([issue #100](https://github.com/andydoane/worksheet-generator/issues/100)) | This guide, README entrypoint, PR template and handoff regression tests are in `main`; maintain the focused roadmap and version details in each code PR |
| **Merged** | [#103 — Plan C: printed Who Am I clue cleanup](https://github.com/andydoane/worksheet-generator/pull/103) | Shared display-only cleanup hides standalone trailing question in both SVG and PDF. Raw reviewed/approved clues retain source text and attribution, with regression coverage |
| **In this PR (Plan D)** | Sidebar Home and collapsible desktop navigation | Add Home above Your Workspace, toggle between 255px sidebar and 76px icon/number rail, persist the choice separately from worksheet drafts, retain top-right Home and mobile brand bar, and test labels/keyboard/responsiveness |

**To maintain this table in every future feature/bug-fix PR:** replace stale statuses rather than simply adding rows; add the PR/issue link, brief outcome or current blocker, and accurate next step. Update **Status last checked**, package version above, and milestone context based on actual GitHub information. Never invent a date, merge, approval, or test result. Avoid documenting every small curriculum upload. Documentation-only changes may update the handoff without requiring a release; new direct-to-main approved JSON uploads are exempt.

## 8. First steps for a future ChatGPT conversation

You can say: **“Read `docs/PROJECT-HANDOFF.md` in `andydoane/worksheet-generator`, then verify the current `main`, issues, PRs, version, and Actions. Treat GitHub and my latest directions as authoritative. Don't make changes until you've checked the relevant source and tests.”**

If something in this file differs from the repository, the user's new testing feedback, or the current schema, **follow the current evidence** and update this handoff in the next relevant code PR. The objective is a dependable, low-effort living orientation—not another source of stale rules.
