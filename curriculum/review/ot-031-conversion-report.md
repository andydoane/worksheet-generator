# OT 31 — God Parts the Red Sea: Conversion Report

## Source and scope

- **Primary file:** `OT 31 Lesson (God Parts the Red Sea)(1).odt` (ODT, 15 rendered pages)
- **Curriculum:** Old Testament, Lesson 31 — *God Parts the Red Sea*
- **Bible narrative:** Exodus 13–14
- **Memory verse:** Exodus 15:11 (ESV), preserved exactly as it appears twice in the document on page 7. The provided text is not shown as an excerpt and contains no ellipses.
- **Original important idea:** **The Lord God is a mighty savior.** (page 5)
- **Additional presentation:** No ODP supplied. ODT slide-thumbnail artwork was reviewed as supporting context, but no standalone presentation was checked.

## Extraction totals

| Material | Count | Notes |
|---|---:|---|
| Original chronological Story Notes | **7** | All seven preserved verbatim, including emphasized words CLOUD, CHASE, DIE, FIGHT, SPLIT, PANIC, DOWN; pages 2–5. |
| Source teaching/review questions | **38** | Includes 10 dedicated review questions, 5 introductory recap questions, and contextual, application, rhetorical, and interpretive prompts. |
| Factual questions | **33** | Factual count includes recap material that is separately marked; some prompts need surrounding context. |
| Other questions | **5** | rhetorical: 1, hypothetical: 1, discussion: 1, interpretive: 2. |
| Story/application vocabulary entries | **38** | Plus 5 suggested unrelated distractor words. |
| Shared true statements | **13** | Derived from story facts, original emphasis, and the teaching script. |
| Shared false statements | **11** | Newly suggested, clearly marked, and flagged for teacher approval. |
| Prepared multiple-choice candidates | **8** | Each has one answer and two newly suggested distractors (16 total). |
| Matching pairs | **6** | Prepared for Match the Words. |
| Drawing prompt bank | **7** | Covers all seven Story Notes; six selected for Draw the Story. |
| Crossword answer/clue pairs | **10** | Text limits passed; generator layout not tested. |
| Modules assessed | **27** | 26 READY (content-level); 1 ADAPTATION NEEDED. |

## Source fidelity

The seven Story Notes follow this order: God guides Israel toward the Red Sea; Pharaoh chases; Israel fears death while trapped; Moses says God will fight; God splits the sea and Israel crosses on dry ground; Egyptians panic and chariot wheels jam; God brings water down over the Egyptian army. Pages 2–5.

The Bible story and theological application are intentionally separate. Page 5 names the important idea, **The Lord God is a mighty savior.** Pages 5–6 compare God's rescue of Israel with the salvation taught through Jesus' death and resurrection; this comparison remains in `theologicalApplications` and does not become an additional chronological Red Sea event.

The page-5 Important Idea display spells the final word **“savior.”**; the page-6 teaching prose also uses **“Savior!”** The JSON uses the exact page-5 display-card wording. The original Exodus 15:11 memory verse is preserved without replacing, completing, or shortening words. Bracketed variants restore exactly to the source wording when the brackets are removed.

## Module readiness (27 activities)

The status assesses the **prepared lesson content**, not whether the future importer or worksheet generator successfully accepts it. All applicable standalone text, word-count, and option-count checks passed (33/33). The actual app's rendering/solver validation has **not** been run.

