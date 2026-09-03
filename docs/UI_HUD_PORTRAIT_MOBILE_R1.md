# Eric's Garden — Portrait Mobile UI / HUD Construction Spec R1

**Status:** implementation specification, not yet activated construction  
**Scope:** **portrait mobile only**. Desktop, tablet landscape, and other layouts are explicitly out of scope for this document.  
**Source of truth:** latest user direction + fresh `main`. The R4 SVG is a discussion aid, not a pixel-perfect contract.

## 1. Product intent

The portrait phone layout is **garden-first**. The rendered garden must occupy as much of the viewport as practical; UI exists as lightweight, semi-transparent overlays around it rather than as page sections that shrink the world.

All visible UI is for Eric. Do not expose engineering terminology, raw renderer statistics, draw counts, pass counts, resource counts, FPS grids, WebGPU jargon, or similar developer-facing information in the normal interface.

Information must obey a **no-duplication rule**: each fact or action has one primary visible home. Do not restate the same task, score, action, or status in multiple containers just because space exists.

## 2. Hard constraints

### 2.1 Garden area

- The garden is the dominant visual surface.
- Do not reserve permanent left/right sidebars.
- Do not stack large cards above the garden.
- Normal play must fit in one portrait viewport without page scrolling.
- Overlays may cover peripheral garden space, but must not resize the renderer/canvas when opened or closed.
- Preserve a large central interaction-safe region for crops, beds, rotation, zoom, and taps.

### 2.2 Top status HUD

The top HUD is compact, semi-transparent, and fixed to the same visual alignment system as the bottom controls.

It contains only:

1. **Level number** as an icon-like numeric badge, e.g. `1`, `2`, `3`.
   - Do **not** append `关`.
   - Do not write `第 1 关` on portrait mobile.
2. **Progress bar** with the numeric progress overlaid inside the bar, e.g. `4/10`.
   - Do not place a second progress number beside it.
3. **Stars and score** as one combined visual unit, e.g. `⭐ 12`.
4. **Read-aloud** icon.
5. **Notebook** icon as the primary information entry point.

Do **not** show weather text or a weather icon in the portrait HUD. Weather is part of the rendered world and should be visually legible by looking at the garden/sky.

Do **not** repeat the current planting/growing action in the top HUD. Current actions live in the bottom action dock.

### 2.3 Bottom action dock

- The bottom dock is semi-transparent and fixed near the safe-area bottom inset.
- It contains the three tools plus the current primary action.
- **Icons are sufficient; do not add tool names under icons** on portrait mobile.
- The current primary action may use a larger or more prominent slot, but it must not duplicate text already shown elsewhere.
- The dock must not change width because of current crop, count, score, or task text.

### 2.4 Context status

A small context card may appear when a bed/crop is selected or when immediate feedback is needed.

Examples:

- `萝卜床`
- `缺水`
- `可以收啦`

Rules:

- one short title + one short state line maximum;
- large readable text;
- no instructional microcopy such as `点开查看详情`;
- no duplicate progress, score, or action labels;
- disappear when it has no useful context.

### 2.5 Notebook

The notebook icon opens the **single primary information container** for non-immediate information.

The notebook may contain compact sections such as:

- today / current goal;
- recent garden events;
- harvest totals / simple statistics.

Do not create separate permanent containers for mission, event log, and statistics on portrait mobile.

#### Notebook scrolling

- The notebook container has a **fixed viewport-relative maximum height** and does not grow indefinitely with content.
- Header and close affordance remain fixed/sticky.
- Only the notebook content body scrolls vertically.
- The page and garden canvas do not scroll with notebook content.
- Scrolling inside the notebook must not accidentally rotate or zoom the garden.
- Content sections align to the same left/right inset and column edges.
- Avoid nested independent scroll areas inside notebook sections.
- At the bottom, leave enough padding so the final row never sits under the phone safe area or the action dock.

Exact max-height and sheet travel are tuneable during implementation, but the structure above is not.

### 2.6 Help / fault / render support

Fault, renderer, compatibility, and diagnostic UI must be consolidated into **one normally collapsed support area** reachable through the notebook/settings path.

Visible language must remain child-readable and task-oriented, for example:

- `画面正常`
- `换成兼容画面`
- `再试一次`
- `需要帮助`

Raw engineering metrics should stay in test tooling, console diagnostics, automated evidence, or other non-Eric surfaces rather than being exposed as normal game UI.

## 3. Alignment mechanism

Portrait layout must be built from a **shared alignment grid**, not independently positioned floating cards.

### 3.1 Shared horizontal anchors

Define one common pair of viewport insets:

- `--hud-left`
- `--hud-right`

The following containers align to those same anchors unless intentionally narrower:

- top status HUD;
- notebook sheet;
- bottom action dock.

If a context card is narrower, its outer edge still aligns to one of these anchors or to a documented internal grid column.

### 3.2 Shared vertical rhythm

Use a small spacing token set only, e.g. `xs / sm / md / lg`, rather than arbitrary per-component gaps.

Within each container:

- icon centers align on a shared row;
- text baselines align;
- neighboring boxes share top/bottom edges where they visually form one row;
- internal padding is symmetric unless a deliberate optical correction is required;
- section edges form clear straight lines.

The target is **compact but not crowded**: no loose empty forehead, no decorative gaps that have no interaction or readability purpose.

### 3.3 Fixed slots

Layout must remain stable when numbers change.

Use fixed or bounded slots for:

- level badge;
- progress bar;
- progress number inside the bar;
- star + score group;
- top icons;
- each bottom tool;
- primary action slot.

