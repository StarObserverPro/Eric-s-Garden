import {
  terrainHeightAt,
  type TerrainVec3,
} from "./terrain-surface";

export const WILDERNESS_VERTEX_STRIDE_FLOATS = 9;

export const WILDERNESS_MATERIAL = {
  wood: 2,
  metal: 3,
  rubber: 4,
  foliage: 5,
  hay: 6,
} as const;

type Vec3 = TerrainVec3;
type Rng = () => number;

export interface WildernessSceneryStats {
  readonly gateTriangles: number;
  readonly tractorTriangles: number;
  readonly workCornerTriangles: number;
  readonly boundaryTriangles: number;
  readonly triangleCount: number;
  readonly vertexCount: number;
}

export interface WildernessSceneryGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: WildernessSceneryStats;
}

/**
 * P0 countryside dressing. Everything returned here is static world geometry
 * that is folded into the existing hardscape draw. All roots/wheels query the
 * same analytic terrain authority as the visible ground; there are no floating
 * terrain cards or a second scene graph.
 */
export function createWildernessSceneryGeometryData(): WildernessSceneryGeometryData {
  const output: number[] = [];

  const gateStart = triangleCount(output);
  appendOpenGate(output);
  const gateTriangles = triangleCount(output) - gateStart;

  const tractorStart = triangleCount(output);
  appendCompactTractor(output);
  const tractorTriangles = triangleCount(output) - tractorStart;

  const workStart = triangleCount(output);
  appendWorkCorner(output);
  const workCornerTriangles = triangleCount(output) - workStart;

  const boundaryStart = triangleCount(output);
  appendFieldBoundaries(output);
  const boundaryTriangles = triangleCount(output) - boundaryStart;

  const total = triangleCount(output);
  return {
    data: new Float32Array(output) as Float32Array<ArrayBuffer>,
    stats: {
      gateTriangles,
      tractorTriangles,
      workCornerTriangles,
      boundaryTriangles,
      triangleCount: total,
      vertexCount: total * 3,
    },
  };
}

function appendOpenGate(output: number[]): void {
  // East-side gate, swung outward so the gap itself remains visually obvious.
  const pivot: Vec3 = [4.82, terrainHeightAt(4.82, -1.22), -1.22];
  const yaw = -0.63;
  appendCylinder(output, add(pivot, [0, 0.49, 0]), 0.075, 0.98, 8, WILDERNESS_MATERIAL.wood, 0.21);

  const gateLength = 1.88;
  for (const height of [0.28, 0.67]) {
    appendBeam(output, add(pivot, [0, height, 0]), gateLength, 0.062, 0.072, yaw, WILDERNESS_MATERIAL.wood, 0.33 + height);
  }
  const end = add(pivot, [Math.cos(yaw) * gateLength, 0, Math.sin(yaw) * gateLength]);
  appendCylinder(output, add(end, [0, 0.46, 0]), 0.064, 0.92, 8, WILDERNESS_MATERIAL.wood, 0.57);
  appendBeam(output, add(pivot, [0, 0.30, 0]), gateLength * 1.01, 0.037, 0.045, yaw + 0.19, WILDERNESS_MATERIAL.wood, 0.71);
}

