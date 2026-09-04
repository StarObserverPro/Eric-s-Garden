# Eric's Garden — Desktop UI / HUD Construction Spec R1

**Status:** implementation specification, not yet activated construction  
**Scope:** desktop / wide landscape only. Portrait phone continues to follow [`UI_HUD_PORTRAIT_MOBILE_R1.md`](./UI_HUD_PORTRAIT_MOBILE_R1.md).  
**Source of truth:** latest user direction + fresh `main`. The approved R6 SVG is a visual discussion aid; the alignment relationships and formulas in this document are the construction contract.

## 1. Product intent

Desktop must be treated as a **game interaction surface**, not as a three-column web page.

The garden is the dominant surface. HUD elements float over peripheral sky / grass space and must not reserve permanent sidebars that squeeze the renderer. The layout should be readable to a child at a glance: fewer containers, larger text, stable targets, obvious action hierarchy, and no unnecessary duplicate information.

The desktop design has three principles:

1. **Align outer edges before placing inner content.** Every major group belongs to a left, center, or right alignment column.
2. **Use one spacing rhythm.** Sibling subcontainers use the same gap rather than ad-hoc `6 / 7 / 9 / 10 / 15px` values.
3. **Size containers from their contents.** Do not leave unexplained trailing whitespace, especially in the bottom action dock.

All normal Eric-facing surfaces should be substantially translucent. The result should read as HUD glass over the garden, not opaque document cards on top of a page.

## 2. Current-main mismatch this work is intended to replace

Fresh `main` still uses:

- a permanent three-column `.game-layout` with mission / garden / notebook columns;
- level, weather, and progress inside the left mission card;
- a permanent right notebook / event column;
- a renderer engineering panel visible in the normal scene;
- a fixed bottom deck whose geometry is independent from the side alignment system.

The desktop construction should change **layout ownership and presentation only**. It must not fork game state, renderer state, save semantics, or the core play loop.

## 3. Desktop alignment system

### 3.1 Three top containers

The top HUD is **three separate medium containers**, not one full-width bar and not several unrelated pills floating independently.

They are:

- **top-left / brand container**;
- **top-center / level-status container**;
- **top-right / utility container**.

All three share the **same outer height** and the same vertical top coordinate.

The left and right containers are vertically tied to the columns below them:

```text
LEFT COLUMN                 CENTER                     RIGHT COLUMN
┌──────────────────┐       ┌──────────────────────┐   ┌──────────────────┐
│ brand            │       │ level/status         │   │ utilities        │
└──────────────────┘       └──────────────────────┘   └──────────────────┘
        ↓ same width                                       ↓ same width
┌──────────────────┐                                  ┌──────────────────┐
│ mission          │                                  │ context/status   │
│                  │                                  │ toast / drawer   │
└──────────────────┘                                  └──────────────────┘
```

Hard relationships:

- top-left width = mission-card outer width;
- top-left left edge = mission-card left edge;
- top-right width = right context-column outer width;
- top-right right edge = context cards / toast / bottom-right utility stack right edge;
- top-center is horizontally centered in the viewport interaction frame;
- top-center outer height = top-left outer height = top-right outer height;
- top-center must not shift because left/right content widths change within their fixed budgets.

At the approved 1906×937 reference frame, the useful starting geometry is:

| token | reference | role |
| --- | ---: | --- |
| left column width | `344px` | brand + mission |
| center top width | `596px` | level / progress / weather / score |
| right column width | `292px` | top utilities + context + bottom-right utility stack |
| top container height | `64px` | same for all three |
| sibling gap | `12px` | default gap between sibling subcontainers |
| major vertical gap | `16px` | top container → next column container |

These are **reference values, not single-monitor breakpoints**. Preserve the relationships and content-derived formulas when tuning for narrower desktop widths.

### 3.2 One primary spacing token

Use one primary sibling gap:

```css
--hud-gap: 12px;
```

Use it for:

- top-center status segments;
- top-right utility buttons;
- mission target-grid columns and rows;
- mission three-state row;
- bottom center tool buttons;
- bottom-right stacked utility controls;
- vertical spacing between right-column feedback containers where they form one group.

A larger separation such as `16px` may be used only between **major groups**, e.g. top container → mission/context card. Do not introduce arbitrary local gaps unless there is a documented optical reason.

### 3.3 Alignment is about both edges

Do not validate alignment by checking only the left edge or only the first child.

For every row or column, calculate:

```text
outer content width
= sum(child widths)
+ sum(sibling gaps)
```

Then center or edge-anchor that exact result inside the parent.

If a row is supposed to fill its parent content width, its children plus gaps must exactly equal that width. No leftover strip should remain on the right.

## 4. Top-left brand container

The brand container is compact and passive.

Contents:

