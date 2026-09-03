import { expect, test } from "vitest";
import { draw, frame, init, target, type Frame, type Target } from "vgpu/node";

test("vgpu node adapter renders one deterministic headless frame", async () => {
  const gpu = await init({ label: "eric-garden-node-smoke" });
  const output = target(gpu, { size: [24, 24], format: "rgba8unorm" });
  const triangle = draw(gpu, {
    shader: `
      @vertex fn vs_main(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
        var positions = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
        return vec4f(positions[vertex], 0, 1);
      }
      @fragment fn fs_main() -> @location(0) vec4f {
        return vec4f(0.2, 0.7, 0.3, 1.0);
      }
    `,
  });
  frame(gpu, (current: Frame) => current.pass(output, triangle));
  const pixels = await output.read();
  expect(pixels.byteLength).toBeGreaterThanOrEqual(24 * 24 * 4);
  (output as Target & { destroy(): void }).destroy();
  gpu.dispose();
}, 30_000);