function appendCompactTractor(output: number[]): void {
  // A small 1950s-style utility tractor parked just beyond the east gate.
  const x = 9.45;
  const z = 0.78;
  const ground = averageTerrain([
    [x - 1.3, z - 0.8], [x - 1.3, z + 0.8],
    [x + 1.3, z - 0.8], [x + 1.3, z + 0.8],
  ]);
  const green = WILDERNESS_MATERIAL.metal;
  const rubber = WILDERNESS_MATERIAL.rubber;
  const metal = WILDERNESS_MATERIAL.metal;

  // Main chassis, engine cowling, radiator nose and rear transmission case.
  appendBox(output, [x, ground + 0.62, z], [2.20, 0.26, 0.54], 0, green, 0.11, 0);
  appendRoundedBox(output, [x + 0.58, ground + 0.93, z], [1.35, 0.54, 0.66], 0, green, 0.17);
  appendBox(output, [x + 1.29, ground + 0.89, z], [0.20, 0.48, 0.70], 0, metal, 0.23, 1);
  appendRoundedBox(output, [x - 0.70, ground + 0.82, z], [0.66, 0.62, 0.70], 0, green, 0.29);

  // Four deeply readable wheels. Rear pair intentionally large, front pair small.
  for (const side of [-1, 1]) {
    const rearZ = z + side * 0.66;
    const rearGround = terrainHeightAt(x - 0.78, rearZ);
    appendTorus(output, [x - 0.78, rearGround + 0.51, rearZ], 0.44, 0.15, 24, 8, rubber, 0.37 + side * 0.03);
    appendCylinderAlongZ(output, [x - 0.78, rearGround + 0.51, rearZ], 0.24, 0.16, 12, metal, 0.41);

    const frontZ = z + side * 0.51;
    const frontGround = terrainHeightAt(x + 1.02, frontZ);
    appendTorus(output, [x + 1.02, frontGround + 0.34, frontZ], 0.29, 0.105, 20, 7, rubber, 0.49 + side * 0.02);
    appendCylinderAlongZ(output, [x + 1.02, frontGround + 0.34, frontZ], 0.16, 0.13, 10, metal, 0.53);
  }

  // Seat, steering column/wheel and exhaust are deliberately exaggerated enough
  // to make the tractor silhouette legible from the garden camera distances.
  appendBox(output, [x - 0.66, ground + 1.35, z], [0.40, 0.09, 0.48], -0.12, rubber, 0.59, 1);
  appendCylinder(output, [x - 0.28, ground + 1.35, z], 0.035, 0.52, 8, metal, 0.62);
  appendTorusVertical(output, [x - 0.18, ground + 1.58, z], 0.18, 0.025, 16, 5, rubber, 0.66);
  appendCylinder(output, [x + 0.72, ground + 1.38, z - 0.18], 0.055, 0.86, 10, metal, 0.70);
  appendCylinder(output, [x + 0.72, ground + 1.84, z - 0.18], 0.085, 0.10, 10, metal, 0.73);

  // Small headlamps, axle and fender blocks add old-machine character without a
  // vehicle asset framework.
  for (const side of [-1, 1]) {
    appendCylinderAlongX(output, [x + 1.20, ground + 1.04, z + side * 0.34], 0.095, 0.10, 10, metal, 0.77);
    appendCurvedFender(output, [x - 0.78, ground + 0.87, z + side * 0.66], side, green, 0.81);
  }
  appendCylinderAlongZ(output, [x + 0.92, ground + 0.54, z], 0.095, 1.15, 12, metal, 0.87);
}