- garden mark;
- small `ERIC'S SECRET GARDEN` eyebrow;
- large `Eric 的秘密菜园` title.

Rules:

- same outer width as mission card;
- same left and right edges as mission card;
- same height as the center and right top containers;
- no extra product / renderer jargon in the child-facing title area;
- use a translucent background; the sky should remain perceptible through it.

The brand is not a page header. It is one HUD tile in the left alignment column.

## 5. Top-center status container

This container owns the stable global play state:

1. level;
2. level progress;
3. weather;
4. star score.

Desktop may show weather explicitly. This differs intentionally from portrait mobile, where weather is omitted from the HUD.

### 5.1 Fixed slots

Each segment has a fixed or bounded slot. Normal numeric changes must not reflow the group.

Reference slot geometry inside a `596px` outer container:

```text
30px inner left
90 level
12 gap
212 progress
12 gap
106 weather
12 gap
92 score
30px inner right
= 596
```

The exact slot widths may be tuned if real labels require it, but construction must preserve:

- symmetric inner padding;
- `12px` sibling gaps;
- one shared vertical center line;
- one shared segment height;
- stable outer geometry when values change.

Progress number belongs **inside** the progress track, not as a detached duplicate counter.

At minimum budget for:

- two-digit level numbers;
- values such as `12 / 12`;
- three-digit star counts;
- expected Chinese weather strings without pushing neighbors.

Use tabular numerals where available.

## 6. Top-right utility container

The top-right container contains only global utility actions:

- read aloud;
- notebook;
- reset.

Rules:

- outer width equals the right context column;
- right edge equals all right-column feedback and bottom-right utilities;
- outer height equals both other top containers;
- three controls use the same sibling gap;
- notebook is visually primary relative to the two icon-only utilities;
- notification count may attach to notebook without changing the notebook slot width.

The desktop notebook button replaces the current permanent right notebook column as the primary entry point for history / goals / statistics.

## 7. Left mission card

The mission card remains permanently visible on desktop because the screen has enough room and the current goal is useful during play. It must, however, behave as a **compact HUD card**, not a full-height sidebar.

It owns:

- current task title;
- one short instruction / state sentence;
- target crop counts;
- current water / pest / growth state;
- one short completion / readiness line when useful.

It does **not** own level, progress, weather, or star score after this redesign.

### 7.1 Outer alignment

- outer width = top-left brand width;
- outer left edge = top-left left edge;
- outer right edge = top-left right edge;
- vertical gap from the top-left container uses the major-group gap token.

### 7.2 Internal width arithmetic

At the reference `344px` card width:

```text
22px inner left
300px content
22px inner right
= 344px
```

The internal content width is therefore `300px`.

For two target columns, use:

```text
144 + 12 + 144 = 300
```

For the three compact status cells, use the same sibling gap rather than a smaller special-case gap:

```text
92 + 12 + 92 + 12 + 92 = 300
```

The completion / readiness row uses the full `300px` content width.

This arithmetic is a construction rule. Do not independently size each chip and then accept whatever whitespace remains.

### 7.3 Readability

Desktop card text should be larger than the current main implementation.

Reference hierarchy:

- task title: ~`28–30px`;
- instruction / state copy: ~`16–18px`;
- target labels: ~`16px`;
- target counts and status values: ~`15px`;
- eyebrow / English secondary label: ~`12–15px`.

Use actual browser evidence to tune type sizes, but do not fall back to dense dashboard typography merely to fit more information.

## 8. Right feedback column

The permanent notebook sidebar is removed from normal play.

The right feedback column is reserved for **temporary or selected-context information**.

### 8.1 Context card

A full-width context card may show the selected bed / crop state, e.g.:

```text
草莓床
可以收啦
```

Rules:

- outer width = top-right container width;
- right edge = top-right container right edge;
- one short title + one short state line;
- disappear when no meaningful context exists;
- do not duplicate level, progress, score, or current tool.

### 8.2 Toast / event feedback

Short events such as `摘到草莓 +1` use a compact toast.

The toast may be narrower than the full right column, but its **right edge must still align** with the right-column anchor.

Do not build a permanent event-log column. Historical events live in the notebook.

### 8.3 Notebook / statistics

Clicking the desktop notebook opens an **overlay drawer / sheet**, not a layout column that resizes the garden.

The drawer may contain:

- today / goal summary;
- recent events;
- unlock information;
- harvest statistics;
- reset or secondary management actions if still needed.

Rules:

- opening / closing it must not resize the renderer or change camera framing;
- it owns its own scrolling;
- page / canvas must not begin scrolling because the notebook is open;
- statistics are reached through the notebook rather than a separate permanent desktop card;
- drawer width may exceed the normal `292px` feedback column if readability needs it, but its **outer right anchor remains the same**.

