import { config } from './config.js';
import { backfillAll } from './backfill.js';
import { backfillSellbacks } from './sellbacks.js';
import { backfillMarketplace } from './marketplace.js';
import { getLatestBlock } from './chain.js';
import { enrichPending, restatusHolding } from './enrich.js';

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

export async function pollLoop(): Promise<void> {
  console.log(`[poll] starting loop, interval=${config.pollIntervalMs}ms`);
  let i = 0;
  while (true) {
    const t0 = Date.now();
    try {
      await pollOnce();
      // Every 60 cycles (~10 min at default 10s), also restatus holding pulls.
      if (i % 60 === 0) {
        await restatusHolding(500);
      }
    } catch (e) {
      console.error('[poll] error:', e instanceof Error ? e.message : e);
    }
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, config.pollIntervalMs - elapsed);
    await new Promise(r => setTimeout(r, wait));
    i++;
  }
}