function appendWorkCorner(output: number[]): void {
  // Small two-wheel trailer following the same road direction.
  const x = 6.95;
  const z = 1.26;
  const ground = averageTerrain([[x - 1, z - 0.7], [x - 1, z + 0.7], [x + 1, z - 0.7], [x + 1, z + 0.7]]);
  appendBox(output, [x, ground + 0.54, z], [1.75, 0.18, 1.06], 0.035, WILDERNESS_MATERIAL.wood, 0.15, 0);
  appendBox(output, [x, ground + 0.86, z - 0.51], [1.75, 0.54, 0.09], 0.035, WILDERNESS_MATERIAL.wood, 0.19, 0);
  appendBox(output, [x, ground + 0.86, z + 0.51], [1.75, 0.54, 0.09], 0.035, WILDERNESS_MATERIAL.wood, 0.23, 0);
  for (const side of [-1, 1]) {
    const wheelZ = z + side * 0.62;
    const wheelGround = terrainHeightAt(x - 0.15, wheelZ);
    appendTorus(output, [x - 0.15, wheelGround + 0.31, wheelZ], 0.27, 0.09, 18, 7, WILDERNESS_MATERIAL.rubber, 0.29 + side * 0.03);
    appendCylinderAlongZ(output, [x - 0.15, wheelGround + 0.31, wheelZ], 0.14, 0.12, 10, WILDERNESS_MATERIAL.metal, 0.35);
  }
  appendBeam(output, [x + 0.90, ground + 0.48, z], 1.95, 0.055, 0.055, 0, WILDERNESS_MATERIAL.metal, 0.39);

  // Hay bales, one crate, one barrel and a leaning hand tool establish a compact
  // work vignette instead of leaving the tractor as a lone display model.
  for (let index = 0; index < 3; index += 1) {
    const bx = 7.75 + index * 0.55;
    const bz = 2.65 + (index % 2) * 0.42;
    const by = terrainHeightAt(bx, bz) + 0.34;
    appendCylinderAlongZ(output, [bx, by, bz], 0.32, 0.48, 16, WILDERNESS_MATERIAL.hay, 0.45 + index * 0.07);
    appendTorus(output, [bx, by, bz - 0.245], 0.285, 0.014, 16, 4, WILDERNESS_MATERIAL.wood, 0.48 + index * 0.06);
  }

  const crateX = 8.93;
  const crateZ = 2.05;
  const crateY = terrainHeightAt(crateX, crateZ);
  appendCrate(output, [crateX, crateY + 0.28, crateZ], [0.58, 0.52, 0.52], -0.16, 0.61);

  const barrelX = 8.15;
  const barrelZ = -0.18;
  const barrelY = terrainHeightAt(barrelX, barrelZ);
  appendCylinder(output, [barrelX, barrelY + 0.38, barrelZ], 0.25, 0.76, 16, WILDERNESS_MATERIAL.wood, 0.69);
  for (const offset of [-0.23, 0.23]) {
    appendTorusVertical(output, [barrelX, barrelY + 0.38 + offset, barrelZ], 0.255, 0.017, 16, 4, WILDERNESS_MATERIAL.metal, 0.74);
  }

  const toolRoot: Vec3 = [7.66, terrainHeightAt(7.66, -0.42) + 0.02, -0.42];
  appendBeam(output, add(toolRoot, [0, 0.58, 0]), 1.18, 0.026, 0.026, 1.52, WILDERNESS_MATERIAL.wood, 0.82, Math.PI * 0.46);
  appendBox(output, add(toolRoot, [0.02, 1.14, -0.02]), [0.08, 0.34, 0.26], 0.03, WILDERNESS_MATERIAL.metal, 0.88, 0);
}

function appendFieldBoundaries(output: number[]): void {
  const rng = mulberry32(0x5f3759df);

  // Broken southwest hedge: staggered grounded masses and visible gaps, never a wall.
  const hedgeCenters: readonly Vec3[] = [
    [-14.5, 0, -9.5], [-12.8, 0, -9.0], [-10.9, 0, -8.7],
    [-8.7, 0, -8.0], [-6.8, 0, -7.2],
  ];
  for (let index = 0; index < hedgeCenters.length; index += 1) {
    const source = hedgeCenters[index]!;
    const x = source[0] + (rng() - 0.5) * 0.45;
    const z = source[2] + (rng() - 0.5) * 0.45;
    const y = terrainHeightAt(x, z);
    appendBushCluster(output, [x, y, z], 1.05 + rng() * 0.55, 0.64 + rng() * 0.34, rng, 0.13 + index * 0.08);
  }

  // Northeast orchard/tree group gives a separate vertical anchor.
  const trees: readonly (readonly [number, number, number])[] = [
    [15.5, -9.5, 1.05], [18.2, -7.8, 1.18], [20.4, -10.6, 0.98],
    [17.0, -12.4, 0.92], [22.4, -8.6, 0.86],
  ];
  for (let index = 0; index < trees.length; index += 1) {
    const [x, z, scale] = trees[index]!;
    appendTree(output, x, z, scale, rng, 0.49 + index * 0.07);
  }

  // A much farther pair is intentionally coarse: skyline punctuation only.
  appendTree(output, -32.5, 24.0, 1.32, rng, 0.84, true);
  appendTree(output, -27.0, 27.5, 1.08, rng, 0.91, true);
}