## 9. Bottom action region

### 9.1 Center action dock

The three tools plus primary action remain centered near the bottom of the garden.

The outer dock must be **content-derived**, not an arbitrary wide shell.

Reference geometry:

```text
16 outer left padding
150 tool
12 gap
150 tool
12 gap
150 tool
12 gap
414 primary action
16 outer right padding
= 932px total outer width
```

Reference outer height: `90px`.

Rules:

- no unexplained trailing whitespace after the primary action;
- tool slots remain fixed when labels / values change;
- the primary action is larger than each tool but does not stretch to half the screen;
- desktop may keep text labels under / beside tool icons because space permits and readability benefits;
- active tool remains visually obvious;
- the dock overlays peripheral ground and must not resize the renderer.

### 9.2 Bottom-right utility stack

The two auxiliary controls move to the **right side together** and are stacked vertically:

1. rotation / zoom interaction help;
2. `画面与帮助`.

They use the same right-column width and right edge as the top-right and context column.

Their **combined outer height must equal the center action dock height**, and their top and bottom edges must align with the center dock:

```text
39 top utility
12 gap
39 bottom utility
= 90 total
```

Therefore:

```text
utility-stack.top == center-dock.top
utility-stack.bottom == center-dock.bottom
```

Do not leave a separate control in the bottom-left corner.

The interaction-help control may become less prominent or auto-fade after the gesture is learned, but while visible it stays in this stack rather than creating a fourth alignment island.

## 10. Transparency, depth, and contrast

The approved direction is deliberately more transparent than current main.

Passive HUD surfaces should generally use:

- translucent warm / off-white backgrounds;
- mild backdrop blur;
- subtle border contrast;
- soft shadow for separation from mixed sky / grass backgrounds.

The scene should remain visibly present through the container.

Do not solve legibility by returning to opaque white cards. If contrast is weak, first tune:

1. text weight / color;
2. local blur;
3. border / shadow;
4. then modestly raise surface opacity.

Active controls may be more opaque than passive containers.

## 11. Child-facing interaction and language

The desktop redesign must prioritize interaction clarity over information density.

- large click targets;
- large task title and tool labels;
- short state language;
- one visible home for each fact;
- feedback close to the relevant side / action without covering the crop interaction center;
- no engineering terminology in normal play.

Renderer / compatibility controls belong under `画面与帮助` or the notebook support area.

Do not expose the current raw diagnostic grid (`FPS`, draws, passes, resources, DPR, etc.) as normal Eric-facing UI. Those measurements remain available to test / diagnostics code and browser evidence.

## 12. Information ownership

| Information / action | Desktop primary home | Must not also live in |
| --- | --- | --- |
| Brand | top-left container | mission title area |
| Level | top-center | mission card |
| Level progress | top-center progress slot | mission card / right feedback |
| Weather | top-center | mission card |
| Stars / score | top-center | notebook heading / mission card |
| Current task | left mission card | top-center |
| Target crops | left mission card | right feedback |
| Water / pest / growth state | left mission card | top-center |
| Tool selection | center bottom dock | top containers |
| Primary action | center bottom dock | mission card as a second button |
| Selected crop / bed state | right context card | persistent top HUD |
| Immediate event | right-aligned toast | permanent log column |
| Goal history / events / statistics | notebook overlay | permanent right sidebar |
| Rotation / zoom help | bottom-right utility stack | bottom-left island |
| Renderer / support | bottom-right `画面与帮助` / notebook support | normal scene engineering panel |

## 13. Recommended implementation seam

Current `main` already has a portrait adapter that moves the existing shared DOM nodes for portrait mode and then restores them when the media query no longer matches. Desktop should preserve the same architectural principle: **one DOM/game-state source, viewport-specific placement adapter**.

Recommended construction:

- keep `main.ts` as the game/UI state source;
- keep the existing renderer-neutral game state untouched;
- create a desktop HUD adapter / stylesheet rather than duplicating state or event logic;
- desktop and portrait adapters must be mutually exclusive;
- the desktop adapter may move existing nodes into the new top-left / top-center / top-right / mission / notebook-support containers and restore them on mode exit;
- avoid creating a second event log, second progress counter, or second tool state solely for layout.

Likely affected paths:

- `index.html` — only as needed for stable desktop container anchors / semantic shells;
- `styles.css` — remove the current three-column desktop page layout and old desktop card assumptions;
- `src/ui/desktop-hud.ts` — recommended desktop placement / ownership adapter if DOM moves are required;
- `src/ui/desktop-hud.css` — recommended desktop-only HUD geometry;
- `src/ui/portrait-mobile.ts` / `.css` — only if boot / mode arbitration needs a small compatibility adjustment;
- browser/UI tests covering desktop geometry and notebook/support behavior.

