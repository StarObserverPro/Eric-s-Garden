import type { CropId } from "../../game/model";

export const CROP_VERTEX_STRIDE_FLOATS = 13;
export const CROP_INSTANCE_COUNT = 12;

export const CROP_KIND: Readonly<Record<CropId, number>> = {
  carrot: 0,
  tomato: 1,
  corn: 2,
  pumpkin: 3,
  lettuce: 4,
  strawberry: 5,
};

export const CROP_MATURE_HEIGHT: Readonly<Record<CropId, number>> = {
  carrot: 0.55,
  tomato: 1.08,
  corn: 1.78,
  pumpkin: 0.46,
  lettuce: 0.38,
  strawberry: 0.34,
};

const MATERIAL_FOLIAGE = 0;
const MATERIAL_STEM = 1;
const MATERIAL_HARVEST = 2;
const MATERIAL_BLOSSOM = 3;
const MATERIAL_HUSK = 4;

type Vec3 = readonly [number, number, number];

export interface CropGeometryStats {
  readonly triangleCount: number;
  readonly vertexCount: number;
  readonly perCropTriangles: Readonly<Record<CropId, number>>;
  readonly maxRadius: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface CropGeometryData {
  readonly data: Float32Array<ArrayBuffer>;
  readonly stats: CropGeometryStats;
}

export function cropKindFor(crop: CropId | null): number {
  return crop ? CROP_KIND[crop] : -1;
}

export function cropMarkerHeight(crop: CropId, visualStage: number): number {
  const stage = clamp((visualStage - 1) / 3, 0, 1);
  return 0.14 + CROP_MATURE_HEIGHT[crop] * (0.40 + stage * 0.60);
}

export function advanceVisualStage(current: number, target: number, deltaSeconds: number): number {
  if (target <= 0 || target < current) return target;
  if (current <= 0) return target;
  if (target <= current) return current;
  return Math.min(target, current + Math.max(0, deltaSeconds) * 0.86);
}

export function createCropGeometryData(): CropGeometryData {
  const output: number[] = [];
  const perCropTriangles = {} as Record<CropId, number>;

  perCropTriangles.carrot = appendCarrot(output);
  perCropTriangles.tomato = appendTomato(output);
  perCropTriangles.corn = appendCorn(output);
  perCropTriangles.pumpkin = appendPumpkin(output);
  perCropTriangles.lettuce = appendLettuce(output);
  perCropTriangles.strawberry = appendStrawberry(output);

  const data = new Float32Array(output) as Float32Array<ArrayBuffer>;
  let maxRadius = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < data.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    const x = data[offset]!;
    const y = data[offset + 1]!;
    const z = data[offset + 2]!;
    maxRadius = Math.max(maxRadius, Math.hypot(x, z));
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const triangleCount = Object.values(perCropTriangles).reduce((sum, value) => sum + value, 0);
  return {
    data,
    stats: {
      triangleCount,
      vertexCount: triangleCount * 3,
      perCropTriangles,
      maxRadius,
      minY,
      maxY,
    },
  };
}

function appendCarrot(output: number[]): number {
  const crop = CROP_KIND.carrot;
  let triangles = 0;

  triangles += appendEllipsoid(
    output,
    [0, -0.17, 0],
    [0.115, 0.29, 0.115],
    12,
    8,
    crop,
    MATERIAL_HARVEST,
    0.27,
    0,
    [0, 0, 0],
    0.03,
  );

  const frondCount = 12;
  for (let frond = 0; frond < frondCount; frond += 1) {
    const angle = frond / frondCount * Math.PI * 2 + (frond % 3 - 1) * 0.08;
    const birth = frond < 4 ? 0 : frond < 8 ? 0.24 : 0.56;
    const height = 0.40 + (frond % 4) * 0.035;
    const start: Vec3 = [Math.cos(angle) * 0.018, 0.015, Math.sin(angle) * 0.018];
    const end: Vec3 = [Math.cos(angle) * 0.11, height, Math.sin(angle) * 0.11];
    triangles += appendCylinderBetween(output, start, end, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.62, start);

    for (let node = 1; node <= 6; node += 1) {
      const t = node / 7;
      const nodePoint = lerp3(start, end, t);
      const leafletLength = 0.050 + t * 0.030;
      const leafletWidth = 0.010 + t * 0.006;
      const branchAngle = 0.96 + (node % 2) * 0.12;
      triangles += appendLeafRibbon(
        output,
        nodePoint,
        angle + branchAngle,
        leafletLength,
        leafletWidth,
        0.020,
        0.010,
        3,
        crop,
        MATERIAL_FOLIAGE,
        birth,
        0.92,
      );
      triangles += appendLeafRibbon(
        output,
        nodePoint,
        angle - branchAngle,
        leafletLength * 0.94,
        leafletWidth,
        0.018,
        0.010,
        3,
        crop,
        MATERIAL_FOLIAGE,
        birth,
        0.92,
      );
    }
  }
  return triangles;
}

function appendTomato(output: number[]): number {
  const crop = CROP_KIND.tomato;
  let triangles = 0;
  const root: Vec3 = [0, 0.015, 0];
  const top: Vec3 = [0.025, 1.05, -0.015];
  triangles += appendCylinderBetween(output, root, top, 0.026, 8, crop, MATERIAL_STEM, 0, 0.16, root);

  for (let branch = 0; branch < 9; branch += 1) {
    const t = 0.19 + branch * 0.083;
    const base = lerp3(root, top, t);
    const yaw = branch * 2.37 + 0.35;
    const length = 0.30 + (branch % 3) * 0.055;
    const end: Vec3 = [
      base[0] + Math.cos(yaw) * length,
      base[1] + 0.07 + (branch % 2) * 0.025,
      base[2] + Math.sin(yaw) * length,
    ];
    const birth = branch < 3 ? 0 : branch < 6 ? 0.24 : 0.50;
    triangles += appendCylinderBetween(output, base, end, 0.010, 6, crop, MATERIAL_STEM, birth, 0.36, base);

    for (let leaflet = 1; leaflet <= 4; leaflet += 1) {
      const lt = leaflet / 5;
      const p = lerp3(base, end, lt);
      const sideYaw = yaw + (leaflet % 2 === 0 ? 1.18 : -1.18);
      const leafLength = 0.105 - Math.abs(lt - 0.52) * 0.045;
      triangles += appendOvalLeaf(
        output,
        p,
        sideYaw,
        leafLength,
        0.043,
        0.20,
        10,
        crop,
        birth,
        0.76,
        base,
      );
    }
    triangles += appendOvalLeaf(
      output,
      end,
      yaw,
      0.13,
      0.047,
      0.25,
      10,
      crop,
      birth,
      0.79,
      base,
    );
  }

  const fruitClusters: readonly (readonly [Vec3, number, number])[] = [
    [[0.18, 0.43, 0.10], 0.072, 0.54],
    [[0.28, 0.48, 0.06], 0.082, 0.58],
    [[-0.16, 0.61, 0.18], 0.085, 0.61],
    [[-0.26, 0.66, 0.13], 0.078, 0.66],
    [[0.16, 0.76, -0.18], 0.088, 0.70],
    [[0.26, 0.82, -0.12], 0.082, 0.74],
    [[-0.10, 0.90, -0.19], 0.074, 0.80],
  ];
  for (const [center, radius, birth] of fruitClusters) {
    const attach: Vec3 = [center[0] * 0.55, center[1] + radius * 0.60, center[2] * 0.55];
    triangles += appendCylinderBetween(output, attach, [center[0], center[1] + radius * 0.62, center[2]], 0.006, 5, crop, MATERIAL_STEM, birth - 0.08, 0.26, attach);
    triangles += appendEllipsoid(output, center, [radius, radius * 0.92, radius], 12, 8, crop, MATERIAL_HARVEST, birth, 0.08, attach);
  }
  return triangles;
}

function appendCorn(output: number[]): number {
  const crop = CROP_KIND.corn;
  let triangles = 0;
  const root: Vec3 = [0, 0.01, 0];
  const top: Vec3 = [0, 1.70, 0];
  triangles += appendCylinderBetween(output, root, top, 0.035, 10, crop, MATERIAL_STEM, 0, 0.10, root);

  for (let leaf = 0; leaf < 11; leaf += 1) {
    const t = 0.12 + leaf * 0.068;
    const base: Vec3 = [0, 0.04 + t * 1.48, 0];
    const yaw = leaf * 2.15;
    const length = 0.48 + (leaf % 4) * 0.075;
    const width = 0.070 + (leaf % 3) * 0.010;
    const birth = leaf < 4 ? 0 : leaf < 8 ? 0.25 : 0.50;
    triangles += appendLeafRibbon(output, base, yaw, length, width, 0.18, 0.12, 8, crop, MATERIAL_FOLIAGE, birth, 0.72);
  }

  const earCenter: Vec3 = [0.08, 0.96, 0.015];
  triangles += appendEllipsoid(output, earCenter, [0.070, 0.22, 0.070], 12, 9, crop, MATERIAL_HARVEST, 0.66, 0.08, [0.02, 1.10, 0.01], 0.02);
  triangles += appendLeafRibbon(output, [0.035, 0.78, 0.0], 0.08, 0.34, 0.095, 0.20, 0.04, 6, crop, MATERIAL_HUSK, 0.50, 0.48);
  triangles += appendLeafRibbon(output, [0.035, 0.82, 0.0], -0.14, 0.32, 0.090, 0.18, 0.04, 6, crop, MATERIAL_HUSK, 0.50, 0.48);

  for (let tassel = 0; tassel < 9; tassel += 1) {
    const yaw = tassel / 9 * Math.PI * 2;
    const start: Vec3 = [0, 1.66, 0];
    const end: Vec3 = [Math.cos(yaw) * 0.16, 1.80 - (tassel % 3) * 0.025, Math.sin(yaw) * 0.16];
    triangles += appendCylinderBetween(output, start, end, 0.0045, 5, crop, MATERIAL_BLOSSOM, 0.74, 0.58, start);
  }
  return triangles;
}

function appendPumpkin(output: number[]): number {
  const crop = CROP_KIND.pumpkin;
  let triangles = 0;
  const root: Vec3 = [0, 0.025, 0];
  const vinePoints: Vec3[] = [
    root,
    [0.28, 0.040, 0.03],
    [0.58, 0.035, -0.08],
    [0.86, 0.045, 0.04],
    [1.14, 0.035, 0.13],
  ];
  for (let index = 0; index < vinePoints.length - 1; index += 1) {
    triangles += appendCylinderBetween(output, vinePoints[index]!, vinePoints[index + 1]!, 0.018, 7, crop, MATERIAL_STEM, index < 2 ? 0 : 0.26 + index * 0.08, 0.44, vinePoints[index]!);
  }

  const leafAnchors: readonly (readonly [Vec3, number, number])[] = [
    [[0.02, 0.03, 0.02], -0.6, 0.00],
    [[0.18, 0.04, -0.05], 1.15, 0.00],
    [[0.34, 0.04, 0.04], -1.00, 0.20],
    [[0.51, 0.04, -0.05], 0.72, 0.28],
    [[0.67, 0.04, 0.00], -1.10, 0.36],
    [[0.82, 0.04, 0.05], 0.94, 0.48],
    [[0.98, 0.04, 0.08], -0.78, 0.58],
    [[1.12, 0.04, 0.12], 0.62, 0.68],
  ];
  for (let index = 0; index < leafAnchors.length; index += 1) {
    const [anchor, side, birth] = leafAnchors[index]!;
    const petioleEnd: Vec3 = [
      anchor[0] + Math.cos(side) * 0.20,
      0.17 + (index % 3) * 0.018,
      anchor[2] + Math.sin(side) * 0.20,
    ];
    const leafRadius = index === leafAnchors.length - 1 ? 0.20 : 0.23 + (index % 2) * 0.025;
    triangles += appendCylinderBetween(output, anchor, petioleEnd, 0.009, 6, crop, MATERIAL_STEM, birth, 0.58, anchor);
    triangles += appendPalmateLeaf(output, petioleEnd, side, leafRadius, 14, crop, birth, 0.86, anchor);
  }

  const fruitCenter: Vec3 = [0.22, 0.155, 0.12];
  triangles += appendEllipsoid(output, fruitCenter, [0.245, 0.155, 0.225], 16, 10, crop, MATERIAL_HARVEST, 0.60, 0.02, [0.10, 0.05, 0.08], 0.085);
  triangles += appendCylinderBetween(output, [0.20, 0.27, 0.11], [0.18, 0.35, 0.10], 0.015, 7, crop, MATERIAL_STEM, 0.58, 0.15, [0.20, 0.27, 0.11]);
  return triangles;
}

function appendLettuce(output: number[]): number {
  const crop = CROP_KIND.lettuce;
  let triangles = 0;
  const rings = [
    { count: 16, length: 0.34, width: 0.115, rise: 0.10, birth: 0 },
    { count: 12, length: 0.28, width: 0.105, rise: 0.16, birth: 0.24 },
    { count: 9, length: 0.20, width: 0.090, rise: 0.22, birth: 0.50 },
  ] as const;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex]!;
    for (let leaf = 0; leaf < ring.count; leaf += 1) {
      const yaw = leaf / ring.count * Math.PI * 2 + ringIndex * 0.21;
      const baseRadius = 0.025 + ringIndex * 0.012;
      const base: Vec3 = [Math.cos(yaw) * baseRadius, 0.018 + ringIndex * 0.018, Math.sin(yaw) * baseRadius];
      triangles += appendLeafRibbon(
        output,
        base,
        yaw,
        ring.length * (0.93 + (leaf % 3) * 0.035),
        ring.width,
        ring.rise,
        0.075 + ringIndex * 0.015,
        7,
        crop,
        MATERIAL_FOLIAGE,
        ring.birth,
        0.60,
      );
    }
  }
  return triangles;
}