function appendTree(output: number[], x: number, z: number, scale: number, rng: Rng, seed: number, coarse = false): void {
  const ground = terrainHeightAt(x, z);
  const trunkHeight = (coarse ? 2.0 : 2.45) * scale;
  appendCylinder(output, [x, ground + trunkHeight * 0.5, z], 0.16 * scale, trunkHeight, coarse ? 6 : 9, WILDERNESS_MATERIAL.wood, seed);

  const crownY = ground + trunkHeight + 0.75 * scale;
  const blobs = coarse ? 2 : 4;
  for (let index = 0; index < blobs; index += 1) {
    const angle = (index / blobs) * Math.PI * 2 + seed * 3.0;
    const radius = (0.88 + rng() * 0.38) * scale;
    const center: Vec3 = [
      x + Math.cos(angle) * radius * (coarse ? 0.22 : 0.38),
      crownY + (rng() - 0.5) * 0.55 * scale,
      z + Math.sin(angle) * radius * (coarse ? 0.22 : 0.38),
    ];
    appendLowPolyBlob(output, center, [radius, radius * (0.82 + rng() * 0.25), radius], coarse ? 1 : 2, WILDERNESS_MATERIAL.foliage, seed + index * 0.11);
  }
}

function appendBushCluster(output: number[], center: Vec3, width: number, height: number, rng: Rng, seed: number): void {
  // One broad body owns the silhouette and is sunk slightly below the sampled
  // terrain. Smaller closed lobes build an irregular top edge. This reads as a
  // grounded hedge mass instead of three detached tumbleweed-like spheres.
  const lobes = [
    [0.00, 0.00, 0.46, 0.78, 0.58, 0.56, 2],
    [-0.34, -0.10, 0.62, 0.50, 0.48, 0.43, 1],
    [0.35, 0.08, 0.60, 0.54, 0.52, 0.45, 1],
    [-0.06, 0.28, 0.55, 0.48, 0.46, 0.40, 1],
  ] as const;

  for (let index = 0; index < lobes.length; index += 1) {
    const [lx, lz, lift, rx, ry, rz, subdivisions] = lobes[index]!;
    const x = center[0] + lx * width + (rng() - 0.5) * width * 0.05;
    const z = center[2] + lz * width + (rng() - 0.5) * width * 0.05;
    const ground = terrainHeightAt(x, z);
    appendLowPolyBlob(
      output,
      [x, ground + height * lift, z],
      [
        width * rx * (0.94 + rng() * 0.10),
        height * ry * (0.94 + rng() * 0.10),
        width * rz * (0.94 + rng() * 0.10),
      ],
      subdivisions,
      WILDERNESS_MATERIAL.foliage,
      seed + index * 0.09,
    );
  }

  // Short woody stems are mostly occluded by the foliage body, but the glimpses
  // at the lower edge make the object read as a rooted shrub rather than a ball.
  for (let index = 0; index < 2; index += 1) {
    const x = center[0] + (index === 0 ? -0.16 : 0.18) * width;
    const z = center[2] + (index === 0 ? 0.05 : -0.08) * width;
    const ground = terrainHeightAt(x, z);
    const stemHeight = height * (0.42 + index * 0.04);
    appendCylinder(
      output,
      [x, ground + stemHeight * 0.5, z],
      width * 0.028,
      stemHeight,
      6,
      WILDERNESS_MATERIAL.wood,
      seed + 0.51 + index * 0.07,
    );
  }
}

function appendCurvedFender(output: number[], center: Vec3, side: number, material: number, seed: number): void {
  const segments = 10;
  const width = 0.20;
  for (let segment = 0; segment < segments; segment += 1) {
    const a0 = Math.PI * (0.08 + segment / segments * 0.84);
    const a1 = Math.PI * (0.08 + (segment + 1) / segments * 0.84);
    const p0: Vec3 = [center[0] + Math.cos(a0) * 0.56, center[1] + Math.sin(a0) * 0.56, center[2] - side * width * 0.5];
    const p1: Vec3 = [center[0] + Math.cos(a1) * 0.56, center[1] + Math.sin(a1) * 0.56, center[2] - side * width * 0.5];
    const p2: Vec3 = [p1[0], p1[1], center[2] + side * width * 0.5];
    const p3: Vec3 = [p0[0], p0[1], center[2] + side * width * 0.5];
    pushQuad(output, p0, p1, p2, p3, material, seed + segment * 0.017, 1);
  }
}

