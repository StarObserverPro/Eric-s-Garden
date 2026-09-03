# Experience note: recover render mechanisms, not a foreign runtime

This note records the reusable part of recovering visual ideas from an external rendering demo. It is cold experience, not a boot requirement.

## The useful boundary

An external demo may contain excellent sky, vegetation, wind, color and material work while using the wrong runtime for Eric's Garden. Separate those two layers before porting:

**Portable:** equations, deterministic placement, geometry profiles, palette relationships, lighting ratios, fog models, temporal/spatial wind functions, material heuristics and tuning ranges.

**Non-portable by default:** its scene graph, renderer/device, frame loop, camera controller, UI state, framework shell, deployment setup and asset ownership model.

For the wind-meadow source, the reusable chain was:

```text
segmented blade profile
+ spatial gust / eddy field
+ root occlusion and back-light response
+ camera-consistent sun/sky relationships
+ warm direct light + cool ambient light + distance fog
        ↓
existing GardenSceneSnapshot weather
        ↓
existing VgpuRenderer / one frame owner / one WebGPU context
```

The Three.js/WebGL shell never entered the repository.

## Port product state only when the product asks for it

The reference demo had season and time-of-day controls. Those are not automatically product requirements. Do not create new save/game state merely because a source demo exposes a useful tuning axis.

In this recovery, existing level weather remains authoritative for wind, cloud, rain and sunlight. Additional sun/ambient/fog values are renderer-neutral presentation parameters attached to that same weather profile rather than a second clock or environment state machine.

## Verification boundary

A successful source transplant needs three different checks:

1. validate every new WGSL module with the repository-pinned vgpu toolchain;
2. compile/record the changed geometry + shader contract in focused mock/Node tests;
3. inspect the actual vgpu browser frame for aesthetic claims.

The first two prove compatibility and wiring. They do not prove that grass density, sun placement or color balance looks right on a real WebGPU browser. Keep that visual claim explicitly separate.

## Reuse rule

When another external visual package arrives, first write down:

- the renderer-independent mechanisms worth keeping;
- the foreign ownership/runtime pieces that must stay out;
- the existing garden carrier that will own each mechanism;
- the smallest focused evidence for the port.

If a mechanism cannot fit the current scene snapshot → one renderer → one frame-owner chain without introducing a parallel world, treat it as an architecture proposal rather than a visual recovery.