function appendStrawberry(output: number[]): number {
  const crop = CROP_KIND.strawberry;
  let triangles = 0;
  for (let cluster = 0; cluster < 10; cluster += 1) {
    const yaw = cluster / 10 * Math.PI * 2 + (cluster % 2) * 0.18;
    const birth = cluster < 4 ? 0 : cluster < 7 ? 0.26 : 0.52;
    const petioleBase: Vec3 = [Math.cos(yaw) * 0.025, 0.015, Math.sin(yaw) * 0.025];
    const petioleEnd: Vec3 = [Math.cos(yaw) * 0.15, 0.19 + (cluster % 3) * 0.018, Math.sin(yaw) * 0.15];
    triangles += appendCylinderBetween(output, petioleBase, petioleEnd, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.64, petioleBase);
    for (let leaflet = -1; leaflet <= 1; leaflet += 1) {
      const leafYaw = yaw + leaflet * 0.78;
      const center: Vec3 = [
        petioleEnd[0] + Math.cos(leafYaw) * 0.050,
        petioleEnd[1] + 0.005,
        petioleEnd[2] + Math.sin(leafYaw) * 0.050,
      ];
      triangles += appendOvalLeaf(output, center, leafYaw, 0.105, 0.052, 0.16, 12, crop, birth, 0.74, petioleBase);
    }
  }

  const berries: readonly (readonly [Vec3, number, number])[] = [
    [[0.16, 0.10, 0.08], 0.070, 0.57],
    [[-0.13, 0.085, 0.12], 0.064, 0.62],
    [[0.08, 0.075, -0.17], 0.068, 0.68],
    [[-0.18, 0.095, -0.08], 0.060, 0.74],
    [[0.02, 0.070, 0.20], 0.056, 0.80],
  ];
  for (const [center, radius, birth] of berries) {
    const attach: Vec3 = [center[0] * 0.45, 0.18, center[2] * 0.45];
    triangles += appendCylinderBetween(output, attach, [center[0], center[1] + radius * 0.55, center[2]], 0.0045, 5, crop, MATERIAL_STEM, birth - 0.08, 0.52, attach);
    triangles += appendEllipsoid(output, center, [radius * 0.88, radius * 1.15, radius * 0.88], 12, 8, crop, MATERIAL_HARVEST, birth, 0.06, attach);
    for (let sepal = 0; sepal < 5; sepal += 1) {
      triangles += appendLeafRibbon(
        output,
        [center[0], center[1] + radius * 0.95, center[2]],
        sepal / 5 * Math.PI * 2,
        radius * 0.48,
        radius * 0.13,
        -radius * 0.05,
        0,
        2,
        crop,
        MATERIAL_FOLIAGE,
        birth,
        0.28,
      );
    }
  }
  return triangles;
}

