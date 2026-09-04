import { expect, test } from "vitest";

import {
  CROP_KIND,
  CROP_VERTEX_STRIDE_FLOATS,
  CROP_VISIBLE_TOPOLOGY,
  advanceVisualStage,
  createCropGeometryData,
  cropMarkerHeight,
} from "../src/render/vgpu/crop-geometry";

const MATERIAL_OFFSET = 10;
const CROP_OFFSET = 9;

test("six crop families share one bounded high-detail geometry carrier", () => {
  const { data, stats } = createCropGeometryData();
  expect(stats.triangleCount).toBeGreaterThan(6_000);
  // Closed tube ends, layered husks, corn kernels and berry seeds: 9,398 versus the old 7,394.
  // This is an allocation bound, not a visual quality score or an equal budget for each crop.
  expect(stats.triangleCount).toBeLessThan(9_600);
  expect(stats.vertexCount).toBe(stats.triangleCount * 3);
  expect(data.length).toBe(stats.vertexCount * CROP_VERTEX_STRIDE_FLOATS);
  for (const triangles of Object.values(stats.perCropTriangles)) expect(triangles).toBeGreaterThan(450);
  expect(stats.minY).toBeLessThan(-0.40);
  expect(stats.maxY).toBeGreaterThan(1.75);
  expect(stats.maxRadius).toBeGreaterThan(1.20);
  expect(stats.maxRadius).toBeLessThan(1.50);
});

test("crop vertices are finite, normalized and include all species/material families", () => {
  const { data } = createCropGeometryData();
  const crops = new Set<number>();
  const materials = new Set<number>();
  let firstNonFinite = -1;
  let minNormalLength = Number.POSITIVE_INFINITY;
  let maxNormalLength = Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < data.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    for (let lane = 0; lane < CROP_VERTEX_STRIDE_FLOATS; lane += 1) {
      if (firstNonFinite < 0 && !Number.isFinite(data[offset + lane]!)) firstNonFinite = offset + lane;
    }
    const normalLength = Math.hypot(data[offset + 3]!, data[offset + 4]!, data[offset + 5]!);
    minNormalLength = Math.min(minNormalLength, normalLength);
    maxNormalLength = Math.max(maxNormalLength, normalLength);
    crops.add(Math.round(data[offset + CROP_OFFSET]!));
    materials.add(Math.round(data[offset + MATERIAL_OFFSET]!));
  }
  expect(firstNonFinite, "all crop carrier floats must remain finite").toBe(-1);
  expect(minNormalLength).toBeGreaterThan(0.98);
  expect(maxNormalLength).toBeLessThan(1.02);
  expect([...crops].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  expect([...materials].sort()).toEqual([0, 1, 2, 3, 4]);
});

test("visible morphology contract keeps species-specific axes, leaf order and fruit groups", () => {
  expect(CROP_VISIBLE_TOPOLOGY.carrot).toMatchObject({ leafOrder: "basal-rosette", leafUnits: 12 });
  expect(CROP_VISIBLE_TOPOLOGY.tomato).toMatchObject({ leafOrder: "alternate-compound", primaryAxisSegments: 7, fruitGroups: 3 });
  expect(CROP_VISIBLE_TOPOLOGY.corn).toMatchObject({ leafOrder: "alternate-node", primaryAxisSegments: 10, leafUnits: 9, fruitGroups: 1 });
  expect(CROP_VISIBLE_TOPOLOGY.pumpkin).toMatchObject({ leafOrder: "alternate-node", primaryAxisSegments: 6, fruitGroups: 1 });
  expect(CROP_VISIBLE_TOPOLOGY.lettuce).toMatchObject({ leafOrder: "independent-rosette", leafUnits: 24, fruitGroups: 0 });
  expect(CROP_VISIBLE_TOPOLOGY.strawberry).toMatchObject({ leafOrder: "spiral-crown", leafUnits: 8, fruitGroups: 2 });
});

