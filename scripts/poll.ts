import { config } from './config.js';
import { sql, setState } from '../db/client.js';
import { backfillAll } from './backfill.js';
import { backfillSellbacks } from './sellbacks.js';
import { backfillRedemptions } from './redemptions.js';
import { backfillMarketplace } from './marketplace.js';
import { backfillUsdmFlows, linkSellbacksOnchain } from './usdm-flows.js';
import { getLatestBlock } from './chain.js';
import { enrichPending, enrichRecentMissing, restatusHolding } from './enrich.js';
import { refreshCardFmvs } from './fmv.js';
import { checkPackDrift } from './drift.js';
import { startWs } from './ws.js';
import { notify } from './notify.js';

export async function pollOnce(): Promise<void> {
  // Snapshot the head once and share it across all backfills so the sellback
  // pass can't race ahead and reference a pull whose PlayAssigned arrived after
  // backfillAll's head check.
  const head = await getLatestBlock();
  await backfillAll(undefined, {}, head);
  await backfillSellbacks(undefined, {}, head);
  await backfillRedemptions(undefined, {}, head);
  await backfillMarketplace({}, head);
  // USDm flow indexing — ground truth for realized payouts. Runs after the
  // sellback backfill so any sellback we just indexed has its matching USDm IN
  // attributed by the linker inside backfillUsdmFlows.
  await backfillUsdmFlows({ toBlock: head });
  // Defensive second pass in case the linker inside backfillUsdmFlows
  // raced past a just-inserted sellback row. Idempotent, cheap.
  await linkSellbacksOnchain();
  await enrichPending();
  // Catch pulls whose card mnstr assigned after our fast-enrich raced ahead
  // (card_slug still NULL) without waiting for the 24h restatus pass.
  await enrichRecentMissing();
  // wallet_pnl is a materialized view (sql/022) — its inputs (usdm_flows,
  // enrichment) only move during this reconcile, so refresh once per cycle.
  // CONCURRENTLY keeps readers unblocked. Non-fatal: a failed refresh only
  // means P&L aggregates lag one cycle, not that indexing broke.
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY wallet_pnl`.catch(e =>
    console.warn('[poll] wallet_pnl refresh failed:', e instanceof Error ? e.message : e),
  );
}

/* Indexer entrypoint. Topology:
 *
 *   1. WebSocket listener (scripts/ws.ts) is started ONCE at boot. New events
 *      stream in within ~200ms of confirmation via Alchemy. This is the
 *      primary path — every PULL / SELL / BUY / PRICE lands here first.
 *
 *   2. Reconcile poll runs on a 5-minute cadence (config.pollIntervalMs) to
 *      back-fill any events missed during WS reconnects or transient errors.
 *      Same code as before; dedup via ON CONFLICT.
 *
 *   3. Once per loop iteration, refresh enrichment + restatus holding pulls
 *      (every 12 iterations ≈ 1h at the 5-min cadence).
 *
 * If the WS is solid we get real-time updates AND a 30× cut in Etherscan
 * usage vs the old 10s-poll loop. If the WS dies, the reconcile poll
 * is the safety net.
 */
// Alert once after this many consecutive reconcile failures, then stay quiet
// until a success re-arms it — so a quota stall produces one Telegram ping,
// not one per 5-min cycle.
const ALERT_AFTER_FAILURES = 3;

export async function pollLoop(): Promise<void> {
  console.log('[boot] starting WS listener');
  startWs();

  console.log(`[poll] reconcile loop active, interval=${config.pollIntervalMs}ms`);
  let i = 0;
  let consecutiveFailures = 0;
  let alerted = false;
  while (true) {
    const t0 = Date.now();
    try {
      await pollOnce();
      // Restatus holding pulls every ~12 reconciles (~1h at 5-min cadence).
      if (i % 12 === 0) {
        await restatusHolding(500);
        // Same hourly cadence: warn if mnstr launched a gacha pack we don't
        // index yet (new contract not in GACHA_CONTRACTS). Runs on the first
        // iteration too (i=0) so a fresh boot flags drift immediately.
        await checkPackDrift().catch(e =>
          console.warn('[drift] check failed:', e instanceof Error ? e.message : e),
        );
      }
      // Full per-card FMV refresh + history log every ~12 reconciles (~1h),
      // offset by 6 so it doesn't run in the same cycle as restatus.
      if (i % 12 === 6) {
        await refreshCardFmvs();
      }
      // Heartbeat for /api/health: only a fully-successful reconcile counts.
      // A quota-stalled poller (every call errors) stops advancing this, which
      // is exactly what the health endpoint + UI staleness badge key off.
      await setState('last_poll_ok', new Date().toISOString()).catch(() => {});
      if (alerted) {
        notify(`reconcile recovered after ${consecutiveFailures} failed cycle(s)`).catch(() => {});
      }
      consecutiveFailures = 0;
      alerted = false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      consecutiveFailures++;
      console.error(`[poll] reconcile error (${consecutiveFailures} consecutive):`, msg);
      if (consecutiveFailures === ALERT_AFTER_FAILURES && !alerted) {
        alerted = true;
        notify(`poller failing: ${consecutiveFailures} consecutive reconcile errors. Last: ${msg.slice(0, 300)}`).catch(() => {});
      }
    }
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, config.pollIntervalMs - elapsed);
    await new Promise(r => setTimeout(r, wait));
    i++;
  }
}
