export const VEGETATION_NEAR_TRIANGLES_PER_INSTANCE = 50;
export const VEGETATION_MID_CLUSTERS_PER_INSTANCE = 2;
export const VEGETATION_MID_TRIANGLES_PER_CLUSTER = 6;
export const VEGETATION_MID_TRIANGLES_PER_INSTANCE =
  VEGETATION_MID_CLUSTERS_PER_INSTANCE * VEGETATION_MID_TRIANGLES_PER_CLUSTER;
export const VEGETATION_TRIANGLES_PER_INSTANCE =
  VEGETATION_NEAR_TRIANGLES_PER_INSTANCE + VEGETATION_MID_TRIANGLES_PER_INSTANCE;

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

  // P0 keeps the existing detailed tuft and carries two deliberately tiny
  // mid/far clusters in the same instanced draw. Each cluster is three tapered
  // crossed cards (six triangles), so the default 1,500 tier yields 3,000
  // country-grass clusters without a new pass/draw/resource owner.
  for (let cluster = 0; cluster < VEGETATION_MID_CLUSTERS_PER_INSTANCE; cluster += 1) {
    for (let blade = 0; blade < 3; blade += 1) {
      const part = 6 + cluster * 3 + blade;
      const angle = blade / 3 * Math.PI;
      const dx = Math.cos(angle) * 0.5;
      const dz = Math.sin(angle) * 0.5;
      const baseHalf = 0.42;
      const topHalf = 0.10;
      const a = [-dx * baseHalf, 0, -dz * baseHalf] as const;
      const b = [dx * baseHalf, 0, dz * baseHalf] as const;
      const c = [dx * topHalf, 1, dz * topHalf] as const;
      const d = [-dx * topHalf, 1, -dz * topHalf] as const;
      pushQuad(output, a, b, c, d, [dz, 0, -dx], part);
    }
  }
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