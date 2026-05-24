/* Group on-chain tiers by their IP / brand category for UI sectioning.
 *
 * Add a new IP here when MnStr ships another franchise (e.g. baseball cards,
 * Yu-Gi-Oh). The TierHeroRow + TierPicker render one section per category. */

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

export const CATEGORIES: TierCategory[] = [
  {
    key: 'pokemon',
    label: 'POKEMON',
    color: 'var(--accent)',
    tiers: [
      { key: 'Starter', label: 'STARTER', priceLabel: '$50' },
      { key: 'Premium', label: 'MONSTER', priceLabel: '$250' },
      { key: 'Ultra',   label: 'ULTRA',   priceLabel: '$1,250' },
    ],
  },
  {
    key: 'one_piece',
    label: 'ONE PIECE',
    color: 'var(--tier-cyan)',
    tiers: [
      { key: 'Adventure', label: 'ADVENTURE', priceLabel: '$150' },
    ],
  },
];

export function categoryFor(tierKey: string): TierCategory | undefined {
  return CATEGORIES.find(c => c.tiers.some(t => t.key === tierKey));
}
