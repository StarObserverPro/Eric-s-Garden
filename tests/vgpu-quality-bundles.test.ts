import { describe, expect, test } from "vitest";
import { draw, frame, init, target, type Frame, type FramePass, type Target } from "vgpu/mock";

import type { InstanceTier } from "../src/render/contract";
import {
  createInstanceTierBundles,
  selectInstanceTierBundle,
} from "../src/render/vgpu/quality-bundles";

const shader = `
@vertex
fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> @builtin(position) vec4f {
  let x = f32(vi) * 0.001 + f32(ii % 10u) * 0.00001;
  return vec4f(x, 0.0, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(0.2, 0.8, 0.3, 1.0);
}
`;

describe("vgpu runtime quality bundles", () => {
  test("prepares reusable bundle variants for one shared draw", async () => {
    const gpu = await init();
    const output = target(gpu, { size: [32, 32], format: "rgba8unorm", depth: true });
    const vegetation = draw(gpu, {
      shader,
      vertices: 3,
      instances: 4000,
      label: "quality-bundle-test",
    });
    await vegetation.compile(output);

    const tiers: InstanceTier[] = [500, 1500, 4000];
    const variants = createInstanceTierBundles(
      gpu,
      output,
      vegetation,
      tiers,
      "quality-bundle-test",
    );

    expect([...variants.keys()]).toEqual(tiers);
    expect(selectInstanceTierBundle(variants, 500)).not.toBe(selectInstanceTierBundle(variants, 1500));
    expect(selectInstanceTierBundle(variants, 1500)).not.toBe(selectInstanceTierBundle(variants, 4000));

    for (const tier of tiers) {
      expect(() => frame(gpu, (current: Frame) => {
        current.pass(
          { target: output, clear: [0, 0, 0, 1], clearDepth: 1 },
          (pass: FramePass) => pass.bundles(selectInstanceTierBundle(variants, tier)),
        );
      })).not.toThrow();
    }

    (output as Target & { destroy(): void }).destroy();
    gpu.dispose();
    expect(gpu.disposed).toBe(true);
  }, 20_000);

  test("rejects an unprepared tier instead of silently rebuilding", async () => {
    const gpu = await init();
    const output = target(gpu, { size: [16, 16], format: "rgba8unorm" });
    const vegetation = draw(gpu, { shader, vertices: 3, instances: 1500 });
    await vegetation.compile(output);
    const variants = createInstanceTierBundles(
      gpu,
      output,
      vegetation,
      [500, 1500],
      "quality-bundle-capped",
    );

    expect(() => selectInstanceTierBundle(variants, 4000)).toThrow(/No render-bundle variant/);

    (output as Target & { destroy(): void }).destroy();
    gpu.dispose();
  }, 20_000);
});
