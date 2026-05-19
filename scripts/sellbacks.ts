import { sql, setState, getState } from '../db/client.js';
import { GACHA_CONTRACTS, type Tier } from './config.js';
import { getSellbackLogs, getLatestBlock, type NFTSoldBackLog } from './chain.js';

const CHUNK_BLOCKS = 50_000;
// Re-scan a small window of recently-processed blocks each run, so orphan
// sellbacks (skipped because their PlayAssigned hadn't landed yet) get picked up
// on the next pass.
const LOOKBACK_BLOCKS = 5_000;

interface Contract {
  tier: Tier;
  address: string;
  deployBlock: number;
}

export interface BackfillSellbacksOpts {
  fromDeploy?: boolean;
}

async function insertSellbacks(logs: NFTSoldBackLog[]): Promise<{ inserted: number; orphans: number }> {
  if (logs.length === 0) return { inserted: 0, orphans: 0 };

  // Pre-filter against pulls to avoid FK violations from the inherent race
  // between PlayAssigned catch-up and NFTSoldBack catch-up. Orphans (sellback
  // events whose playId isn't yet in pulls — usually because PlayAssigned for
  // that pull is still propagating into our DB) are skipped; the next run picks
  // them up once pulls catches up.
  const ids = logs.map(l => l.requestId.toString());
  const present = await sql<{ request_id: string }[]>`
    SELECT request_id::text AS request_id FROM pulls
    WHERE request_id IN ${sql(ids)}
  `;
  const presentSet = new Set(present.map(r => r.request_id));

  const kept = logs.filter(l => presentSet.has(l.requestId.toString()));
  const orphans = logs.length - kept.length;
  if (kept.length === 0) return { inserted: 0, orphans };

  const values = kept.map(l => ({
    request_id: l.requestId.toString(),
    player: l.player,
    block_number: l.blockNumber,
    tx_hash: l.txHash,
    log_index: l.logIndex,
    sold_at: new Date(l.timestamp * 1000),
  }));
  const result = await sql`
    INSERT INTO sellbacks ${sql(values,
      'request_id', 'player', 'block_number', 'tx_hash', 'log_index', 'sold_at'
    )}
    ON CONFLICT (request_id) DO NOTHING
  `;
  return { inserted: result.count ?? 0, orphans };
}

async function getCheckpoint(c: Contract): Promise<number> {
  const raw = await getState(`last_sellback_block_${c.tier.toLowerCase()}`);
  return raw ? Number(raw) : c.deployBlock - 1;
}

export async function backfillSellbacksContract(
  c: Contract,
  opts: BackfillSellbacksOpts = {},
  headOverride?: number,
): Promise<void> {
  const latest = headOverride ?? (await getLatestBlock());
  const checkpoint = await getCheckpoint(c);
  // Re-scan the last LOOKBACK_BLOCKS blocks of the prior run so orphan sellbacks
  // (skipped due to missing pulls FK) get retried after pulls catches up.
  const start = opts.fromDeploy
    ? c.deployBlock
    : Math.max(c.deployBlock, checkpoint - LOOKBACK_BLOCKS + 1);

  if (start > latest) {
    console.log(`[sellbacks ${c.tier}] up to date (start=${start} > latest=${latest})`);
    return;
  }

  console.log(
    `[sellbacks ${c.tier}] ${c.address} blocks ${start}..${latest}` +
      (opts.fromDeploy ? ' (reindex from deploy)' : ''),
  );

  let cursor = start;
  let totalInserted = 0;
  let totalOrphans = 0;
  while (cursor <= latest) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, latest);
    const logs = await getSellbackLogs(c.address, cursor, to);
    const { inserted, orphans } = await insertSellbacks(logs);
    totalInserted += inserted;
    totalOrphans += orphans;
    console.log(
      `[sellbacks ${c.tier}] blocks ${cursor}..${to}: fetched=${logs.length} inserted=${inserted} orphans=${orphans} total=${totalInserted}`,
    );
    await setState(`last_sellback_block_${c.tier.toLowerCase()}`, String(to));
    cursor = to + 1;
  }

  console.log(
    `[sellbacks ${c.tier}] done. New sellbacks inserted: ${totalInserted}` +
      (totalOrphans > 0 ? ` (deferred orphans: ${totalOrphans} — will retry on next run)` : ''),
  );
}

export async function backfillSellbacks(
  tierFilter?: Tier,
  opts: BackfillSellbacksOpts = {},
  headOverride?: number,
): Promise<void> {
  const contracts = tierFilter
    ? GACHA_CONTRACTS.filter(c => c.tier === tierFilter)
    : GACHA_CONTRACTS;
  for (const c of contracts) {
    await backfillSellbacksContract(c, opts, headOverride);
  }
}
