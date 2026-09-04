import type { CropId } from "../../game/model";

export const CROP_VERTEX_STRIDE_FLOATS = 13;
export const CROP_INSTANCE_COUNT = 12;

export const CROP_KIND: Readonly<Record<CropId, number>> = {
  carrot: 0, tomato: 1, corn: 2, pumpkin: 3, lettuce: 4, strawberry: 5,
};

export const CROP_MATURE_HEIGHT: Readonly<Record<CropId, number>> = {
  carrot: 0.55, tomato: 1.08, corn: 1.78, pumpkin: 0.46, lettuce: 0.38, strawberry: 0.34,
};

export const CROP_VISIBLE_TOPOLOGY = {
  carrot: { primaryAxisSegments: 0, leafUnits: 12, fruitGroups: 0, leafOrder: "basal-rosette" },
  tomato: { primaryAxisSegments: 7, leafUnits: 6, fruitGroups: 3, leafOrder: "alternate-compound" },
  corn: { primaryAxisSegments: 10, leafUnits: 9, fruitGroups: 1, leafOrder: "alternate-node" },
  pumpkin: { primaryAxisSegments: 6, leafUnits: 7, fruitGroups: 1, leafOrder: "alternate-node" },
  lettuce: { primaryAxisSegments: 0, leafUnits: 24, fruitGroups: 0, leafOrder: "independent-rosette" },
  strawberry: { primaryAxisSegments: 0, leafUnits: 8, fruitGroups: 2, leafOrder: "spiral-crown" },
} as const;

const MATERIAL_FOLIAGE = 0;
const MATERIAL_STEM = 1;
const MATERIAL_HARVEST = 2;
const MATERIAL_BLOSSOM = 3;
const MATERIAL_HUSK = 4;

export type Vec3 = readonly [number, number, number];

export interface CropAttachmentFrame {
  readonly origin: Vec3;
  readonly x: Vec3;
  readonly y: Vec3;
  readonly z: Vec3;
}

/** +Y grows from the attachment; +Z is the front; X cross Y = Z. */
export function cropAttachmentFrame(origin: Vec3, direction: Vec3, front: Vec3 = [0, 0, 1]): CropAttachmentFrame {
  if (Math.hypot(...direction) < 1e-8) throw new Error("Crop attachment needs a nonzero direction");
  const y = normalize3(direction);
  const fallback: Vec3 = Math.abs(y[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
  const hint = Math.abs(dot3(y, normalize3(front))) > 0.96 ? fallback : front;
  const x = normalize3(cross3(y, hint));
  return { origin, x, y, z: normalize3(cross3(x, y)) };
}

export function cropFramePoint(frame: CropAttachmentFrame, point: Vec3): Vec3 {
  return add3(frame.origin, cropFrameVector(frame, point));
}

function cropFrameVector(frame: CropAttachmentFrame, value: Vec3): Vec3 {
  return add3(add3(scale3(frame.x, value[0]), scale3(frame.y, value[1])), scale3(frame.z, value[2]));
}

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
    maxRadius = Math.max(maxRadius, Math.hypot(data[offset]!, data[offset + 2]!));
    minY = Math.min(minY, data[offset + 1]!);
    maxY = Math.max(maxY, data[offset + 1]!);
  }
  const triangleCount = Object.values(perCropTriangles).reduce((sum, value) => sum + value, 0);
  return { data, stats: { triangleCount, vertexCount: triangleCount * 3, perCropTriangles, maxRadius, minY, maxY } };
}

function appendCarrot(output: number[]): number {
  const crop = CROP_KIND.carrot;
  let triangles = appendEllipsoid(output, [0, -0.17, 0], [0.115, 0.29, 0.115], 12, 8, crop, MATERIAL_HARVEST, 0, 0, [0, 0, 0], 0.03);
  const frondCount = 12;
  for (let frond = 0; frond < frondCount; frond += 1) {
    const angle = frond / frondCount * Math.PI * 2 + (frond % 3 - 1) * 0.08;
    const birth = frond < 4 ? 0 : frond < 8 ? 0.24 : 0.56;
    const height = 0.40 + (frond % 4) * 0.035;
    const start: Vec3 = [Math.cos(angle) * 0.018, 0.102, Math.sin(angle) * 0.018];
    const end: Vec3 = [Math.cos(angle) * 0.11, height, Math.sin(angle) * 0.11];
    triangles += appendCylinderBetween(output, start, end, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.62, start);
    for (let node = 1; node <= 6; node += 1) {
      const t = node / 7;
      const nodePoint = lerp3(start, end, t);
      const leafletLength = 0.050 + t * 0.030;
      const leafletWidth = 0.010 + t * 0.006;
      const branchAngle = 0.96 + (node % 2) * 0.12;
      triangles += appendLeafRibbon(output, nodePoint, angle + branchAngle, leafletLength, leafletWidth, 0.020, 0.010, 3, crop, MATERIAL_FOLIAGE, birth, 0.92, start);
      triangles += appendLeafRibbon(output, nodePoint, angle - branchAngle, leafletLength * 0.94, leafletWidth, 0.018, 0.010, 3, crop, MATERIAL_FOLIAGE, birth, 0.92, start);
    }
  }
  return triangles;
}

