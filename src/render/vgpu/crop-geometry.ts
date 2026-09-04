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
  const stemNodes: Vec3[] = [
    [0.000, 0.015, 0.000],
    [0.012, 0.175, -0.008],
    [-0.010, 0.330, 0.012],
    [0.018, 0.485, 0.004],
    [-0.012, 0.640, -0.014],
    [0.022, 0.790, 0.008],
    [0.000, 0.930, -0.010],
    [0.025, 1.055, -0.015],
  ];

  // The visible main axis is a chain of internodes, not one perfectly straight tube.
  for (let index = 0; index < stemNodes.length - 1; index += 1) {
    const birth = index < 2 ? 0 : index < 5 ? 0.24 : 0.48;
    const radius = 0.027 - index * 0.0017;
    triangles += appendCylinderBetween(output, stemNodes[index]!, stemNodes[index + 1]!, radius, 8, crop, MATERIAL_STEM, birth, 0.16, stemNodes[index]!);
    if (index > 0 && index < stemNodes.length - 2) {
      triangles += appendEllipsoid(output, stemNodes[index]!, [radius * 1.18, 0.014, radius * 1.18], 7, 3, crop, MATERIAL_STEM, birth, 0.16, stemNodes[index]!);
    }
  }

  const leafNodes = [1, 2, 3, 4, 5, 6] as const;
  for (let leafIndex = 0; leafIndex < leafNodes.length; leafIndex += 1) {
    const nodeIndex = leafNodes[leafIndex]!;
    const node = stemNodes[nodeIndex]!;
    const yaw = 0.42 + leafIndex * 2.38;
    const birth = leafIndex < 2 ? 0 : leafIndex < 4 ? 0.24 : 0.48;
    const petioleLength = 0.16 + (leafIndex % 3) * 0.018;
    const petioleEnd: Vec3 = [
      node[0] + Math.cos(yaw) * petioleLength,
      node[1] + 0.035 + (leafIndex % 2) * 0.012,
      node[2] + Math.sin(yaw) * petioleLength,
    ];
    const rachisEnd: Vec3 = [
      petioleEnd[0] + Math.cos(yaw) * 0.17,
      petioleEnd[1] + 0.035,
      petioleEnd[2] + Math.sin(yaw) * 0.17,
    ];
    triangles += appendCylinderBetween(output, node, petioleEnd, 0.009, 6, crop, MATERIAL_STEM, birth, 0.44, node);
    triangles += appendCylinderBetween(output, petioleEnd, rachisEnd, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.56, node);

    // One compound leaf: three lateral leaflet pairs plus a terminal leaflet.
    for (let pair = 0; pair < 3; pair += 1) {
      const t = 0.28 + pair * 0.25;
      const base = lerp3(petioleEnd, rachisEnd, t);
      const leafletLength = 0.105 - pair * 0.010;
      for (const sideSign of [-1, 1] as const) {
        const leafYaw = yaw + sideSign * (0.93 + pair * 0.08);
        const center: Vec3 = [
          base[0] + Math.cos(leafYaw) * leafletLength * 0.44,
          base[1] + 0.006 + pair * 0.004,
          base[2] + Math.sin(leafYaw) * leafletLength * 0.44,
        ];
        triangles += appendOvalLeaf(output, center, leafYaw, leafletLength, 0.040 - pair * 0.003, 0.20, 10, crop, birth, 0.76, node);
      }
    }
    const terminalCenter: Vec3 = [
      rachisEnd[0] + Math.cos(yaw) * 0.055,
      rachisEnd[1] + 0.008,
      rachisEnd[2] + Math.sin(yaw) * 0.055,
    ];
    triangles += appendOvalLeaf(output, terminalCenter, yaw, 0.135, 0.045, 0.23, 10, crop, birth, 0.80, node);
  }

  // Three short trusses originate at visible stem nodes. Fruit hangs below branched pedicels.
  const trusses = [
    { nodeIndex: 2, yaw: -0.55, birth: 0.52, fruits: 2 },
    { nodeIndex: 4, yaw: 1.18, birth: 0.64, fruits: 3 },
    { nodeIndex: 5, yaw: -2.05, birth: 0.75, fruits: 2 },
  ] as const;
  for (let trussIndex = 0; trussIndex < trusses.length; trussIndex += 1) {
    const truss = trusses[trussIndex]!;
    const node = stemNodes[truss.nodeIndex]!;
    const hub: Vec3 = [
      node[0] + Math.cos(truss.yaw) * 0.16,
      node[1] - 0.005,
      node[2] + Math.sin(truss.yaw) * 0.16,
    ];
    triangles += appendCylinderBetween(output, node, hub, 0.0075, 5, crop, MATERIAL_STEM, truss.birth - 0.10, 0.32, node);

    for (let fruitIndex = 0; fruitIndex < truss.fruits; fruitIndex += 1) {
      const spread = (fruitIndex - (truss.fruits - 1) * 0.5) * 0.72;
      const pedicelYaw = truss.yaw + spread;
      const radius = 0.073 + ((fruitIndex + trussIndex) % 3) * 0.007;
      const pedicelBase: Vec3 = [
        hub[0] + Math.cos(truss.yaw) * fruitIndex * 0.025,
        hub[1] - fruitIndex * 0.008,
        hub[2] + Math.sin(truss.yaw) * fruitIndex * 0.025,
      ];
      const calyx: Vec3 = [
        pedicelBase[0] + Math.cos(pedicelYaw) * (0.075 + fruitIndex * 0.010),
        pedicelBase[1] - 0.045 - fruitIndex * 0.012,
        pedicelBase[2] + Math.sin(pedicelYaw) * (0.075 + fruitIndex * 0.010),
      ];
      const center: Vec3 = [calyx[0], calyx[1] - radius * 0.82, calyx[2]];
      const fruitBirth = truss.birth + fruitIndex * 0.025;
      triangles += appendCylinderBetween(output, pedicelBase, calyx, 0.0055, 5, crop, MATERIAL_STEM, fruitBirth - 0.08, 0.26, pedicelBase);
      triangles += appendEllipsoid(output, center, [radius, radius * 0.92, radius], 10, 7, crop, MATERIAL_HARVEST, fruitBirth, 0.08, calyx);
      for (let sepal = 0; sepal < 5; sepal += 1) {
        triangles += appendLeafRibbon(output, calyx, sepal / 5 * Math.PI * 2, radius * 0.44, radius * 0.11, -radius * 0.07, 0, 2, crop, MATERIAL_FOLIAGE, fruitBirth, 0.22);
      }
    }
  }
  return triangles;
}