function appendCrate(output: number[], center: Vec3, size: Vec3, yaw: number, seed: number): void {
  appendBox(output, center, size, yaw, WILDERNESS_MATERIAL.wood, seed, 0);
  const halfX = size[0] * 0.5;
  const halfY = size[1] * 0.5;
  const halfZ = size[2] * 0.5;
  for (const localZ of [-halfZ - 0.015, halfZ + 0.015]) {
    for (const localY of [-halfY * 0.55, halfY * 0.55]) {
      const p = rotateLocal([0, localY, localZ], yaw);
      appendBeam(output, add(center, p), size[0] * 1.03, 0.034, 0.036, yaw, WILDERNESS_MATERIAL.wood, seed + localY + localZ);
    }
  }
}

function appendRoundedBox(output: number[], center: Vec3, size: Vec3, yaw: number, material: number, seed: number): void {
  appendBox(output, center, size, yaw, material, seed, 0);
  const noseX = center[0] + size[0] * 0.48;
  appendCylinderAlongX(output, [noseX, center[1], center[2]], Math.min(size[1], size[2]) * 0.47, 0.12, 12, material, seed + 0.03);
}

function appendBox(output: number[], center: Vec3, size: Vec3, yaw: number, material: number, seed: number, part: number): void {
  const hx = size[0] * 0.5;
  const hy = size[1] * 0.5;
  const hz = size[2] * 0.5;
  const faces: readonly (readonly [Vec3, Vec3, Vec3, Vec3])[] = [
    [[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]],
    [[-hx, -hy, hz], [-hx, -hy, -hz], [-hx, hy, -hz], [-hx, hy, hz]],
    [[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]],
    [[-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz], [-hx, -hy, -hz]],
    [[-hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz], [hx, -hy, hz]],
    [[hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, -hz]],
  ];
  for (let index = 0; index < faces.length; index += 1) {
    const face = faces[index]!;
    const points = face.map((point) => add(center, rotateLocal(point, yaw))) as [Vec3, Vec3, Vec3, Vec3];
    pushQuad(output, points[0], points[1], points[2], points[3], material, seed + index * 0.011, part);
  }
}

function appendBeam(
  output: number[],
  center: Vec3,
  length: number,
  height: number,
  depth: number,
  yaw: number,
  material: number,
  seed: number,
  pitch = 0,
): void {
  if (Math.abs(pitch) < 1e-5) {
    appendBox(output, [center[0] + Math.cos(yaw) * length * 0.5, center[1], center[2] + Math.sin(yaw) * length * 0.5], [length, height, depth], yaw, material, seed, 1);
    return;
  }
  const direction: Vec3 = [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)];
  const right: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const up = normalize(cross(right, direction));
  const middle = add(center, scale(direction, length * 0.5));
  appendOrientedBox(output, middle, direction, up, right, [length, height, depth], material, seed);
}

function appendOrientedBox(output: number[], center: Vec3, forward: Vec3, up: Vec3, right: Vec3, size: Vec3, material: number, seed: number): void {
  const hx = size[0] * 0.5;
  const hy = size[1] * 0.5;
  const hz = size[2] * 0.5;
  const point = (x: number, y: number, z: number): Vec3 => add(center, add(scale(forward, x), add(scale(up, y), scale(right, z))));
  const faces: readonly (readonly [Vec3, Vec3, Vec3, Vec3])[] = [
    [point(hx, -hy, -hz), point(hx, -hy, hz), point(hx, hy, hz), point(hx, hy, -hz)],
    [point(-hx, -hy, hz), point(-hx, -hy, -hz), point(-hx, hy, -hz), point(-hx, hy, hz)],
    [point(-hx, hy, -hz), point(hx, hy, -hz), point(hx, hy, hz), point(-hx, hy, hz)],
    [point(-hx, -hy, hz), point(hx, -hy, hz), point(hx, -hy, -hz), point(-hx, -hy, -hz)],
    [point(-hx, -hy, hz), point(-hx, hy, hz), point(hx, hy, hz), point(hx, -hy, hz)],
    [point(hx, -hy, -hz), point(hx, hy, -hz), point(-hx, hy, -hz), point(-hx, -hy, -hz)],
  ];
  for (let index = 0; index < faces.length; index += 1) {
    const f = faces[index]!;
    pushQuad(output, f[0], f[1], f[2], f[3], material, seed + index * 0.013, 1);
  }
}