function appendTomato(output: number[]): number {
  const crop = CROP_KIND.tomato;
  let triangles = 0;
  const stemNodes: Vec3[] = [
    [0.000, 0.015, 0.000], [0.012, 0.175, -0.008], [-0.010, 0.330, 0.012],
    [0.018, 0.485, 0.004], [-0.012, 0.640, -0.014], [0.022, 0.790, 0.008],
    [0.000, 0.930, -0.010], [0.025, 1.055, -0.015],
  ];
  // The primary axis is a persistent attachment backbone; children never float ahead of a growing internode.
  for (let index = 0; index < stemNodes.length - 1; index += 1) {
    const radius = 0.027 - index * 0.0017;
    triangles += appendCylinderBetween(output, stemNodes[index]!, stemNodes[index + 1]!, radius, 8, crop, MATERIAL_STEM, 0, 0.16, stemNodes[index]!);
    if (index > 0 && index < stemNodes.length - 2) {
      triangles += appendEllipsoid(output, stemNodes[index]!, [radius * 1.18, 0.014, radius * 1.18], 7, 3, crop, MATERIAL_STEM, 0, 0.16, stemNodes[index]!);
    }
  }
  const leafNodes = [1, 2, 3, 4, 5, 6] as const;
  for (let leafIndex = 0; leafIndex < leafNodes.length; leafIndex += 1) {
    const node = stemNodes[leafNodes[leafIndex]!]!;
    const yaw = 0.42 + leafIndex * 2.38;
    const birth = leafIndex < 2 ? 0 : leafIndex < 4 ? 0.24 : 0.48;
    const petioleLength = 0.16 + (leafIndex % 3) * 0.018;
    const petioleEnd: Vec3 = [node[0] + Math.cos(yaw) * petioleLength, node[1] + 0.035 + (leafIndex % 2) * 0.012, node[2] + Math.sin(yaw) * petioleLength];
    const rachisEnd: Vec3 = [petioleEnd[0] + Math.cos(yaw) * 0.17, petioleEnd[1] + 0.035, petioleEnd[2] + Math.sin(yaw) * 0.17];
    triangles += appendCylinderBetween(output, node, petioleEnd, 0.009, 6, crop, MATERIAL_STEM, birth, 0.44, node);
    triangles += appendCylinderBetween(output, petioleEnd, rachisEnd, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.56, node);
    // Leaflets start at their actual rachis attachments, not guessed center-minus-half-length positions.
    for (let pair = 0; pair < 3; pair += 1) {
      const base = lerp3(petioleEnd, rachisEnd, 0.28 + pair * 0.25);
      const leafletLength = 0.160 - pair * 0.014;
      for (const sideSign of [-1, 1] as const) {
        const leafYaw = yaw + sideSign * (0.93 + pair * 0.08);
        triangles += appendOvalLeaf(output, base, leafYaw, leafletLength, 0.061 - pair * 0.005, 0.20 + (leafIndex % 3) * 0.08, 10, crop, birth, 0.76, node);
      }
    }
    triangles += appendOvalLeaf(output, rachisEnd, yaw, 0.180, 0.065, 0.26 + (leafIndex % 2) * 0.08, 10, crop, birth, 0.80, node);
  }
  const trusses = [
    { nodeIndex: 2, yaw: -0.55, birth: 0.52, fruits: 2 },
    { nodeIndex: 4, yaw: 1.18, birth: 0.64, fruits: 3 },
    { nodeIndex: 5, yaw: -2.05, birth: 0.75, fruits: 2 },
  ] as const;
  for (let trussIndex = 0; trussIndex < trusses.length; trussIndex += 1) {
    const truss = trusses[trussIndex]!;
    const node = stemNodes[truss.nodeIndex]!;
    const hub: Vec3 = [node[0] + Math.cos(truss.yaw) * 0.16, node[1] - 0.005, node[2] + Math.sin(truss.yaw) * 0.16];
    triangles += appendCylinderBetween(output, node, hub, 0.0075, 5, crop, MATERIAL_STEM, truss.birth, 0.32, node);
    for (let fruitIndex = 0; fruitIndex < truss.fruits; fruitIndex += 1) {
      const spread = (fruitIndex - (truss.fruits - 1) * 0.5) * 1.05;
      const pedicelYaw = truss.yaw + spread;
      const radius = 0.073 + ((fruitIndex + trussIndex) % 3) * 0.007;
      const calyx: Vec3 = [hub[0] + Math.cos(pedicelYaw) * 0.18, hub[1] - 0.045 - fruitIndex * 0.012, hub[2] + Math.sin(pedicelYaw) * 0.18];
      const center: Vec3 = [calyx[0], calyx[1] - radius * 0.92, calyx[2]];
      const fruitBirth = truss.birth;
      // Pedicels all return to the hub; fruit, calyx and support share one growth pivot and timing.
      triangles += appendCylinderBetween(output, hub, calyx, 0.0055, 5, crop, MATERIAL_STEM, fruitBirth, 0.26, node);
      triangles += appendEllipsoid(output, center, [radius, radius * 0.92, radius], 10, 7, crop, MATERIAL_HARVEST, fruitBirth, 0.08, node);
      for (let sepal = 0; sepal < 5; sepal += 1) {
        triangles += appendLeafRibbon(output, calyx, sepal / 5 * Math.PI * 2, radius * 0.44, radius * 0.11, -radius * 0.07, 0, 2, crop, MATERIAL_FOLIAGE, fruitBirth, 0.22, node);
      }
    }
  }
  return triangles;
}

