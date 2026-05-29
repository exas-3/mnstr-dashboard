import { sql, setState, getState } from '../db/client.js';
import { GACHA_CONTRACTS, type Tier } from './config.js';
import { getRedemptionLogs, getLatestBlock, type NFTRedeemedLog } from './chain.js';

const CHUNK_BLOCKS = 50_000;
// Re-scan a small window of recently-processed blocks each run so orphan
// redemptions (skipped because their PlayAssigned hadn't landed yet) get
// picked up on the next pass.
const LOOKBACK_BLOCKS = 5_000;

interface Contract {
  tier: Tier;
  address: string;
  deployBlock: number;
}

export interface BackfillRedemptionsOpts {
  fromDeploy?: boolean;
}

export async function insertRedemptions(logs: NFTRedeemedLog[]): Promise<{ inserted: number; orphans: number }> {
  if (logs.length === 0) return { inserted: 0, orphans: 0 };

  // Pre-filter against pulls to avoid FK violations (request_id refers to pulls).
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
    claimed_at: new Date(l.timestamp * 1000),
  }));
  const result = await sql`
    INSERT INTO redemptions ${sql(values,
      'request_id', 'player', 'block_number', 'tx_hash', 'log_index', 'claimed_at'
    )}
    ON CONFLICT (request_id) DO NOTHING
  `;
  const inserted = result.count ?? 0;
  // SSE fan-out — held-FMV and any holding-based metric needs to refresh
  // when a card leaves the vault. Same channel as marketplace.
  if (inserted > 0) {
    sql.notify('market_tick', '').catch(() => {});
  }
  return { inserted, orphans };
}

async function getCheckpoint(c: Contract): Promise<number> {
  const raw = await getState(`last_redemption_block_${c.tier.toLowerCase()}`);
  return raw ? Number(raw) : c.deployBlock - 1;
}

export async function backfillRedemptionsContract(
  c: Contract,
  opts: BackfillRedemptionsOpts = {},
  headOverride?: number,
): Promise<void> {
  const latest = headOverride ?? (await getLatestBlock());
  const checkpoint = await getCheckpoint(c);
  const start = opts.fromDeploy
    ? c.deployBlock
    : Math.max(c.deployBlock, checkpoint - LOOKBACK_BLOCKS + 1);

  if (start > latest) {
    console.log(`[redemptions ${c.tier}] up to date (start=${start} > latest=${latest})`);
    return;
  }

  console.log(
    `[redemptions ${c.tier}] ${c.address} blocks ${start}..${latest}` +
      (opts.fromDeploy ? ' (reindex from deploy)' : ''),
  );

  let cursor = start;
  let totalInserted = 0;
  let totalOrphans = 0;
  while (cursor <= latest) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, latest);
    const logs = await getRedemptionLogs(c.address, cursor, to);
    const { inserted, orphans } = await insertRedemptions(logs);
    totalInserted += inserted;
    totalOrphans += orphans;
    console.log(
      `[redemptions ${c.tier}] blocks ${cursor}..${to}: fetched=${logs.length} inserted=${inserted} orphans=${orphans} total=${totalInserted}`,
    );
    await setState(`last_redemption_block_${c.tier.toLowerCase()}`, String(to));
    cursor = to + 1;
  }

  console.log(
    `[redemptions ${c.tier}] done. New redemptions inserted: ${totalInserted}` +
      (totalOrphans > 0 ? ` (deferred orphans: ${totalOrphans} — will retry on next run)` : ''),
  );
}

export async function backfillRedemptions(
  tierFilter?: Tier,
  opts: BackfillRedemptionsOpts = {},
  headOverride?: number,
): Promise<void> {
  const contracts = tierFilter
    ? GACHA_CONTRACTS.filter(c => c.tier === tierFilter)
    : GACHA_CONTRACTS;
  for (const c of contracts) {
    await backfillRedemptionsContract(c, opts, headOverride);
  }
}
