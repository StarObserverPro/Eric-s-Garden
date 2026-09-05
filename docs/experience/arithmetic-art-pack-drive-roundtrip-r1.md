# Arithmetic art pack: GitHub / Drive round-trip R1

## Pattern

For small, project-authored art packs, keep the construction contract in GitHub and the reviewable source package in a dedicated Google Drive folder.

- GitHub owns the normative style, semantic meaning, asset inventory, and runtime boundary.
- Drive owns the external SVG source bundle, preview renders, and ZIP handoff.
- The ZIP is a convenience copy; the individual SVGs remain visible for review and later export.
- No generated raster preview becomes a runtime source of truth.

## Applied here

- Ledger: [`docs/ARITHMETIC_ART_LEDGER_R1.md`](../ARITHMETIC_ART_LEDGER_R1.md).
- Full original direction and inventory: [`docs/ARITHMETIC_ART_DIRECTION_R1.md`](../ARITHMETIC_ART_DIRECTION_R1.md), preserved byte-for-byte when the independent #28/#29 ledger additions were reconciled.
- Drive folder: [Eric's Garden — Arithmetic Art R1](https://drive.google.com/drive/folders/1aTr5TTzBJolMV9UrmwNt0p2z-tAY8smX)
- Pack contents: operator tokens, number tiles, six crop badges, feedback icons, contact sheet, README, and ZIP archive.

## Verification lesson

Before upload, render each SVG independently. SVG filter support can fail differently between local conversion tools and browser/Drive previews; the R1 source pack therefore keeps the standalone source shapes filter-light and treats shadows as optional presentation, not a semantic dependency.