function appendCylinderBetween(
  output: number[],
  start: Vec3,
  end: Vec3,
  radius: number,
  segments: number,
  cropKind: number,
  materialKind: number,
  birth: number,
  flex: number,
  anchor: Vec3,
): number {
  const axis = normalize3(subtract3(end, start));
  const reference: Vec3 = Math.abs(axis[1]) > 0.86 ? [1, 0, 0] : [0, 1, 0];
  const side = normalize3(cross3(axis, reference));
  const up = normalize3(cross3(side, axis));
  const startRing: Vec3[] = [];
  const endRing: Vec3[] = [];
  const normals: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const normal = normalize3(add3(scale3(side, Math.cos(angle)), scale3(up, Math.sin(angle))));
    normals.push(normal);
    startRing.push(add3(start, scale3(normal, radius)));
    endRing.push(add3(end, scale3(normal, radius * 0.86)));
  }
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushTriangle(output, startRing[index]!, startRing[next]!, endRing[next]!, normals[index]!, normals[next]!, normals[next]!, anchor, cropKind, materialKind, birth, flex);
    pushTriangle(output, startRing[index]!, endRing[next]!, endRing[index]!, normals[index]!, normals[next]!, normals[index]!, anchor, cropKind, materialKind, birth, flex);
  }
  return segments * 2;
}