function appendCorn(output: number[]): number {
  const crop = CROP_KIND.corn;
  let triangles = 0;
  const stalkNodes: Vec3[] = [
    [0.000, 0.010, 0.000], [0.002, 0.155, -0.002], [-0.003, 0.305, 0.002],
    [0.003, 0.460, -0.002], [-0.003, 0.620, 0.003], [0.003, 0.785, -0.002],
    [-0.002, 0.955, 0.002], [0.003, 1.130, -0.002], [-0.002, 1.310, 0.002],
    [0.002, 1.495, -0.001], [0.000, 1.675, 0.000],
  ];
  for (let index = 0; index < stalkNodes.length - 1; index += 1) {
    const radius = 0.038 - index * 0.0012;
    triangles += appendCylinderBetween(output, stalkNodes[index]!, stalkNodes[index + 1]!, radius, 9, crop, MATERIAL_STEM, 0, 0.10, stalkNodes[index]!);
    if (index > 0 && index < stalkNodes.length - 2) {
      triangles += appendEllipsoid(output, stalkNodes[index]!, [radius * 1.15, 0.012, radius * 1.15], 7, 3, crop, MATERIAL_STEM, 0, 0.10, stalkNodes[index]!);
    }
  }
  // Alternating leaf nodes, with a real sheath. Blade and sheath use the same node pivot.
  for (let leafIndex = 0; leafIndex < 9; leafIndex += 1) {
    const node = stalkNodes[leafIndex + 1]!;
    const yaw = (leafIndex % 2) * Math.PI + leafIndex * 0.12;
    const birth = leafIndex < 3 ? 0 : leafIndex < 6 ? 0.24 : 0.48;
    const sheathTop: Vec3 = [node[0], node[1] + 0.085, node[2]];
    triangles += appendCylinderBetween(output, node, sheathTop, 0.041 - leafIndex * 0.0011, 8, crop, MATERIAL_FOLIAGE, birth, 0.18, node);
    const bladeBase: Vec3 = [sheathTop[0] + Math.cos(yaw) * 0.026, sheathTop[1] - 0.004, sheathTop[2] + Math.sin(yaw) * 0.026];
    const length = (0.50 + (leafIndex % 4) * 0.055) * (1 - Math.max(0, leafIndex - 5) * 0.10);
    const upper = Math.max(0, leafIndex - 5);
    const width = (0.078 + (leafIndex % 3) * 0.009) * (1 - upper * 0.09);
    triangles += appendLeafRibbon(output, bladeBase, yaw, length, width, 0.13 + Math.min(leafIndex, 5) * 0.006 - upper * 0.018, 0.11 - upper * 0.012, 8, crop, MATERIAL_FOLIAGE, birth, 0.72, node);
  }
  // Ear, wrapping husk sheets and silk use one base-to-tip frame, not world-upright ellipsoids.
  const earNode = stalkNodes[6]!;
  const earBase: Vec3 = [earNode[0] + 0.068, earNode[1] + 0.055, earNode[2] + 0.012];
  const earFrame = cropAttachmentFrame(earBase, [0.30, 0.94, 0.11]);
  const earBirth = 0.58;
  triangles += appendCylinderBetween(output, earNode, earBase, 0.017, 6, crop, MATERIAL_STEM, earBirth, 0.18, earNode);
  const earStart = output.length;
  triangles += appendEllipsoid(output, [0, 0.185, 0], [0.063, 0.185, 0.063], 12, 7, crop, MATERIAL_HARVEST, earBirth, 0.12, [0, 0, 0]);
  // Low-cost raised kernels on the exposed upper cob; the core remains a closed body.
  for (let ring = 4; ring <= 6; ring += 1) {
    const phi = -Math.PI * 0.5 + ring / 7 * Math.PI;
    const radial = Math.cos(phi) * 0.063;
    for (let kernel = 0; kernel < 10; kernel += 1) {
      const theta = kernel / 10 * Math.PI * 2;
      const center: Vec3 = [Math.cos(theta) * radial, 0.185 + Math.sin(phi) * 0.185, Math.sin(theta) * radial];
      const radius = ring === 6 ? 0.0075 : 0.009;
      triangles += appendEllipsoid(output, center, [radius, 0.011, radius], 4, 3, crop, MATERIAL_HARVEST, earBirth, 0.12, [0, 0, 0]);
    }
  }
  for (let sheet = 0; sheet < 3; sheet += 1) triangles += appendCornHusk(output, sheet, crop, earBirth);
  const silkOrigin: Vec3 = [0, 0.368, 0];
  for (let silk = 0; silk < 6; silk += 1) {
    const yaw = (silk - 2.5) * 0.32;
    const knee: Vec3 = [Math.cos(yaw) * 0.036, 0.395 + (silk % 2) * 0.008, Math.sin(yaw) * 0.036];
    const end: Vec3 = [Math.cos(yaw) * 0.072, 0.345 - silk * 0.003, Math.sin(yaw) * 0.072];
    triangles += appendCylinderBetween(output, silkOrigin, knee, 0.0023, 4, crop, MATERIAL_BLOSSOM, earBirth, 0.46, [0, 0, 0]);
    triangles += appendCylinderBetween(output, knee, end, 0.0019, 4, crop, MATERIAL_BLOSSOM, earBirth, 0.46, [0, 0, 0]);
  }
  transformSurface(output, earStart, earFrame, earNode);
  const tasselBase = stalkNodes[stalkNodes.length - 1]!;
  const tasselTop: Vec3 = [0, 1.86, 0];
  triangles += appendCylinderBetween(output, tasselBase, tasselTop, 0.006, 5, crop, MATERIAL_BLOSSOM, 0.72, 0.52, tasselBase);
  for (let tassel = 0; tassel < 7; tassel += 1) {
    const yaw = tassel / 7 * Math.PI * 2;
    const start: Vec3 = [0, 1.735 + (tassel % 2) * 0.018, 0];
    const end: Vec3 = [Math.cos(yaw) * (0.13 + (tassel % 3) * 0.018), 1.845 - (tassel % 3) * 0.015, Math.sin(yaw) * (0.13 + (tassel % 3) * 0.018)];
    triangles += appendCylinderBetween(output, start, end, 0.0038, 5, crop, MATERIAL_BLOSSOM, 0.72, 0.58, tasselBase);
  }
  return triangles;
}

