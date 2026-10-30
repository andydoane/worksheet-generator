# Worksheet Studio

A browser-based editor for building four-page Bible story worksheet booklets.

## Current milestone: PR 2 — booklet layout engine

- All PR 1 fields remain editable: title, story Scripture reference, Big Idea, memory verse reference and text.
- Each of four virtual folded pages has a physical size of **5.5 × 8.5 inches** and **0.35-inch margins**, leaving **4.8 × 7.8 inches** for content.
- Page 1 always uses a **medium title area on top** and a **large activity area below**.
- Pages 2, 3, and 4 can each independently use one of **six layout presets**, selected in the Page layouts tab.
- The responsive **Single page** preview shows the selected virtual page. **Print sheets** shows the correct imposition: outside sheet [4, 1] and inside sheet [2, 3].
- Layout selections and lesson content are automatically saved in your current browser. PR 1 draft content is preserved when the app upgrades.

These are **empty module regions**. Actual module assignment, puzzle generation, answer keys, and PDF export are reserved for future milestones. Although the preview is based on exact inch measurements, it is **screen-scaled** and is not a print/export button.

## Layout grid

Each page has a 2-column × 3-row content grid:
- **Small:** 2.4 × 2.6 inches (1 column × 1 row).
- **Medium:** 4.8 × 2.6 inches (2 columns × 1 row).
- **Large:** 4.8 × 5.2 inches (2 columns × 2 rows).

Page 1: medium title + large activity. Pages 2–4 choose from:

1. Medium, Large
2. Large, Medium
3. Small + Small, Medium, Medium
4. Medium, Small + Small, Medium
5. Medium, Medium, Small + Small
6. Large, Small + Small

Geometry and page order are defined in `src/booklet.ts`, independent of display styling, so PR 3 can use those same measurements for PDF output. Tests ensure the six layouts have no gaps, overlaps, or out-of-bounds regions.

## Development

Requires Node.js 22.12 or later.

1. Run `npm install`.
2. Run `npm run dev` and open the local URL shown.
3. Run `npm run test` for layout geometry tests.
4. Run `npm run build` for TypeScript validation and a production build.

The GitHub Actions workflow runs tests and builds on PRs; after merge to `main` it also deploys the built site to GitHub Pages.

**One-time setup:** GitHub repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Production URL: https://andydoane.github.io/worksheet-generator/

## Fonts

The three existing repository fonts are bundled automatically: Mouse Memoirs, Nunito Sans, and Zilla Slab Bold. The uploaded slab font is **Zilla** Slab (not “Villa Slab”).

No account, server, paid API, or backend is required for the current editor. Draft data is stored only in the current browser.
