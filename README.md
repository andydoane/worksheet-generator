# Worksheet Studio

A browser-based editor for four-page Bible story worksheet booklets.

## PR 8b — Cryptograms and improved True/False Trek

**Large Verse Cryptogram** and **Medium Big Idea Cryptogram** now use one shared
deterministic substitution engine. Each letter A–Z maps to one of 26 unique
**pigpen-style vector symbols** (drawn with line strokes and dots instead of
depending on a symbol font or emoji). A regenerated seed scrambles the
letter-to-symbol mapping. The two-row key shows symbols above their letters,
lists **only used letters**, and sorts the letters alphabetically. Above
each encoded symbol is a line for the child to write the decoded letter.
Punctuation, spaces and numbers stay visible as originally entered.

The Verse Cryptogram has a Scripture reference beneath the code; the
Big Idea Cryptogram deliberately has no reference. Editors prefill content
from Lesson details, where available. Long content is rejected rather than
silently clipped: 145 characters maximum for verses and 62 for Big Ideas,
with a smaller unique-letter key limit for medium modules.

**True or False Trek** now has **IN at the bottom middle**, **TRUE on the
left**, and **FALSE on the right**. It is still a 35×14 randomized
depth-first maze with verified correct routes and two reachable exits.
The generator now evaluates 24 reproducible candidates and chooses one
with shorter, more balanced routes. Moving labels alone would not have
guaranteed shorter walks; the entrance and path checks changed too.

No symbols or answer paths are rasterized. Existing lesson data, booklet
imposition, Zilla Slab Bold, and previous modules are preserved.

Run `npm run sample:pr8b` for two example booklets in `artifacts/`.
CI also checks glyph uniqueness, symbol bijection, stable regeneration,
maze entrances/exits and correct routes, and complete PDF export.

Deferred: teacher answer-key PDFs and final optical layout polish.

## PR 7 — Word Search and True or False Maze

Two seeded puzzle engines use the **same generated puzzle data** for the browser preview,
PDF, and automatic solution checks. Regenerating one module does not change any other
module or rearrange existing saved content.

**Large — Word Search:** 12 columns × 10 rows. Enter **4–10 distinct words**,
one per line, using A–Z and 2–12 letters each. Words are placed horizontally,
vertically or diagonally, never backwards. All words are actually placed and
checked against their recorded solution coordinates; a seeded backtracking
algorithm rejects an impossible set instead of silently dropping words.
The printed worksheet uses **Zilla Slab Bold** for grid letters and provides
the word list below the grid.

**Medium — True or False Trek!:** A genuine randomized **35×14-cell maze**
with an entrance on the left, an exit on the right, and another on the
bottom (middle-right). Enter a statement **and its correct true/false answer**.
The generated maze is a connected perfect maze; both exits are accessible,
but students must take the exit marked with the correct answer. The engine
runs a solver over the maze walls and verifies the correct route. Changing
the answer affects which exit is correct, never the wall geometry for a
given statement and seed.

Use **Regenerate puzzle** on each module to get a different repeatable puzzle.
Use **Show puzzle solution** in the editor to highlight the word-search
placements or the maze's correct route and answer. **No solutions appear
in the student PDF.** A future teacher-answer-key PR can reuse this data.

Tests check generated grid dimensions, words placed in valid directions,
maze wall symmetry, full connectivity, both exits, shortest correct route,
seed reproducibility and independence, validation errors, and two-page
vector PDF export.

Run `npm run sample:pr7` to generate two sample puzzle booklets in
`artifacts/`. CI uploads those with earlier example PDFs.

**Still deferred:** final optical centering, balanced line wraps,
decorative graphics, answer-key PDFs and an interactive student-solving
game (the student worksheet is printed and completed by hand).

## PR 6 — Story and verse activities

Six new modules, all with editable content, browser previews, saved assignments,
and vector PDF output:

| Activity | Size | Input | Worksheet |
|---|---|---|---|
| Story Order | Large | 5–8 chronological events, one per line | Shuffled bordered events with number circles |
| Sort the Story | Large | 4–8 statements ending in true/false | Shuffled lettered bank and True / False answer boxes |
| Draw the Story | Large | 4–6 prompts | 2×2 or 3×2 drawing panels with captions |
| Finish the Verse | Medium | Reference + verse with 4–8 [bracketed] words | Two-row word bank and letter-height writing squares |
| Unscramble the Verse | Medium | Reference + verse with 4–6 [bracketed] words | Blank writing lines above scrambled letters |
| Circle the Mistakes | Medium | Paragraph + number of errors | “Circle all X mistakes!” above the text |

