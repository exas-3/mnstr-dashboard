import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIERS, TIER_NAMES, FALLBACK_BUYBACK_RATE } from '../lib/tiers.js';
import { GACHA_CONTRACTS } from '../scripts/config.js';

/* Drift tripwire — lib/tiers.ts is the single source of truth on the TS side,
 * but the live SQL views hard-code the same per-tier buyback rates in CASE
 * arms (sql/021 pulls_enriched + wallet_pnl, sql/022 the materialized
 * wallet_pnl). A tier added to one side but not the other silently falls
 * through to the 0.85 marketing-floor ELSE and misprices every payout.
 * These tests make that drift a red build instead of a quiet data bug. */

const SQL_FILES = [
  '021_add_great_outlaw_tiers.sql',
  '022_hot_indexes_wallet_pnl_matview.sql',
];

function readSql(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../sql/${name}`, import.meta.url)), 'utf8');
}

/** Every `WHEN [p.]tier = 'X' THEN … * <rate>` buyback arm in a migration. */
function tierRateArms(sqlText: string): Array<{ tier: string; rate: number }> {
  const re = /WHEN\s+(?:\w+\.)?tier\s*=\s*'([^']+)'\s+THEN[^\n]*?\*\s*(\d+\.\d+)/g;
  return [...sqlText.matchAll(re)].map(m => ({ tier: m[1], rate: Number(m[2]) }));
}

/** Every `ELSE … fmv… * <rate>` fallback arm (skips non-buyback ELSEs). */
function elseRates(sqlText: string): number[] {
  const re = /ELSE\s+[^\n]*?fmv[^\n]*?\*\s*(\d+\.\d+)/g;
  return [...sqlText.matchAll(re)].map(m => Number(m[1]));
}

for (const file of SQL_FILES) {
  describe(`sql/${file} buyback CASE arms vs lib/tiers.ts`, () => {
    const arms = tierRateArms(readSql(file));

    it('parses at least one full per-tier CASE block', () => {
      expect(arms.length).toBeGreaterThanOrEqual(TIERS.length);
    });

    it('covers exactly the lib/tiers tier set (no missing / no unknown tier)', () => {
      const sqlTiers = [...new Set(arms.map(a => a.tier))].sort();
      expect(sqlTiers).toEqual([...TIER_NAMES].sort());
    });

    it('lists every tier in every CASE block (equal arm counts)', () => {
      const counts = new Map<string, number>();
      for (const a of arms) counts.set(a.tier, (counts.get(a.tier) ?? 0) + 1);
      // All tiers must appear the same number of times — catches a tier
      // added to some CASE blocks in the file but not all of them.
      expect(new Set(counts.values()).size).toBe(1);
    });

    it('uses the exact lib/tiers rate in every arm', () => {
      const expected = new Map<string, number>(TIERS.map(t => [t.tier, t.buybackRate]));
      for (const a of arms) {
        expect(a.rate, `${a.tier} rate in sql/${file}`).toBe(expected.get(a.tier));
      }
    });

    it('falls back to the 0.85 marketing floor in every ELSE arm', () => {
      const rates = elseRates(readSql(file));
      expect(rates.length).toBeGreaterThan(0);
      for (const r of rates) expect(r).toBe(FALLBACK_BUYBACK_RATE);
    });
  });
}

describe('lib/tiers.ts vs scripts/config.ts', () => {
  it('GACHA_CONTRACTS carries exactly the lib/tiers tier names, in order', () => {
    expect(GACHA_CONTRACTS.map(c => c.tier)).toEqual(TIERS.map(t => t.tier));
  });
});
