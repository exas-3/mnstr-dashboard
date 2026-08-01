import { getPacks } from './api.js';
import { GACHA_CONTRACTS } from './config.js';

export interface MissingPack {
  slug: string;
  contract: string;
  priceUsd?: string;
  buybackRatePct?: number;
}

/**
 * Compare the live mnstr.xyz /packs catalog against our hardcoded
 * GACHA_CONTRACTS (lib/tiers.ts). MnStr ships a new OffchainGacha contract per
 * pack, and the indexer only watches the addresses in GACHA_CONTRACTS — so a
 * freshly-launched pack is silently ignored (the WS listener logs
 * "PlayAssigned from unknown contract … — skipping") until someone adds it to
 * lib/tiers.ts and reindexes.
 *
 * This surfaces that drift so we notice within ~1h (it runs on the reconcile
 * loop) instead of when a community member reports missing pulls. Returns the
 * list of enabled gacha packs whose contract isn't configured; logs a loud
 * warning when non-empty.
 *
 * KNOWN packs are checked too: mnstr can reprice a pack or change its buyback
 * rate without shipping a new contract, and the /packs payload carries both
 * (`priceUsd`, `buybackRatePct`) — a stale rate in lib/tiers.ts silently
 * misprices paper payouts AND leaves the sql/021+022 CASE mirrors wrong, so
 * any mismatch gets its own loud warning (doesn't affect the return value).
 */
export async function checkPackDrift(): Promise<MissingPack[]> {
  let packs;
  try {
    packs = await getPacks();
  } catch (e) {
    console.warn('[drift] could not fetch /packs:', e instanceof Error ? e.message : e);
    return [];
  }

  const byAddress = new Map(GACHA_CONTRACTS.map(c => [c.address.toLowerCase(), c]));
  const livePacks = packs.filter(p => p.packType === 'gacha' && p.enabled && p.contractAddress);

  const missing: MissingPack[] = livePacks
    .filter(p => !byAddress.has(p.contractAddress.toLowerCase()))
    .map(p => ({
      slug: p.slug,
      contract: p.contractAddress.toLowerCase(),
      priceUsd: p.priceUsd,
      buybackRatePct: p.buybackRatePct,
    }));

  // Economics drift on KNOWN packs — compare live price + buyback rate
  // against the configured values.
  let drifted = 0;
  for (const p of livePacks) {
    const t = byAddress.get(p.contractAddress.toLowerCase());
    if (!t) continue;
    const mismatches: string[] = [];
    if (p.priceUsd != null && Number(p.priceUsd) !== t.priceUsd) {
      mismatches.push(`price: configured $${t.priceUsd} vs live $${Number(p.priceUsd)}`);
    }
    if (p.buybackRatePct != null && Math.abs(p.buybackRatePct / 100 - t.buybackRate) > 1e-9) {
      mismatches.push(`buyback: configured ${t.buybackRate} vs live ${p.buybackRatePct / 100}`);
    }
    if (mismatches.length > 0) {
      drifted++;
      console.warn(
        `[drift] ⚠ ${t.tier} (${p.slug}) economics drifted from lib/tiers.ts — ${mismatches.join('; ')}\n` +
          `  → update lib/tiers.ts (TS side derives from it) + a new sql/NNN view migration for the CASE arms.`,
      );
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[drift] ⚠ ${missing.length} live gacha pack(s) NOT in GACHA_CONTRACTS — their pulls are being ignored:\n` +
        missing
          .map(m => `  • ${m.slug}  ${m.contract}  $${m.priceUsd ?? '?'}  buyback ${m.buybackRatePct ?? '?'}%`)
          .join('\n') +
        `\n  → add each to lib/tiers.ts TIERS (scripts/config.ts + the UI derive from it; ` +
        `the SQL CASE arms need a new sql/NNN view migration), then reindex.`,
    );
  } else if (drifted === 0) {
    console.log(
      `[drift] ok — all ${GACHA_CONTRACTS.length} configured tiers cover every live gacha pack`,
    );
  }
  return missing;
}
