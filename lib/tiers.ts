/* Canonical tier economics — single source of truth for the TS side.
 *
 * Every per-tier fact lives here: on-chain identity (OffchainGacha contract,
 * deploy block), economics (entry price, buyback rate) and UI identity
 * (display label, IP category, accent color). scripts/config.ts re-exports
 * the array as GACHA_CONTRACTS; lib/buyback.ts, lib/queries/tiers.ts and the
 * tier UI components all derive from it — add a new pack HERE, not there.
 *
 * `buybackRate` is the % of FMV the vault pays out on sell-back. Source of
 * truth is the mnstr.xyz /packs API (`buybackRatePct`); scripts/drift.ts
 * compares the live catalog against this table on every reconcile cycle.
 * The SQL side (CASE arms in sql/021 + sql/022) is a deliberate hand-written
 * mirror — tests/tiers.test.ts fails loudly if the two drift apart, so a new
 * tier also needs a new sql/NNN view migration.
 *
 * Zero React/Next imports on purpose: this module is shared by app code
 * (import '@/lib/tiers') and the tsx indexer (import '../lib/tiers.js'). */

/* IP / brand categories for UI sectioning (one section per franchise). */
export const TIER_CATEGORIES = [
  { key: 'pokemon',   label: 'POKEMON',   color: 'var(--accent)' },
  { key: 'one_piece', label: 'ONE PIECE', color: 'var(--tier-cyan)' },
] as const;

export type TierCategoryKey = (typeof TIER_CATEGORIES)[number]['key'];

interface TierRow {
  readonly tier: string;
  /** Marketing name where it differs from the canonical tier (Premium → "Monster"). */
  readonly label: string;
  readonly category: TierCategoryKey;
  readonly color: string;
  readonly address: string;
  readonly deployBlock: number;
  readonly priceUsd: number;
  readonly buybackRate: number;
}

// OffchainGacha contracts on MegaETH (created by operator 0x61fccfc...),
// in deploy order — the order scripts iterate for backfills.
export const TIERS = [
  {
    tier: 'Starter',
    label: 'Starter',
    category: 'pokemon',
    color: 'var(--tier-blue)',
    address: '0xdea1d72f08d83e36946128603d4cd0a180a938a9',
    deployBlock: 13_479_640,
    priceUsd: 50,
    buybackRate: 0.87,
  },
  {
    // MnStr labels this tier "Monster" in their UI; "Premium" stays the
    // canonical name in DB + chain + URL params (see primitives tierLabel).
    tier: 'Premium',
    label: 'Monster',
    category: 'pokemon',
    color: 'var(--accent)',
    address: '0x6a786932b1ca83e2343b85483101c5b820860ac4',
    deployBlock: 13_479_705,
    priceUsd: 250,
    buybackRate: 0.91,
  },
  {
    tier: 'Ultra',
    label: 'Ultra',
    category: 'pokemon',
    color: 'var(--tier-magenta)',
    address: '0xebb285b5cd4610d0f6dc538379a7027f02274ca2',
    deployBlock: 13_479_710,
    priceUsd: 1250,
    buybackRate: 0.95,
  },
  {
    // One Piece "Adventure" pack (https://mnstr.xyz/packs/one-piece-adventure/).
    // Different IP than the Pokemon trio, same OffchainGacha contract pattern.
    tier: 'Adventure',
    label: 'Adventure',
    category: 'one_piece',
    color: 'var(--tier-cyan)',
    address: '0x1472a250e3663a33a62142a8c68b6c3c611e47bf',
    deployBlock: 16_747_858,
    priceUsd: 150,
    buybackRate: 0.90,
  },
  {
    // Pokemon "Great" pack (https://mnstr.xyz/packs/pokemon-great-pack/).
    // Mid-low Pokemon tier between Starter ($50) and Premium ($250).
    tier: 'Great',
    label: 'Great',
    category: 'pokemon',
    color: 'var(--tier-green)',
    address: '0x79dd7da84a93abbd304d41cf0addb20f8435f532',
    deployBlock: 18_227_887,
    priceUsd: 100,
    buybackRate: 0.90,
  },
  {
    // One Piece "Outlaw" pack (https://mnstr.xyz/packs/one-piece-outlaw-pack/).
    // Higher-priced One Piece tier above Adventure ($150).
    tier: 'Outlaw',
    label: 'Outlaw',
    category: 'one_piece',
    color: 'var(--tier-violet)',
    address: '0xd7119f7251afd521847ae6bca51a56c3f24971e3',
    deployBlock: 18_228_682,
    priceUsd: 500,
    buybackRate: 0.92,
  },
] as const satisfies readonly TierRow[];

export type Tier = (typeof TIERS)[number]['tier'];
export type TierInfo = (typeof TIERS)[number];

export const TIER_NAMES: readonly Tier[] = TIERS.map(t => t.tier);

/* Marketing floor — what an unrecognized tier pays. Also the ELSE arm of the
 * SQL CASE mirrors (tests/tiers.test.ts asserts both stay 0.85). A tier
 * missing from TIERS silently misprices at this rate — that's exactly the
 * drift the tripwire test exists to catch. */
export const FALLBACK_BUYBACK_RATE = 0.85;

const RATE_BY_TIER = new Map<string, number>(TIERS.map(t => [t.tier, t.buybackRate]));

export function buybackRateFor(tier: string | null | undefined): number {
  if (!tier) return FALLBACK_BUYBACK_RATE;
  return RATE_BY_TIER.get(tier) ?? FALLBACK_BUYBACK_RATE;
}

/* Tiers in UI display order: category sections flattened, price-ascending
 * within each — the order the /tiers picker + buyback table render. */
export const TIERS_BY_DISPLAY: readonly TierInfo[] = TIER_CATEGORIES.flatMap(cat =>
  TIERS.filter(t => t.category === cat.key).sort((a, b) => a.priceUsd - b.priceUsd),
);
