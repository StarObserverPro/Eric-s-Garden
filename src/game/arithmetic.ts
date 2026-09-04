import type { CropId, PlotState } from "./model";

export interface OrderLine {
  readonly crop: CropId;
  readonly target: number;
  readonly collected: number;
  readonly remaining: number;
}

export interface BasketOrder {
  readonly lines: readonly OrderLine[];
  readonly target: number;
  readonly collected: number;
  readonly remaining: number;
  readonly complete: boolean;
}

/** The only additional saved state: where each real harvest token was placed.
 * -1 means still in the source basket. No second crop inventory or score. */
export interface SharingState {
  placements: number[];
}

export function countOrder(
  targets: Readonly<Partial<Record<CropId, number>>>,
  harvested: Readonly<Partial<Record<CropId, number>>>,
): BasketOrder {
  const lines = (Object.entries(targets) as [CropId, number][])
    .filter(([, target]) => target > 0)
    .map(([crop, target]): OrderLine => {
      const raw = harvested[crop] ?? 0;
      const collected = Math.min(target, Math.max(0, Number.isFinite(raw) ? Math.floor(raw) : 0));
      return { crop, target, collected, remaining: target - collected };
    });
  const target = lines.reduce((sum, line) => sum + line.target, 0);
  const collected = lines.reduce((sum, line) => sum + line.collected, 0);
  return { lines, target, collected, remaining: target - collected, complete: target > 0 && collected === target };
}

export function countCare(plots: readonly PlotState[], matureStage: number): {
  total: number; watered: number; remaining: number; pests: number;
} {
  const growing = plots.filter((plot) => plot.crop && !plot.harvested && plot.stage < matureStage);
  const watered = growing.filter((plot) => plot.watered).length;
  return {
    total: growing.length,
    watered,
    remaining: growing.length - watered,
    pests: plots.filter((plot) => plot.crop && plot.pest && !plot.harvested).length,
  };
}

/** Current orders supply 10 or 12 crops. Other small, exactly divisible orders
 * work without adding a resource economy, task generator, or answer input. */
export function sharingBasketCount(total: number, level: number): number {
  const preferred = total === 12 ? (level % 2 === 0 ? 3 : 4) : 2;
  return [preferred, 2, 3, 4, 6].find((count) => total >= count && total % count === 0) ?? 0;
}

export function orderTokens(order: BasketOrder): CropId[] {
  return order.lines.flatMap((line) => Array<CropId>(line.collected).fill(line.crop));
}

export function normalizeSharing(value: unknown, order: BasketOrder, level: number): SharingState | null {
  if (!order.complete || !value || typeof value !== "object") return null;
  const placements = (value as Partial<SharingState>).placements;
  const count = sharingBasketCount(order.target, level);
  if (!Array.isArray(placements) || !count) return null;
  return {
    placements: Array.from({ length: order.target }, (_, index) => {
      const basket = placements[index];
      return typeof basket === "number" && Number.isInteger(basket) && basket >= 0 && basket < count ? basket : -1;
    }),
  };
}

export function countSharing(order: BasketOrder, sharing: SharingState | null, level: number): {
  active: boolean;
  tokens: readonly CropId[];
  baskets: readonly (readonly number[])[];
  unassigned: readonly number[];
  each: number;
  equal: boolean;
} {
  const tokens = orderTokens(order);
  const count = sharingBasketCount(order.target, level);
  const normalized = normalizeSharing(sharing, order, level);
  const baskets: number[][] = Array.from({ length: count }, () => []);
  const unassigned: number[] = [];
  tokens.forEach((_, index) => {
    const basket = normalized?.placements[index] ?? -1;
    if (basket === -1) unassigned.push(index);
    else baskets[basket]!.push(index);
  });
  const each = count ? order.target / count : 0;
  return {
    active: normalized !== null,
    tokens,
    baskets,
    unassigned,
    each,
    equal: normalized !== null && unassigned.length === 0 && baskets.every((basket) => basket.length === each),
  };
}