function appendPumpkin(output: number[]): number {
  const crop = CROP_KIND.pumpkin;
  let triangles = 0;
  const vinePoints: Vec3[] = [
    [0.00, 0.075, 0.00], [0.20, 0.090, 0.02], [0.39, 0.087, -0.05],
    [0.58, 0.095, -0.08], [0.76, 0.087, -0.01], [0.94, 0.095, 0.07], [1.12, 0.087, 0.12],
  ];
  for (let index = 0; index < vinePoints.length - 1; index += 1) {
    triangles += appendCylinderBetween(output, vinePoints[index]!, vinePoints[index + 1]!, 0.028, 7, crop, MATERIAL_STEM, 0, 0.44, vinePoints[index]!);
    if (index > 0) triangles += appendEllipsoid(output, vinePoints[index]!, [0.032, 0.017, 0.032], 7, 3, crop, MATERIAL_STEM, 0, 0.38, vinePoints[index]!);
  }
  for (let index = 0; index < vinePoints.length; index += 1) {
    const anchor = vinePoints[index]!;
    const side = index === 1 ? 2.30 : (index % 2 === 0 ? -1 : 1) * (1.00 + (index % 3) * 0.12) + 0.10;
    const birth = index < 2 ? 0 : 0.18 + index * 0.085;
    const petioleLength = index < 2 ? 0.25 : 0.20 + (index % 2) * 0.018;
    const petioleEnd: Vec3 = [anchor[0] + Math.cos(side) * petioleLength, (index < 2 ? 0.36 : 0.29) + (index % 3) * 0.025, anchor[2] + Math.sin(side) * petioleLength];
    const leafRadius = index < 2 ? 0.205 : index === vinePoints.length - 1 ? 0.19 : 0.225 + (index % 2) * 0.018;
    triangles += appendCylinderBetween(output, anchor, petioleEnd, 0.009, 6, crop, MATERIAL_STEM, birth, 0.58, anchor);
    triangles += appendPalmateLeaf(output, petioleEnd, side, leafRadius, 14, crop, birth, 0.86, anchor);
  }
  // Keep the fruit off the vine centerline. The peduncle rises outside it and returns to the top, not through its flesh.
  const fruitCenter: Vec3 = [0.28, 0.158, 0.33];
  const fruitTop: Vec3 = [fruitCenter[0], fruitCenter[1] + 0.158, fruitCenter[2]];
  const peduncleRoot = vinePoints[1]!;
  const peduncleKnee: Vec3 = [0.22, 0.36, 0.060];
  triangles += appendCylinderBetween(output, peduncleRoot, peduncleKnee, 0.018, 7, crop, MATERIAL_STEM, 0.60, 0.24, peduncleRoot);
  triangles += appendCylinderBetween(output, peduncleKnee, fruitTop, 0.016, 7, crop, MATERIAL_STEM, 0.60, 0.18, peduncleRoot);
  triangles += appendEllipsoid(output, fruitCenter, [0.245, 0.158, 0.225], 16, 10, crop, MATERIAL_HARVEST, 0.60, 0.02, peduncleRoot, 0.085);
  for (const index of [3, 5]) {
    const base = vinePoints[index]!;
    const birth = 0.18 + index * 0.085;
    let previous = base;
    for (let segment = 1; segment <= 8; segment += 1) {
      const t = segment / 8;
      const point: Vec3 = [base[0] + t * 0.105, base[1] + 0.035 * t + Math.sin(t * Math.PI * 3) * 0.018 * t, base[2] - 0.08 * t + Math.cos(t * Math.PI * 3) * 0.025 * t];
      triangles += appendCylinderBetween(output, previous, point, 0.0038, 4, crop, MATERIAL_STEM, birth, 0.60, base);
      previous = point;
    }
  }
  return triangles;
}

function appendLettuce(output: number[]): number {
  const crop = CROP_KIND.lettuce;
  let triangles = 0;
  const crown: Vec3 = [0, 0.028, 0];
  triangles += appendEllipsoid(output, crown, [0.060, 0.034, 0.060], 8, 4, crop, MATERIAL_STEM, 0, 0.12, crown);
  const rings = [
    { count: 10, baseRadius: 0.046, length: 0.33, width: 0.105, rise: 0.060, arch: 0.045, cup: 0.030, birth: 0.00, yawOffset: 0.00 },
    { count: 8, baseRadius: 0.035, length: 0.255, width: 0.100, rise: 0.135, arch: 0.050, cup: 0.050, birth: 0.24, yawOffset: 0.23 },
    { count: 6, baseRadius: 0.024, length: 0.175, width: 0.083, rise: 0.185, arch: 0.035, cup: 0.060, birth: 0.50, yawOffset: 0.46 },
  ] as const;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex]!;
    for (let leaf = 0; leaf < ring.count; leaf += 1) {
      const yaw = leaf / ring.count * Math.PI * 2 + ring.yawOffset + Math.sin(leaf * 4.7 + ringIndex) * 0.14;
      const base: Vec3 = [Math.cos(yaw) * ring.baseRadius, 0.016 + ringIndex * 0.018 + (leaf % 3) * 0.003, Math.sin(yaw) * ring.baseRadius];
      triangles += appendCuppedLeaf(output, base, yaw, ring.length * (0.94 + (leaf % 3) * 0.025), ring.width * (0.96 + (leaf % 2) * 0.05), ring.rise, ring.arch, ring.cup, 6, crop, ring.birth, 0.60);
    }
  }
  return triangles;
}