function appendCylinder(output: number[], center: Vec3, radius: number, height: number, segments: number, material: number, seed: number): void {
  const bottomY = center[1] - height * 0.5;
  const topY = center[1] + height * 0.5;
  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const b0: Vec3 = [center[0] + Math.cos(a0) * radius, bottomY, center[2] + Math.sin(a0) * radius];
    const b1: Vec3 = [center[0] + Math.cos(a1) * radius, bottomY, center[2] + Math.sin(a1) * radius];
    const t0: Vec3 = [b0[0], topY, b0[2]];
    const t1: Vec3 = [b1[0], topY, b1[2]];
    pushQuad(output, b0, b1, t1, t0, material, seed + index * 0.007, 0);
    pushFlatTriangle(output, [center[0], topY, center[2]], t0, t1, material, seed, 1);
    pushFlatTriangle(output, [center[0], bottomY, center[2]], b1, b0, material, seed, 1);
  }
}

function appendCylinderAlongZ(output: number[], center: Vec3, radius: number, length: number, segments: number, material: number, seed: number): void {
  const half = length * 0.5;
  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const p0: Vec3 = [center[0] + Math.cos(a0) * radius, center[1] + Math.sin(a0) * radius, center[2] - half];
    const p1: Vec3 = [center[0] + Math.cos(a1) * radius, center[1] + Math.sin(a1) * radius, center[2] - half];
    const p2: Vec3 = [p1[0], p1[1], center[2] + half];
    const p3: Vec3 = [p0[0], p0[1], center[2] + half];
    pushQuad(output, p0, p1, p2, p3, material, seed + index * 0.009, 0);
    pushFlatTriangle(output, [center[0], center[1], center[2] - half], p1, p0, material, seed, 1);
    pushFlatTriangle(output, [center[0], center[1], center[2] + half], p3, p2, material, seed, 1);
  }
}

function appendCylinderAlongX(output: number[], center: Vec3, radius: number, length: number, segments: number, material: number, seed: number): void {
  const half = length * 0.5;
  for (let index = 0; index < segments; index += 1) {
    const a0 = index / segments * Math.PI * 2;
    const a1 = (index + 1) / segments * Math.PI * 2;
    const p0: Vec3 = [center[0] - half, center[1] + Math.cos(a0) * radius, center[2] + Math.sin(a0) * radius];
    const p1: Vec3 = [center[0] - half, center[1] + Math.cos(a1) * radius, center[2] + Math.sin(a1) * radius];
    const p2: Vec3 = [center[0] + half, p1[1], p1[2]];
    const p3: Vec3 = [center[0] + half, p0[1], p0[2]];
    pushQuad(output, p0, p1, p2, p3, material, seed + index * 0.009, 0);
    pushFlatTriangle(output, [center[0] - half, center[1], center[2]], p1, p0, material, seed, 1);
    pushFlatTriangle(output, [center[0] + half, center[1], center[2]], p3, p2, material, seed, 1);
  }
}

function appendTorus(output: number[], center: Vec3, major: number, minor: number, majorSegments: number, minorSegments: number, material: number, seed: number): void {
  for (let u = 0; u < majorSegments; u += 1) {
    const u0 = u / majorSegments * Math.PI * 2;
    const u1 = (u + 1) / majorSegments * Math.PI * 2;
    for (let v = 0; v < minorSegments; v += 1) {
      const v0 = v / minorSegments * Math.PI * 2;
      const v1 = (v + 1) / minorSegments * Math.PI * 2;
      const point = (ua: number, va: number): Vec3 => {
        const radial = major + Math.cos(va) * minor;
        return [center[0] + Math.cos(ua) * radial, center[1] + Math.sin(ua) * radial, center[2] + Math.sin(va) * minor];
      };
      pushQuad(output, point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1), material, seed + u * 0.003 + v * 0.001, 0);
    }
  }
}

