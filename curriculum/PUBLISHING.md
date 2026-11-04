# Publishing a new Bible lesson (one-file workflow)

**No shared rights manifest or manual list of lesson IDs is required.** Vite automatically discovers every `curriculum/approved/*.lesson.json` file when the application builds. Each approved lesson contains its own teacher approval and separately confirmed BSB Scripture-rights record.

## 1. Prepare the review-stage JSON

1. Convert your ODT curriculum lesson (and optional ODP slides) into a **schema-v1** JSON file using the current [curriculum schema](schema/lesson-v1.schema.json) and the [approved OT31 example](approved/ot-031-god-parts-the-red-sea.lesson.json).
2. Do not mark the conversion approved or fabricate review decisions. Preserve original Story Notes and emphasized words, provenance (`sourceIds`), factual truth, adapted vs. suggested labels, and teacher-review flags.
3. Save the conversion report and the teacher checklist. The JSON can remain on your computer; adding a draft to GitHub's `curriculum/review/` is optional. Do **not** add unapproved JSON to `curriculum/approved/`.

## 2. Complete your review

1. Open [Curriculum Review Studio](https://andydoane.github.io/worksheet-generator/review.html).
2. Upload your latest **working lesson JSON** (or saved review session with review checkmarks).
3. Review all flagged activities, suggested distractors, drawing captions, Finish the Story blanks, and the separate Solve the Code phrase. Click **Mark reviewed & continue** for each task after checking it.
4. Select the official BSB memory verse or excerpt using **BSB memory verse**. Apply it to all Scripture activities; check reference, punctuation and suitability. The app uses the official `bsb.txt` prepared for the Review Studio.
5. Click **Run preflight checks**. Fix the clickable errors until the report says **27/27 activity types converted** with **no issues**. Preflight also attempts all three numbered worksheet presets and reports failures before signoff. Export a working/review-session JSON at any earlier point if you need to pause; it remains unapproved. GitHub CI still independently checks the complete schema, rights and printable modules.
6. In **Final publication signoff**, enter your name and approval date, then check the **one** checkbox confirming you checked the official BSB public-domain terms and verified the exact text. This confirmation records **Scripture-rights evidence inside this lesson's `publication.scriptureRights`**, separate from `publication.teacherSignoff`.
7. Click **Download approved lesson JSON**. The filename must be `<lesson-id>.lesson.json`. This is **the only file** you need to upload for publication. Do not manually set `approved:true`, invent a clearance, or edit the official BSB text.

## 3. Add the approved file through GitHub

1. In the repository, open [`curriculum/approved/`](https://github.com/andydoane/worksheet-generator/tree/main/curriculum/approved).
2. Choose **Add file → Upload files** and select the downloaded `<lesson-id>.lesson.json`. Its basename must match the internal JSON `id` exactly (for example, `ot-032-god-provides-in-the-wilderness.lesson.json`).
3. Commit to a **new branch**, not directly to `main`, and create a pull request. You do **not** need to delete an existing pending review-stage JSON with the same ID: CI validates it separately, and only the approved lesson is included in the public catalog. Review-stage files must stay unapproved. Keep conversion reports/checklists for historical reference.
4. Wait for GitHub Actions to run `npm test` and `npm run build`. CI scans `curriculum/approved/` automatically and rejects missing/malformed source data, unsigned approval, missing or invalid embedded rights clearance, unverified BSB provenance, invalid modules, broken puzzle engines, duplicate IDs **within a publication stage**, and any numbered preset that cannot be built. Tests discover the approved lesson set dynamically rather than assuming a fixed number.
5. Review the PR diff and the Actions **sample-bifold-booklet** PDF artifact. Existing sample PDFs may use OT31; for a newly added story, also inspect its own generated booklet in a local preview or after deployment. Pay attention to prose fit, picture captions, variety, and print layout.
6. Merge the PR after tests and editorial review pass. GitHub Pages deploys from `main` using the deployment workflow. The new story appears automatically in **Choose a Bible Story** after the deploy completes—no hard-coded registration or separate rights file.

## Publication gates (intentional)

- Merely placing a JSON file in `approved/` does **not** authorize publication.
- A lesson requires `publication.status:'approved'`, `approved:true`, explicit `teacherSignoff`, all teacher-approval flags resolved, and a distinct `publication.scriptureRights` object with `status:'cleared'`, a substantive `basis`, `reviewedBy` and ISO `reviewedOn`.
- Its memory-verse content must use verified BSB text, with the official source/terms URLs. These restrictions are checked independently by schema/semantic validation, CI readiness auditing and the runtime public-catalog guard.
- Review-stage files and historical fixtures remain excluded from public Vite imports.
- The expected workflow stays the same for the 2nd or 123rd lesson: **review → one approved JSON → new GitHub PR → CI → merge**.

**Useful checks for developers:** `npm run validate:curriculum`, `npm run validate:library`, `npm test`, `npm run build`. The library report is written to `artifacts/curriculum-readiness-report.{json,md}`.