function appendStrawberry(output: number[]): number {
  const crop = CROP_KIND.strawberry;
  let triangles = 0;
  const crown: Vec3 = [0, 0.030, 0];
  triangles += appendEllipsoid(output, crown, [0.055, 0.042, 0.055], 8, 4, crop, MATERIAL_STEM, 0, 0.10, crown);
  for (let leafIndex = 0; leafIndex < 8; leafIndex += 1) {
    const yaw = leafIndex * 2.40 + 0.18;
    const birth = leafIndex < 3 ? 0 : leafIndex < 6 ? 0.26 : 0.52;
    const petioleBase: Vec3 = [Math.cos(yaw) * 0.022, 0.035, Math.sin(yaw) * 0.022];
    const junction: Vec3 = [Math.cos(yaw) * 0.135, 0.185 + (leafIndex % 3) * 0.018, Math.sin(yaw) * 0.135];
    triangles += appendCylinderBetween(output, petioleBase, junction, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.64, petioleBase);
    for (let leaflet = -1; leaflet <= 1; leaflet += 1) {
      const leafYaw = yaw + leaflet * 0.72;
      const petioluleLength = leaflet === 0 ? 0.060 : 0.050;
      const leafletBase: Vec3 = [junction[0] + Math.cos(leafYaw) * petioluleLength, junction[1] + 0.005 - Math.abs(leaflet) * 0.003, junction[2] + Math.sin(leafYaw) * petioluleLength];
      triangles += appendCylinderBetween(output, junction, leafletBase, 0.0036, 4, crop, MATERIAL_STEM, birth, 0.70, petioleBase);
      triangles += appendOvalLeaf(output, leafletBase, leafYaw, 0.108, 0.045, 0.20 + ((leafIndex + leaflet + 3) % 3) * 0.10, 12, crop, birth, 0.74, petioleBase);
    }
  }
  const inflorescences = [
    { base: [0.015, 0.038, 0.010] as Vec3, hub: [0.075, 0.221, 0.035] as Vec3, yaw: 0.35, fruits: 3, birth: 0.55 },
    { base: [-0.018, 0.040, -0.008] as Vec3, hub: [-0.070, 0.215, -0.045] as Vec3, yaw: 3.45, fruits: 2, birth: 0.67 },
  ] as const;
  for (let clusterIndex = 0; clusterIndex < inflorescences.length; clusterIndex += 1) {
    const inflorescence = inflorescences[clusterIndex]!;
    triangles += appendCylinderBetween(output, inflorescence.base, inflorescence.hub, 0.0055, 5, crop, MATERIAL_STEM, inflorescence.birth, 0.56, inflorescence.base);
    for (let fruitIndex = 0; fruitIndex < inflorescence.fruits; fruitIndex += 1) {
      const spread = (fruitIndex - (inflorescence.fruits - 1) * 0.5) * 1.15;
      const pedicelYaw = inflorescence.yaw + spread;
      const radius = 0.055 + ((clusterIndex + fruitIndex) % 3) * 0.005;
      const calyx: Vec3 = [inflorescence.hub[0] + Math.cos(pedicelYaw) * 0.145, inflorescence.hub[1] - 0.037 - fruitIndex * 0.006, inflorescence.hub[2] + Math.sin(pedicelYaw) * 0.145];
      const center: Vec3 = [calyx[0], calyx[1] - radius * 1.05, calyx[2]];
      const fruitBirth = inflorescence.birth;
      triangles += appendCylinderBetween(output, inflorescence.hub, calyx, 0.0043, 5, crop, MATERIAL_STEM, fruitBirth, 0.52, inflorescence.base);
      triangles += appendEllipsoid(output, center, [radius * 0.88, radius * 1.05, radius * 0.88], 10, 7, crop, MATERIAL_HARVEST, fruitBirth, 0.06, inflorescence.base);
      // Seeds sit half-embedded at actual berry mesh vertices, so growth never separates them.
      for (const ring of [3, 5]) {
        const phi = -Math.PI * 0.5 + ring / 7 * Math.PI;
        const y = Math.sin(phi);
        const radial = Math.cos(phi) * radius * 0.88 * (0.68 + 0.32 * (y + 1) * 0.5);
        for (let seed = 0; seed < 5; seed += 1) {
          const theta = (seed * 2 + (ring === 5 ? 1 : 0)) / 10 * Math.PI * 2;
          const seedCenter: Vec3 = [center[0] + Math.cos(theta) * radial, center[1] + y * radius * 1.05, center[2] + Math.sin(theta) * radial];
          triangles += appendEllipsoid(output, seedCenter, [radius * 0.04, radius * 0.075, radius * 0.04], 4, 2, crop, MATERIAL_BLOSSOM, fruitBirth, 0.06, inflorescence.base);
        }
      }
      for (let sepal = 0; sepal < 5; sepal += 1) {
        triangles += appendLeafRibbon(output, calyx, sepal / 5 * Math.PI * 2, radius * 0.46, radius * 0.12, -radius * 0.06, 0, 2, crop, MATERIAL_FOLIAGE, fruitBirth, 0.28, inflorescence.base);
      }
    }
  }
  return triangles;
}

function appendCylinderBetween(output: number[], start: Vec3, end: Vec3, radius: number, segments: number, cropKind: number, materialKind: number, birth: number, flex: number, anchor: Vec3): number {
  const delta = subtract3(end, start);
  const axis = normalize3(delta);
  const taper = radius * 0.14 / Math.max(Math.hypot(...delta), 1e-8);
  const reference: Vec3 = Math.abs(axis[1]) > 0.86 ? [1, 0, 0] : [0, 1, 0];
  const side = normalize3(cross3(axis, reference));
  const up = normalize3(cross3(side, axis));
  const startRing: Vec3[] = [];
  const endRing: Vec3[] = [];
  const normals: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const normal = normalize3(add3(scale3(side, Math.cos(angle)), scale3(up, Math.sin(angle))));
    normals.push(normalize3(add3(normal, scale3(axis, taper))));
    startRing.push(add3(start, scale3(normal, radius)));
    endRing.push(add3(end, scale3(normal, radius * 0.86)));
  }
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushTriangle(output, startRing[index]!, startRing[next]!, endRing[next]!, normals[index]!, normals[next]!, normals[next]!, anchor, cropKind, materialKind, birth, flex);
    pushTriangle(output, startRing[index]!, endRing[next]!, endRing[index]!, normals[index]!, normals[next]!, normals[index]!, anchor, cropKind, materialKind, birth, flex);
  }
  // Closed end caps, with hard normals. Do not smooth a cap into the side of the tapered tube.
  const bottomNormal = scale3(axis, -1);
  for (let index = 1; index < segments - 1; index += 1) {
    pushTriangle(output, startRing[0]!, startRing[index + 1]!, startRing[index]!, bottomNormal, bottomNormal, bottomNormal, anchor, cropKind, materialKind, birth, flex);
    pushTriangle(output, endRing[0]!, endRing[index]!, endRing[index + 1]!, axis, axis, axis, anchor, cropKind, materialKind, birth, flex);
  }
  return segments * 4 - 4;
}