function appendLeafRibbon(
  output: number[],
  base: Vec3,
  yaw: number,
  length: number,
  width: number,
  rise: number,
  arch: number,
  segments: number,
  cropKind: number,
  materialKind: number,
  birth: number,
  flex: number,
): number {
  const forward: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)];
  const side: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const left: Vec3[] = [];
  const right: Vec3[] = [];
  const normals: Vec3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const center: Vec3 = [
      base[0] + forward[0] * length * t,
      base[1] + rise * t + Math.sin(t * Math.PI) * arch,
      base[2] + forward[2] * length * t,
    ];
    const widthProfile = width * (0.07 + Math.pow(Math.sin(t * Math.PI), 0.72) * 0.93);
    left.push(add3(center, scale3(side, widthProfile)));
    right.push(add3(center, scale3(side, -widthProfile)));
    const slope: Vec3 = normalize3([forward[0] * length, rise + Math.cos(t * Math.PI) * arch * Math.PI, forward[2] * length]);
    let normal = normalize3(cross3(side, slope));
    if (normal[1] < 0) normal = scale3(normal, -1);
    normals.push(normal);
  }
  for (let index = 0; index < segments; index += 1) {
    pushTriangle(output, left[index]!, right[index]!, right[index + 1]!, normals[index]!, normals[index]!, normals[index + 1]!, base, cropKind, materialKind, birth, flex);
    pushTriangle(output, left[index]!, right[index + 1]!, left[index + 1]!, normals[index]!, normals[index + 1]!, normals[index + 1]!, base, cropKind, materialKind, birth, flex);
  }
  return segments * 2;
}

