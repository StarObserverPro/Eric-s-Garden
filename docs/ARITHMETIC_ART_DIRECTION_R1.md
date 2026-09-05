# Eric's Garden — Arithmetic Art Ledger R1

**Status:** art direction approved for the first arithmetic asset pack; SVG pack ready for review; runtime integration intentionally separate.

**Scope:** the arithmetic/counting presentation layer for Eric's Garden. This ledger covers operator tokens, number tiles, crop counting badges, feedback icons, and the visual rules that keep them inside the existing garden identity.

## 1. Why this style

Eric's Garden already has a warm paper surface, dark green ink, soil brown, soft meadow green, and a gold reward accent. Arithmetic should feel like a small set of garden tools that Eric can pick up and arrange, not like a detached worksheet or a generic education app.

The art direction is therefore:

> **Garden schoolbook / painted low-poly tokens** — large, tactile vector shapes with paper-card faces, simple wooden sign colors, and a restrained dark-green outline.

The pack is 2.5D rather than photorealistic. A quiet offset shadow gives the pieces physical presence, while the silhouette and color remain clear at small sizes and in the Canvas fallback.

## 2. Existing visual authority

The pack follows the current repository baseline rather than inventing a new theme:

| Existing authority | Arithmetic treatment |
| --- | --- |
| `--paper: #f7f2df` / `--paper-2: #fffaf0` | card and tile faces |
| `--ink: #26352c` | primary outline and numerals |
| `--green: #4f7a54` / `--green-dark: #2f5639` | correct state, leaves, plus/equal signs |
| `--green-soft: #dfe9d2` | calm backgrounds and selected tiles |
| `--soil: #8f6546` | wooden/earth accents and retry state |
| `--gold: #d8a43b` | reward, hint emphasis, and multiplication token |
| warm sky / water accents | optional hint and water feedback only |

No new primary brand color is introduced in R1. Crop badges use the existing six-crop visual vocabulary: carrot orange, tomato/strawberry red, corn yellow, pumpkin orange, and lettuce green.

## 3. Shape grammar

### 3.1 Shared rules — HARD

- Use a stable `4–5px` source outline at the supplied preview size, with rounded joins and caps.
- Keep the main silhouette understandable without text or color. The symbol must still read in monochrome.
- Use one quiet down/right shadow, never a floating neon glow or a heavy 3D bevel.
- Keep symbols optically centered, not mathematically forced into the box.
- Keep the usable shape inside an approximately `12%` safe margin so hover/selected states do not clip.
- Do not use emoji glyphs as the production icon source.

### 3.2 Operator tokens

Operators are small garden signboards / seed packets. Each token has a rounded square body, a contrasting symbol, and a tiny material cue near the bottom edge. The cue is decorative and must not carry meaning by itself.

- `+` — meadow green: adding plants together.
- `−` — straw gold: taking plants away.
- `×` — pale wood: groups / repeated rows.
- `÷` — light timber: sharing into equal groups.
- `=` — sky green: the result / balance point.

The operator symbol is the only required semantic layer. Do not replace it with a word on the token.

### 3.3 Number tiles

Number tiles are cream paper cards with a single large dark-green numeral. A small colored dot gives the row a hand-sorted, garden-workbench feel, but numbers remain identical in contrast and weight. The initial pack covers `0–9`; multi-digit values are formed by adjacent fixed-width tiles or by the runtime's bounded number slot.

Use tabular numerals where the runtime font supports them. Do not let a changing number resize neighboring controls.

### 3.4 Crop counting badges

The six current crops receive simplified vector badges so arithmetic can show “three carrots” or “two tomatoes” without relying on emoji. The badge is an object-counting aid, not a replacement for the reviewed 3D crop models in the garden scene.

Recognition details are intentionally retained:

- carrot: exposed orange shoulder plus divided foliage;
- tomato: round red fruit plus a green crown;
- corn: yellow ear, vertical leaves, and stalk;
- pumpkin: ribbed orange fruit plus short stem;
- lettuce: cupped green rosette;
- strawberry: red pointed fruit, leafy calyx, and pale seed marks.

The badges may be repeated in a counting row, but should not become noisy repeating patterns. Prefer one badge plus an explicit count for larger quantities.

### 3.5 Feedback and reward

Feedback uses familiar garden actions rather than punitive marks:

- correct: green check;
- try again: amber circular arrow;
- hint: blue water drop;
- reward: gold star;
- plant/start: sprout;
- harvest/finish: wooden basket.

Wrong answers should not use a large red X, harsh alarm red, or a shaking error illustration. The existing small shake motion may remain a behavior, but the artwork stays calm and inviting.

## 4. Asset ledger

| Asset | Role | Source format | Intended use | State |
| --- | --- | --- | --- | --- |
| `arithmetic_operator_tokens.svg` | `+ − × ÷ =` token strip | SVG, `920×190` viewBox | operator picker, equation row, review sheet | ready |
| `arithmetic_number_tiles.svg` | `0–9` tile strip | SVG, `1210×190` viewBox | number picker / tile source | ready |
| `arithmetic_crop_badges.svg` | six crop counting badges | SVG, `900×270` viewBox | counting prompts and result feedback | ready |
| `arithmetic_feedback_icons.svg` | check, retry, hint, star, sprout, basket | SVG, `1080×310` viewBox | feedback, rewards, action affordances | ready |
| `arithmetic_art_preview.svg` | contact sheet | SVG, `1280×980` viewBox | visual review / handoff | ready |

The source SVGs are the canonical art. The strips are deliberately self-contained, dependency-free, and usable as review sheets before a later runtime sprite-export step.

## 5. Export and integration rules

### Fixed

- Preserve the source SVGs and their viewBoxes.
- Export raster derivatives at `1×`, `2×`, and `3×` only when a consuming surface requires raster data.
- Preserve transparent corners and the dark-green outline.
- Keep an accessible text label or `aria-label` beside every interactive symbol in the runtime; the SVG itself is not the only accessibility channel.
- Keep art state separate from arithmetic/game truth. Selecting `×` or showing a check must consume the existing game/UI state rather than creating a second state model.

### Tuneable

- final rendered pixel size per viewport;
- shadow opacity and offset;
- selected/pressed outline treatment;
- whether crop badges are displayed individually or as a count-plus-badge composition;
- exact operator token body color if contrast evidence calls for a small adjustment.

### Not in this pack

- final equation gameplay rules or question generation;
- 3D crop geometry or stage transitions;
- new renderer ownership, sprite atlases, or a texture-loading framework;
- third-party artwork or fonts;
- a full animated math-board scene.

## 6. Review checklist

- [ ] A child can identify each operator from its symbol alone.
- [ ] Numerals remain readable at the smallest planned button size.
- [ ] Crop badges are recognizable without emoji fallback.
- [ ] Correct / retry / hint / reward states are distinct without relying on red-versus-green alone.
- [ ] Icons remain legible on both the paper UI and the garden scene overlay.
- [ ] No asset introduces a palette or visual effect that fights the existing garden.
- [ ] The same SVG can be reviewed independently of the runtime and later wired into Canvas/WebGPU UI without a second art source.

## 7. Handoff

The finished external pack is stored in the [Eric's Garden — Arithmetic Art R1 Google Drive folder](https://drive.google.com/drive/folders/1aTr5TTzBJolMV9UrmwNt0p2z-tAY8smX) for art review and future export. GitHub carries this ledger as the normative style and inventory record; runtime code should only be wired in a later construction packet after the arithmetic gameplay contract and target surfaces are confirmed.