function appendCorn(output: number[]): number {
  const crop = CROP_KIND.corn;
  let triangles = 0;
  const stalkNodes: Vec3[] = [
    [0.000, 0.010, 0.000],
    [0.002, 0.155, -0.002],
    [-0.003, 0.305, 0.002],
    [0.003, 0.460, -0.002],
    [-0.003, 0.620, 0.003],
    [0.003, 0.785, -0.002],
    [-0.002, 0.955, 0.002],
    [0.003, 1.130, -0.002],
    [-0.002, 1.310, 0.002],
    [0.002, 1.495, -0.001],
    [0.000, 1.675, 0.000],
  ];

  for (let index = 0; index < stalkNodes.length - 1; index += 1) {
    const birth = index < 3 ? 0 : index < 7 ? 0.22 : 0.48;
    const radius = 0.038 - index * 0.0012;
    triangles += appendCylinderBetween(output, stalkNodes[index]!, stalkNodes[index + 1]!, radius, 9, crop, MATERIAL_STEM, birth, 0.10, stalkNodes[index]!);
    if (index > 0 && index < stalkNodes.length - 2) {
      triangles += appendEllipsoid(output, stalkNodes[index]!, [radius * 1.15, 0.012, radius * 1.15], 7, 3, crop, MATERIAL_STEM, birth, 0.10, stalkNodes[index]!);
    }
  }

  // Corn is distichous: one leaf per node, alternating sides. A short enlarged sheath precedes each blade.
  for (let leafIndex = 0; leafIndex < 9; leafIndex += 1) {
    const nodeIndex = leafIndex + 1;
    const node = stalkNodes[nodeIndex]!;
    const yaw = (leafIndex % 2) * Math.PI + leafIndex * 0.12;
    const birth = leafIndex < 3 ? 0 : leafIndex < 6 ? 0.24 : 0.48;
    const sheathTop: Vec3 = [node[0], node[1] + 0.085, node[2]];
    triangles += appendCylinderBetween(output, node, sheathTop, 0.041 - leafIndex * 0.0011, 8, crop, MATERIAL_FOLIAGE, birth, 0.18, node);
    const bladeBase: Vec3 = [
      sheathTop[0] + Math.cos(yaw) * 0.026,
      sheathTop[1] - 0.004,
      sheathTop[2] + Math.sin(yaw) * 0.026,
    ];
    const length = 0.50 + (leafIndex % 4) * 0.055 - Math.max(0, leafIndex - 6) * 0.045;
    const width = 0.078 + (leafIndex % 3) * 0.009;
    triangles += appendLeafRibbon(output, bladeBase, yaw, length, width, 0.13 + leafIndex * 0.006, 0.11, 8, crop, MATERIAL_FOLIAGE, birth, 0.72);
  }

  // The ear leaves a leaf axil on a short shank and points slightly upward/outward while remaining husked.
  const earNode = stalkNodes[6]!;
  const earYaw = 0.16;
  const earBase: Vec3 = [earNode[0] + Math.cos(earYaw) * 0.065, earNode[1] + 0.055, earNode[2] + Math.sin(earYaw) * 0.065];
  const earCenter: Vec3 = [earBase[0] + Math.cos(earYaw) * 0.055, earBase[1] + 0.155, earBase[2] + Math.sin(earYaw) * 0.055];
  triangles += appendCylinderBetween(output, earNode, earBase, 0.016, 6, crop, MATERIAL_STEM, 0.52, 0.18, earNode);
  triangles += appendEllipsoid(output, earCenter, [0.070, 0.205, 0.070], 10, 7, crop, MATERIAL_HUSK, 0.58, 0.12, earBase, 0.02);
  // A small exposed tip keeps the crop readable without pretending the whole mature ear is naturally de-husked.
  const kernelTip: Vec3 = [earCenter[0] + Math.cos(earYaw) * 0.012, earCenter[1] + 0.165, earCenter[2] + Math.sin(earYaw) * 0.012];
  triangles += appendEllipsoid(output, kernelTip, [0.044, 0.052, 0.044], 9, 5, crop, MATERIAL_HARVEST, 0.70, 0.05, earBase);
  triangles += appendLeafRibbon(output, [earBase[0], earBase[1] - 0.02, earBase[2]], earYaw + 0.18, 0.36, 0.090, 0.19, 0.035, 6, crop, MATERIAL_HUSK, 0.52, 0.42);
  triangles += appendLeafRibbon(output, [earBase[0], earBase[1] + 0.015, earBase[2]], earYaw - 0.22, 0.33, 0.086, 0.17, 0.030, 6, crop, MATERIAL_HUSK, 0.52, 0.42);
  const silkOrigin: Vec3 = [earCenter[0], earCenter[1] + 0.205, earCenter[2]];
  for (let silk = 0; silk < 6; silk += 1) {
    const silkYaw = earYaw + (silk - 2.5) * 0.22;
    const end: Vec3 = [silkOrigin[0] + Math.cos(silkYaw) * (0.055 + silk * 0.006), silkOrigin[1] - 0.045 - silk * 0.004, silkOrigin[2] + Math.sin(silkYaw) * (0.055 + silk * 0.006)];
    triangles += appendCylinderBetween(output, silkOrigin, end, 0.0022, 4, crop, MATERIAL_BLOSSOM, 0.70, 0.46, silkOrigin);
  }

  const tasselBase = stalkNodes[stalkNodes.length - 1]!;
  const tasselTop: Vec3 = [0, 1.82, 0];
  triangles += appendCylinderBetween(output, tasselBase, tasselTop, 0.006, 5, crop, MATERIAL_BLOSSOM, 0.72, 0.52, tasselBase);
  for (let tassel = 0; tassel < 7; tassel += 1) {
    const yaw = tassel / 7 * Math.PI * 2;
    const start: Vec3 = [0, 1.70 + (tassel % 2) * 0.025, 0];
    const end: Vec3 = [Math.cos(yaw) * (0.13 + (tassel % 3) * 0.018), 1.80 - (tassel % 3) * 0.025, Math.sin(yaw) * (0.13 + (tassel % 3) * 0.018)];
    triangles += appendCylinderBetween(output, start, end, 0.0038, 5, crop, MATERIAL_BLOSSOM, 0.74, 0.58, start);
  }
  return triangles;
}

