/* Per-tier buyback rate (% of FMV the protocol pays out on a sell-back).
 * Canonical values live in lib/tiers.ts (SQL mirror: sql/021 + sql/022 CASE
 * arms — tests/tiers.test.ts trips on drift). */

import { TIERS, buybackRateFor } from '@/lib/tiers';

export { buybackRateFor };

export const BUYBACK_RATES: Record<string, number> = Object.fromEntries(
  TIERS.map(t => [t.tier, t.buybackRate]),
);

export type PremiumMode = 'buyback' | 'fmv';

/** Returns the marketplace premium as a fraction (e.g. 0.05 = +5%). null
 * when there's no usable reference price. */
export function premiumFraction(
  salePrice: number,
  fmv: number | null | undefined,
  tier: string | null | undefined,
  mode: PremiumMode,
): number | null {
  if (fmv == null || fmv <= 0) return null;
  const ref = mode === 'buyback' ? fmv * buybackRateFor(tier) : fmv;
  if (ref <= 0) return null;
  return (salePrice - ref) / ref;
}