function appendLeafRibbon(output: number[], base: Vec3, yaw: number, length: number, width: number, rise: number, arch: number, segments: number, cropKind: number, materialKind: number, birth: number, flex: number, anchor: Vec3 = base): number {
  const surfaceStart = output.length;
  const forward: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)];
  const side: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const left: Vec3[] = [];
  const right: Vec3[] = [];
  const normals: Vec3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const center: Vec3 = [base[0] + forward[0] * length * t, base[1] + rise * t + Math.sin(t * Math.PI) * arch, base[2] + forward[2] * length * t];
    const widthProfile = width * (0.07 + Math.pow(Math.sin(t * Math.PI), 0.72) * 0.93);
    left.push(add3(center, scale3(side, widthProfile)));
    right.push(add3(center, scale3(side, -widthProfile)));
    const slope = normalize3([forward[0] * length, rise + Math.cos(t * Math.PI) * arch * Math.PI, forward[2] * length]);
    let normal = normalize3(cross3(side, slope));
    if (normal[1] < 0) normal = scale3(normal, -1);
    normals.push(normal);
  }
  for (let index = 0; index < segments; index += 1) {
    pushTriangle(output, left[index]!, right[index]!, right[index + 1]!, normals[index]!, normals[index]!, normals[index + 1]!, anchor, cropKind, materialKind, birth, flex);
    pushTriangle(output, left[index]!, right[index + 1]!, left[index + 1]!, normals[index]!, normals[index + 1]!, normals[index + 1]!, anchor, cropKind, materialKind, birth, flex);
  }
  smoothSurfaceNormals(output, surfaceStart);
  return segments * 2;
}

function appendCuppedLeaf(output: number[], base: Vec3, yaw: number, length: number, width: number, rise: number, arch: number, cup: number, segments: number, cropKind: number, birth: number, flex: number): number {
  const surfaceStart = output.length;
  const forward: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)];
  const side: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  const left: Vec3[] = [];
  const mid: Vec3[] = [];
  const right: Vec3[] = [];
  const leftNormals: Vec3[] = [];
  const midNormals: Vec3[] = [];
  const rightNormals: Vec3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const profile = Math.pow(Math.sin(t * Math.PI), 0.52);
    const along = length * (t - 0.16 * t * t);
    const center: Vec3 = [base[0] + forward[0] * along, base[1] + rise * t + Math.sin(t * Math.PI) * arch, base[2] + forward[2] * along];
    const halfWidth = width * (0.055 + profile * 0.945);
    const edgeLift = cup * profile * (0.55 + t * 0.45) + Math.sin(t * 17.0 + yaw) * profile * 0.007;
    left.push([center[0] + side[0] * halfWidth, center[1] + edgeLift, center[2] + side[2] * halfWidth]);
    mid.push(center);
    right.push([center[0] - side[0] * halfWidth, center[1] + edgeLift, center[2] - side[2] * halfWidth]);
    const longitudinalSlope = rise + Math.cos(t * Math.PI) * arch * Math.PI;
    const surfaceNormal = normalize3([-forward[0] * longitudinalSlope * 0.28, 1, -forward[2] * longitudinalSlope * 0.28]);
    const fold = 0.16 + profile * 0.20;
    leftNormals.push(normalize3(add3(surfaceNormal, scale3(side, -fold))));
    midNormals.push(surfaceNormal);
    rightNormals.push(normalize3(add3(surfaceNormal, scale3(side, fold))));
  }
  for (let index = 0; index < segments; index += 1) {
    const next = index + 1;
    pushTriangle(output, left[index]!, mid[index]!, mid[next]!, leftNormals[index]!, midNormals[index]!, midNormals[next]!, base, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, left[index]!, mid[next]!, left[next]!, leftNormals[index]!, midNormals[next]!, leftNormals[next]!, base, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, mid[index]!, right[index]!, right[next]!, midNormals[index]!, rightNormals[index]!, rightNormals[next]!, base, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, mid[index]!, right[next]!, mid[next]!, midNormals[index]!, rightNormals[next]!, midNormals[next]!, base, cropKind, MATERIAL_FOLIAGE, birth, flex);
  }
  smoothSurfaceNormals(output, surfaceStart);
  return segments * 4;
}

