# Arithmetic Art R1 runtime integration

Originals: the user-supplied **Eric's Garden — Arithmetic Art R1** Drive folder, recorded in `provenance.json`. `source/` preserves the four original SVG contact sheets byte-for-byte. The source README identifies them as project-authored; no third-party pictures or font files are included.

## Reproduce

From the repository root, run `python3 scripts/prepare-arithmetic-art.py`. It reads only the local originals and writes `runtime.svg` and `provenance.json`. No network access, dependency installation, rasterization or runtime SVG parsing is involved. Only `runtime.svg` is referenced by the production bundle.

## Placement

| Symbols | Live UI owners |
| --- | --- |
| Six crops | Order HUD, filled order slots, statistics, question references/choices, harvest receipt, sharing tokens |
| Plus, minus, multiplication, division, equals | Post-interaction mathematical recaps |
| Number-card shape with native digits | Numeric answer choices and large equations, including multi-digit values |
| Correct / retry | Local answer and equal-sharing feedback |
| Water / seed / basket / star | Water tool, sow action, basket actions/headings, completion feedback |

Reference counts stay as native text, not baked artwork. SVG elements are decorative, fixed-size and non-interactive. Buttons and rows own the text labels and input targets. Equation wrappers provide a full textual mathematical label.

## Deliberate derivatives

The source division token is incorrectly drawn with two horizontal bars and one decorative dot. The runtime symbol has **one bar between two centered dots**; the original remains unchanged. A regression test protects this distinction.

Contact-sheet translations, captions and outer backgrounds are not runtime widgets. Crop paths are retained while their contact-sheet cards are removed. Feedback circles use tight view boxes. The source droplet caption says “hint”; the runtime maps that actual droplet to **watering**, not a misleading hint symbol.

The ten original numeral cards share one shape. Runtime values use that shape with native digits, preserving legibility and variable/two-digit quantities without bundling fonts.

This integration does not replace 3D crop models, add a runtime Drive connection, redesign all non-arithmetic HUD icons, or alter game inventory/rewards.
