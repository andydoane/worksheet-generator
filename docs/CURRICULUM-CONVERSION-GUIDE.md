# Curriculum conversion guide — Worksheet Studio

**Audience:** curriculum-to-data ChatGPT conversations, teachers, and reviewers creating schema-v1 lesson JSON.  
**Project:** [Worksheet Studio](https://andydoane.github.io/worksheet-generator/) · [Review Studio](https://andydoane.github.io/worksheet-generator/review.html)  
**Canonical machine-readable specification:** [`curriculum/schema/lesson-v1.schema.json`](../curriculum/schema/lesson-v1.schema.json)  
**Legacy source-rich, teacher-approved real example:** [OT31 — God Parts the Red Sea](../curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json)  
**Preferred compact, deliberately unapproved example:** [`curriculum/examples/lesson-v1-content-first-unapproved.example.json`](../curriculum/examples/lesson-v1-content-first-unapproved.example.json)  
**Legacy source-rich structural example (optional):** [`curriculum/examples/lesson-v1-unapproved.example.json`](../curriculum/examples/lesson-v1-unapproved.example.json)  
**Publishing instructions:** [`curriculum/PUBLISHING.md`](../curriculum/PUBLISHING.md)

> **For future conversion chats:** This guide is a human-readable companion, **not** a substitute for the current JSON Schema, validators, or a teacher's review. Re-read the files on GitHub at the start of each conversion; the source may have changed since this guide was written. Never invent quotations, source page/paragraph references, Bible citations, rights clearance, completed tests, or teacher approval.

## Current authoring contract — content first

**This section supersedes source-preservation requirements in the historical workflows and examples below.** Review Studio exists to approve the material that can appear on worksheets, not to build an archive of the original curriculum's document IDs, page numbers and old conversion logs.

**Required new-lesson fields:** `schemaVersion:1`, `id`, `curriculum`, `lessonDetails` (title, references, Important Idea and teacher-verifiable memory verse), `facts[]` (canonical answer statements), `preparedActivities` (all 27 types), and `publication` (pending/unapproved). **Optional:** `sourceFiles`, `storyNotes`, original `questions`, `moduleReadiness`, `reviewFlags`, `validation`, filenames, page citations, `sourceIds` and `sourceQuestionIds`. The linked original material may be read to write good teaching content; it need **not** be copied into the output JSON. Source citations are never a teacher approval requirement.

**Do preserve PRINTABLE alternative pools** when the generator can actually use them: `facts`, `vocabulary`, `characters`, `drawingPrompts`, `matchingPairs` and `keyPhrases`. Those are usable student content and should be reviewed for accuracy, not a historical record. Canonical `factId` links, `isTrue` answers, three Multiple Choice choices/one correct flag, verse text, and other answer keys remain essential; do not confuse *correct-answer relationships* with source provenance.

**The new approved export is lean:** it keeps printable activity and alternative content, accurate lesson identification, verified BSB, teacher signoff and actual Review Studio preflight evidence. It drops original documents, Story Notes, original questions, source-reference pointers, stale conversion test logs and readiness estimates. An imported **review session remains unchanged**, so save it separately if you want an editable history. Older approved v1 files with provenance fields remain readable, and aren't automatically rewritten.

### Preferred workflow for a new conversion chat

1. Read the Bible lesson and supplied slides for teaching content; do not invent events or Scripture.
2. Prepare the 27 activity types and optional alternate **printable** content pools. Default to about 14 thoughtful canonical True/False facts (7–8 TRUE and 6–7 FALSE) and six prepared Multiple Choice questions.
3. Reserve **distinct canonical fact IDs** for Sort the Story (4–8 balanced facts), Small True/False (≤80 characters), and Maze (≤65 characters). Exact canonical statement/truth matching is still required.
4. Use short scene phrases for Small Draw a Picture and complete narrative sentences for Large Draw the Story. Apply every activity-specific **§4 contract**, not just the schema.
5. Never claim BSB verification, rights clearance, teacher review or successful generator runs you didn't perform. A teacher makes these decisions in Review Studio.
6. Parse and validate the precise candidate JSON, run real puzzles/layouts when available, report unrun checks **NOT RUN**, and deliver an unapproved content file plus a concise 27-activity handoff (not a source-ID inventory).

**Illustrative compact shape only (not 27/27 ready, and placeholder text is not Scripture):**

```json
{
  "schemaVersion": 1,
  "id": "ot-999-example",
  "curriculum": {"series": "OT", "lessonNumber": 999},
  "lessonDetails": {
    "title": "Example lesson",
    "scripturePassages": ["Genesis 1:1"],
    "scriptureDisplay": "Genesis 1:1",
    "bigIdeas": [{"text": "God made the world.", "origin": "suggested"}],
    "memoryVerse": {
      "reference": "Genesis 1:1",
      "translation": "SOURCE TRANSLATION, TEACHER MUST VERIFY BSB",
      "text": "PLACEHOLDER NOT A VERIFIED SCRIPTURE QUOTE",
      "isExcerpt": true
    }
  },
  "facts": [
    {"id": "tf-01", "statement": "God made the world.", "isTrue": true,
     "origin": "suggested", "teacherReviewRequired": true}
  ],
  "preparedActivities": {},
  "publication": {"status": "pending-teacher-approval", "approved": false}
}
```

The compact unapproved example is the preferred starting shape for new conversions; it is deliberately incomplete and **not** 27/27 ready. OT31 and older source-rich examples are useful for field shapes and compatibility, **not** requirements to copy source metadata, approval, or rights evidence.

## 1. What you're preparing

A **lesson JSON** contains reviewed printable content pools and **prepared choices for 27 printable activity types**. It is *not* a saved worksheet. The Review Studio converts this file into selectable activities, lets the teacher correct and approve the material, applies the teacher-verified Berean Standard Bible (BSB) excerpt, and checks all four numbered worksheet presets. Finally, the teacher downloads an individually approved `<lesson-id>.lesson.json` for `curriculum/approved/`.

There are three distinct gates:

1. **JSON syntax and schema:** a parseable file with correct printable field structure, names, types, required fields and enums. Optional historical citations are not an approval gate. Review Studio and CI share schema checking, but schema validity does **not** prove truthful canonical-fact linkage or 27/27 printable activities.
2. **Review Studio preflight:** the real converter, all 27 module validators, printable content/answers, and all four numbered worksheet recipes. A schema-valid draft may still fail preflight.
3. **Teacher approval and GitHub library validation:** faithful teaching content and Scripture verification, explicit teacher review/signoff, separate BSB-rights confirmation, live puzzle solvers and printable layouts. **Only a teacher may authorize publication.** Repository-wide tests don't automatically validate a new file outside the checkout.

Avoid saying "validated" without identifying which gate you actually ran.

## 2. Before converting — request the source material

Ask for the actual lesson ODT/DOCX/PDF and optional slides. Read those materials for accurate teaching content, including the lesson's Big Idea, Scripture references, people, events, original memory-verse reference/translation, teaching cautions and useful vocabulary. If something is missing, report uncertainty rather than inventing it.

**Reading original material is essential; copying its document audit trail into the new JSON is not.** The current compact lesson can omit `sourceFiles`, `storyNotes`, the source `questions[]` archive, `sourceIds`, `sourceQuestionIds`, page references, `moduleReadiness`, historical `validation` and source-inventory `reviewFlags`. Preserve useful *printable* alternatives and accurate answers instead. If you deliberately include optional historical fields, keep them truthful and distinguish original quotation from adaptation and suggestion.

### Source citation format (optional historical metadata)

A source-rich legacy file may represent a verified original document location like this:

```json
{"filename":"OT 31 Lesson.odt","section":"STORY NOTE","page":2,"sourceParagraphIndex":21}
```

That example illustrates a **legacy optional field**, not a request to create document IDs or page numbers. Never fabricate a source citation or link. New content-first lessons normally omit these source locations. Web Scripture-verification URLs are distinct from original document page citations; neither is a substitute for teacher BSB verification.

### Ten-step workflow for a new conversion chat

1. **Read the real inputs.** Identify the lesson, Scripture passages, Big Idea, story timeline, original memory-verse reference and translation, and any genuine teaching concerns.
2. **Define printable lesson details.** Create `schemaVersion:1`, stable lesson `id`, `curriculum` and `lessonDetails`. Use truthful wording and label any suggested material for teacher review.
3. **Build canonical true/false facts.** Aim for about 14 worthwhile distinct `facts[]` (normally 7–8 TRUE and 6–7 FALSE); never pad a weak lesson. Make every truth key unambiguous.
4. **Allocate unique fact IDs.** Reserve 4–8 balanced facts for Sort the Story, a different ≤80-character fact for Small True/False and a different ≤65-character fact for Maze. Selected statements and truth values must exactly match their canonical fact.
5. **Prepare worthwhile questions.** Aim for six different `preparedActivities.multipleChoice[]` entries, each with three distinct choices and exactly one correct answer. Original source `questions[]` need not be copied into the file.
6. **Prepare useful alternatives.** Where available, retain real printable `vocabulary`, `characters`, `drawingPrompts`, `matchingPairs` and `keyPhrases` pools. These support varied presets and activity switching; don't replace them with empty provenance inventories.
7. **Write all 27 activity types.** Follow the §4 recipes and their actual module limits. Small drawing prompts are scene phrases; Large Draw the Story captions are complete sentences. Preserve chronological Story Order, answer-key consistency, word-bank distinctness and puzzle feasibility.
8. **Keep Scripture truthful.** Record the source translation accurately in the unapproved draft, or mark a transparent placeholder if needed. Do not invent a verified BSB quotation. The teacher chooses the final exact BSB excerpt in Review Studio; aligned verse activities must then match it.
9. **Validate the actual candidate.** Parse JSON, run the live schema/semantic checker and generators when available, and later have Review Studio verify 27/27 activities **and all four presets**. Distinguish evidence from assumptions; report unrun checks `NOT RUN`.
10. **Deliver the unapproved content file.** Keep `publication.status:"pending-teacher-approval"` and `approved:false`. Supply a concise 27-activity/readiness report and teacher decisions, not a source-ID inventory. The teacher reviews, verifies BSB/rights and approves in Review Studio.

### Exact JSON formatting and provenance rules

- Output one UTF-8 `.json` file with one top-level object. No Markdown wrappers inside the file, JSON comments, trailing commas, unquoted keys, duplicate keys or unescaped literal line breaks within strings; encode line breaks as `\n`.
- Keep the correct printable **data types**: `preparedActivities` is an object; `multipleChoice`, `matchWords`, `storyOrder`, `sortStory`, `drawStory` and `crossword` are arrays of objects; `characters[].clues[]` contains objects with `text` and `origin`. Lists such as `oddWords.related`, `checkboxes.incorrect`, `unscrambleWords.answers` and word-search `words` contain strings.
- Use exact hyphenated registered module IDs in reporting, and their corresponding camelCase keys inside `preparedActivities` (for example, `true-false-maze` versus `trueFalseMaze`).
- `origin:"source"` means truly verbatim source wording; `"adapted"` means faithful rewording; `"suggested"` means newly authored. Flag suggested/teacher-dependent content with `teacherReviewRequired:true`. Use these labels honestly **without** inventing original document references.
- Source-reference objects and `sourceIds` are **optional** historical metadata. If deliberately included, their file/ID/page relationships must be real; they must never be fabricated just to pass review.
- Leave `publication` pending and unapproved. Do not copy a teacher's name, signoff, approval date, completed rights review, BSB verification or fake test success from another lesson.

## 3. Exact schema-v1 sections and naming

Use **`schemaVersion:1`** and a lowercase, hyphenated `id` such as `ot-021-joseph-works-for-potiphar`. The downloaded approved filename must be `<id>.lesson.json`.

The schema requires these **printable-content** properties; historical fields are optional:

| Field | Purpose |
|---|---|
| `schemaVersion` | Integer value `1` |
| `id` | Stable lowercase hyphenated lesson identifier |
| `curriculum` | `series` and positive integer `lessonNumber` |
| `lessonDetails` | `title`, `scripturePassages` (nonempty), `scriptureDisplay`, `bigIdeas`, `memoryVerse` |
| `sourceFiles` (optional) | Historical original document filenames, never an approval gate |
| `storyNotes` (optional) | Original curriculum note archive, not required for printable Story Order |
| `questions` (optional) | Original curriculum questions; the worksheet uses prepared Multiple Choice instead |
| `facts` | True/false facts with truthful `isTrue`, IDs and origins |
| `vocabulary` (optional) | Printable vocabulary/alternate choice pools, when useful |
| `preparedActivities` | Prepared content, in **camelCase keys**, for the printable activity types |
| `moduleReadiness` (optional) | Historical converter estimates; actual preflight is authoritative |
| `reviewFlags` (optional) | Optional real teaching/age suitability reminders, not source bookkeeping |
| `publication` | **Pending/unapproved** during conversion |

Optional sections include `schemaStatus`, `characters`, `matchingPairs`, `drawingPrompts`, `keyPhrases`, `theologicalApplications`, and `validation`. Include them when the source/working data supports them. Do not invent values merely to fill optional sections.

### Important nested details

- Each `facts[]` entry needs `id`, truthful `statement`, Boolean `isTrue` and `origin`. `factId` links are **answer-key relationships**, not optional source provenance.
- Each `lessonDetails.bigIdeas[]` entry needs `text` and `origin`. Preserve the canonical Big Idea; do not shorten it merely to make a cipher fit.
- `lessonDetails.memoryVerse` needs `reference`, `translation`, `text` and `isExcerpt`. Accurately label any unverified source translation; the teacher applies the verified BSB excerpt later.
- If `characters` exists, each `characters[].clues[]` element must be an object with `text` and `origin`, never a bare string.
- Printable pools (`vocabulary`, `matchingPairs`, `drawingPrompts`, `keyPhrases`) remain useful for distinct activity choices even when all original `sourceIds` are omitted.
- **Legacy fields only when deliberately supplied:** `storyNotes[]` and original `questions[]` retain their own older schema shape; `moduleReadiness[]`, `reviewFlags[]` and `validation.checks[]` are not required for a new content-first file and do not prove executable readiness. When an optional `validation.checks[]` entry is used, its key is `check` (not `name`).
- Conversion-stage `publication` must remain `{"status":"pending-teacher-approval","approved":false}`. Do not copy `teacherSignoff`, `scriptureRights` or `resolvedReviewFlagIds` from an approved example.

### Character clues: objects, never bare strings

`characters` is optional, but **each entry** in `characters[].clues[]` must be an object with at least `text` and `origin`. The shorthand `"clues":["My clue"]` **fails schema validation and stops all 27 conversions**. A valid illustrative structure is:

```json
{
  "characters": [{
    "id": "ch-01",
    "name": "Moses",
    "origin": "adapted",
    "clues": [{
      "text": "I warned Pharaoh before the tenth plague. Who am I?",
      "origin": "adapted",
      "teacherReviewRequired": true
    }]
  }]
}
```

`text` preserves the clue and `origin` records whether it was sourced, faithfully adapted or suggested. Optional source links may be omitted entirely. Proposed wording needs teacher review. The compact starter demonstrates the shape; Review Studio can repair legacy string clues without inventing attribution.

### Canonical facts, IDs and length budgets

Every prepared record in `preparedActivities.trueFalse`, `preparedActivities.trueFalseMaze` and `preparedActivities.sortStory[]` needs a real `factId` from `facts[]`. Its `statement` and boolean `isTrue` must match that canonical fact **exactly**. Never copy a shortened paraphrase into a prepared selection while retaining the old long fact ID. Review Studio prohibits reusing the same ID across these three activities, so reserve distinct facts.

**Historical reference warning:** the approved OT31 sample predates this uniqueness guard and reuses `tf-07` in multiple prepared activities. Use its field shapes, **not** its repeated fact selections, when preparing new curricula.

- **True/False:** 80-character maximum. **Maze:** 65-character maximum. **Sort the Story:** 4–8 distinct canonical facts, each ≤115 characters, including at least one TRUE and one FALSE. Reserve unused suitable facts for True/False and Maze; don't allocate all short facts to Sort.
- For a faithfully shortened version, create a **new canonical fact ID**, a truthful adapted `statement`, the **same `isTrue`**, `origin:"adapted"` (or `"suggested"` if it cannot be verified) and `teacherReviewRequired:true`. The original fact stays unchanged; optional `adaptedFromFactId` can record lineage, but no original-document citation is required. Select the new fact ID in the prepared activity.
- If the source does not support a shortened statement, mark a review decision instead of inventing a sourced fact. Review Studio now supports teacher-confirmed adaptations and moving eligible facts out of Sort the Story when its remaining rows stay valid.

Prepared True/False example, **only after** its new canonical fact `tf-review-01` has the exact same statement and truth:

```json
{
  "trueFalse": {
    "factId": "tf-review-01",
    "statement": "The angel passed over homes marked with lamb's blood.",
    "isTrue": true,
    "origin": "adapted",
    "teacherReviewRequired": true
  }
}
```

This belongs **inside** `preparedActivities`. Never omit its `factId`.


### Editorial quantity targets — avoid overproducing worksheet choices

These are **preferred preparation quantities, not schema minima, hard maxima, or mandatory quotas**. Source quality and genuine variety take priority. An audit of **15 earlier approved lessons (OT18–OT29 and OT31–OT33)** counted canonical `facts[].isTrue` values and **prepared** `multipleChoice[]` entries, *not* original source questions:

| Prepared content | Older-lesson mean | Older-lesson median | Normal new-lesson target |
| --- | ---: | ---: | --- |
| TRUE statements in `facts[]` | 8.47 | 8 | **7–8** |
| FALSE statements in `facts[]` | 7.13 | 7 | **6–7** |
| Total canonical facts | 15.60 | 14 | **About 14** (normally 7 TRUE + 7 FALSE or 8 TRUE + 6 FALSE) |
| Questions in `preparedActivities.multipleChoice[]` | 6.53 | 6 | **6** |

**Thirteen of the fifteen older lessons contained exactly 14 facts and six prepared Multiple Choice questions**; OT31 and OT32 were larger exceptions. These values are an editorial baseline, **not a validator restriction**. Prepare fewer if the source doesn't support enough distinct, worthwhile items; prepare more only when it adds clear lesson-specific educational value. **Never add filler, duplicate trivia, or ambiguous false statements just to reach a number; never delete strong material solely to obey a target.** Explain meaningful deviations in the final handoff.

The **prepared worksheet choices** in `preparedActivities.multipleChoice[]` normally number six. Read original questions as teaching material and preserve their meaning when adapting them, but the original `questions[]` archive is **optional** and not an approval condition. Preserve the correct Big Idea, Scripture attribution and printable lesson alternatives. Canonical `facts[]` is a selectively prepared True/False bank, not a historical question archive.

Allocate separate canonical `factId` values before building the activities. Sort the Story needs **4–8** distinct facts with both truth values; Small True/False needs one separate fact **≤80 characters**, and True/False Maze another separate fact **≤65 characters**. Every prepared statement and truth value must match its referenced canonical record *exactly*. With a bank of roughly 14, keep suitable facts available for all three activities rather than using every short fact for Sort. Each of the usual six Multiple Choice candidates needs exactly **three distinct answer choices with one correct**, plausible distractors, and a nonredundant source-grounded question.

**Required delivery counts:** Report the number of canonical TRUE facts, canonical FALSE facts, and prepared Multiple Choice questions; explain meaningful deviations from the normal targets. Do **not** require a count of archived source questions.

## 4. All 27 module IDs and prepared activity keys

**Machine-readable IDs are exact and case-sensitive.** `"circle-mistakes"` is valid; `"circle-the-mistakes"` is **not**. `preparedActivities` uses the separate camelCase key shown in the table. The rightmost column is a quick preparation guide, **not** a complete validator specification. For exact current requirements consult `src/modules.ts`, `src/smallModules.ts`, `src/storyVerseModules.ts`, `src/specialtyModules.ts`, `src/puzzleEngines.ts`, `src/cryptograms.ts`, and `src/lessonActivityConverter.ts`.

| Registered module ID | `preparedActivities` key | Principal constraints / purpose |
|---|---|---|
| `draw-picture` | `drawPicture` | A scene phrase completing “Draw a picture of …”, ≤105 characters; no past-tense sentence, instruction prefix, or final punctuation |
| `multiple-choice` | `multipleChoice` | Question up to 105 chars; **three distinct choices**, exactly one correct, choices up to 42 chars; source answer stays true |
| `true-false` | `trueFalse` | Statement up to 80 chars, correct `isTrue`, unique canonical `factId`, exact matching wording |
| `first-letters` | `firstLetters` | Memory Verse text 3–75 words; reference up to 32 chars |
| `odd-words` | `oddWords` | **1–5 `related`** and **1–5 `unrelated`**; 6–10 total; each entry ≤12 chars |
| `unscramble-words` | `unscrambleWords` | **Exactly 2** distinct answers; each 3–10 **total** letters across one/two words, ignoring the single space; each word needs two different letters |
| `checkboxes` | `checkboxes` | **1–5 `correct`** and **1–5 `incorrect`**; one/two words, ≤14 chars |
| `who-am-i` | `whoAmI` | Clue up to 120 chars, answer up to 14 letters; don't repeat a trailing "Who am I?" prompt unnecessarily |
| `match-words` | `matchWords` | 3–6 source-grounded pairs; each side ≤22 chars, unique matches |
| `finish-verse` | `finishVerse` | 2–8 bracketed blanks in marked verse, blank words ≤9 letters; marked passage ≤300 chars; reference ≤38 |
| `unscramble-verse` | `unscrambleVerse` | 4–8 bracketed blanks; marked passage ≤240 chars; reference ≤38 |
| `circle-mistakes` | `circleMistakes` | Error-filled paragraph ≤475 chars; specified mistake count 1–8; distinguish deliberate mistakes from original Scripture |
| `medium-word-search` | `mediumWordSearch` | 1–6 distinct A–Z words/phrases, 2–9 letters each excluding spaces |
| `true-false-maze` | `trueFalseMaze` | Statement ≤65 chars; truthful `isTrue`, distinct canonical `factId`, exact matching wording |
| `big-idea-cryptogram` | `bigIdeaCryptogram` | Code phrase ≤62 chars and ≤18 distinct letters; can use approved story phrase instead of canonical Big Idea |
| `upside-down-verse` | `upsideDownVerse` | Memory Verse ≤240 total chars and ≤160 letters; reference ≤42 |
| `connect-big-idea` | `connectBigIdea` | 4–20 words, ≤125 chars, each word ≤12; may use a separate approved story phrase |
| `pixel-picture` | `pixelPicture` | 30–85-character phrase, words ≤18 characters, English letters/digits/simple punctuation, and a repeated letter; generator selects the picture |
| `finish-story` | `finishStory` | Coherent paragraph ≤1,100 characters; **6–12** single-word `[blanks]` ≤16 characters each; emphasized Story Note words are not mandatory blanks |
| `story-order` | `storyOrder` | **5–8** chronological events, each ≤115 chars; preserve true event order |
| `sort-story` | `sortStory` | 4–8 separate canonical `factId`s, matching wording/truth, each ≤115 chars, at least one TRUE and FALSE; reserve suitable facts for True/False and Maze |
| `draw-story` | `drawStory` | 4–6 narrative drawing captions, each ≤105 chars; complete sentences, not "Draw…" instructions |
| `word-search` | `wordSearch` | 4–12 distinct A–Z words/phrases, each 2–12 letters excluding spaces |
| `verse-cryptogram` | `verseCryptogram` | Exact verse ≤145 chars, reference ≤42; puzzle letter and print-fit checks |
| `crossword` | `crossword` | 6–10 distinct answer/clue pairs; answer 3–12 A–Z letters, clue 1–85 chars, all words must interlock |
| `spiral-verse` | `spiralVerse` | Verse ≤260 chars, reference ≤45 |
| `connect-verse` | `connectVerse` | 4–35 words, ≤260 characters; **no blanket 12-letter word cap** since [PR #102](https://github.com/andydoane/worksheet-generator/pull/102); measured SVG/PDF word-box fit applies |

**Do not trust this table over the latest code.** Some activities also enforce uniqueness, letter alphabets, spacing, source conflicts, measured PDF placement, grid solvability, and special verse/reference limits. The final converter and preflight remain authoritative.

### Common choices and links

- A `preparedActivities.multipleChoice[]` item needs `id`, `question`, `correctAnswer`, `choices`, and `origin`; the `choices` contain exactly one `isCorrect:true`. The printable generator shuffles the answers, **not** the teacher’s editing screen.
- `oddWords.related` and `checkboxes.correct` are **small selected subsets** of the lesson vocabulary; do not paste every story word into these activities. OT21 failed because the list held **six** story-related words where a maximum of five is allowed.
- `unscrambleWords.answers` must have two distinct useful entries. Review Studio can offer two defaults and retain extra saved alternatives, but fresh conversions should prepare exactly two.
- `preparedActivities.crossword[]` holds `{"answer":"WORD","clue":"Specific source-grounded clue"}` entries. Review Studio displays the grid after a brief typing pause; final preflight always checks the actual generator.
- Marked verse fields (`finishVerse.markedVerse`, `unscrambleVerse.markedVerse`) use **square brackets** around selected words; every other verse word remains ordinary text.
- The teacher can copy compatible 4–8 blank selections between Finish the Verse and Unscramble the Verse in Review Studio.
- Related Big Idea and Memory Verse activities can be linked to the canonical teacher selections. Do not force the same phrase into activities that intentionally use independent approved alternatives.

### Detailed conversion recipes for all 27 activities

This is the **authoring contract** for all 27 activity types, not just a list of maximum lengths. A new conversion chat should read every card before generating the corresponding `preparedActivities` record. Examples are **illustrative fragments**, not real verified source facts or Scripture. They intentionally omit source IDs if no source document is available. Never paste a `tf-demo-*` ID into a final lesson unless you separately create and verify its matching canonical `facts[]` record. For Scripture examples, the words `SOURCE VERSE REFERENCE` and `EXACT VERIFIED BSB VERSE GOES HERE` are placeholders only.

**Shared rules:** Store `origin:"source"` only for truly verbatim wording, `"adapted"` for faithful rewordings and `"suggested"` for new editorial content; mark suggestions and teacher-dependent edits `teacherReviewRequired:true`. Original Story Notes and `sourceIds` are **optional**, not prerequisites for a prepared activity. A JSON/schema-valid sample might still fail a real puzzle generator or teacher review; those checks are independent.

#### 01. `draw-picture` — Small Draw a Picture (`preparedActivities.drawPicture`)

**Sentence test:** append the entire prompt to **“Draw a picture of …”**. It must form a natural noun/participial scene phrase. Maximum **105 characters**; no imperative `Draw`/`Sketch`/`Illustrate`, no terminal `.`, `!`, or `?`. Reusable `drawingPrompts[].prompt` entries follow the same rule. The printed activity already adds the instruction.

**Wrong:** `Moses spoke with Pharaoh about the tenth plague.` (a complete past-tense sentence). **Right:** `Moses speaking with Pharaoh about the tenth plague`. **Do not** merely delete the final period; convert the grammar. Prefer specific, drawable action over abstract moral summaries.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "drawPicture": {
      "prompt": "Moses speaking with Pharaoh about the tenth plague",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 02. `multiple-choice` — Small Multiple Choice (`preparedActivities.multipleChoice`)

Prepare **six distinct, meaningful questions per lesson by default** in `preparedActivities.multipleChoice[]`; the one-question JSON example below illustrates the *shape*, not the target count. Ground each question and its correct answer in the actual lesson: question up to **105 characters**, answers up to **42 characters**. Use exactly **three distinct choices** (case-insensitive), with **one** `isCorrect:true` that matches `correctAnswer` exactly. Original questions are useful inputs; copying them into `questions[]` or assigning `sourceQuestionIds` is **optional**.

**Wrong:** four choices, two correct flags, a `correctAnswer` absent from `choices`, an invented wrong answer presented as sourced. Wrong choices may be `suggested` and need teacher approval. Review Studio displays correct-first for teacher editing; student print shuffles.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "multipleChoice": [
      {
        "id": "mc-demo-01",
        "question": "Who spoke to Pharaoh?",
        "correctAnswer": "Moses",
        "choices": [
          {
            "text": "Moses",
            "isCorrect": true,
            "origin": "suggested"
          },
          {
            "text": "David",
            "isCorrect": false,
            "origin": "suggested"
          },
          {
            "text": "Samuel",
            "isCorrect": false,
            "origin": "suggested"
          }
        ],
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 03. `true-false` — Small True/False (`preparedActivities.trueFalse`)

Statement **1–80 characters**. `factId` must refer to a real `facts[]` record with **identical** `statement` and Boolean `isTrue`. Allocate this ID to this activity alone: do not reuse it in Sort the Story or Maze. Keep the statement truthful about the lesson without requiring source citation fields; a deliberately false statement must actually be false, not merely ambiguous.

**Wrong:** using an overlong canonical fact's ID with a silently shortened prepared statement. Create a separate linked `facts[]` adaptation with a new ID, preserved source/truth, and `teacherReviewRequired:true`, or move an eligible fact in Review Studio. `factId` is **editor-required even when the bare schema allows it to be omitted**.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "trueFalse": {
      "factId": "tf-demo-01",
      "statement": "Moses spoke to Pharaoh.",
      "isTrue": true,
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 04. `first-letters` — Small First Letter Challenge (`preparedActivities.firstLetters`)

Uses the **canonical selected memory verse**: **3–75 words**, reference **1–32 characters**. The example is a schematic placeholder only, **not Scripture**. After teacher BSB selection, this `reference` and `verse` must match `lessonDetails.memoryVerse` exactly. Avoid short excerpts that cannot make a useful puzzle.

**Wrong:** guessing BSB text or abbreviating the verse differently in each activity. Never treat placeholder text as Scripture or invent BSB verification.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "firstLetters": {
      "reference": "SOURCE VERSE REFERENCE",
      "verse": "REPLACE WITH VERIFIED EXACT MEMORY VERSE",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 05. `odd-words` — Small Odd Words / What Doesn't Belong? (`preparedActivities.oddWords`)

**1–5 story-related** entries and **1–5 unrelated** entries, **6–10 total**. Each entry **≤12 characters including spaces**; short phrases are allowed if they follow the word-list format. Entries must be distinct ignoring case. Mark invented decoys as `unrelatedOrigin:"suggested"` and review them for accidental relevance.

**Wrong:** six correct entries, duplicate words across sides, or a long two-word phrase. Review Studio's five-random-decoy button is optional; the converter should still prepare useful reviewed candidates. Don't reuse the other activity's selected decoys.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "oddWords": {
      "related": [
        "MOSES",
        "PHARAOH",
        "EGYPT",
        "STAFF"
      ],
      "unrelated": [
        "CROWN",
        "BANANA"
      ],
      "unrelatedOrigin": "suggested",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 06. `unscramble-words` — Small Unscramble the Words (`preparedActivities.unscrambleWords`)

**Exactly two distinct** answers. Each answer may be **one or two words**, with **3–10 letters total excluding the single inter-word space**; each component has ≥2 letters and at least **two different letters** so it can scramble. Plain A–Z letters and one space between two words; choose relevant, recognizable answers.

**Wrong:** `RED SEA CROSSING` (three words), treating 10 letters as a *per-word* allowance, or sending three or more prepared choices. Review Studio may retain other candidates, but the final prepared array must contain two.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "unscrambleWords": {
      "answers": [
        "MOSES",
        "RED SEA"
      ],
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 07. `checkboxes` — Small Checkboxes (`preparedActivities.checkboxes`)

**1–5 correct** and **1–5 incorrect** entries. Each is **one or two words**, **≤14 characters including spaces**; all choices distinct ignoring case. Put genuinely story-relevant words in `correct`; teacher reviews the `incorrect` decoys. Record `incorrectOrigin:"suggested"` for generated decoys.

**Wrong:** six entries on one side, 15-character phrases, or overlap with Odd Words decoys. Review Studio's picker can suggest five different decoys and avoids words already assigned to the other activity.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "checkboxes": {
      "correct": [
        "MOSES",
        "EGYPT",
        "STAFF"
      ],
      "incorrect": [
        "ROCKET",
        "BANANA"
      ],
      "incorrectOrigin": "suggested",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 08. `who-am-i` — Small Who Am I? (`preparedActivities.whoAmI`)

A descriptive **clue ≤120 printable characters**; answer **1–14 letters** (spaces/hyphens allowed). The answer should be the intended person's name and agree with the evidence in `characters[]`. Clues in `characters[].clues[]` must be **objects** with `text` and `origin`, never strings.

**Wrong:** clue only `Who am I?`; repeated large prompt after the clue. Rendering omits a redundant **standalone trailing** “Who am I?” without rewriting the source JSON; write a clean clue anyway.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "whoAmI": {
      "clue": "I spoke with Pharaoh before the people left Egypt.",
      "answer": "Moses",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 09. `match-words` — Small Match Words (`preparedActivities.matchWords`)

**3–6 pairs**; each side **≤22 characters**. Each left label and each right label must be unique (case-insensitively). The converter serializes pairs using a comma separator; therefore **neither side may contain a comma**. Write unequivocal, source-grounded relationships.

**Wrong:** two pairs, two different left items sharing the same right answer, or `Moses, Aaron` inside a cell. If multiple answers could reasonably match a clue, reword it.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "matchWords": [
      {
        "left": "Moses",
        "right": "Leader",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "left": "Pharaoh",
        "right": "Ruler",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "left": "Egypt",
        "right": "Land",
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 10. `finish-verse` — Medium Finish the Verse (`preparedActivities.finishVerse`)

Mark **2–8** complete missing words with matching `[square brackets]`; each blank **≤9 letters**, one word, legal punctuation treatment; **marked passage ≤300 characters**, reference **≤38**. The unbracketed `markedVerse` must reconstruct **exactly** the teacher-selected canonical BSB verse, including punctuation/case. `sourceVerse` must match that verse too. **Example text is not a verified Scripture quotation.**

**Wrong:** swapping words, stripping punctuation, or choosing an original translation and claiming BSB. Never shorten Bible text just to improve fit. After BSB selection Review Studio can copy compatible blank positions.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "finishVerse": {
      "reference": "SOURCE VERSE REFERENCE",
      "sourceVerse": "God is our help.",
      "markedVerse": "God [is] our [help].",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 11. `unscramble-verse` — Medium Unscramble the Verse (`preparedActivities.unscrambleVerse`)

Choose **4–8** bracketed words, each **≤9 letters** (legal adjacent punctuation allowed), **marked passage ≤240 characters**, reference **≤38**. Unbracketing must reproduce the exact canonical BSB verse byte-for-byte. Use distinctive, scrambleable words where possible. **Schematic example, not verified Scripture.**

**Wrong:** only two bracketed words, inserting words absent from the original verse, or modifying Scripture to make a scramble easier.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "unscrambleVerse": {
      "reference": "SOURCE VERSE REFERENCE",
      "sourceVerse": "God cares for all his people.",
      "markedVerse": "God [cares] for [all] [his] [people].",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 12. `circle-mistakes` — Medium Circle the Mistakes (`preparedActivities.circleMistakes`)

A short narrative paragraph **1–475 characters** with **1–8 deliberate errors**. Set `mistakeCount` equal to `mistakes.length`; every `mistakes[].incorrect` must appear in the paragraph (the editor checks case-insensitively). Provide a truthful `correction` for each. Make mistakes clear and separable to children.

**Wrong:** listing corrections for phrases absent from the paragraph, marking a true Scripture statement as false, or adding accidental extra errors not in the correction list. Preserve the original Story Notes unmodified; the incorrect paragraph is an editorial activity.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "circleMistakes": {
      "paragraph": "Moses built a boat to leave Egypt. He led the people through the desert by train.",
      "mistakeCount": 2,
      "mistakes": [
        {
          "incorrect": "built a boat",
          "correction": "led the people out of Egypt",
          "origin": "suggested",
          "teacherReviewRequired": true
        },
        {
          "incorrect": "by train",
          "correction": "on foot",
          "origin": "suggested",
          "teacherReviewRequired": true
        }
      ],
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 13. `medium-word-search` — Medium Word Search (`preparedActivities.mediumWordSearch`)

**1–6 distinct words or short phrases**, each **2–9 A–Z letters ignoring spaces**. Only letters A–Z and single internal spaces; no punctuation or numerals. Choose source-grounded labels and ensure a real generator run can place them all.

**Wrong:** `PHARAOH'S` (apostrophe), repeated word in two casings, or a 10-letter answer. Schema-valid word arrays do **not** imply that the grid can be generated.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "mediumWordSearch": {
      "words": [
        "MOSES",
        "WATER",
        "STAFF",
        "EGYPT"
      ],
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 14. `true-false-maze` — Medium True/False Maze (`preparedActivities.trueFalseMaze`)

Canonical fact selection as for Small True/False, but **≤65 characters** and a **different `factId`** from True/False and Sort the Story. The Boolean truth must be intentionally and factually correct. The maze's answer comes from this canonical fact.

**Wrong:** a prepared statement without `factId`, or reusing a canonical ID already in Sort the Story. If the source statement is too long, create a separate reviewed adaptation with its own ID.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "trueFalseMaze": {
      "factId": "tf-demo-02",
      "statement": "Moses built a ship for the Israelites.",
      "isTrue": false,
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 15. `big-idea-cryptogram` — Medium Solve the Code / Big Idea Cryptogram (`preparedActivities.bigIdeaCryptogram`)

Phrase **1–62 characters**, at least **3 distinct A–Z letters**, **no more than 18 distinct A–Z letters**, with ordinary spacing and no accented alphabetic characters. Source-linked alternatives may come from the original Important Idea, a real `keyPhrases[]` record, or an appropriate Story Order event.

**Wrong:** changing `lessonDetails.bigIdeas[0].text` to make a cryptogram fit. Keep the canonical Important Idea intact and choose a **separate reviewed** `preparedActivities.bigIdeaCryptogram.phrase` if necessary.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "bigIdeaCryptogram": {
      "phrase": "God is our help.",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 16. `upside-down-verse` — Medium Upside-Down Verse (`preparedActivities.upsideDownVerse`)

Canonical memory verse exactly as selected: **≤160 A–Z letters**, **≤240 total characters**, reference **≤42**; at least 3 letters and only unaccented A–Z alphabetic characters. Schematic text is a placeholder, **not actual Scripture**. Never change a verse to meet the limit.

**Wrong:** treating 240 total characters as permission for 200 letters, or using a different excerpt from the other verse activities.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "upsideDownVerse": {
      "reference": "SOURCE VERSE REFERENCE",
      "verse": "EXACT VERIFIED BSB VERSE GOES HERE",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 17. `connect-big-idea` — Medium Connect the Big Idea (`preparedActivities.connectBigIdea`)

**4–20 words**, **≤125 characters total**, **each word ≤12 letters**. Use unaccented English A–Z. This is intentionally **different** from Connect the Verse, whose old 12-letter cap was removed. A teacher-reviewed alternative phrase may be used without shortening the canonical Big Idea.

**Wrong:** copying an overlong Big Idea verbatim and then altering the source teaching text. Keep `lessonDetails.bigIdeas[0]` unchanged and select a separately reviewed source-linked phrase.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "connectBigIdea": {
      "phrase": "God helps his people in trouble",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 18. `pixel-picture` — Medium Pixel Picture (`preparedActivities.pixelPicture`)

Phrase **30–85 characters**. English letters A–Z, numbers, spaces, and simple punctuation only; each word **≤18 characters**; **at least one letter repeats**, or no missing-letter game can be formed. The visual shape is **chosen by the worksheet generator**, not by the conversion chat.

**Wrong:** `shapeId` guessed from an old lesson or choosing a short 12-character phrase. The converter ignores old `shapeId`; do not fake a generator pass.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "pixelPicture": {
      "phrase": "God helped the people walk on dry ground.",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 19. `finish-story` — Large Finish the Story (`preparedActivities.finishStory`)

A coherent age-appropriate paragraph **≤1,100 characters**, containing **6–12 bracketed blanks**. Every answer must be a single word **≤16 characters** (apostrophes/hyphens may be allowed). Keep enough unblanked context for comprehension. The teacher **may choose any meaningful blank words**; the original emphasized Story Note words are valuable source metadata, **not a required ordered subsequence**.

**Wrong:** treating original Story Note emphasis as mandatory blank choices, rewriting original source material just to match blanks, or placing multiword phrases inside a single pair of brackets. Respect lesson truth but treat the prepared paragraph as separately authored activity copy.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "finishStory": {
      "markedParagraph": "God asked [Moses] to lead the [people] out of [Egypt]. They crossed the [sea] on [dry] ground. The [Lord] protected them.",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 20. `story-order` — Large Story Order (`preparedActivities.storyOrder`)

**5–8 meaningful lesson-grounded events**, each **≤115 characters**. Store `order:1,2,3,...` in **chronological sequence**. Review Studio shows the chronological preview for checking; the **printed student worksheet shuffles** the events. Use clear, distinguishable events; `sourceIds` and original Story Notes are not needed.

**Wrong:** manually shuffling the JSON before delivery, vague scenes whose order cannot be determined, or copying invented chronology and calling it source-backed.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "storyOrder": [
      {
        "order": 1,
        "text": "Moses spoke to Pharaoh.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "order": 2,
        "text": "The people prepared for their journey.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "order": 3,
        "text": "The people left Egypt.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "order": 4,
        "text": "The people reached the sea.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "order": 5,
        "text": "They crossed on dry ground.",
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 21. `sort-story` — Large Sort the Story (`preparedActivities.sortStory`)

**4–8** prepared selections taken from a pool of **about 14 carefully chosen facts** (normally 7–8 TRUE, 6–7 FALSE), each a different **canonical `facts[].id`**, with **identical** `statement` and `isTrue`; each **≤115 characters** and include both TRUE and FALSE. Reserve unused, independently valid fact IDs for the Small True/False and Medium Maze—avoid assigning every short fact to Sort.

**Wrong:** copying `tf-demo-01` from Small True/False, paraphrasing only prepared text, or ignoring a missing `factId` because schema doesn't mark it required. Review Studio can move facts out of Sort when at least four and both truth values remain.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "sortStory": [
      {
        "factId": "tf-demo-03",
        "statement": "The people walked out of Egypt.",
        "isTrue": true,
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "factId": "tf-demo-04",
        "statement": "Moses commanded Pharaoh's army.",
        "isTrue": false,
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "factId": "tf-demo-05",
        "statement": "God provided for his people.",
        "isTrue": true,
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "factId": "tf-demo-06",
        "statement": "The people crossed the sea in wooden boats.",
        "isTrue": false,
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 22. `draw-story` — Large Draw the Story (`preparedActivities.drawStory`)

**4–6 complete, capitalized narrative sentences**, **≤105 characters** each, **ending in appropriate punctuation**. Preserve chronological order and select distinct drawable events. Prefer reusing an accurate, matching Story Order sentence when it fits; original Story Note links are unnecessary.

**Wrong:** Small scene fragments such as `Moses speaking to Pharaoh` in a Large caption, an imperative `Draw Moses…`, missing punctuation, or duplicate captions. This activity prints the captions directly under its own Draw the Story heading.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "drawStory": [
      {
        "prompt": "Moses spoke to Pharaoh.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "prompt": "The people prepared to leave Egypt.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "prompt": "The people reached the sea.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "prompt": "The people crossed on dry ground.",
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 23. `word-search` — Large Word Search (`preparedActivities.wordSearch`)

**4–12 distinct words/phrases**, each **2–12 A–Z letters after removing spaces**. Use only English letters and single internal spaces, no punctuation. Verify actual grid placement and answer checking, not merely the number of entries.

**Wrong:** a 13-letter answer, apostrophes, unsupported accented letters, duplicate entries, or a claim that the grid passed without running the engine.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "wordSearch": {
      "words": [
        "MOSES",
        "PHARAOH",
        "EGYPT",
        "WATER",
        "STAFF",
        "ISRAEL"
      ],
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 24. `verse-cryptogram` — Large Verse Cryptogram (`preparedActivities.verseCryptogram`)

Use the **exact verified canonical BSB memory verse**. Verse **≤145 characters**, at least 3 distinct A–Z letters, reference **≤42**; no accented alphabetic characters, and avoid triple spaces. This example is a placeholder only. The canonical verse should not change for cryptogram fit.

**Wrong:** using the source's non-BSB translation and claiming it's the final BSB, or silently truncating a word. If it cannot fit, return a blocker for teacher review.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "verseCryptogram": {
      "reference": "SOURCE VERSE REFERENCE",
      "verse": "EXACT VERIFIED BSB VERSE GOES HERE",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 25. `crossword` — Large Crossword (`preparedActivities.crossword`)

**6–10 distinct entries**. Answers **3–12 unaccented A–Z letters** (a phrase may have a space in the JSON label, e.g. `RED SEA`; the grid strips it); each clue **1–85 characters** and should have a unique answer. All entries must **actually interlock** in the generated crossword—the validator alone doesn't prove it.

**Wrong:** comma or number in an answer, a clue with several equally plausible answers, repeated answers, or assuming generator success from valid JSON alone. Run the crossword solver.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "crossword": [
      {
        "answer": "MOSES",
        "clue": "The leader who went before Pharaoh.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "answer": "PHARAOH",
        "clue": "The ruler of Egypt.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "answer": "EGYPT",
        "clue": "The land the Israelites left.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "answer": "STAFF",
        "clue": "What Moses carried.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "answer": "ISRAEL",
        "clue": "The people Moses led.",
        "origin": "suggested",
        "teacherReviewRequired": true
      },
      {
        "answer": "WATER",
        "clue": "What parted at the sea.",
        "origin": "suggested",
        "teacherReviewRequired": true
      }
    ]
  }
}
```


#### 26. `spiral-verse` — Large Spiral Verse (`preparedActivities.spiralVerse`)

Canonical verse **1–260 characters**; reference **1–45 characters**. The full text is copied around a handwriting spiral; test printable geometry. The example is not verified Scripture; teacher BSB selection provides the real content.

**Wrong:** paraphrasing, removing words to fit, or using a different text from other canonical-memory-verse activities.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "spiralVerse": {
      "reference": "SOURCE VERSE REFERENCE",
      "verse": "EXACT VERIFIED BSB VERSE GOES HERE",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```


#### 27. `connect-verse` — Large Connect the Verse (`preparedActivities.connectVerse`)

Canonical verse **4–35 words** and **≤260 characters**, with unaccented English A–Z letters. **There is NO blanket 12-letter-per-word limit** here since PR #102; the real Large SVG/PDF measured-box print-fit planner determines whether a long word fits. The reference must agree with the teacher-selected memory verse.

**Wrong:** altering the Scripture wording or rejecting `understanding` solely for being 13 letters. Conversely, schema validity or 35 words alone does not guarantee all boxes will fit; run Review Studio's print-fit preflight.

**Schematic prepared-activity JSON** (replace all illustrative words, IDs and citations with verified lesson-specific data):

```json
{
  "preparedActivities": {
    "connectVerse": {
      "reference": "SOURCE VERSE REFERENCE",
      "verse": "EXACT VERIFIED BSB VERSE GOES HERE",
      "origin": "suggested",
      "teacherReviewRequired": true
    }
  }
}
```



### Preset 4 — complete prescribed booklet layout

The **fourth numbered preset** is built from the same 27 reviewed activity types and existing Small/Medium/Large region geometries; it is **not** a 28th activity type. It uses these exact page assignments (from top to bottom and left to right within each Small pair):

| Page | Region layout | Activities in placement order |
| --- | --- | --- |
| 1 | Existing large cover activity below title | **Crossword** |
| 2 | L, M (`large-medium`) | Large **Word Search**; Medium **Upside Down Verse** |
| 3 | SS, M, M (`small-small-medium-medium`) | Small **Multiple Choice** (left); Small **Draw a Picture** (right); Medium **Pixel Picture**; Medium **Solve the Code** |
| 4 | M, SS, M (`medium-small-small-medium`) | Medium **Match the Words**; Small **True or False** (left); Small **What Doesn't Belong?** (right); Medium **Unscramble the Verse** |

**Source preparation:** Preset 4 needs all eleven modules, including a reviewed crossword with 6–10 interlocking answers and a separate Large Word Search plus Odd Words bank **without repeated printed vocabulary**. There is one Multiple Choice question in Preset 4; the standard six prepared candidates still supply cross-preset alternatives. Review Studio preflight verifies **all four** numbered presets and blocks approval if any one cannot be filled. Do not confuse a passing `27/27` module count with successful construction of every numbered preset.

## 5. BSB and Scripture rules

The project has a versioned local BSB corpus at `public/bible/bsb.txt`, verified by `npm run verify:bsb`. Sources are explained in [`docs/BSB-CORPUS.md`](BSB-CORPUS.md). The teacher **chooses and verifies** the final BSB passage in Review Studio.

A conversion chat should:
- Retain the verse reference and text **exactly as the supplied curriculum presents them**, labeling the actual original translation truthfully.
- Never replace source wording with a guessed paraphrase and label it BSB.
- Distinguish Scripture verse text from bracketed blanks, teacher editorial instructions, and copyright/source evidence.
- Never invent BSB verification. If the final verse excerpt is not verified, leave the publication pending and require teacher BSB selection.
- Avoid modifying Bible text merely to make a puzzle fit. Report the limitation and let Review Studio/generator choose a valid excerpt or alternative activity.
- Note that the **teacher-edit input caps** for the canonical Big Idea and Memory Verse are 62 and 145 characters, respectively, but those alone do **not** guarantee that every linked activity will fit.

## 6. Printable content, optional provenance and validation

A conversion is not “approved” just because it contains all expected JSON keys or 27 nonempty activity records.

- **Required for good worksheets:** clear teaching content, accurate TRUE/FALSE keys, matching `factId` statements and truth values, one correct answer per Multiple Choice question, valid word banks, viable puzzles, correct chronological events and measured printable fit.
- **Required for final publication:** an issue-free Review Studio preflight for 27 activity types and all four numbered presets, plus real teacher signoff, verified local BSB selection and independently confirmed Scripture-rights evidence.
- **Source provenance is optional:** `sourceFiles`, `storyNotes`, `questions`, `sourceIds`, page citations, legacy `moduleReadiness` and converter `validation` logs are not approval prerequisites. A source-rich draft may keep real originals in its working review session, but Review Studio's compact approved export intentionally drops the historical audit trail.
- **Editorial decisions still matter:** label truly sourced text `source`, faithful rewrites `adapted` and new distractors/phrases `suggested`. Mark teacher-dependent content `teacherReviewRequired:true`; flag genuine age/theology concerns in your handoff rather than inventing a metadata blocker.
- **Never invent validation evidence:** claim a generator test, BSB verification or preset pass only after running that exact check. Report anything you cannot run as `NOT RUN`; do not add a fake `moduleReadiness[]` inventory or claimed `validation.passed` to make a draft appear complete.
- **Never approve for the teacher:** do not set `publication.status:"approved"`, `publication.approved:true`, `teacherSignoff` or `scriptureRights.status:"cleared"` in conversion output. Review Studio is the approval and BSB confirmation interface.

## 7. Worked sample and real full reference

**Start new conversions** with the [compact content-first unapproved example](../curriculum/examples/lesson-v1-content-first-unapproved.example.json). Its correct JSON structure shows printable fields and deliberate placeholders **without** original-document provenance. It is intentionally incomplete, has fewer than 27 activities, has not passed print preflight and is **not** approved for publication.

For examples of older field shapes, the [legacy unapproved starter](../curriculum/examples/lesson-v1-unapproved.example.json) and the [source-rich approved OT31 lesson](../curriculum/approved/ot-031-god-parts-the-red-sea.lesson.json) remain useful references. They are **not** a request to copy source IDs, original questions, validation histories, review signoff, Scripture text or rights clearance into a new lesson. Never copy their old duplicate fact selection patterns into a new candidate.

## 8. Mandatory pre-delivery verification for the conversion chat

**Run this checklist on the actual JSON being delivered.** A schema-valid record may have unusable activity wording, wrong answer keys, impossible grids, or missing Scripture verification. Source links are optional; never declare all 27 activities passed merely because the keys exist.

### Content and structure — check every item

- [ ] The file parses as exactly one JSON object with no comments, trailing commas, duplicate keys, unsupported field names or surrounding Markdown.
- [ ] `schemaVersion:1`, exact top-level section names, registered module IDs, camelCase `preparedActivities` keys, and arrays/objects are all correct.
- [ ] The written **printable** teaching content reflects the supplied Bible lesson. Source filenames/pages/Story Note IDs are **optional**; never invent claims.
- [ ] Printed Important Idea and answer keys are accurate; the memory verse is ready for teacher BSB verification. Historical `storyNotes[]` and original `questions[]` need not be copied to a content-first file.
- [ ] Every `characters[].clues[]` item is an object with `text` and `origin`, never a bare string.
- [ ] Small drawing: each `drawingPrompts[].prompt` and `preparedActivities.drawPicture.prompt` naturally completes **“Draw a picture of …”**, is ≤105 characters, and has no imperative prefix, final period, or full past-tense sentence. Large drawing: 4–6 full, capitalized, punctuated, nonduplicate narrative sentences in chronological order, ≤105 characters each.
- [ ] Canonical facts: default to **about 14 meaningful facts** (7–8 TRUE, 6–7 FALSE), with no padding or hard cap; all prepared Sort/True-False/Maze selections have existing, **unique** `factId` values, *exact* canonical `statement` and `isTrue`, 115/80/65 character budgets and both truth values in Sort. No silent shortening of an original fact.
- [ ] Multiple Choice: default to **six high-quality prepared questions**, explain warranted deviations; each question ≤105 characters, exactly three distinct choices ≤42 characters, one true flag and `correctAnswer` matching the correct choice. Original `questions[]` archival records are optional.
- [ ] Odd Words: 1–5 related, 1–5 unrelated, **6–10 total**, each entry ≤12 characters, no duplicates. Checkboxes: 1–5 per side, one/two words ≤14 characters, no duplicates or unnecessary overlap with selected Odd Words decoys.
- [ ] Unscramble the Words: **exactly two** distinct actually scrambleable answers, each 3–10 **total** letters across one/two words.
- [ ] Who Am I: a descriptive clue ≤120 printable characters and a 1–14-letter answer, without a pointless repeated trailing question.
- [ ] Match Words: 3–6 clear pairs, no commas within cells, unique right and left labels ≤22 characters. Word searches: correctly sized A–Z-only words/phrases, no duplicates.
- [ ] Pixel Picture: 30–85 printable characters, permitted English characters/punctuation, words ≤18 characters, a repeated letter, and **no claimed manually selected shape**.
- [ ] Circle the Mistakes: 1–8 deliberate errors, `mistakeCount` matching `mistakes.length`, each incorrect substring visibly present in the paragraph, and a verified truthful correction.
- [ ] Finish the Story: coherent paragraph ≤1,100 characters with 6–12 single-word `[blanks]` ≤16 characters each. Original Story Notes and emphasized words are **not required** in the compact file or as blank selections.
- [ ] Story Order: 5–8 source-grounded events ≤115 characters, stored in real chronological order; student shuffle happens only in the renderer.
- [ ] Solve the Code: ≤62 characters with 3–18 distinct A–Z letters; **do not rewrite** the canonical Big Idea to make it fit. Connect the Big Idea: 4–20 words, ≤125 characters, **≤12 letters per word** (this cap does **not** apply to Connect the Verse).
- [ ] Prepared verse text/reference matches the teacher-selected canonical memory verse **exactly**; bracket removal reconstructs the verse with identical punctuation, case and spacing. Finish Verse: 2–8 blanks, passage ≤300 chars. Unscramble Verse: 4–8 blanks, passage ≤240. Each bracketed answer ≤9 letters; reference ≤38.
- [ ] First Letters: 3–75 verse words, reference ≤32. Upside Down: ≤160 letters/240 chars, reference ≤42. Verse Cryptogram: ≤145 chars, reference ≤42. Spiral: ≤260 chars, reference ≤45.
- [ ] Connect the Verse: 4–35 words, ≤260 characters, unaccented A–Z, and **measured print fit**. There is **no automatic 12-letter word rejection**. Never alter Scripture to improve the fit.
- [ ] Crossword: 6–10 unique A–Z 3–12-letter answers, clues ≤85 characters, and **actual crossword generation/interlock** verified where executable.
- [ ] All 27 prepared module types contain valid printable content; teacher-review flags may identify real teaching or sensitivity concerns. Historical `moduleReadiness[]` isn't required.
- [ ] Canonical BSB text has not been guessed and no rights clearance, review approval or successful test claim has been fabricated. `publication` remains pending/unapproved.

### Validation matrix — what the commands really prove

| Stage | Procedure | Can confirm | Cannot confirm |
|---|---|---|---|
| A. JSON syntax | Parse the exact file with a JSON parser | JSON is readable | Schema, truth, puzzles |
| B. Candidate schema and semantic checks | `node --experimental-strip-types scripts/validate-curriculum.mjs /absolute/path/to/candidate.json` in a current repo checkout | Actual printable fields pass schema and answer/content consistency checks | All puzzle solvers, measured print fit, teacher approval |
| C. Existing repo files | `npm run validate:curriculum` and `npm run validate:library` | Review/approved files already scanned in that checkout | An *external candidate file* not included in that scan |
| D. Repository tests | `npm test`, `npm run verify:bsb`, `npm run build` | Existing tests, checked-in data, build and local BSB integrity | That a new external JSON or its verse was verified |
| E. Candidate activity and print checks | Upload the candidate to Review Studio, **Run preflight checks**; inspect all four numbered worksheet presets and the actual puzzle engines | 27/27 and all four presets are technically ready **if issues list is empty** | Narrative accuracy, rights and teacher approval |
| F. Teacher approval | Teacher reviews claims, BSB excerpt/terms and final signoff inside Review Studio | Authorized teacher-approved export | Permission for a converter to infer approval |

When preflight says **0/27 because of schema errors**, **no activities were attempted**. Correct the structural schema errors first and rerun to see the remaining content/print issues. Even **27/27 converted** does not mean success if there are other preflight issues. If you cannot run a stage, report **NOT RUN**; do not infer a pass from a different stage.

**Commands for a local checkout** (the first line is the only listed command aimed explicitly at an external candidate):

```bash
node --experimental-strip-types scripts/validate-curriculum.mjs /absolute/path/to/candidate.json
npm run validate:curriculum
npm run validate:library
npm test
npm run verify:bsb
npm run build
```

Do not copy an unapproved draft to `curriculum/approved/` just to run tests. Neither the starter nor the historical OT31 lesson is evidence that **your** newly created file passed.

### Required final handoff report (outside the JSON)

Supply the unapproved JSON as its **own file**, plus a concise report with these six headings:

1. **Lesson material used:** briefly identify the Bible lesson and any factual uncertainty; **no source-ID inventory required**.
2. **Print-content decisions:** summarize meaningful teaching adaptations, correct answers and factual questions still requiring teacher review.
3. **Activity coverage and counts:** a 27-row table with module ID/prepared key, present/missing and generator tested/not tested. Report **TRUE canonical facts, FALSE canonical facts and prepared Multiple Choice question counts** and explain deviations from normal targets.
4. **Verification evidence:** JSON parse, exact candidate schema command/result, 27/27 printable preflight, puzzles/layouts, all four presets and BSB verification. Mark unrun checks **NOT RUN**. Source-ID matching is not a check.
5. **Teacher decisions:** suggested facts/decoys, wording, theology, overlong passages, BSB verification and rights review—not missing source links.
6. **Publication status:** `pending-teacher-approval`, `approved:false`, no copied signatures, no implied source/rights clearance.

If any required gate fails, correct the data or report a precise blocker; never substitute a reassuring summary for a test result.

### Reading approval evidence in a content-first Review Studio export

For **new compact approved files**, Review Studio keeps the printable `facts`/alternatives, `preparedActivities`, lesson identity, verified BSB and publication evidence. It omits the historical `sourceFiles`, `storyNotes`, original `questions`, `sourceIds`, `moduleReadiness`, `validation`, `reviewFlags` and conversion-status metadata. Keep a **separate review-session export** if you need the original imported working material or checked-off review tasks; the final approved file is not a backup of that session.

The current teacher preflight evidence belongs to `publication.reviewStudioVerification` and reflects the actual issue-free **27/27** activity check and **four numbered preset** checks performed by Review Studio. It is not a claim that independent Node commands or PDF exports ran. `publication.teacherSignoff` and `publication.scriptureRights` are independent human decisions; never synthesize either in a conversion chat.

**Legacy approved source-rich files still load unchanged.** Their old `validation.checks[]`, `moduleReadiness[]` and optional original conversion notes may document earlier unsuccessful or unrun checks. Do not rewrite those historical records to invent passes. When discussing a legacy file, distinguish its historical converter audit from current Review Studio publication evidence. Both `matchingPairs[]` (usable alternative pool) and `preparedActivities.matchWords[]` (selected printable pairs) remain meaningful printable content and should not be blindly overwritten to match each other.

## 9. Teacher workflow: direct upload to main is supported

You can keep the familiar, simple workflow:

1. Ask the conversion chat to read **this guide**, the current schema and the **compact content-first unapproved example**, then supply the actual lesson ODT/DOCX and optional slides. OT31 is a legacy example, not the template for required source metadata.
2. Open the draft JSON in [Review Studio](https://andydoane.github.io/worksheet-generator/review.html).
3. Review and correct data, choose and verify BSB, complete the teacher checklist, and run preflight until **27/27** converted and no schema/content/preset issues remain.
4. Sign off and confirm the separate Scripture-rights checkbox. Download the **approved** `<id>.lesson.json`.
5. On GitHub navigate to `curriculum/approved/`, choose **Add file → Upload files**, and commit the file **directly to `main`** if that is your preferred workflow. You do not need to create a branch for routine uploads.
6. Check the repository's **Actions** tab. If a check fails, the change is already on `main`, so fix/re-upload the JSON (or revert that commit). A failed build is not a passing publication. The last successful deployment generally remains available until a corrected deploy succeeds.

**A branch and PR is optional** for routine curriculum uploads, but it is useful if you want GitHub to test before touching `main`. No branch protection is required by this guide. See [`curriculum/PUBLISHING.md`](../curriculum/PUBLISHING.md) for click-by-click instructions.

## 10. Recurring issues and why they happened

| Incident | Root cause | Now prevented by |
|---|---|---|
| OT18 review flag failed CI | `circle-the-mistakes` is not a registered module ID | Same schema checked in Review Studio and CI, plus explicit confirmed alias correction |
| OT20 and OT21 validation summaries failed CI | `validation.checks[].name` used instead of required `check` | Shared schema check and confirmed metadata-only rename |
| OT21 word banks showed 25/27 | Six story-related/correct words where max five allowed | Review Studio two-sided word-bank editing and converter checklist |
| Unscramble editor demanded "Keep these two" repeatedly | More than two prepared answers | Two default choices with recoverable alternatives, plus future conversions specifying exactly two |
| Connect the Verse rejected "understanding" | Former blanket 12-character word limit | [PR #102](https://github.com/andydoane/worksheet-generator/pull/102) merged and issue #95 closed; real print fit is now measured |
| OT30 blocked preflight at 0/27 | Seven string character clues instead of `{text,origin}` objects, plus separate overlong/missing True/False fact references | One-confirmation schema repair, source-preserving fact adaptation/move, and explicit converter examples and audits |
| GitHub `main` workflow failed after direct upload | Direct-to-main commits execute CI *after* upload | Full schema check before Review Studio approval; GitHub CI still independently runs and can catch later issues |
| Source-only metadata blocked an otherwise printable curriculum review | Older approval logic required source IDs and converter histories | [PR #111](https://github.com/andydoane/worksheet-generator/pull/111) makes printable content, truth keys, BSB, teacher review and four presets authoritative; original-document links are optional |

## 11. Copy-ready opening instruction for a new conversion chat

> I am preparing an **unapproved, content-first** Bible curriculum JSON file for Worksheet Studio (PR #111 / v0.16.63). Before generating it, reread the [current Curriculum Conversion Guide](https://github.com/andydoane/worksheet-generator/blob/main/docs/CURRICULUM-CONVERSION-GUIDE.md), [schema-v1](https://github.com/andydoane/worksheet-generator/blob/main/curriculum/schema/lesson-v1.schema.json), [compact content-first example](https://github.com/andydoane/worksheet-generator/blob/main/curriculum/examples/lesson-v1-content-first-unapproved.example.json), and the §4 recipes for **all 27 activities**. I will supply the actual lesson and optional slides. Use those sources for accurate printable content, but do **not** require original `storyNotes`, `questions[]`, `sourceFiles`, `sourceIds`, page citations, old readiness inventories or source-archiving reports. Preserve meaningful `facts`, `preparedActivities` and alternative `vocabulary`, `characters`, `drawingPrompts`, `matchingPairs` and `keyPhrases`. By default aim for **about 14 worthwhile canonical facts (7–8 TRUE, 6–7 FALSE)** and **six prepared Multiple Choice questions**, without filler. Keep canonical `factId` / statement / truth links exact, unique assignments for Sort/True-False/Maze, three choices with one right answer, correct story order and measured print-fit limits. Use all four numbered presets as validation targets. **Do not** invent BSB text, teacher approval, rights clearance or a successful test run. Deliver the unapproved lesson JSON and a concise 27-activity verification/teacher-review handoff, marking checks you could not run **NOT RUN**. The teacher will verify Scripture, resolve content decisions and authorize publication in Review Studio.

---

**Guide maintenance:** Future PRs changing module identifiers, schema fields, validators, prepared formats, source/rights behavior, or publishing steps should update this guide and the example in the **same PR**. The schema and executable validators remain the final authority.