| Size | Module | Status | Prepared material / remaining test |
|---|---|---|---|
| Small | Draw a Picture (`draw-picture`) | **READY** | One Red Sea drawing prompt |
| Small | Multiple Choice Question (`multiple-choice`) | **READY** | Eight three-choice candidates |
| Small | True or False Questions (`true-false`) | **READY** | True fact linked to shared bank |
| Small | First Letter Challenge (`first-letters`) | **READY** | Full 22-word verse + reference |
| Small | What’s Doesn’t Belong? (`odd-words`) | **READY** | Five related + five unrelated terms |
| Small | Unscramble the Words (`unscramble-words`) | **READY** | MOSES, CLOUD |
| Small | Checkboxes (`checkboxes`) | **READY** | Five correct + five incorrect words |
| Small | Who Am I? (`who-am-i`) | **READY** | Moses clue and answer |
| Medium | Match the Words (`match-words`) | **READY** | Six unique matches |
| Medium | Finish the Verse (`finish-verse`) | **READY** | Five bracketed verse answers |
| Medium | Unscramble the Verse (`unscramble-verse`) | **READY** | Five different bracketed verse answers |
| Medium | Circle the Mistakes (`circle-mistakes`) | **READY** | Six mistakes with correction key |
| Medium | Word Search (Medium) (`medium-word-search`) | **READY** | Six words |
| Medium | True or False Maze (`true-false-maze`) | **READY** | True fact + boolean |
| Medium | Solve the Code (`big-idea-cryptogram`) | **READY** | Exact original important idea |
| Medium | Upside Down Verse (`upside-down-verse`) | **READY** | Exact memory verse |
| Medium | Connect the Phrase (`connect-big-idea`) | **READY** | Original important idea |
| Medium | Pixel Picture (`pixel-picture`) | **READY** | Adapted 53-character story phrase |
| Large | Finish the Story (`finish-story`) | **READY** | Seven bracketed source emphasis words |
| Large | Story Order (`story-order`) | **READY** | Seven chronological events |
| Large | Sort the Story (`sort-story`) | **READY** | Eight statements (four true, four false) |
| Large | Draw the Story (`draw-story`) | **READY** | Six visual scenes |
| Large | Word Search (Large) (`word-search`) | **READY** | Twelve story terms |
| Large | Verse Cryptogram (`verse-cryptogram`) | **READY** | Full 121-character verse |
| Large | Crossword (`crossword`) | **ADAPTATION NEEDED** | Ten original clues; app grid test pending |
| Large | Spiral Verse (`spiral-verse`) | **READY** | Exact memory verse |
| Large | Connect the Verse (`connect-verse`) | **READY** | Full 22-word verse |

## Validation completed

- JSON serialized and parsed successfully (valid UTF-8; no comments or trailing commas).
- Verified each original Story Note against an ODT text paragraph and kept its documented sequence.
- Verified both occurrences of Exodus 15:11 in the lesson text match the stored verse.
- Checked all 27 content candidates against the handoff's specified character, word, answer-count, and uniqueness limits.
- Checked the story paragraph has exactly seven bracketed answers, in the source note emphasis order.
- Checked generated verse brackets can be removed to recover the exact provided memory verse.
- Checked Sort the Story includes both true and false statements, linked to the shared fact bank.
- Checked every selected multiple-choice item has exactly one right choice and two distinct wrong choices.
- Checked teacher-review labels for newly authored distractors, false statements, and intentionally incorrect content.

**Not tested:** No access to the actual worksheet-generator code or validator was supplied. Crossword grid connectedness in the app, Pixel Picture output, exact imported field names, and finished worksheet rendering are all unverified.

## Recommended importer design note

This file preserves the handoff's proposed v1 fields, including `schemaVersion`, `lessonDetails`, `storyNotes`, `questions`, `facts`, `vocabulary`, and `preparedActivities`. The `preparedActivities` object is extended to all 27 module keys and provenance is attached to the prepared items where applicable. The JSON is a **proposed lesson preset**, not a presently importable file. The importer developer should map these fields to the real module contract before marking the file app-compatible.

## Teacher review priorities

1. Approve eight adapted multiple-choice prompts and 16 suggested wrong choices.
2. Approve the suggested false statements and confirm none is confusing or accidentally true.
3. Approve the Finish the Story wording, especially its source-emphasis bracket answers.
4. Check the six intentional mistakes and corrections in Circle the Mistakes.
5. Review wording about the Egyptian soldiers' deaths for the target age group; keep the source's teaching intent.
6. Optional wording check: confirm whether the page-5 **“savior.”** capitalization should be retained for display (the page-6 prose says **“Savior!”**). Test Crossword and Pixel Picture in the app and confirm the proposed importer mapping. No ODP was supplied for a separate slide-image comparison.

The lesson already has enough prepared, source-grounded data for a useful preset. Optional production-level checks can be completed when the importer is implemented.