test("crop-specific material carriers reflect the organs that must remain visibly attached", () => {
  const { data } = createCropGeometryData();
  const materialsByCrop = new Map<number, Set<number>>();
  for (let offset = 0; offset < data.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    const crop = Math.round(data[offset + CROP_OFFSET]!);
    const material = Math.round(data[offset + MATERIAL_OFFSET]!);
    if (!materialsByCrop.has(crop)) materialsByCrop.set(crop, new Set<number>());
    materialsByCrop.get(crop)!.add(material);
  }
  expect([...materialsByCrop.get(CROP_KIND.carrot)!].sort()).toEqual([0, 1, 2]);
  expect([...materialsByCrop.get(CROP_KIND.tomato)!].sort()).toEqual([0, 1, 2]);
  expect([...materialsByCrop.get(CROP_KIND.corn)!].sort()).toEqual([0, 1, 2, 3, 4]);
  expect([...materialsByCrop.get(CROP_KIND.pumpkin)!].sort()).toEqual([0, 1, 2]);
  expect([...materialsByCrop.get(CROP_KIND.lettuce)!].sort()).toEqual([0, 1]);
  // The existing pale blossom material also carries the small half-embedded achenes.
  expect([...materialsByCrop.get(CROP_KIND.strawberry)!].sort()).toEqual([0, 1, 2, 3]);
});

test("ordinary crops stay bed-scale while pumpkin alone owns the long overflow footprint", () => {
  const { data } = createCropGeometryData();
  const maxRadius = new Map<number, number>();
  for (let offset = 0; offset < data.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    const crop = Math.round(data[offset + CROP_OFFSET]!);
    const radius = Math.hypot(data[offset]!, data[offset + 2]!);
    maxRadius.set(crop, Math.max(maxRadius.get(crop) ?? 0, radius));
  }
  expect(maxRadius.get(CROP_KIND.carrot)).toBeLessThan(0.50);
  expect(maxRadius.get(CROP_KIND.tomato)).toBeLessThan(0.60);
  expect(maxRadius.get(CROP_KIND.corn)).toBeLessThan(0.78);
  expect(maxRadius.get(CROP_KIND.lettuce)).toBeLessThan(0.50);
  expect(maxRadius.get(CROP_KIND.strawberry)).toBeLessThan(0.45);
  expect(maxRadius.get(CROP_KIND.pumpkin)).toBeGreaterThan(1.20);
});

test("carrot carries dense divided foliage plus a restrained harvest shoulder", () => {
  const { data } = createCropGeometryData();
  let carrotFoliageVertices = 0;
  let carrotHarvestVertices = 0;
  for (let offset = 0; offset < data.length; offset += CROP_VERTEX_STRIDE_FLOATS) {
    if (Math.round(data[offset + CROP_OFFSET]!) !== CROP_KIND.carrot) continue;
    const material = Math.round(data[offset + MATERIAL_OFFSET]!);
    if (material === 0) carrotFoliageVertices += 1;
    if (material === 2) carrotHarvestVertices += 1;
  }
  expect(carrotFoliageVertices).toBeGreaterThan(2_000);
  expect(carrotHarvestVertices).toBeGreaterThan(400);
});

test("visual stage interpolation is continuous upward and snaps on resets", () => {
  expect(advanceVisualStage(1, 2, 0.5)).toBeCloseTo(1.43);
  expect(advanceVisualStage(1.9, 2, 1)).toBe(2);
  expect(advanceVisualStage(3, 1, 0.1)).toBe(1);
  expect(advanceVisualStage(0, 1, 0.1)).toBe(1);
});

test("status marker height follows species stature without changing plot position", () => {
  expect(cropMarkerHeight("corn", 4)).toBeGreaterThan(1.8);
  expect(cropMarkerHeight("lettuce", 4)).toBeLessThan(0.6);
  expect(cropMarkerHeight("carrot", 1)).toBeLessThan(cropMarkerHeight("carrot", 4));
});
