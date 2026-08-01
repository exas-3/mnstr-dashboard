import { sql } from '../db/client.js';
import { GACHA_CONTRACTS, type Tier } from './config.js';
import { getPullLogs, getLatestBlock, type PlayAssignedLog } from './chain.js';
import { setState, getState } from '../db/client.js';

const CHUNK_BLOCKS = 50_000;
// Re-scan a small window of recently-processed blocks each run. The WS listener
// shares insertPullLogs, so pulls can land ahead of the reconcile cursor; the
// overlap (plus the state-key checkpoint below) guarantees a WS gap is always
// re-scanned. ON CONFLICT makes the re-scan free.
const LOOKBACK_BLOCKS = 5_000;

interface Contract {
  tier: Tier;
  address: string;
  deployBlock: number;
  priceUsd: number;
}

export interface BackfillOpts {
  /** If true, ignore the per-tier checkpoint and start at the contract's deploy block. */
  fromDeploy?: boolean;
}

export async function insertPullLogs(c: Contract, logs: PlayAssignedLog[]): Promise<number> {
  if (logs.length === 0) return 0;
  // postgres.js batch insert
  const values = logs.map(l => ({
    request_id: l.requestId.toString(),
    tier: c.tier,
    contract: l.contract,
    wallet: l.wallet,
    block_number: l.blockNumber,
    tx_hash: l.txHash,
    log_index: l.logIndex,
    price_usd: c.priceUsd,
    pulled_at: new Date(l.timestamp * 1000),
    payment_type: l.payment,
    amount_wei: l.amount.toString(),
  }));
  const result = await sql`
    INSERT INTO pulls ${sql(values,
      'request_id', 'tier', 'contract', 'wallet',
      'block_number', 'tx_hash', 'log_index', 'price_usd', 'pulled_at',
      'payment_type', 'amount_wei'
    )}
    ON CONFLICT (request_id) DO NOTHING
  `;
  const inserted = result.count ?? 0;
  // SSE fan-out: tell every connected dashboard the pull feed changed.
  // Listener lives in app/api/live/stream. Cross-process via Postgres pubsub.
  if (inserted > 0) {
    sql.notify('pulls_tick', '').catch(() => {});
  }
  return inserted;
}

async function getCheckpoint(c: Contract): Promise<number> {
  // Use the reconcile's own state key — NOT MAX(block_number) from pulls. The
  // WS listener also inserts into pulls, so a MAX-based cursor would advance
  // past any block range the WS missed during a reconnect and the gap would
  // never be re-scanned (same pattern as sellbacks.ts).
  const raw = await getState(`last_block_${c.tier.toLowerCase()}`);
  if (raw) return Number(raw);
  // No state key yet (pre-existing DB indexed before the key was read here):
  // fall back to the old MAX-based cursor once; the key is written on this run.
  const rows = await sql<{ block_number: number }[]>`
    SELECT MAX(block_number)::int AS block_number FROM pulls WHERE tier = ${c.tier}
  `;
  return rows[0]?.block_number ?? c.deployBlock - 1;
}

export async function backfillContract(
  c: Contract,
  opts: BackfillOpts = {},
  headOverride?: number,
): Promise<void> {
  const latest = headOverride ?? (await getLatestBlock());
  const start = opts.fromDeploy
    ? c.deployBlock
    : Math.max(c.deployBlock, (await getCheckpoint(c)) - LOOKBACK_BLOCKS + 1);

  if (start > latest) {
    console.log(`[backfill ${c.tier}] up to date (start=${start} > latest=${latest})`);
    return;
  }

  console.log(
    `[backfill ${c.tier}] ${c.address} blocks ${start}..${latest}` +
      (opts.fromDeploy ? ' (reindex from deploy)' : ''),
  );

  let cursor = start;
  let totalInserted = 0;

  while (cursor <= latest) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, latest);
    const logs = await getPullLogs(c.address, cursor, to);
    const inserted = await insertPullLogs(c, logs);
    totalInserted += inserted;
    console.log(
      `[backfill ${c.tier}] blocks ${cursor}..${to}: fetched=${logs.length} inserted=${inserted} total=${totalInserted}`,
    );
    await setState(`last_block_${c.tier.toLowerCase()}`, String(to));
    cursor = to + 1;
  }

  console.log(`[backfill ${c.tier}] done. Total new pulls inserted: ${totalInserted}`);
}

export async function backfillAll(
  tierFilter?: Tier,
  opts: BackfillOpts = {},
  headOverride?: number,
): Promise<void> {
  const contracts = tierFilter
    ? GACHA_CONTRACTS.filter(c => c.tier === tierFilter)
    : GACHA_CONTRACTS;
  for (const c of contracts) {
    await backfillContract(c, opts, headOverride);
  }
}