function appendPumpkin(output: number[]): number {
  const crop = CROP_KIND.pumpkin;
  let triangles = 0;
  const vinePoints: Vec3[] = [
    [0.00, 0.038, 0.00],
    [0.20, 0.056, 0.02],
    [0.39, 0.052, -0.05],
    [0.58, 0.060, -0.08],
    [0.76, 0.052, -0.01],
    [0.94, 0.060, 0.07],
    [1.12, 0.052, 0.12],
  ];
  for (let index = 0; index < vinePoints.length - 1; index += 1) {
    const birth = index < 2 ? 0 : 0.22 + index * 0.075;
    triangles += appendCylinderBetween(output, vinePoints[index]!, vinePoints[index + 1]!, 0.021, 7, crop, MATERIAL_STEM, birth, 0.44, vinePoints[index]!);
    if (index > 0) {
      triangles += appendEllipsoid(output, vinePoints[index]!, [0.032, 0.017, 0.032], 7, 3, crop, MATERIAL_STEM, birth, 0.38, vinePoints[index]!);
    }
  }

  // One alternate leaf per visible vine node. Side alternation is structural; small yaw offsets keep it organic.
  for (let index = 0; index < vinePoints.length; index += 1) {
    const anchor = vinePoints[index]!;
    const side = (index % 2 === 0 ? -1 : 1) * (1.00 + (index % 3) * 0.12) + 0.10;
    const birth = index < 2 ? 0 : 0.18 + index * 0.085;
    const petioleLength = index < 2 ? 0.25 : 0.20 + (index % 2) * 0.018;
    const petioleEnd: Vec3 = [
      anchor[0] + Math.cos(side) * petioleLength,
      0.19 + (index % 3) * 0.020,
      anchor[2] + Math.sin(side) * petioleLength,
    ];
    const leafRadius = index < 2 ? 0.205 : index === vinePoints.length - 1 ? 0.19 : 0.225 + (index % 2) * 0.018;
    triangles += appendCylinderBetween(output, anchor, petioleEnd, 0.009, 6, crop, MATERIAL_STEM, birth, 0.58, anchor);
    triangles += appendPalmateLeaf(output, petioleEnd, side, leafRadius, 14, crop, birth, 0.86, anchor);
    for (let vein = -1; vein <= 1; vein += 1) {
      const veinAngle = side + vein * 0.90;
      const veinStart: Vec3 = [petioleEnd[0], petioleEnd[1] + leafRadius * 0.052, petioleEnd[2]];
      const veinEnd: Vec3 = [
        petioleEnd[0] + Math.cos(veinAngle) * leafRadius * 0.70,
        petioleEnd[1] + leafRadius * 0.006,
        petioleEnd[2] + Math.sin(veinAngle) * leafRadius * 0.70,
      ];
      triangles += appendCylinderBetween(output, veinStart, veinEnd, 0.0022, 5, crop, MATERIAL_STEM, birth, 0.74, anchor);
    }
  }

  // The primary fruit sits on the soil but its thick, slightly bent peduncle actually returns to vine node 1.
  const fruitCenter: Vec3 = [0.33, 0.158, 0.14];
  const fruitTop: Vec3 = [0.31, 0.305, 0.13];
  const peduncleRoot = vinePoints[1]!;
  const peduncleKnee: Vec3 = [0.245, 0.165, 0.070];
  triangles += appendCylinderBetween(output, peduncleRoot, peduncleKnee, 0.018, 7, crop, MATERIAL_STEM, 0.54, 0.24, peduncleRoot);
  triangles += appendCylinderBetween(output, peduncleKnee, fruitTop, 0.016, 7, crop, MATERIAL_STEM, 0.57, 0.18, peduncleKnee);
  triangles += appendEllipsoid(output, fruitCenter, [0.245, 0.158, 0.225], 16, 10, crop, MATERIAL_HARVEST, 0.60, 0.02, fruitTop, 0.085);
  return triangles;
}