**Match the Words refinement:** the right column is now fully deranged, so
none of the shuffled answers remains directly opposite its corresponding
left-hand word. This applies to the web preview and PDF.

The memory verse and reference from **Lesson details** are prefilled when
you first create a verse module, ready for you to bracket the missing words.
Previously saved drafts and module assignments remain compatible.

Invalid or overflowing content is rejected with an error rather than silently
clipped. This preserves existing inch-based margins, the three project fonts
(including Zilla Slab Bold in PDFs), and outside 4 | 1 / inside 2 | 3 booklet
imposition.

**Deferred:** teacher answer keys, optical centering, balanced wrapping, and
decorative illustration polish. Sort the Story retains true/false flags for an
eventual answer key; Circle the Mistakes captures only the number, as specified.

Run `npm run sample:pr6` to create two demonstration booklets in
`artifacts/`. GitHub Actions runs tests, builds, and uploads samples on PRs.

## PR 5 — All eight small modules

Small sections now support all eight activities from the original module specifications:

| Small activity | Inputs | What children see |
|---|---|---|
| Draw a Picture | Drawing prompt | Empty drawing frame and “Draw a picture of…” |
| Multiple Choice Question | Question, one correct answer, two incorrect answers | Three shuffled answers, each with an empty checkbox |
| True or False Questions | One statement | “True or False?”, statement, thumbs-up and thumbs-down icons to circle |
| First Letter Challenge | Scripture reference and verse | Instruction, reference and uppercase verse initials in Zilla Slab Bold |
| What Doesn't Belong? | Up to five related and five unrelated words, one per line | A mixed two-column word bank to scribble out unrelated words |
| Unscramble the Words | Two words (3–10 letters each) | Two scrambled letter sequences with writing lines above each letter |
| Checkboxes | Up to five story and five unrelated words | Two columns of mixed words with empty checkboxes |
| Who Am I? | Character clue and answer | Clue, “Who Am I?” and one answer blank per letter |

Click a **Small** activity region and open the **Activities** tab to choose an activity. The editor provides activity-specific fields and validation messages. Matching, word lists, answer options and scrambles use saved deterministic shuffle seeds; changing unrelated text does not reshuffle puzzles. Click **Shuffle** to regenerate an eligible activity.

The browser preview and PDF use the same derived answer orders and text transformations. PDFs remain exactly **two landscape US Letter pages** in booklet order (outside: 4 | 1; inside: 2 | 3), and the Zilla Slab Bold compatibility fix from PR 4.1 is preserved.

**Limits:** Small regions measure 2.4 × 2.6 inches and have 0.1-inch internal padding. Longer content is validated or rejected instead of silently clipping. The original specification mentions 6–12 total words for What Doesn't Belong but also limits each of the two input lists to five words; this version supports 6–10 total words, honoring the per-list limits. True/False only needs a statement as specified; answer keys are a future milestone.

### Review samples

Run `npm run sample:pdf` to produce **two** demonstration booklets in `artifacts/`:
- `sample-bifold-booklet.pdf`: Multiple Choice, True/False, First Letter Challenge, What Doesn't Belong, Unscramble, Checkboxes; also existing matching and story modules.
- `sample-small-modules-b.pdf`: Who Am I?, Draw a Picture, plus existing matching and story modules.

The GitHub Actions workflow runs all layout, PDF, font and module tests, checks TypeScript, builds the website, and uploads both sample PDFs as a downloadable artifact on pull requests.

## Earlier releases

PR 4 introduced the typed module registry and three activities: Small Draw a Picture, Medium Match the Words, and Large Finish the Story. Module assignments and lesson fields save in the browser, with a per-page layout selector and PDF export.

PR 4.1 fixed Zilla Slab PDF embedding by reserializing the original complete TrueType font. The original remains the browser font; the normalized copy is embedded in PDFs (both are covered by the SIL Open Font License).

PRs 1–3 established the React/Vite/TypeScript editor, inch-based booklet layout, and a vector PDF download.

## Printing

Download the generated PDF, open it in a PDF reader, and select US Letter, landscape, **Actual size / 100%**, duplex printing, **flip on short edge**. Fold the sheet vertically. Printer options may vary: check a test sheet when possible.

## Local development

Node.js 22.12 or later:
1. `npm install`
2. `npm run dev`
3. `npm run test`
4. `npm run build`
5. `npm run sample:pdf`

GitHub Actions builds on pull requests and deploys on a push to `main` when **Settings → Pages → Build and deployment → Source** is set to **GitHub Actions**.

Deployed site: https://andydoane.github.io/worksheet-generator/

No server, paid API, or account is needed. Worksheet drafts reside in browser localStorage, not in GitHub.