function appendOvalLeaf(
  output: number[],
  center: Vec3,
  yaw: number,
  length: number,
  width: number,
  tilt: number,
  segments: number,
  cropKind: number,
  birth: number,
  flex: number,
  anchor: Vec3,
): number {
  const forward: Vec3 = normalize3([Math.cos(yaw) * Math.cos(tilt), Math.sin(tilt), Math.sin(yaw) * Math.cos(tilt)]);
  const side: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  let normal = normalize3(cross3(side, forward));
  if (normal[1] < 0) normal = scale3(normal, -1);
  const outline: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const serration = 0.94 + 0.06 * Math.cos(angle * 5);
    outline.push(add3(center, add3(
      scale3(side, Math.cos(angle) * width * serration),
      scale3(forward, Math.sin(angle) * length * 0.5 * serration),
    )));
  }
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushTriangle(output, center, outline[index]!, outline[next]!, normal, normal, normal, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
  }
  return segments;
}

function appendPalmateLeaf(
  output: number[],
  center: Vec3,
  yaw: number,
  radius: number,
  segments: number,
  cropKind: number,
  birth: number,
  flex: number,
  anchor: Vec3,
): number {
  const outline: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = yaw + index / segments * Math.PI * 2;
    const lobe = index % 2 === 0 ? 1 : 0.63;
    const r = radius * lobe * (0.96 + 0.04 * Math.cos(index * 1.7));
    outline.push([
      center[0] + Math.cos(angle) * r,
      center[1] + 0.018 * Math.cos(angle * 2.2),
      center[2] + Math.sin(angle) * r,
    ]);
  }
  const normal: Vec3 = [0, 1, 0];
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushTriangle(output, center, outline[index]!, outline[next]!, normal, normal, normal, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
  }
  return segments;
}

