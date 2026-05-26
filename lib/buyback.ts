/* Per-tier buyback rate (% of FMV the protocol pays out on a sell-back).
 * Mirrored in sql/006+ view definition + scripts/config.ts. */

export const BUYBACK_RATES: Record<string, number> = {
  Starter:   0.87,
  Premium:   0.91,
  Ultra:     0.95,
  Adventure: 0.90,
};

const DEFAULT_RATE = 0.85;

export function buybackRateFor(tier: string | null | undefined): number {
  if (!tier) return DEFAULT_RATE;
  return BUYBACK_RATES[tier] ?? DEFAULT_RATE;
}

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
