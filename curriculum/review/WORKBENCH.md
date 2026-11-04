# Curriculum Review Studio (unlisted page)

**Purpose:** Approve a schema-v1 lesson without reviewing its entire JSON source. This is an
authoring utility; it does **not** publish, deploy or update the repository.

After this PR is deployed, open:
https://andydoane.github.io/worksheet-generator/review.html

The URL is intentionally absent from the main app's navigation. This is **not**
authentication: GitHub Pages and this public repository are visible to anyone who knows
the URL. Only repository collaborators have permission to commit changes.

## Getting started

1. Open the review URL. Click **Load Red Sea lesson from GitHub**, or choose a
   `curriculum/review/*.json` file saved on your computer.
2. The tool lists review tasks, including **drawing-scene and caption review**, suggested incorrect multiple-choice answers,
   deliberately false facts, the adapted Finish the Story paragraph, the Circle
   the Mistakes paragraph and corrections, suggested unrelated vocabulary,
   age-suitability wording, the Important Idea wording, and Scripture.
3. In **Drawing activities**, check Small scene phrases (used after "Draw a picture of") separately from Large **Draw the Story** complete narrative captions. The buttons can normalize legacy Small "Draw ..." instructions or explicitly copy source-linked, approved Story Order sentences into Large captions. Each caption is editable; the source-note text appears alongside it. Re-run preflight after edits. The original Story Notes never change.
4. Edit and mark each review task as reviewed. False-fact edits are propagated
   to every matching Sort/True-False module reference. The Important Idea
   is likewise kept consistent between its two puzzle activities.
5. In **BSB memory verse**, look up a single verse or a short verse range in the
   official Berean Standard Bible. Choose **first word** and **last word** of
   the exact excerpt, including a second verse if desired. Select the words
   that should be blanks in the two verse-completion puzzles. Click **Apply**
   and then **Mark reviewed**.
6. **Run preflight checks**. Individual issues are clickable: choose one to jump directly to the relevant editor field. The conversion count is shown once as a summary. Finish the Story may have 6–12 blanks, retaining the original emphasis words in order while allowing extra words. For Solve the Code, choose a short reviewed key phrase separately from the original Important Idea; its key supports at most 18 unique letters. It checks all 27 module candidates and module
   validators. It does not replace the official schema, real puzzle-engine,
   and recipe validation in GitHub CI.
7. Download a **review session** to carry edits AND checked-off items across
   browsers and devices. Ordinary workbench progress is autosaved in the
   current browser only.
8. After all decisions and preflight pass, enter your actual reviewer name/date
   and check the official BSB text/source/terms confirmation. Review Studio
   records this **individual lesson's Scripture-rights clearance** separately
   from the curriculum teacher signoff in the downloaded approved file.
9. Download **one approved lesson JSON** (`<id>.lesson.json`). In one GitHub
   PR, upload it to `curriculum/approved/<id>.lesson.json` and remove any
   existing review-stage JSON with the same ID under `curriculum/review/`.
   No manual rights-manifest import or export is necessary. Wait for CI to pass,
   inspect the worksheet PDFs and then merge. See [the full publication guide](../PUBLISHING.md).

You can always download an unapproved working JSON and defer decisions. Loading
a different lesson prompts before replacing your in-browser working copy.

## Scripture data provenance

- **Translation:** Berean Standard Bible (BSB), current 3rd Printing listed by
  publisher: https://berean.bible/downloads.htm
- **Official plain text:** https://bereanbible.com/bsb.txt
- **Public-domain dedication:** https://berean.bible/terms.htm
- Berean Bible and Majority Bible entered the public domain on 30 April 2023.
- The GitHub Pages build downloads and validates `bsb.txt` into
  `public/review/bsb.txt`, which Vite publishes only as a static corpus.
  This corpus is not imported into the public worksheet editor.
- The export uses **verbatim contiguous BSB text**, including punctuation,
  chosen from official verse boundaries and first/last word clipping.
  A custom display reference can clarify half-verses (e.g. 11b–12a), but
  teachers should verify the label carefully.
- The original ODT source references remain in the JSON. The public approved
  JSON's memory verse and all seven derivative verse activities are rewritten
  to BSB so original ESV memory-verse wording is not redistributed there.
- Only the built-in BSB text is provided as public-domain Scripture. No
  additional Scripture translations or text-editing tools are introduced.

## Privacy and authoring limitations

- The review page cannot write to GitHub; there are no access tokens or write
  API calls. GitHub PR creation remains a separate manual process.
- Imported files and edits stay on the device. Optional GitHub **read-only**
  access loads the public Red Sea lesson using GitHub raw file hosting.
- Local browser autosave is not cross-device sync. Export/import a review
  session to continue from another device.
- Unlinked public URLs are discoverable. Never upload private credentials,
  student information or content you cannot disclose to a public service.
- This first version intentionally handles word-bounded excerpts of up to
  twelve verses; unusually complicated cross-reference selections should be
  prepared as separate editorial cases rather than fabricated automatically.
- Teacher signoff is separate from the validated BSB rights evidence, and
  CI's `npm run validate:library` is the authoritative final technical gate.
