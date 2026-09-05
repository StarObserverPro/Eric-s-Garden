# General HUD Art R1 runtime integration

Status: generated WebP pack integrated on a fresh `main` base; weather and arithmetic operators intentionally unchanged.

## Scope

This change replaces the remaining production-facing HUD pictographic placeholders with the generated General HUD Art R1 WebP pack.

- 21 unique symbols are stored at 1x, 2x and 3x under `src/ui/art/general-hud-r1/webp/`.
- 2x is the runtime import; 1x and 3x remain co-located derivatives.
- Main action, care/status, utilities, gestures, learning hint, reward, event-log and WebGPU crop-state surfaces use local WebP.
- Labels, ARIA text, hit targets, game/save state, camera, renderer ownership and layout remain authoritative.
- Existing weather symbols and authored arithmetic operators remain unchanged.

## Source and Drive handoff

Drive master pack: [General HUD Art R1](https://drive.google.com/drive/folders/1Iw2D_R_KAnvDhQHGJzpCE5IEvhzxWb5a)

The Drive pack is grouped into generated sheets, source masters, preview, WebP, and WebP size subfolders. The repository copies are self-contained; the app never reads Drive or the network.

## Runtime contract

`src/ui/general-hud-art.ts` owns image URL mapping and decorative presentation mapping only. Images are `aria-hidden`, have empty alt text and `pointer-events: none`. WebGPU crop badges reuse the same local URLs without changing crop state or GPU draw ownership.

Unlock lettuce/strawberry continues to reuse the existing authored crop symbols, per the General HUD Art spec.
