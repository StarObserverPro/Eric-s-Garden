---
name: render-visual-qa
description: Reproduce, diagnose, and verify browser rendering problems in Eric's Garden across the vgpu/WebGPU path and the playable Canvas fallback. Use for blank or wrong canvases, shader/material/geometry regressions, lighting/weather/soil appearance, renderer fallback, responsive visual problems, and before-after rendering verification.
---

# Render Visual QA

Use the **exact application state** as the source of truth. A standalone shader probe, a build pass, a fallback screenshot, and a real WebGPU browser frame prove different things.

This skill is adapted from Crystal Garden's `webgl-visual-qa` workflow, but Eric's Garden is vgpu/WebGPU-first. Do not import Spector.js or WebGL-only machinery merely to imitate the older project.

## 1. Establish the target

Before diagnosing a visual problem, record:

- exact branch/commit or PR head;
- URL/build being inspected;
- viewport and DPR;
- level/weather/garden state;
- expected active renderer;
- the visible symptom and one acceptance statement.

When comparing before/after, keep camera, viewport, DPR, level, weather, seed/time and quality tier fixed unless the changed variable is the subject of the test.

## 2. Start with repository-owned checks

Use the cheapest layer that can answer the question:

```bash
npm run shader:check
npm run test
npm run build
```

Or use the composed check when the worklet is coherent:

```bash
npm run check
```

Interpret them narrowly:

- shader validation checks WGSL validity under the repository's pinned vgpu toolchain;
- mock/Node tests can prove bounded render contracts and readback;
- production build proves packaging/type/build compatibility;
- none of those proves the intended browser frame is visually correct.

The hosted Verify Canvas screenshot is useful fallback evidence. It is not WebGPU visual evidence.

## 3. Determine which renderer actually ran

For a WebGPU claim, confirm both:

1. the browser has usable WebGPU; and
2. Eric's Garden reports the vgpu renderer as active.

For a fallback claim, confirm Canvas is active for the intended reason rather than because the WebGPU path silently failed.

Never call a Canvas capture a vgpu pass, and never call a software-renderer run target-GPU performance evidence.

## 4. Reproduce before editing

Drive the smallest representative journey that exposes the defect. Prefer application-owned controls and the existing diagnostics panel over arbitrary sleeps or guessed timing.

Capture before changing source:

- screenshot or short recording;
- active renderer;
- console/runtime errors and relevant failed requests;
- viewport/DPR;
- render diagnostics when relevant: FPS, CPU frame time, passes, draws, instances, resources and effective DPR;
- exact state needed to reproduce the frame.

If browser automation or DevTools is available, attach to the same application session rather than launching multiple browsers with different state. Do not add a new browser framework dependency just to take one screenshot unless the task explicitly justifies that infrastructure.

## 5. Classify before escalating

- **Wrong DOM layout, labels, controls, touch targets:** inspect DOM/CSS/input first.
- **Missing asset, navigation error, JS exception, initialization failure:** inspect console/network/runtime first.
- **Canvas exists but scene geometry/material/lighting is wrong:** inspect scene snapshot → renderer inputs → WGSL/material/pass data in that order.
- **Unexpected Canvas fallback:** inspect WebGPU capability, initialization, render failure/device loss, and runtime selection before changing art code.
- **Shader compile/validation failure:** run `npm run shader:check` before browser archaeology.
- **Frame-time or resource spike:** use fixed scene conditions and browser performance/devtools evidence; compare base/head before attributing cost to one draw/pass.

Keep the repository's ownership boundaries intact: game state → renderer-neutral scene snapshot → one frame owner → one active renderer. A visual bug is not permission to create a second scene graph or duplicate game state.

## 6. Make the smallest source change

Fix the owner that actually controls the defect. Do not tune around a broken upstream scene snapshot, hide an initialization failure by forcing Canvas, or move gameplay truth into GPU state.

For vgpu limitations, use the existing raw-WebGPU boundary only when the architecture contract permits it; do not spread native WebGPU calls through feature modules.

## 7. Replay the same state

After the change:

1. rerun the focused repository check;
2. open the same application/build state;
3. reproduce the same viewport/DPR/level/weather/camera/quality conditions;
4. confirm the intended renderer is active;
5. capture the after frame and diagnostics;
6. compare against the baseline and the work packet's acceptance criteria.

A test/build pass without representative visual evidence is insufficient for a visible regression. A prettier screenshot that obscures touch targets, growth state, or feedback is still a regression.

## 8. Fallback and failure testing

Only when the renderer-selection/fallback seam changes, exercise the relevant forced paths:

- WebGPU unsupported;
- vgpu/WebGPU initialization failure;
- render-time failure;
- device loss/re-entry if affected.

The acceptance condition is a playable Canvas fallback rather than a blank or frozen canvas, while preserving the same game model/save semantics.

Do not force every failure mode for an unrelated material or geometry tune.

## 9. Performance boundary

For performance claims, record identified hardware and fixed conditions. At minimum keep constant:

- viewport/DPR;
- vegetation instance tier;
- camera/garden state;
- weather/time;
- warm-up and sample window.

Compare base vs head using FPS/frame time and the diagnostics counters available in the game. Software/CPU rendering is compatibility and determinism evidence, not a substitute for real-GPU frame pacing, memory pressure, mobile thermals, or integrated-GPU performance.

## 10. Evidence closeout

A useful rendering closeout states:

- exact head/build;
- reproduced symptom;
- root cause/owner;
- focused checks run;
- active renderer for the representative capture;
- viewport/DPR/state;
- before/after evidence;
- console/runtime findings;
- performance counters when relevant;
- any claim still `blocked` or `not_checked`.

Follow [`docs/VERIFICATION.md`](../../VERIFICATION.md) for claim boundaries and [`docs/RELEASE_WORKFLOW.md`](../../RELEASE_WORKFLOW.md) if the result proceeds to merge or production deployment.
