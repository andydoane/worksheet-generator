# Worksheet Studio

A browser-based editor for four-page Bible story worksheet booklets.

## PR 3 — printable PDF foundation

**PDF export now works.** Enter a worksheet title and story Scripture reference, choose one of six layouts independently for pages 2–4, then click **Download PDF**. The app creates a vector PDF directly in your browser; it does not upload lesson data to a server.

The PDF contains **two landscape US Letter pages** (each 11 × 8.5 inches) in the order needed for folding:

- **PDF page 1 (outside):** booklet page **4 on the left**, booklet page **1 on the right**.
- **PDF page 2 (inside):** booklet page **2 on the left**, booklet page **3 on the right**.

Each folded booklet page is 5.5 × 8.5 inches with a 0.35-inch outer margin, leaving 4.8 × 7.8 inches for the module grid. Module frames use 0.1-inch internal padding. All sizes and positions derive from the same constants in `src/booklet.ts` used by the responsive on-screen preview.

### How to print

1. Download the PDF with the button at the top of the editor.
2. Open the PDF in your normal PDF reader.
3. Choose **US Letter**, **Landscape**, **Actual size / 100%** (not 'Fit to printable area').
4. Choose **two-sided / duplex printing, flip on short edge**.
5. Fold the printed sheet in half vertically so the title page is the front cover.

**Printer note:** Duplex settings can vary by driver. Print one test sheet, confirm page 4 and page 1 are on the outside and pages 2 and 3 on the inside, and adjust the flip setting if the reverse side is upside down. The faint 'PAGE N' labels near the bottom are temporary verification helpers.

### What this milestone includes

- Responsive worksheet editor and saved lesson details from PRs 1 and 2.
- Fixed front cover: a medium-size title/reference area above a large activity area.
- Six valid arrangements for pages 2–4.
- Print-friendly black/grey vector borders, safe-area padding, and placeholder region labels.
- Embedded project fonts in PDFs: **Mouse Memoirs** for the title, **Nunito Sans** for text, and **Zilla Slab Bold** for labels.
- Browser download of a two-page PDF without any extra account or server.
- Automated tests for geometry, imposition, PDF page count, and 11 × 8.5-inch dimensions.
- A downloadable **sample-bifold-booklet** artifact in the GitHub Actions run for each PR.

**Not yet included:** individual activity modules, answer keys, decorative border images, or module-specific typography. Empty activity spaces are intentional until PR 4 and later.

### Visual preview vs exported PDF

The on-screen preview is scaled to fit your monitor. The PDF is created separately from the exact inch-based model, so it has consistent physical coordinates regardless of screen size. The editor is colored for usability, but the PDF uses black-and-white-friendly rules to save ink.

## Running locally

Requires Node.js 22.12 or later.

1. Run `npm install`.
2. Run `npm run dev` and open the local URL.
3. Run `npm run test` for geometry/PDF tests.
4. Run `npm run build` for type checks and a production build.
5. Run `npm run sample:pdf` to create an example PDF at `artifacts/sample-bifold-booklet.pdf`.

GitHub Actions checks every pull request, and after a push to `main` deploys to GitHub Pages. The Pages source should be set to **GitHub Actions** under **Settings → Pages**.

Live site: https://andydoane.github.io/worksheet-generator/

Lesson data remains in this browser's local storage. Reloading the page preserves the draft, but it does not sync between devices or browsers.

## Fonts and licensing

Project font files are already present in the repository under `fonts/`: Mouse Memoirs Regular, Nunito Sans Variable, and Zilla Slab Bold. The PDF exporter embeds those same fonts using `pdf-lib` and `@pdf-lib/fontkit`. Keep their licenses in mind if distributing modified font files in the future.