function appendOvalLeaf(output: number[], base: Vec3, yaw: number, length: number, width: number, tilt: number, segments: number, cropKind: number, birth: number, flex: number, anchor: Vec3): number {
  const surfaceStart = output.length;
  const forward = normalize3([Math.cos(yaw) * Math.cos(tilt), Math.sin(tilt), Math.sin(yaw) * Math.cos(tilt)]);
  const side: Vec3 = [-Math.sin(yaw), 0, Math.cos(yaw)];
  let surfaceNormal = normalize3(cross3(side, forward));
  if (surfaceNormal[1] < 0) surfaceNormal = scale3(surfaceNormal, -1);
  const sections = Math.max(3, Math.round(segments / 3));
  const left: Vec3[] = [];
  const mid: Vec3[] = [];
  const right: Vec3[] = [];
  const leftNormals: Vec3[] = [];
  const midNormals: Vec3[] = [];
  const rightNormals: Vec3[] = [];
  for (let index = 0; index <= sections; index += 1) {
    const t = index / sections;
    const profile = Math.pow(Math.sin(t * Math.PI), 0.78);
    const serration = 0.95 + 0.05 * Math.cos(t * Math.PI * 6);
    const halfWidth = width * (0.045 + profile * 0.955) * serration;
    const centerLine = add3(base, add3(scale3(forward, t * length), scale3(surfaceNormal, Math.sin(t * Math.PI) * length * 0.018)));
    const ridge = halfWidth * profile * 0.18;
    left.push(add3(centerLine, scale3(side, halfWidth)));
    mid.push(add3(centerLine, scale3(surfaceNormal, ridge)));
    right.push(add3(centerLine, scale3(side, -halfWidth)));
    const fold = 0.16 + profile * 0.12;
    leftNormals.push(normalize3(add3(surfaceNormal, scale3(side, fold))));
    midNormals.push(surfaceNormal);
    rightNormals.push(normalize3(add3(surfaceNormal, scale3(side, -fold))));
  }
  for (let index = 0; index < sections; index += 1) {
    const next = index + 1;
    pushTriangle(output, left[index]!, mid[index]!, mid[next]!, leftNormals[index]!, midNormals[index]!, midNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, left[index]!, mid[next]!, left[next]!, leftNormals[index]!, midNormals[next]!, leftNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, mid[index]!, right[index]!, right[next]!, midNormals[index]!, rightNormals[index]!, rightNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, mid[index]!, right[next]!, mid[next]!, midNormals[index]!, rightNormals[next]!, midNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
  }
  smoothSurfaceNormals(output, surfaceStart);
  return sections * 4;
}

function appendPalmateLeaf(output: number[], center: Vec3, yaw: number, radius: number, segments: number, cropKind: number, birth: number, flex: number, anchor: Vec3): number {
  const surfaceStart = output.length;
  const hubCenter = center;
  const inner: Vec3[] = [];
  const outer: Vec3[] = [];
  const innerNormals: Vec3[] = [];
  const outerNormals: Vec3[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = yaw + index / segments * Math.PI * 2;
    const radial: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
    const lobe = index % 2 === 0 ? 1 : 0.70;
    const outerRadius = radius * lobe * (0.97 + 0.03 * Math.cos(index * 1.7));
    const innerRadius = radius * (0.27 + (index % 2) * 0.025);
    const innerLift = radius * (0.055 + 0.018 * Math.cos(angle * 2.0 - yaw));
    const outerLift = radius * (-0.018 + 0.050 * Math.cos(angle * 2.2 - yaw * 0.4));
    inner.push([center[0] + radial[0] * innerRadius, center[1] + innerLift, center[2] + radial[2] * innerRadius]);
    outer.push([center[0] + radial[0] * outerRadius, center[1] + outerLift, center[2] + radial[2] * outerRadius]);
    innerNormals.push(normalize3([radial[0] * 0.07, 1, radial[2] * 0.07]));
    outerNormals.push(normalize3([radial[0] * 0.20, 1, radial[2] * 0.20]));
  }
  const centerNormal: Vec3 = [0, 1, 0];
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    pushTriangle(output, hubCenter, inner[index]!, inner[next]!, centerNormal, innerNormals[index]!, innerNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, inner[index]!, outer[index]!, outer[next]!, innerNormals[index]!, outerNormals[index]!, outerNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
    pushTriangle(output, inner[index]!, outer[next]!, inner[next]!, innerNormals[index]!, outerNormals[next]!, innerNormals[next]!, anchor, cropKind, MATERIAL_FOLIAGE, birth, flex);
  }
  smoothSurfaceNormals(output, surfaceStart);
  return segments * 3;
}

function appendEllipsoid(output: number[], center: Vec3, radii: Vec3, segments: number, rings: number, cropKind: number, materialKind: number, birth: number, flex: number, anchor: Vec3, lobeAmount = 0): number {
  const surfaceStart = output.length;
  const rows: Vec3[][] = [];
  const rowNormals: Vec3[][] = [];
  for (let ring = 1; ring < rings; ring += 1) {
    const phi = -Math.PI * 0.5 + ring / rings * Math.PI;
    const y = Math.sin(phi);
    const radial = Math.cos(phi);
    const row: Vec3[] = [];
    const normals: Vec3[] = [];
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = segment / segments * Math.PI * 2;
      const lobe = 1 + lobeAmount * Math.cos(theta * 8);
      let shape = 1;
      if (materialKind === MATERIAL_HARVEST && cropKind === CROP_KIND.strawberry) shape = 0.68 + 0.32 * (y + 1) * 0.5;
      if (materialKind === MATERIAL_HARVEST && cropKind === CROP_KIND.carrot) shape = 0.42 + 0.58 * Math.min(1, (y + 1) / 1.3);
      const x = Math.cos(theta) * radial * lobe * shape;
      const z = Math.sin(theta) * radial * lobe * shape;
      row.push([center[0] + x * radii[0], center[1] + y * radii[1], center[2] + z * radii[2]]);
      normals.push(normalize3([x / Math.max(0.0001, radii[0]), y / Math.max(0.0001, radii[1]), z / Math.max(0.0001, radii[2])]));
    }
    rows.push(row);
    rowNormals.push(normals);
  }
  const bottom: Vec3 = [center[0], center[1] - radii[1], center[2]];
  const top: Vec3 = [center[0], center[1] + radii[1], center[2]];
  const bottomNormal: Vec3 = [0, -1, 0];
  const topNormal: Vec3 = [0, 1, 0];
  let triangles = 0;
  const firstRow = rows[0]!;
  const firstNormals = rowNormals[0]!;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    pushTriangle(output, bottom, firstRow[next]!, firstRow[segment]!, bottomNormal, firstNormals[next]!, firstNormals[segment]!, anchor, cropKind, materialKind, birth, flex);
    triangles += 1;
  }
  for (let ring = 0; ring < rows.length - 1; ring += 1) {
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
  const lastRow = rows[rows.length - 1]!;
  const lastNormals = rowNormals[rowNormals.length - 1]!;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    pushTriangle(output, lastRow[segment]!, lastRow[next]!, top, lastNormals[segment]!, lastNormals[next]!, topNormal, anchor, cropKind, materialKind, birth, flex);
    triangles += 1;
  }
  smoothSurfaceNormals(output, surfaceStart);
  return triangles;
}

