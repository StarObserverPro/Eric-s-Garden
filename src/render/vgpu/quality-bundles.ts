import {
  bundle,
  type Bundle,
  type BundleRecorder,
  type Draw,
  type Gpu,
  type Target,
} from "vgpu";

import type { InstanceTier } from "../contract";

export type InstanceTierBundles = ReadonlyMap<InstanceTier, Bundle>;

/**
 * Record one render-bundle variant per allowed instance tier while sharing the
 * same Draw, shader, geometry and bind-group identities. WebGPU bundle commands
 * capture the per-call instance count, so quality changes only select a bundle;
 * they do not rebuild scene resources or pipelines.
 */
export function createInstanceTierBundles(
  gpu: Gpu,
  target: Target,
  drawable: Draw,
  tiers: readonly InstanceTier[],
  label: string,
): InstanceTierBundles {
  const variants = new Map<InstanceTier, Bundle>();
  for (const tier of tiers) {
    variants.set(
      tier,
      bundle(
        gpu,
        { target, label: `${label}-${tier}` },
        (recorded: BundleRecorder) => recorded.draw(drawable, { instances: tier }),
      ),
    );
  }
  return variants;
}

export function selectInstanceTierBundle(
  variants: InstanceTierBundles,
  tier: InstanceTier,
): Bundle {
  const selected = variants.get(tier);
  if (!selected) {
    throw new Error(`No render-bundle variant was prepared for ${tier} instances.`);
  }
  return selected;
}
