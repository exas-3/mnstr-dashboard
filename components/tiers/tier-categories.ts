/* Group on-chain tiers by their IP / brand category for UI sectioning.
 *
 * Derived from lib/tiers.ts — when MnStr ships another franchise (e.g.
 * baseball cards, Yu-Gi-Oh), add the category + tiers there, not here.
 * The TierHeroRow + TierPicker render one section per category. */

import { TIER_CATEGORIES, TIERS_BY_DISPLAY } from '@/lib/tiers';

export interface TierEntry {
  key: string;
  label: string;
  priceLabel: string;
}

export interface TierCategory {
  key: string;
  label: string;
  color: string;
  tiers: TierEntry[];
}

export const CATEGORIES: TierCategory[] = TIER_CATEGORIES.map(cat => ({
  key: cat.key,
  label: cat.label,
  color: cat.color,
  tiers: TIERS_BY_DISPLAY.filter(t => t.category === cat.key).map(t => ({
    key: t.tier,
    label: t.label.toUpperCase(),
    priceLabel: `$${t.priceUsd.toLocaleString('en-US')}`,
  })),
}));

export function categoryFor(tierKey: string): TierCategory | undefined {
  return CATEGORIES.find(c => c.tiers.some(t => t.key === tierKey));
}
