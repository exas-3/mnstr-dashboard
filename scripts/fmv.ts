import { sql } from '../db/client.js';
import { config } from './config.js';
import { getPull, RateLimiter } from './api.js';
import { runWithConcurrency } from './enrich.js';

/* Per-card FMV refresh + history logger.
 *
 * The mnstr API only exposes a card's current FMV through the per-pull
 * endpoint (/gacha/pulls/{id} → card.fmv), so we fetch one representative
 * (newest) pull per distinct card — ~1.4k calls, not one per pull. For each:
 *   1. Update `pulls.fmv_usd` across every instance of that card so the
 *      dashboard's current appraisal reflects the latest vault price.
 *   2. Append a row to `card_fmv_snapshots` ONLY when the value moved vs the
 *      last snapshot, keeping the history compact (see sql/016).
 *
 * Runs hourly from the poll loop. fmv_at_pull_usd is never touched here — that
 * stays frozen at pull time for paper-P&L stability.
 */
export async function refreshCardFmvs(): Promise<void> {
  const cards = await sql<{ card_slug: string; request_id: string }[]>`
    SELECT card_slug, MAX(request_id)::text AS request_id
    FROM pulls
    WHERE card_slug IS NOT NULL
    GROUP BY card_slug
  `;
  if (cards.length === 0) {
    console.log('[fmv] no cards to refresh');
    return;
  }
  console.log(`[fmv] refreshing ${cards.length} cards`);

  const limiter = new RateLimiter(config.enrichRps);
  let ok = 0, changed = 0, miss = 0, err = 0;
  await runWithConcurrency(cards, config.enrichConcurrency, async c => {
    await limiter.take();
    try {
      const pull = await getPull(c.request_id);
      const fmv = pull?.card?.fmv ?? null;
      // Treat 0 / null as "not known right now" — never overwrite a real value
      // with a zero (mirrors the snapshot guard in enrichOne).
      if (fmv == null || fmv <= 0) { miss++; return; }

      // Refresh current appraisal across all instances of this card.
      await sql`
        UPDATE pulls SET fmv_usd = ${fmv}
        WHERE card_slug = ${c.card_slug} AND fmv_usd IS DISTINCT FROM ${fmv}
      `;

      // Append to history only on change.
      const [last] = await sql<{ fmv_usd: string }[]>`
        SELECT fmv_usd::text AS fmv_usd
        FROM card_fmv_snapshots
        WHERE card_slug = ${c.card_slug}
        ORDER BY observed_at DESC
        LIMIT 1
      `;
      if (!last || Number(last.fmv_usd) !== fmv) {
        await sql`
          INSERT INTO card_fmv_snapshots (card_slug, fmv_usd)
          VALUES (${c.card_slug}, ${fmv})
          ON CONFLICT DO NOTHING
        `;
        changed++;
      }
      ok++;
    } catch (e) {
      err++;
      if (err <= 5) console.warn(`[fmv] ${c.card_slug} error:`, e instanceof Error ? e.message : e);
    }
  });
  console.log(`[fmv] done ok=${ok} changed=${changed} miss=${miss} err=${err}`);
  // A change means held-card mark-to-market shifted — nudge any live clients.
  if (changed > 0) sql.notify('pulls_tick', '').catch(() => {});
}
