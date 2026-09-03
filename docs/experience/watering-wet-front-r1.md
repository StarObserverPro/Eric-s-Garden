# Watering wet-front R1 experience

## The useful seam is binary gameplay state plus continuous render state

`plot.watered` should remain a simple gameplay/save fact. The renderer can detect the dry-to-wet transition and own a short visual progress value without adding a second game state or persisting GPU/transient data. This keeps growth rules, saves and Canvas fallback semantics unchanged while allowing a visibly continuous watering action.

## An analytic wet front is enough for twelve small fixed beds

For the current garden, a moisture texture or ping-pong/compute simulation would add resource lifetime, update and verification cost without yet buying a product capability we need. A seeded analytic field in the soil fragment shader can give the important visual cues cheaply:

- several offset wet lobes rather than one circular disk;
- low-frequency noise on each advancing boundary;
- a few early isolated splash islands;
- deterministic per-bed variation;
- a guaranteed fully saturated state at the end of the 1–3 second transition.

Escalate to a real spatial moisture buffer only if the product later needs persistent drying, runoff, arbitrary moving emitters, overlapping watering histories, or bed shapes that the local analytic field cannot represent convincingly.

## Reuse proportions, not scene-graph ownership

Crystal Garden's `long-spout-can` was useful as a modeling reference: tapered green body, high curved handle, long brass spout and a wider rose. Eric's Garden reimplements that silhouette as local vgpu vertex data instead of importing Three.js objects or creating a second scene graph. One extra dynamic draw is enough for the tool and pour strands, and the existing vgpu renderer remains the sole WebGPU frame/resource owner.

## Keep the animation renderer-local and interruptible

Each bed's wet progress can continue independently after a click. The visible can follows the latest watering action, so rapid clicks do not stall earlier wet fronts or require a gameplay queue. If user testing shows that rapid watering makes the tool motion confusing, add a tiny renderer-only visual queue; do not serialize it or make growth depend on animation completion.

## Pixel evidence should compare semantic states, not magic color counts

Software-renderer readback is useful here, but the assertion has to follow the visual contract. A fixed number of changed pixels at an intermediate wetting time is brittle because projected bed area changes with camera and resolution. Use the fully wet version of the same bed as the local denominator: give the full state an absolute visibility floor, then require the partial state to occupy a non-zero but clearly smaller share of that exact target.

The same rule applies to the pour. Do not infer water presence by requiring a fixed number of sufficiently blue pixels: garden lighting and fog legitimately change the rendered RGB ratio. Render the identical watering-can pose once without water-strand geometry and once with it, then compare the two frames. That isolates the actual pour contribution and can additionally require a vertical span, which is closer to the intended narrow-stream silhouette than a color classifier.

## Verification boundary

The important direct evidence is deterministic timing tests, watering-can geometry checks, WGSL validation, vgpu mock compilation/draw, and a representative WebGPU browser path because this work touches the renderer integration file. Visual acceptance still requires looking at the actual wet-front shape and can proportions; a green build proves compatibility, not taste.