function pushTriangle(output: number[], a: Vec3, b: Vec3, c: Vec3, na: Vec3, nb: Vec3, nc: Vec3, anchor: Vec3, cropKind: number, materialKind: number, birth: number, flex: number): void {
  // The surface builders traverse their rings/strips clockwise. Emit CCW relative to outward/front normals.
  pushVertex(output, a, na, anchor, cropKind, materialKind, birth, flex);
  pushVertex(output, c, nc, anchor, cropKind, materialKind, birth, flex);
  pushVertex(output, b, nb, anchor, cropKind, materialKind, birth, flex);
}

function pushVertex(output: number[], position: Vec3, normal: Vec3, anchor: Vec3, cropKind: number, materialKind: number, birth: number, flex: number): void {
  output.push(...position, ...normal, ...anchor, cropKind, materialKind, birth, flex);
}

function add3(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function subtract3(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale3(value: Vec3, scale: number): Vec3 { return [value[0] * scale, value[1] * scale, value[2] * scale]; }
function dot3(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize3(value: Vec3): Vec3 {
  const length = Math.hypot(...value);
  return length < 1e-8 ? [0, 1, 0] : [value[0] / length, value[1] / length, value[2] / length];
}
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }

/** Area-weighted normals within ONE authored surface. Never weld unrelated organs or solid end caps. */
function smoothSurfaceNormals(output: number[], start: number): void {
  const stride = CROP_VERTEX_STRIDE_FLOATS;
  const sums = new Map<string, Vec3>();
  const keyAt = (offset: number): string => `${output[offset]!.toFixed(7)},${output[offset + 1]!.toFixed(7)},${output[offset + 2]!.toFixed(7)}`;
  const pointAt = (offset: number): Vec3 => [output[offset]!, output[offset + 1]!, output[offset + 2]!];
  for (let offset = start; offset < output.length; offset += stride * 3) {
    const a = pointAt(offset);
    const face = cross3(subtract3(pointAt(offset + stride), a), subtract3(pointAt(offset + stride * 2), a));
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const key = keyAt(offset + vertex * stride);
      sums.set(key, add3(sums.get(key) ?? [0, 0, 0], face));
    }
  }
  for (let offset = start; offset < output.length; offset += stride) {
    const normal = normalize3(sums.get(keyAt(offset))!);
    output[offset + 3] = normal[0];
    output[offset + 4] = normal[1];
    output[offset + 5] = normal[2];
  }
}

function transformSurface(output: number[], start: number, frame: CropAttachmentFrame, growthAnchor: Vec3): void {
  for (let offset = start; offset < output.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    const p = cropFramePoint(frame, [output[offset]!, output[offset + 1]!, output[offset + 2]!]);
    const n = cropFrameVector(frame, [output[offset + 3]!, output[offset + 4]!, output[offset + 5]!]);
    output.splice(offset, 9, ...p, ...n, ...growthAnchor);
  }
}

function appendCornHusk(output: number[], sheet: number, crop: number, birth: number): number {
  const start = output.length;
  const rows: Vec3[][] = [];
  const along = 8;
  const across = 4;
  const sheetYaw = sheet * Math.PI * 2 / 3 + 0.30;
  const height = [0.315, 0.350, 0.335][sheet]!;
  for (let row = 0; row <= along; row += 1) {
    const t = row / along;
    const profile = Math.pow(Math.sin(t * Math.PI), 0.58);
    const radius = 0.016 + 0.068 * profile + sheet * 0.002;
    // Keep the basal wrap continuous; taper the pointed opening only near the tip.
    const tip = Math.max(0, t - 0.70) / 0.30;
    const halfArc = (1.16 + profile * 0.19) * (1 - tip * tip * 0.88);
    const points: Vec3[] = [];
    for (let column = 0; column <= across; column += 1) {
      const u = column / across * 2 - 1;
      const angle = sheetYaw + u * halfArc;
      const flare = Math.pow(Math.max(0, t - 0.64) / 0.36, 2) * (sheet === 0 ? 0.065 : 0.030);
      const rib = column % 2 === 0 ? 0 : 0.0025 * profile;
      points.push([Math.cos(angle) * (radius + flare + rib), t * height, Math.sin(angle) * (radius + flare + rib)]);
    }
    rows.push(points);
  }
  for (let row = 0; row < along; row += 1) {
    for (let column = 0; column < across; column += 1) {
      const a = rows[row]![column]!;
      const b = rows[row]![column + 1]!;
      const c = rows[row + 1]![column + 1]!;
      const d = rows[row + 1]![column]!;
      const n: Vec3 = [Math.cos(sheetYaw), 0, Math.sin(sheetYaw)];
      pushTriangle(output, a, b, c, n, n, n, [0, 0, 0], crop, MATERIAL_HUSK, birth, 0.3);
      pushTriangle(output, a, c, d, n, n, n, [0, 0, 0], crop, MATERIAL_HUSK, birth, 0.3);
    }
  }
  smoothSurfaceNormals(output, start);
  return along * across * 2;
}
