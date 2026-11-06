# Publishing a new Bible lesson (one-file workflow)

**No shared rights manifest or manual list of lesson IDs is required.** Vite automatically discovers every `curriculum/approved/*.lesson.json` file when the application builds. Each approved lesson contains its own teacher approval and separately confirmed BSB Scripture-rights record.

## 1. Prepare the review-stage JSON

1. Convert your ODT curriculum lesson (and optional ODP slides) into a **schema-v1** JSON file using the [step-by-step conversion guide](../docs/CURRICULUM-CONVERSION-GUIDE.md), current [curriculum schema](schema/lesson-v1.schema.json), [unapproved example](examples/lesson-v1-unapproved.example.json), and [approved OT31 reference](approved/ot-031-god-parts-the-red-sea.lesson.json).
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

## 3. Upload the approved lesson directly to main (simplest workflow)

A teacher who is comfortable uploading files directly to GitHub **does not need to create a branch or PR** for ordinary approved lesson uploads. The curriculum converter guide and Review Studio now share the same structural schema rules as CI, so most field-name/enum mistakes can be caught **before** upload.

1. Only after Review Studio preflight and final teacher/rights signoff succeed, download `<lesson-id>.lesson.json`. Never upload the unapproved starter or a saved Review Studio session to `curriculum/approved/`.
2. Open [`curriculum/approved/`](https://github.com/andydoane/worksheet-generator/tree/main/curriculum/approved) in GitHub.
3. Choose **Add file → Upload files**. Select your approved `<lesson-id>.lesson.json`. Its basename must match the internal `id`. To update an existing file, use GitHub's file-editing/replacement workflow for that same filename (do not add a second differently named copy).
4. At the bottom, choose **Commit directly to the main branch** and confirm. No branch or merge is necessary.
5. Open the repository's **Actions** tab and inspect the latest **Check and deploy GitHub Pages** run. Green means curriculum validation, puzzle tests, BSB integrity and production build passed, and the site deploy job completed successfully. An approved lesson appears in the public story picker after the deployment finishes.
6. **If Actions turns red**, the upload is **already committed to main**. Open the failed job to see the exact lesson ID, JSON path and validation error. Repair and re-upload the file under the same path, then check Actions again. Alternatively revert the offending GitHub commit. Do not consider a red run successful publication.

**Tradeoff:** Direct-to-main is easier, but GitHub cannot prevent a bad file from being committed before its checks run. Review Studio's schema gate greatly reduces this risk, but it cannot guarantee there will never be a generator, rights, or repository-level failure.

### Optional: pull-request workflow

If you prefer to test **before** touching production, choose **Create a new branch** on the upload screen instead, open the offered pull request, and merge only after its Actions checks pass. This is optional; it is **not** required for routine curriculum additions. No branch-protection rule is enabled by this guide.

## Publication gates (intentional)

- Merely placing a JSON file in `approved/` does **not** authorize publication.
- A lesson requires `publication.status:'approved'`, `approved:true`, explicit `teacherSignoff`, all teacher-approval flags resolved, and a distinct `publication.scriptureRights` object with `status:'cleared'`, a substantive `basis`, `reviewedBy` and ISO `reviewedOn`.
- Its memory-verse content must use verified BSB text, with the official source/terms URLs. These restrictions are checked independently by schema/semantic validation, CI readiness auditing and the runtime public-catalog guard.
- Review-stage files and historical fixtures remain excluded from public Vite imports.
- The expected workflow stays the same for the 2nd or 123rd lesson: **review → one approved JSON → upload directly to main → CI/deploy**, or optionally **open a PR → CI → merge** when a pre-merge check is preferred. Both choices are explained above.

**Useful checks for developers:** `npm run validate:curriculum`, `npm run validate:library`, `npm test`, `npm run build`. The library report is written to `artifacts/curriculum-readiness-report.{json,md}`.