function appendEllipsoid(
  output: number[],
  center: Vec3,
  radii: Vec3,
  segments: number,
  rings: number,
  cropKind: number,
  materialKind: number,
  birth: number,
  flex: number,
  anchor: Vec3,
  lobeAmount = 0,
): number {
  const rows: Vec3[][] = [];
  const rowNormals: Vec3[][] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const v = ring / rings;
    const phi = -Math.PI * 0.5 + v * Math.PI;
    const y = Math.sin(phi);
    const radial = Math.cos(phi);
    const row: Vec3[] = [];
    const normals: Vec3[] = [];
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = segment / segments * Math.PI * 2;
      const lobe = 1 + lobeAmount * Math.cos(theta * 8);
      const x = Math.cos(theta) * radial * lobe;
      const z = Math.sin(theta) * radial * lobe;
      const point: Vec3 = [center[0] + x * radii[0], center[1] + y * radii[1], center[2] + z * radii[2]];
      row.push(point);
      normals.push(normalize3([x / Math.max(0.0001, radii[0]), y / Math.max(0.0001, radii[1]), z / Math.max(0.0001, radii[2])]));
    }
    rows.push(row);
    rowNormals.push(normals);
  }
  let triangles = 0;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = rows[ring]![segment]!;
      const b = rows[ring]![next]!;
      const c = rows[ring + 1]![next]!;
      const d = rows[ring + 1]![segment]!;
      const na = rowNormals[ring]![segment]!;
      const nb = rowNormals[ring]![next]!;
      const nc = rowNormals[ring + 1]![next]!;
      const nd = rowNormals[ring + 1]![segment]!;
      pushTriangle(output, a, b, c, na, nb, nc, anchor, cropKind, materialKind, birth, flex);
      pushTriangle(output, a, c, d, na, nc, nd, anchor, cropKind, materialKind, birth, flex);
      triangles += 2;
    }
  }
  return triangles;
}

function pushTriangle(
  output: number[],
  a: Vec3,
  b: Vec3,
  c: Vec3,
  na: Vec3,
  nb: Vec3,
  nc: Vec3,
  anchor: Vec3,
  cropKind: number,
  materialKind: number,
  birth: number,
  flex: number,
): void {
  pushVertex(output, a, na, anchor, cropKind, materialKind, birth, flex);
  pushVertex(output, b, nb, anchor, cropKind, materialKind, birth, flex);
  pushVertex(output, c, nc, anchor, cropKind, materialKind, birth, flex);
}

function pushVertex(
  output: number[],
  position: Vec3,
  normal: Vec3,
  anchor: Vec3,
  cropKind: number,
  materialKind: number,
  birth: number,
  flex: number,
): void {
  output.push(
    position[0], position[1], position[2],
    normal[0], normal[1], normal[2],
    anchor[0], anchor[1], anchor[2],
    cropKind, materialKind, birth, flex,
  );
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale3(value: Vec3, scale: number): Vec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize3(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 1e-8) return [0, 1, 0];
  return [value[0] / length, value[1] / length, value[2] / length];
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
