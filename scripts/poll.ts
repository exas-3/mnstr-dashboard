import { config } from './config.js';
import { backfillAll } from './backfill.js';
import { backfillSellbacks } from './sellbacks.js';
import { backfillMarketplace } from './marketplace.js';
import { getLatestBlock } from './chain.js';
import { enrichPending, restatusHolding } from './enrich.js';
import { startWs } from './ws.js';

export async function pollOnce(): Promise<void> {
  // Snapshot the head once and share it across all backfills so the sellback
  // pass can't race ahead and reference a pull whose PlayAssigned arrived after
  // backfillAll's head check.
  const head = await getLatestBlock();
  await backfillAll(undefined, {}, head);
  await backfillSellbacks(undefined, {}, head);
  await backfillMarketplace({}, head);
  await enrichPending();
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
export async function pollLoop(): Promise<void> {
  console.log('[boot] starting WS listener');
  startWs();

  console.log(`[poll] reconcile loop active, interval=${config.pollIntervalMs}ms`);
  let i = 0;
  while (true) {
    const t0 = Date.now();
    try {
      await pollOnce();
      // Restatus holding pulls every ~12 reconciles (~1h at 5-min cadence).
      if (i % 12 === 0) {
        await restatusHolding(500);
      }
    } catch (e) {
      console.error('[poll] reconcile error:', e instanceof Error ? e.message : e);
    }
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, config.pollIntervalMs - elapsed);
    await new Promise(r => setTimeout(r, wait));
    i++;
  }
}
