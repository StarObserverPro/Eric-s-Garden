# Canvas cartoon rendering and ordered integration R1

## Scope
Canvas fallback only: same scene snapshot, parallel/isometric camera, input owner and game/save semantics. Hand-authored local Path2D shapes replace font-dependent crop emoji. No runtime network assets, new dependencies, WebGPU modifications or deployment.

## Spatial rules that mattered
- Project soil tops, visible side faces, stone footprints and contact shadows from the same world X/Z coordinates. Use the existing height scale for verticals. Do not mix screen-sized decorative ellipses with world geometry.
- Determine side visibility from the current camera direction and order every grounded object by current camera depth. World edges have no permanent foreground/background role. Short rail segments avoid one fence edge painting over the entire garden.
- Keep each crop's local origin on the soil top. Draw its bed, contact shadow, crop and status as one depth-ordered plot packet, so a nearer bed can occlude the lower portion of a farther plant.
- Cartoon crops are screen-facing vector cut-outs, not new 3D models. Species identity comes from substantial silhouettes: carrot fronds, corn husks, tomato stem/fruit, pumpkin ribs, lettuce rosette and strawberry calyx.
- Use filled grass blades, filled furrows and rounded rain drops. Bound scene outlines to at least 2 CSS pixels; omit small soil grains on the narrowest view. Crop art caches at most 24 species/stage combinations.

## Picking and browser lessons
The drawing and picking share the painted bed faces and crop paths. Test in reverse paint order; never retain the old nearest screen-circle picker after changing the visible object. Reset the context to identity while testing CSS/local coordinates, otherwise DPR silently shifts hit regions. Keep multiple filled paths as a union of separate hit tests: concatenating opposite path windings can create false holes.

`canvas-projection.test.ts` compares the extracted projection with an independent expression of the old input contract. The separate test-only renderer fixture covers all six crops, four stages, dry/wet/harvested states, weather, quarter-turns, portrait/landscape, DPR 1/2/3, zoom, resize and disposal/re-entry. Synthetic fixture scenes are NOT gameplay evidence and are never imported into production.

The existing production-build five-level mouse/touch journey remains unchanged and provides the gameplay evidence. The Canvas matrix reuses its pinned browser runner and locked esbuild dependency. Both reports and source-tree identifiers are kept in the same Actions artifact. Existing Verify is unchanged; its WebGPU probe only establishes startup/presentation, not full WebGPU playthrough or physical-device performance.

## Source transport
A previously downloaded GitHub workbench can supply a local editor and pinned dependencies, but it is not automatically current main. Verify affected source blobs first and publish only the named changed paths on top of fresh main. Check final artifact source-tree hashes against the reviewed files. Local standalone renderer frames and hosted integrated production screenshots have different claim boundaries.

## Ordered integration on this worklet
User authorized existing PRs and the Canvas change to be merged, not deployed. #28 was merged with ancestry preserved for stacked #30. #29 independently added the same art-ledger path as #28: preserve #28 slot contracts in the ledger and the original #29 direction byte-for-byte in `ARITHMETIC_ART_DIRECTION_R1.md`, with links between them. Do not silently overwrite either source. #30 was retargeted to main, integrated with those documents, and passed Verify 33943622822 and Arithmetic Playability 33943622746 before merging.

Canvas base main is `1bd36be32a29cb15c796df8a2a5f253ff384760f`. Exact final Canvas head, acceptance, artifact links and merge result belong to the PR closeout. Screenshots are verification artifacts, not external production art assets.