function appendTorusVertical(output: number[], center: Vec3, major: number, minor: number, majorSegments: number, minorSegments: number, material: number, seed: number): void {
  for (let u = 0; u < majorSegments; u += 1) {
    const u0 = u / majorSegments * Math.PI * 2;
    const u1 = (u + 1) / majorSegments * Math.PI * 2;
    for (let v = 0; v < minorSegments; v += 1) {
      const v0 = v / minorSegments * Math.PI * 2;
      const v1 = (v + 1) / minorSegments * Math.PI * 2;
      const point = (ua: number, va: number): Vec3 => {
        const radial = major + Math.cos(va) * minor;
        return [center[0] + Math.cos(ua) * radial, center[1] + Math.sin(va) * minor, center[2] + Math.sin(ua) * radial];
      };
      pushQuad(output, point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1), material, seed + u * 0.003 + v * 0.001, 0);
    }
  }
}

function appendLowPolyBlob(output: number[], center: Vec3, radius: Vec3, subdivisions: number, material: number, seed: number): void {
  // Start from an octahedron and split each face. Flat shading is kept, but
  // deformation belongs to logical vertices rather than individual faces.
  // That distinction is what keeps every subdivided edge geometrically closed.
  let faces: [Vec3, Vec3, Vec3][] = [
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1], [-1, 0, 0]],
    [[0, 1, 0], [-1, 0, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, -1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [-1, 0, 0], [0, 0, 1]],
    [[0, -1, 0], [0, 0, -1], [-1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ];
  for (let level = 0; level < subdivisions; level += 1) {
    const next: [Vec3, Vec3, Vec3][] = [];
    for (const [a, b, c] of faces) {
      const ab = normalize(add(a, b));
      const bc = normalize(add(b, c));
      const ca = normalize(add(c, a));
      next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    faces = next;
  }

  const transformed = new Map<string, Vec3>();
  const transform = (point: Vec3): Vec3 => {
    const key = `${Math.round(point[0] * 1_000_000)}:${Math.round(point[1] * 1_000_000)}:${Math.round(point[2] * 1_000_000)}`;
    const cached = transformed.get(key);
    if (cached) return cached;
    const warp = 0.91 + hash2(
      seed * 13 + point[0] * 37 + point[1] * 17,
      seed * 19 + point[2] * 29 - point[1] * 11,
    ) * 0.18;
    const value: Vec3 = [
      center[0] + point[0] * radius[0] * warp,
      center[1] + point[1] * radius[1] * warp,
      center[2] + point[2] * radius[2] * warp,
    ];
    transformed.set(key, value);
    return value;
  };

  for (let index = 0; index < faces.length; index += 1) {
    const [a, b, c] = faces[index]!;
    pushFlatTriangle(output, transform(a), transform(b), transform(c), material, seed + index * 0.001, 0);
  }
}

function pushQuad(output: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3, material: number, seed: number, part: number): void {
  pushFlatTriangle(output, a, b, c, material, seed, part);
  pushFlatTriangle(output, a, c, d, material, seed, part);
}

function pushFlatTriangle(output: number[], a: Vec3, b: Vec3, c: Vec3, material: number, seed: number, part: number): void {
  let normal = normalize(cross(subtract(b, a), subtract(c, a)));
  if (normal[1] < -0.90) normal = scale(normal, -1);
  for (const point of [a, b, c]) {
    output.push(
      point[0], point[1], point[2],
      normal[0], normal[1], normal[2],
      material, seed, part,
    );
  }
}

function triangleCount(output: readonly number[]): number {
  return output.length / (WILDERNESS_VERTEX_STRIDE_FLOATS * 3);
}

function averageTerrain(points: readonly (readonly [number, number])[]): number {
  return points.reduce((sum, [x, z]) => sum + terrainHeightAt(x, z), 0) / Math.max(1, points.length);
}

function rotateLocal(value: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [value[0] * c - value[2] * s, value[1], value[0] * s + value[2] * c];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(value: Vec3, amount: number): Vec3 {
  return [value[0] * amount, value[1] * amount, value[2] * amount];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 0.000001) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
}

function hash2(x: number, z: number): number {
  const sine = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return sine - Math.floor(sine);
}

function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