Do not change renderer architecture, scene geometry, game-state meaning, or save semantics as part of this HUD work.

## 14. Responsive desktop behavior

This specification governs desktop / wide landscape, not portrait mobile.

Implementation should test at minimum:

- `1906×937` — approved design reference;
- `1440×900` — common desktop reference;
- `1280×800` — narrower desktop stress case.

Responsive priorities, in order:

1. preserve garden interaction area;
2. preserve left/right outer alignment columns;
3. preserve the equal-height three top containers;
4. preserve readable type and click targets;
5. reduce optional decorative padding;
6. then reduce column widths / center-slot widths within bounded limits;
7. switch to the appropriate non-desktop layout before allowing overlap or page scrolling.

Do not let the center status container collide with the fixed-width left/right columns. A desktop breakpoint should be based on the **sum of required columns, gaps, and safe scene space**, not one historical CSS breakpoint copied without recalculation.

## 15. Fixed vs. tuneable

### Fixed construction rules

- garden-first overlay layout; no permanent three-column page layout;
- top is exactly three outer containers: left / center / right;
- top-left width and edges align with mission card;
- top-right width and edges align with right feedback / utility column;
- all three top containers share the same outer height;
- center top remains viewport-centered;
- primary sibling gap is shared and consistent;
- mission child widths are calculated to fill its content width exactly;
- right toast may be narrower but remains right-aligned;
- notebook / statistics are overlay information, not a permanent sidebar;
- bottom center dock is content-derived with no trailing empty strip;
- bottom-right two controls are stacked vertically;
- bottom-right stack top and bottom align with center dock;
- no separate bottom-left HUD island;
- passive HUD surfaces remain highly translucent;
- child-facing normal UI contains no raw renderer metrics;
- opening overlays does not resize the garden renderer.

### Tuneable during construction

- exact glass opacity / blur / shadow;
- corner radii;
- exact reference widths at narrower desktop sizes;
- exact type size within the readability hierarchy;
- notebook drawer width;
- whether rotation / zoom help auto-fades after onboarding;
- the final desktop-to-tablet breakpoint derived from real geometry evidence.

## 16. Acceptance checklist

Desktop HUD work is not complete until all of the following are true:

- [ ] Garden is no longer squeezed between permanent left and right page columns.
- [ ] Top HUD has three outer containers only: left brand, center status, right utilities.
- [ ] Three top containers share the same top and bottom edges.
- [ ] Top-left and mission card share both left and right outer edges.
- [ ] Top-right, right context card, and bottom-right utility stack share the same right edge.
- [ ] Top-right and right context column use the same outer width.
- [ ] Center top is viewport-centered and does not shift with normal value changes.
- [ ] Sibling container gaps use the shared spacing token rather than ad-hoc values.
- [ ] Mission two-column targets exactly fill the mission content width.
- [ ] Mission three-state row exactly fills the mission content width with the same sibling gap.
- [ ] Mission title and status text are visibly larger and easier to read than current main.
- [ ] Level, progress, weather, and stars no longer appear in the mission card.
- [ ] Permanent right notebook / event-log sidebar is gone.
- [ ] Notebook opens as an overlay and does not resize the renderer.
- [ ] Immediate feedback appears in the right feedback column and does not become a permanent log.
- [ ] Bottom action dock has no unexplained blank tail after the primary action.
- [ ] Three tools and primary action retain stable slot geometry as labels / values change.
- [ ] Rotation/zoom help and `画面与帮助` are stacked together on the right.
- [ ] The right utility stack total height equals the center bottom dock height.
- [ ] Right utility stack and center dock share top and bottom edges.
- [ ] No bottom-left HUD island remains.
- [ ] Passive HUD surfaces are visibly translucent while text remains legible over sky and grass.
- [ ] Raw WebGPU / vgpu diagnostic metrics are absent from Eric's normal desktop interface.
- [ ] Drag rotation, zoom, bed selection, tool selection, primary action, notebook, read-aloud, reset, and support remain usable.
- [ ] Browser evidence passes at 1906×937, 1440×900, and 1280×800 without overlap or page scrolling.

## 17. Explicit non-scope

This desktop HUD construction must not silently expand into:

- renderer changes;
- camera behavior changes unrelated to preventing HUD obstruction;
- soil / plant / scenery visual work;
- new game mechanics;
- save-schema changes;
- portrait-mobile redesign;
- tablet-landscape redesign unless a later task activates it;
- a general-purpose UI framework or design system.

The goal is a disciplined desktop HUD re-layout: **three aligned top groups, one compact left task column, one temporary right feedback column, one centered primary action dock, and one right-aligned stacked utility group — all floating over the garden rather than turning the garden into a web page.**
