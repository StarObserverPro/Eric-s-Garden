# Eric 的秘密菜园

A child-facing garden game and a deliberately small vgpu proving ground.

The current slice keeps the original five-level R2 game intact while adding the non-vegetable parts of Phase 1 and Phase 2:

- procedural soil connected to the existing watering state;
- a low-poly grass island, stone path and wooden fence;
- instanced grass with sparse wildflowers and vertex-shader wind;
- simple sky, sunlight, cloud shadow and level-driven weather;
- 500 / 1,500 / 4,000 vegetation tiers and explicit DPR caps;
- a playable Canvas 2D fallback for missing WebGPU, initialization failure, render failure and device loss.

Vegetable geometry is intentionally deferred. In the vgpu view, the original crop emoji are temporarily projected from the same camera and scene snapshot. They own no game state and are the narrow replacement seam for the vegetable thread.

## Run locally

Node 22 is required.

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:4173`.

## Verify

```bash
npm run check
```

This runs:

1. `vgpu check` for the WGSL modules;
2. Vitest coverage of the R2 game contract and renderer-neutral snapshot;
3. a vgpu mock compile/record test for the procedural soil shader;
4. a Dawn-backed `vgpu/node` frame and readback;
5. strict TypeScript plus the production Vite build.

## Static production output

```bash
npm run build
```

The deployable site is `dist/`. Runtime production remains static: no backend, database, CDN model, image service or server function is required.

## Renderer ownership

```text
DOM / CSS UI
  -> game model
  -> GardenSceneSnapshot
  -> RenderRuntime                  (the only requestAnimationFrame owner)
      -> VgpuRenderer               (preferred when supported)
      -> Canvas2DRenderer           (playable fallback)
```

Only one renderer is visible and updated at a time. The vgpu path owns one `Gpu` context and uses manual `frame(gpu, callback)` submissions inside the shared runtime loop. Raw WebGPU access is restricted to `src/render/vgpu/raw/`.

## Scene layers in the vgpu path

- **Sky pass:** weather gradient, sun glow and moving cloud cover.
- **World pass:**
  - static render bundle: ground, path and fence;
  - procedural soil bundle: twelve bed instances with wetness uniforms;
  - vegetation bundle: one instanced grass/wildflower draw with GPU wind.
- **Blit pass:** offscreen depth target to the canvas surface.

The collapsed **画面** panel in the garden reports the active renderer, FPS, CPU frame time, passes, draws, instances, resources and effective DPR. Rendering preferences are stored separately from the game save.

## Persistence

- Game save: `eric-secret-garden-r2`
- Rendering preferences: `eric-secret-garden-render-r1`

The first key and its gameplay meaning are preserved from R2.

## Important paths

```text
src/game/                  one serializable game model
src/scene/                 renderer-neutral scene snapshot
src/render/contract.ts     renderer and quality contracts
src/render/runtime.ts      one active renderer / one frame owner
src/render/canvas2d/       playable fallback
src/render/vgpu/           vgpu scene, geometry and WGSL
src/render/vgpu/raw/       narrow raw WebGPU adapters only
src/diagnostics/           render metrics panel binding
tests/                     game, snapshot, mock and Node checks
docs/work/                 active construction packet
docs/experience/           reusable implementation lessons
```

## Scope boundary

This repository is not becoming a general game engine. The current work does **not** add vegetable meshes or shaders, alter crop balance or growth rules, create a second scene graph, or introduce accounts, multiplayer, physics, an editor or a backend.
