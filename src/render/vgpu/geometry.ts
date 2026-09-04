export const VEGETATION_NEAR_TRIANGLES_PER_INSTANCE = 50;
export const VEGETATION_TRIANGLES_PER_INSTANCE = VEGETATION_NEAR_TRIANGLES_PER_INSTANCE;

export function createVegetationVertices(): Float32Array<ArrayBuffer> {
  const output: number[] = [];
  const bladeSegments = [5, 5, 5, 5, 3] as const;
  for (let leaf = 0; leaf < bladeSegments.length; leaf += 1) {
    const segments = bladeSegments[leaf]!;
    for (let segment = 0; segment < segments; segment += 1) {
      const t0 = segment / segments;
      const t1 = (segment + 1) / segments;
      const w0 = bladeProfile(t0) * 0.5;
      const w1 = bladeProfile(t1) * 0.5;
      const a = [-w0, t0, 0] as const;
      const b = [w0, t0, 0] as const;
      const c = [w1, t1, 0] as const;
      const d = [-w1, t1, 0] as const;
      pushTriangle(output, a, b, c, [0, 0, 1], leaf);
      pushTriangle(output, a, c, d, [0, 0, 1], leaf);
    }
  }

  // A tiny crossed flower head is carried by every tuft but becomes a
  // degenerate triangle in the shader for the large majority of instances.
  pushQuad(
    output,
    [-0.48, 0.99, 0],
    [0.48, 0.99, 0],
    [0.30, 1.10, 0],
    [-0.30, 1.10, 0],
    [0, 0, 1],
    5,
  );
  pushQuad(
    output,
    [0, 0.99, -0.48],
    [0, 0.99, 0.48],
    [0, 1.10, 0.30],
    [0, 1.10, -0.30],
    [1, 0, 0],
    5,
  );

  // Keep this draw focused on the garden/fence edge. The former P0 mid/far
  // crossed-card clusters were visually weak countryside fill and cost twelve
  // extra triangles per instance; the user explicitly retired that distant
  // grass layer while keeping this detailed near tuft.
  return new Float32Array(output);
}

function bladeProfile(t: number): number {
  return Math.max(0.055, 1 - Math.pow(t, 1.42));
}

function pushTriangle(
  output: number[],
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
  normal: readonly [number, number, number],
  part: number,
): void {
  for (const point of [a, b, c]) {
    output.push(...point, ...normal, part);
  }
}

function pushQuad(
  output: number[],
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
  d: readonly [number, number, number],
  normal: readonly [number, number, number],
  part: number,
): void {
  pushTriangle(output, a, b, c, normal, part);
  pushTriangle(output, a, c, d, normal, part);
}