Do not let normal numeric variation reflow adjacent elements.

At minimum, budget for values larger than the initial examples:

- level: at least two digits without changing outer HUD geometry;
- progress: values such as `10/10`, `12/12`, or similar expected level totals;
- score: at least three digits without shifting neighboring controls.

Prefer tabular numerals (`font-variant-numeric: tabular-nums`) for counters where supported.

If a value exceeds the designed budget, use a bounded fallback (smaller type within the slot, abbreviated display where semantically safe, or a controlled overflow treatment). Never allow it to push neighboring containers away.

## 4. Layering and transparency

All portrait HUD surfaces other than dialogs/sheets should feel like lightweight overlays over the garden.

- use translucent backgrounds rather than opaque page cards;
- preserve legibility against bright and dark garden states;
- apply enough border/shadow/blur contrast to keep edges readable;
- do not make transparency so strong that text loses contrast;
- opened notebook may be more opaque than passive HUD overlays, but should still visually belong to the same system.

Z-order must be explicit and stable:

1. garden renderer;
2. crop/context overlays;
3. passive HUD;
4. action dock;
5. notebook/support sheet;
6. modal/critical feedback when required.

## 5. Rotation and zoom

Portrait mobile must keep garden camera manipulation obvious without consuming a large permanent container.

- drag / one-finger gesture: rotate the garden;
- pinch: zoom;
- gesture hints may appear as compact semi-transparent overlays during onboarding or when useful;
- hints should fade or collapse after the interaction is understood;
- do not permanently occupy a large block with `旋转` / `缩放` instructions;
- notebook scrolling and button interaction must not leak gestures into garden rotation/zoom.

Exact gesture tuning is an implementation detail, but the visible affordance must stay compact and garden-first.

## 6. Information ownership — no duplication

| Information / action | Primary portrait-mobile home | Must not also live in |
| --- | --- | --- |
| Level | numeric level badge | notebook summary, context card |
| Level progress | number inside progress bar | separate number beside bar, context card |
| Stars / score | combined star-score slot | notebook header, duplicate top text |
| Weather | rendered world | top HUD text/icon |
| Tool selection | bottom dock | top HUD, notebook |
| Current primary action | bottom primary slot | top HUD task sentence |
| Selected bed/crop state | context card | persistent top HUD |
| Goal / history / harvest info | notebook | separate permanent mission/log/stats cards |
| Support / compatibility | collapsed support area | normal HUD |

A later implementation may remove additional text if the visual state already communicates it clearly. It should not add a second home for the same information without a specific product reason.

## 7. Responsive stability inside portrait mobile

This document governs portrait phones only, but portrait phones still vary substantially in width and height.

Implementation must therefore:

- use safe-area insets;
- preserve touch target size before decorative spacing;
- keep the garden interaction region viable on shorter screens;
- reduce gaps before reducing touch targets;
- reduce optional hint visibility before shrinking core controls;
- keep notebook scrolling internal rather than forcing page scrolling;
- avoid breakpoint logic based on one exact phone model.

Exact breakpoint values may be refined during construction against the existing `760px` / `430px` CSS behavior and runtime evidence.

## 8. Tuneable vs. fixed

### Fixed product/layout rules

- portrait phone scope;
- garden-first viewport;
- no weather HUD;
- numeric level badge with no `关`;
- progress number overlaid inside progress bar;
- stars + score combined;
- notebook icon instead of hamburger menu;
- no labels under bottom tool icons;
- notebook is the single primary non-immediate information container;
- notebook body scrolls internally;
- no duplicate information;
- developer-facing metrics absent from normal Eric UI;
- one collapsed support area for fault/render/diagnostic needs;
- shared alignment anchors and fixed numeric slots;
- overlays do not resize the renderer.

### Tuneable during implementation

- exact pixel dimensions;
- opacity / blur / shadow strength;
- corner radii;
- exact notebook max-height;
- gesture-hint placement and fade timing;
- precise type sizes within the large/readable requirement;
- breakpoint thresholds inside portrait mobile.

## 9. Acceptance checklist for later construction

Portrait-mobile work is not complete until all of the following are true:

- [ ] Main garden visibly occupies more space than the current stacked-card mobile layout.
- [ ] No weather label or weather icon appears in the normal portrait HUD.
- [ ] Level appears as a compact number badge with no `关` text.
- [ ] Progress count is visually inside the progress bar and is not duplicated elsewhere.
- [ ] Stars and score form one combined unit and remain aligned as the score changes.
- [ ] Notebook icon replaces the hamburger-style garden information entry.
- [ ] Bottom tools use icons without redundant captions.
- [ ] Current primary action exists only in the bottom action area.
- [ ] Notebook is the sole main container for goal/history/harvest information.
- [ ] Notebook header remains stable while only its content body scrolls.
- [ ] Notebook scroll does not rotate/zoom the garden.
- [ ] All major HUD edges align to the shared viewport grid.
- [ ] Level/progress/score changes do not alter the outer HUD geometry.
- [ ] Overlays do not resize the garden renderer.
- [ ] Rotation and pinch zoom remain usable around the HUD.
- [ ] No raw developer diagnostics are present in Eric's normal interface.
- [ ] Support/compatibility UI is consolidated and normally collapsed.
- [ ] The complete core play loop remains usable without page scrolling.

## 10. Explicit non-scope

This document does **not** define:

- desktop layout;
- tablet landscape layout;
- desktop/tablet information-panel placement;
- final art style;
- final icon assets;
- exact pixel values;
- renderer architecture or game-state changes.

Those must not be inferred from this portrait-mobile specification.