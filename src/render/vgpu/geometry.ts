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
  pushQuad(
    output,
    [-0.18, 0, 0],
    [0.18, 0, 0],
    [0.11, 1, 0],
    [-0.11, 1, 0],
    [0, 0, 1],
    0,
  );
  pushQuad(
    output,
    [0, 0, -0.18],
    [0, 0, 0.18],
    [0, 1, 0.11],
    [0, 1, -0.11],
    [1, 0, 0],
    0,
  );
  pushQuad(
    output,
    [-0.21, 0.96, 0],
    [0.21, 0.96, 0],
    [0, 1.16, 0],
    [0, 0.78, 0],
    [0, 0, 1],
    1,
  );
  pushQuad(
    output,
    [0, 0.96, -0.21],
    [0, 0.96, 0.21],
    [0, 1.16, 0],
    [0, 0.78, 0],
    [1, 0, 0],
    1,
  );
  return new Float32Array(output);
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
  for (const point of [a, b, c, a, c, d]) {
    output.push(...point, ...normal, part);
  }
}
