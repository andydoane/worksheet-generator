# Local Berean Standard Bible corpus

**Source:** https://berean.bible/downloads.htm (publisher's current Berean Standard Bible plain-text bsb.txt, updated to the third printing). **Terms:** https://berean.bible/terms.htm. The Berean Standard Bible was dedicated to the public domain by the publisher in April 2023; attribution is appreciated.

The canonical, reviewed snapshot is committed at **public/bible/bsb.txt**. Its SHA-256 digest is tracked at **public/bible/bsb.sha256**. Both the public verse picker and Review Studio load this same local asset using the site's configured Vite base URL. Deployment does **not** fetch updated Scripture silently.

The source format is one tab-delimited verse per line: Book Chapter:Verse, then a tab, then Text. Existing passage parsing in src/review/bsb.ts is reused without altering Scripture content. It accepts 66 books and more than 30,000 verse records, and returns at most twelve consecutive verses per requested range.

## Deliberate update procedure

1. Review the publisher's current download and publishing terms.
2. Run npm run prepare:bsb to refresh the committed corpus and checksum from the official publisher.
3. Check the proposed text diff and checksum with human review; **do not** silently alter approved curriculum JSON or verse selections.
4. Run npm run verify:bsb, npm test, and the production build; commit the asset and checksum together in a dedicated PR.

The teacher's manual-entry option in the future Change Verse editor is separate from the BSB. The next PR will connect per-module fitting checks to the reusable picker's validateSelection callback; this shared data PR does not automatically rewrite any existing preset activities.