function appendLettuce(output: number[]): number {
  const crop = CROP_KIND.lettuce;
  let triangles = 0;
  const crown: Vec3 = [0, 0.028, 0];
  triangles += appendEllipsoid(output, crown, [0.060, 0.034, 0.060], 8, 4, crop, MATERIAL_STEM, 0, 0.12, crown);

  const rings = [
    { count: 10, baseRadius: 0.070, length: 0.33, width: 0.105, rise: 0.060, arch: 0.045, cup: 0.030, birth: 0.00, yawOffset: 0.00 },
    { count: 8, baseRadius: 0.050, length: 0.255, width: 0.100, rise: 0.135, arch: 0.050, cup: 0.050, birth: 0.24, yawOffset: 0.23 },
    { count: 6, baseRadius: 0.034, length: 0.175, width: 0.083, rise: 0.185, arch: 0.035, cup: 0.060, birth: 0.50, yawOffset: 0.46 },
  ] as const;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex]!;
    for (let leaf = 0; leaf < ring.count; leaf += 1) {
      const yaw = leaf / ring.count * Math.PI * 2 + ring.yawOffset + (leaf % 2) * 0.035;
      const base: Vec3 = [
        Math.cos(yaw) * ring.baseRadius,
        0.016 + ringIndex * 0.018 + (leaf % 3) * 0.003,
        Math.sin(yaw) * ring.baseRadius,
      ];
      triangles += appendCuppedLeaf(
        output,
        base,
        yaw,
        ring.length * (0.94 + (leaf % 3) * 0.025),
        ring.width * (0.96 + (leaf % 2) * 0.05),
        ring.rise,
        ring.arch,
        ring.cup,
        6,
        crop,
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
  const crown: Vec3 = [0, 0.030, 0];
  triangles += appendEllipsoid(output, crown, [0.055, 0.042, 0.055], 8, 4, crop, MATERIAL_STEM, 0, 0.10, crown);

  // Leaves spiral around a compressed crown. Each leaf visibly splits through three petiolules.
  for (let leafIndex = 0; leafIndex < 8; leafIndex += 1) {
    const yaw = leafIndex * 2.40 + 0.18;
    const birth = leafIndex < 3 ? 0 : leafIndex < 6 ? 0.26 : 0.52;
    const petioleBase: Vec3 = [Math.cos(yaw) * 0.022, 0.035, Math.sin(yaw) * 0.022];
    const junction: Vec3 = [Math.cos(yaw) * 0.135, 0.185 + (leafIndex % 3) * 0.018, Math.sin(yaw) * 0.135];
    triangles += appendCylinderBetween(output, petioleBase, junction, 0.0065, 5, crop, MATERIAL_STEM, birth, 0.64, petioleBase);
    for (let leaflet = -1; leaflet <= 1; leaflet += 1) {
      const leafYaw = yaw + leaflet * 0.72;
      const petioluleLength = leaflet === 0 ? 0.060 : 0.050;
      const leafletBase: Vec3 = [
        junction[0] + Math.cos(leafYaw) * petioluleLength,
        junction[1] + 0.005 - Math.abs(leaflet) * 0.003,
        junction[2] + Math.sin(leafYaw) * petioluleLength,
      ];
      triangles += appendCylinderBetween(output, junction, leafletBase, 0.0036, 4, crop, MATERIAL_STEM, birth, 0.70, junction);
      const center: Vec3 = [
        leafletBase[0] + Math.cos(leafYaw) * 0.050,
        leafletBase[1] + 0.004,
        leafletBase[2] + Math.sin(leafYaw) * 0.050,
      ];
      triangles += appendOvalLeaf(output, center, leafYaw, 0.108, 0.052, 0.15, 12, crop, birth, 0.74, petioleBase);
    }
  }

  const inflorescences = [
    { base: [0.015, 0.038, 0.010] as Vec3, hub: [0.075, 0.205, 0.035] as Vec3, yaw: 0.35, fruits: 3, birth: 0.55 },
    { base: [-0.018, 0.040, -0.008] as Vec3, hub: [-0.070, 0.185, -0.045] as Vec3, yaw: 3.45, fruits: 2, birth: 0.67 },
  ] as const;
  for (let clusterIndex = 0; clusterIndex < inflorescences.length; clusterIndex += 1) {
    const inflorescence = inflorescences[clusterIndex]!;
    triangles += appendCylinderBetween(output, inflorescence.base, inflorescence.hub, 0.0055, 5, crop, MATERIAL_STEM, inflorescence.birth - 0.10, 0.56, inflorescence.base);
    for (let fruitIndex = 0; fruitIndex < inflorescence.fruits; fruitIndex += 1) {
      const spread = (fruitIndex - (inflorescence.fruits - 1) * 0.5) * 0.72;
      const pedicelYaw = inflorescence.yaw + spread;
      const radius = 0.060 + ((clusterIndex + fruitIndex) % 3) * 0.006;
      const calyx: Vec3 = [
        inflorescence.hub[0] + Math.cos(pedicelYaw) * (0.075 + fruitIndex * 0.010),
        inflorescence.hub[1] - 0.055 - fruitIndex * 0.015,
        inflorescence.hub[2] + Math.sin(pedicelYaw) * (0.075 + fruitIndex * 0.010),
      ];
      const center: Vec3 = [calyx[0], calyx[1] - radius * 0.92, calyx[2]];
      const fruitBirth = inflorescence.birth + fruitIndex * 0.025;
      triangles += appendCylinderBetween(output, inflorescence.hub, calyx, 0.0043, 5, crop, MATERIAL_STEM, fruitBirth - 0.08, 0.52, inflorescence.hub);
      triangles += appendEllipsoid(output, center, [radius * 0.88, radius * 1.15, radius * 0.88], 10, 7, crop, MATERIAL_HARVEST, fruitBirth, 0.06, calyx);
      for (let sepal = 0; sepal < 5; sepal += 1) {
        triangles += appendLeafRibbon(output, calyx, sepal / 5 * Math.PI * 2, radius * 0.46, radius * 0.12, -radius * 0.06, 0, 2, crop, MATERIAL_FOLIAGE, fruitBirth, 0.28);
      }
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

function appendCuppedLeaf(
  output: number[],
  base: Vec3,
  yaw: number,
  length: number,
  width: number,
  rise: number,
  arch: number,
  cup: number,
  segments: number,
  cropKind: number,
  birth: number,
  flex: number,
): number {
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
    const profile = Math.pow(Math.sin(t * Math.PI), 0.76);
    const along = length * (t - 0.16 * t * t);
    const center: Vec3 = [
      base[0] + forward[0] * along,
      base[1] + rise * t + Math.sin(t * Math.PI) * arch,
      base[2] + forward[2] * along,
    ];
    const halfWidth = width * (0.055 + profile * 0.945);
    const edgeLift = cup * profile * (0.55 + t * 0.45);
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
  return segments * 4;
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
  let surfaceNormal = normalize3(cross3(side, forward));
  if (surfaceNormal[1] < 0) surfaceNormal = scale3(surfaceNormal, -1);

  // Build the leaflet as two half-surfaces around a shallow raised midrib.
  // This avoids the old single-center triangle fan and gives lighting a real bilateral fold.
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
    const along = (t - 0.5) * length;
    const arch = Math.sin(t * Math.PI) * length * 0.018;
    const centerLine = add3(center, add3(scale3(forward, along), scale3(surfaceNormal, arch)));
    const ridge = halfWidth * (0.13 + profile * 0.05);

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
  return sections * 4;
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
  // A small hub ring distributes the palmate topology before it reaches the lobed outline.
  // The old leaf sent every triangle into one central pole, which read as a dark starburst.
  const hubCenter: Vec3 = [center[0], center[1] + radius * 0.045, center[2]];
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

    inner.push([
      center[0] + radial[0] * innerRadius,
      center[1] + innerLift,
      center[2] + radial[2] * innerRadius,
    ]);
    outer.push([
      center[0] + radial[0] * outerRadius,
      center[1] + outerLift,
      center[2] + radial[2] * outerRadius,
    ]);
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
  return segments * 3;
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
  // Keep one real pole vertex at each end instead of repeating an identical pole per segment.
  // This removes degenerate cap triangles and the visible star/pinch they caused on fruit.
  const rows: Vec3[][] = [];
  const rowNormals: Vec3[][] = [];
  for (let ring = 1; ring < rings; ring += 1) {
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
