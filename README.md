# Worksheet Studio

A browser-based project for creating printable Bible story worksheet booklets.

## PR 1: Application foundation

This first release replaces the "Coming soon" page with a responsive React/TypeScript editor shell. It can:

- Edit worksheet title, story Scripture reference, Big Idea, and memory verse details.
- Switch between previews for all four booklet pages.
- Save these details automatically in the current browser via localStorage.
- Use the existing Mouse Memoirs, Nunito Sans, and Zilla Slab Bold fonts.

**Not yet implemented:** page-layout selection, puzzle modules, printable page geometry, PDF export, and answer keys. The preview in PR 1 is a mockup, **not** a print-accurate PDF.

## Local development

Install Node.js 22.12 or newer, then run:

1. `npm install`
2. `npm run dev`
3. Open the local address shown in your terminal.

Run `npm run check` to type-check and `npm run build` to type-check and build the static site in `dist/`. No server, account, or API key is needed for this initial release.

## GitHub Pages deployment

The production Vite base path is `/worksheet-generator/`, matching the repository's Pages URL.

The workflow in `.github/workflows/pages.yml` checks each pull request and deploys to Pages on a push to `main`.

**One-time setup:** In the GitHub repo, go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. After merging, check the **Actions** tab for the deployment run. The eventual address is https://andydoane.github.io/worksheet-generator/.

This first PR uses `npm install` in CI; a future dependency-management change can add a committed package lockfile for reproducible installs.

## Planned booklet dimensions

Two landscape US Letter PDF pages, imposed for a 4-page bifold booklet:

- Outside sheet: booklet page 4 (left), page 1 (right).
- Inside sheet: booklet page 2 (left), page 3 (right).
- Folded page: 5.5 × 8.5 inches, with 0.35-inch margins.
- Large region: 4.8 × 5.2 inches.
- Medium region: 4.8 × 2.6 inches.
- Small region: 2.4 × 2.6 inches.

These exact dimensions will be implemented in PR 2 and the PDF export in PR 3.

## Fonts

Font files already in this repository are loaded from the `fonts/` directory:

- `MouseMemoirs-Regular.ttf` — display headings.
- `NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf` — interface and body text.
- `ZillaSlab-Bold.ttf` — puzzle-style lettering in future modules.

The uploaded font is named **Zilla** Slab (rather than "Villa Slab"). Verify font licenses before republishing or redistributing assets.
