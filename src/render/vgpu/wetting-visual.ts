export const WETTING_MIN_DURATION_SECONDS = 1.45;
export const WETTING_MAX_DURATION_SECONDS = 2.55;

export function wettingDurationSeconds(plotIndex: number): number {
  const wrapped = ((Math.trunc(plotIndex) % 12) + 12) % 12;
  const seed = ((wrapped * 37 + 17) % 101) / 100;
  return WETTING_MIN_DURATION_SECONDS +
    (WETTING_MAX_DURATION_SECONDS - WETTING_MIN_DURATION_SECONDS) * seed;
}

export function shouldStartWettingVisual(previous: number, next: number): boolean {
  return previous < 0.5 && next >= 0.5;
}

export function advanceWettingVisual(
  current: number,
  target: number,
  plotIndex: number,
  deltaSeconds: number,
): number {
  const safeTarget = clamp01(target);
  const safeCurrent = clamp01(current);
  if (safeTarget <= safeCurrent) return safeTarget;
  if (deltaSeconds <= 0) return safeCurrent;
  return Math.min(
    safeTarget,
    safeCurrent + deltaSeconds / wettingDurationSeconds(plotIndex),
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
