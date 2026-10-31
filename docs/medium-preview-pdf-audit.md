# Medium module preview/PDF audit — PR 11a

Scope: the nine Medium module types on `main` at v0.15.1 before PR 11a.
The comparison below is based on reviewing the two renderers, CSS and font
resources. It is a **source-level baseline**, not a claim of pixel-for-pixel
browser screenshot validation for all nine activities.

## Shared baseline

- Physical medium area: 4.8 × 2.6 in, with 0.1 in inset on all sides
  (331.2 × 172.8 pt content region).
- PDF embeds the real static Nunito Medium (500), Bold (700) and
  ExtraBold (800), Mouse Memoirs and Zilla Slab Bold.
- Previous Medium font-family preflight fixed stale Nunito Sans faces and
  several incorrect font weights, but browser CSS and PDF still independently
  calculate line wrapping and whitespace for most activities.
- Preview must eventually use the same content, typography and measured
  geometry as PDF; avoid CSS-only approximations for multiline print text.

| Activity | Baseline mismatch / design issue | PR |
| --- | --- | --- |
| Match the Words | Browser CSS distributes rows by flex space; PDF uses fixed physical points. Both columns used left alignment and the right side wasn't flush to its edge. | **11a**: shared measured geometry and right-justified right column |
| Finish the Verse | CSS flex/wrapping and PDF word/blank placement are independently calculated; word-bank sizing and usable capacity differ, especially with longer verses. | 11b |
| Unscramble the Verse | Browser inline letter widgets and PDF manual placements use different vertical alignment and punctuation handling. | 11c |
| Circle the Mistakes | Preview CSS uses an older 800-weight paragraph and independent wrap; PDF uses 500 weight and a tight 1.25× baseline pitch. | **11a**: one measured layout with 500 weight and 1.75× line pitch |
| True/False Maze | Preview has a fixed 416×173 SVG composition while PDF dynamically fits the maze; exit labels and entrance marker are independently laid out. | 11d |
| Big Idea Cryptogram | Preview CSS flow starts left while PDF centers measured cipher lines, and their key-to-line/bottom spaces differ. | 11e |
| Upside Down Verse | Browser uses flex wrapping; PDF uses fixed-width letter positions and a different punctuation placement. | 11c |
| Connect the Verse | Preview scatters percentage-based elements with CSS letter jitter; PDF uses different point-based jitter and bank/subtitle layout. Planned promotion to Large. | 11g (shared engine in 11f) |
| Connect the Big Idea | Preview and PDF subtitle and bank differ; both use grid-like placement, with notably inconsistent letter jitter. Wrong title appears in preview. | 11f |

## Changes made now

1. `mediumParityLayout.ts` exposes shared, pure top-left print-space planners for
   Match the Words and Circle the Mistakes, both using local static font metrics.
2. `MediumPrintPreview.tsx` uses the exact same planners and font outlines as
   `modulePdf.ts` and `storyVersePdf.ts` for these two activities.
3. Match right entries align at x = printable width − 7pt; the left entries
   remain at x = 7pt. Both retain the same font size and baseline for each row.
4. Circle text wraps at identical words/line boundaries in preview and PDF.
   Preferred font size is 11.5pt, decreasing as needed to 8pt. Line pitch is
   1.75× rather than the former PDF 1.25×; no text may be silently clipped.
5. The other seven Medium renderers remain unchanged, to preserve each
   planned module-specific PR and the user's ability to review them.

## Verification and acceptance

- Run `npm run test && npm run build && npm run sample:pr11a`.
- Compare 3- and 6-pair Match activities, including long right-side labels,
  in browser and printed PDFs; both columns should share row baselines.
- Compare short and long Circle paragraphs, including near-limit text,
  in preview and PDF; no clipped final line and generous circling space.
- The existing PR 10g sample includes representative fixtures for all nine
  Medium activities for the rest of the audit.
- No changes to booklet imposition, layout IDs, seeded shuffles, or stored
  worksheet formats.
