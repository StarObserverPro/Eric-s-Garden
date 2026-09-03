export function createBoxVertices(): Float32Array<ArrayBuffer> {
  const output: number[] = [];
  const faces = [
    [1, 0, 0, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1],
    [-1, 0, 0, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1],
    [0, 1, 0, -1, 1, -1, -1, 1, 1, 1, 1, 1, 1, 1, -1],
    [0, -1, 0, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1],
    [0, 0, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1],
    [0, 0, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1],
  ] as const;
  for (const face of faces) {
    for (const offset of [3, 6, 9, 3, 9, 12]) {
      output.push(
        face[offset]!,
        face[offset + 1]!,
        face[offset + 2]!,
        face[0],
        face[1],
        face[2],
        0,
      );
    }
  }
  return new Float32Array(output);
}

export function createVegetationVertices(): Float32Array<ArrayBuffer> {
  const output: number[] = [];
  const segments = 5;
  for (let leaf = 0; leaf < 4; leaf += 1) {
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
    4,
  );
  pushQuad(
    output,
    [0, 0.99, -0.48],
    [0, 0.99, 0.48],
    [0, 1.10, 0.30],
    [0, 1.10, -0.30],
    [1, 0, 0],
    4,
  );
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
