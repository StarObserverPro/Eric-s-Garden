# Vegetable Species Packet Template R1

Use one copy per crop while researching/modeling. Keep it short and evidence-driven.

```md
# <Crop name> — modeling packet

Status: research | modeling | review | accepted
Crop ID: <existing/new id>
Difficulty: D0 | D1 | D2 | D3 | D4 | D5
Game stages: current 1..4

## 1. Recognition target

One paragraph: what must make this crop immediately recognizable at normal garden scale?

## 2. Size anchors

- Mature height: <target/range>
- Mature spread: <target/range>
- Leaf-to-plant proportion: <notes>
- Harvest-organ size: <range or n/a>
- Visible harvest-organ count: <range or n/a>
- Soil exposure/depth: <notes or n/a>

## 3. Reference set

| Ref | Type | Source | Intended use | Why useful | Caveat |
| --- | --- | --- | --- | --- | --- |
| R1 | 3D / photo / stage model | <URL/id> | runtime-candidate / geometry-donor / organ-donor / stage-reference / visual-reference-only | <note> | <note> |
| R2 | | | | | |
| R3 | | | | | |

Target 3–5 strong references; use more/fewer if justified.

## 4. Asset decision

Chosen base strategy:

- whole-stage models | modular organs | hybrid

Chosen donor/reference assets:

- <asset/ref>

Why this is cheaper/safer than the alternatives:

- <reason>

## 5. Canonical frame

- Root/soil contact checked: yes/no
- +Y up checked: yes/no
- Stable forward across stages: yes/no
- Scale normalization method: <method>
- Normal/mirror issues: <none/issues>

### Modular attachment frame (if used)

- origin at parent connection: yes/no
- +Y base-to-tip: yes/no
- +Z authored front: yes/no
- right-handed frame: yes/no

## 6. Stage plan

### S1 — juvenile

- Stage model/geometry:
- Continuous controls inside stage:
- Key recognition cues:

### S2 — vegetative

- Stage model/geometry:
- Continuous controls inside stage:
- Main topology change from S1:

### S3 — adult / harvest-organ formation

- Stage model/geometry:
- Continuous controls inside stage:
- Main topology change from S2:

### S4 — mature

- Stage model/geometry:
- Continuous controls inside stage:
- Main topology change from S3:

## 7. Transition plan

Large hidden swaps required at:

- S1 → S2: yes/no — <what changes>
- S2 → S3: yes/no — <what changes>
- S3 → S4: yes/no — <what changes>

The scene-level occluder may vary; swap must occur only after confirmed coverage when in view.

## 8. Rendering plan

### Foliage

- Geometry budget note:
- Material note:
- Wind stiffness/amplitude note:

### Harvest organ (if any)

- Geometry/material priority:
- Maturity color/size controls:
- Optical treatment: none / restrained <details>

## 9. Review results

| Check | State | Note |
| --- | --- | --- |
| species readability | pass/revise | |
| silhouette | pass/revise | |
| proportion | pass/revise | |
| leaf structure | pass/revise/n/a | |
| branch structure | pass/revise/n/a | |
| harvest organ | pass/revise/n/a | |
| soil contact | pass/revise | |
| frame / normals | pass/revise | |
| stage progression | pass/revise | |
| transition cover | pass/revise | |

## 10. Blocking issues

- <none or short list>

## 11. Accepted evidence

- Contact sheet: <path/link>
- Debug evidence: <path/link>
- Measurements: <path/link>
- Runtime asset provenance/reuse check (only if shipping third-party data): <note/n/a>
```

Do not leave completed crop packets in `docs/work/` unless that crop is still active construction. Store accepted compact crop evidence with the eventual vegetable asset/review location chosen by the implementation worklet.