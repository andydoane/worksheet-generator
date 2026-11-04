# Approved Bible lessons

This is the **only folder** the public application uses for built-in Bible lesson JSON.

**One file publishes one approved lesson.** The app automatically discovers `<lesson-id>.lesson.json` at build time. There is no shared rights manifest, hand-maintained registry or code change for each new lesson.

For the complete authoring, Review Studio signoff, GitHub upload and CI procedure, see **[Publishing a new Bible lesson](../PUBLISHING.md)**.

## Approval and Scripture rights are recorded per lesson

An approved file contains both of the following distinct, explicit human decisions under `publication`:

- `teacherSignoff` (reviewer, date): the lesson's editorial and teaching-content approval, with all required `resolvedReviewFlagIds`.
- `scriptureRights` (status `cleared`, basis, reviewedBy, reviewedOn): confirmation that the selected official BSB text can be distributed. The Review Studio records this **only** when its BSB-rights confirmation checkbox is explicitly checked.

Both decisions are required. A file with only `approved:true` or without an actual BSB source **cannot be published**. The official schema validator, the real lesson QA audit and the runtime public catalog all enforce the gate.

## What to add

Add just `<lesson-id>.lesson.json`, with the file basename exactly matching its JSON `id`, in a GitHub pull request. If the same lesson ID is still represented by a review-stage JSON file under `curriculum/review/`, remove that review-stage duplicate in the PR. Historical conversion reports and fixtures can stay.

CI checks schema, provenance, actual puzzle engines, all three numbered presets, the teacher's approval and separate Scripture-rights evidence. A failed gate prevents deployment. Once merged and deployed, the new story appears automatically.

## Existing lesson

`ot-031-god-parts-the-red-sea.lesson.json` includes the original author signoff and the already-cleared BSB rights evidence, migrated without changing the original records. The historical preapproval conversion remains in `tests/fixtures/ot-031-original-review.json` strictly for tests; it is not public.

