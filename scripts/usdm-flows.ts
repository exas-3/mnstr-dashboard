import { sql, setState, getState } from '../db/client.js';
import {
  GACHA_CONTRACTS,
  MARKETPLACE_ADDRESS,
  OPERATOR_EOA,
  USDM_ADDRESS,
  config,
} from './config.js';
import {
  getLatestBlock,
  getOperatorUsdmFlows,
  type UsdmFlowLog,
} from './chain.js';

const STATE_KEY = 'last_usdm_flow_block';

// Alchemy eth_getLogs caps at 10k blocks per call. The fetcher in chain.ts
// chunks internally below the cap, so this is the outer-loop step. Bigger
// chunks reduce the number of NOTIFY+state-write cycles per backfill run.
const CHUNK_BLOCKS = 50_000;
// Re-scan the prior tail in case the previous run lost late entries.
const LOOKBACK_BLOCKS = 100;

// Set of mnstr-side addresses for counterparty classification. The operator
// EOA is the only one that actually receives/sends USDm directly today, but
// we keep the gacha + marketplace addresses in the lookup so the table stays
// truthful if mnstr ever changes its settlement topology.
const MNSTR_ADDRESSES = new Map<string, string>([
  [OPERATOR_EOA.toLowerCase(),           'operator'],
  [MARKETPLACE_ADDRESS.toLowerCase(),    'marketplace'],
  ...GACHA_CONTRACTS.map(c => [c.address.toLowerCase(), `gacha_${c.tier.toLowerCase()}`] as [string, string]),
]);

interface Row {
  block_number: number;
  tx_hash: string;
  log_index: number;
  ts: Date;
  wallet: string;
  direction: 'in' | 'out';
  amount_usd: string;
  counterparty: string;
}

function toRows(logs: UsdmFlowLog[]): Row[] {
  const rows: Row[] = [];
  for (const l of logs) {
    const fromIsMnstr = MNSTR_ADDRESSES.get(l.from);
    const toIsMnstr   = MNSTR_ADDRESSES.get(l.to);
    if (!fromIsMnstr && !toIsMnstr) continue;        // shouldn't happen given the filter
    // Skip mnstr-internal shuffles (operator → gacha or vice versa). They're
    // not player flows and would pollute the wallet-centric net.
    if (fromIsMnstr && toIsMnstr) continue;
    const amount = (Number(l.amountWei) / 1e18).toFixed(6);
    if (fromIsMnstr) {
      // operator/gacha/marketplace → player  (player IN)
      rows.push({
        block_number: l.blockNumber,
        tx_hash: l.txHash,
        log_index: l.logIndex,
        ts: new Date(l.timestamp * 1000),
        wallet: l.to,
        direction: 'in',
        amount_usd: amount,
        counterparty: fromIsMnstr,
      });
    } else if (toIsMnstr) {
      // player → operator/gacha/marketplace  (player OUT)
      rows.push({
        block_number: l.blockNumber,
        tx_hash: l.txHash,
        log_index: l.logIndex,
        ts: new Date(l.timestamp * 1000),
        wallet: l.from,
        direction: 'out',
        amount_usd: amount,
        counterparty: toIsMnstr,
      });
    }
  }
  return rows;
}

export async function insertUsdmFlows(logs: UsdmFlowLog[]): Promise<number> {
  const rows = toRows(logs);
  if (rows.length === 0) return 0;
  const result = await sql`
    INSERT INTO usdm_flows ${sql(rows,
      'block_number', 'tx_hash', 'log_index', 'ts',
      'wallet', 'direction', 'amount_usd', 'counterparty'
    )}
    ON CONFLICT (tx_hash, log_index) DO NOTHING
  `;
  const inserted = result.count ?? 0;
  // Same SSE channel as pulls — leaderboard P&L depends on these flows once
  // we switch the formula over, so dashboards should refetch on insert.
  if (inserted > 0) {
    sql.notify('pulls_tick', '').catch(() => {});
  }
  return inserted;
}

async function getCheckpoint(): Promise<number> {
  const raw = await getState(STATE_KEY);
  return raw ? Number(raw) : 0;
}

export interface BackfillUsdmOpts {
  fromBlock?: number;        // override start (e.g. 0 for full history)
  toBlock?: number;          // override head (test scenarios)
}

export async function backfillUsdmFlows(opts: BackfillUsdmOpts = {}): Promise<void> {
  const head = opts.toBlock ?? (await getLatestBlock());
  // Default origin = earliest gacha deploy block. Anything before that has
  // no player↔mnstr USDm activity worth indexing.
  const deployFloor = Math.min(...GACHA_CONTRACTS.map(c => c.deployBlock));
  const checkpoint = await getCheckpoint();
  const start = opts.fromBlock ?? Math.max(deployFloor, checkpoint - LOOKBACK_BLOCKS + 1);

  if (start > head) {
    console.log(`[usdm-flows] up to date (start=${start} > head=${head})`);
    return;
  }

  console.log(`[usdm-flows] scanning blocks ${start}..${head} via operator ${OPERATOR_EOA}`);

  let cursor = start;
  let totalInserted = 0;
  let totalFetched  = 0;
  while (cursor <= head) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, head);
    const logs = await getOperatorUsdmFlows(
      USDM_ADDRESS, OPERATOR_EOA, cursor, to, config.alchemyRpcBackfill,
    );
    const inserted = await insertUsdmFlows(logs);
    totalFetched  += logs.length;
    totalInserted += inserted;
    console.log(`[usdm-flows] ${cursor}..${to}: fetched=${logs.length} inserted=${inserted} total_in=${totalInserted}`);
    await setState(STATE_KEY, String(to));
    cursor = to + 1;
  }
  console.log(`[usdm-flows] done. fetched=${totalFetched} inserted=${totalInserted}`);
  // Always run the linker after a backfill — any sellback rows whose matching
  // USDm IN just landed in this run get attributed now.
  await linkSellbacksOnchain();
}

/**
 * Per-sellback on-chain attribution: fill in `sellbacks.onchain_amount_usd`
 * for any rows that don't have it yet, by matching to the nearest-block
 * USDm IN transfer to the player. Idempotent — re-running only touches
 * rows still NULL.
 *
 * Run after every usdm-flows backfill, OR continuously from the poll loop
 * so newly-indexed sellbacks get their on-chain payout linked within one
 * indexer cycle. The pulls_enriched view falls back to fmv × tier_rate
 * for any row that remains NULL.
 */
export async function linkSellbacksOnchain(): Promise<number> {
  const result = await sql`
    UPDATE sellbacks s
    SET onchain_amount_usd = match.amount_usd,
        payout_tx_hash     = match.tx_hash
    FROM (
      SELECT
        s2.request_id,
        f.amount_usd,
        f.tx_hash
      FROM sellbacks s2
      LEFT JOIN LATERAL (
        SELECT f.amount_usd, f.tx_hash
        FROM usdm_flows f
        WHERE f.wallet = s2.player
          AND f.direction = 'in'
          -- Payout settles AFTER the NFTSoldBack event (separate ERC-4337 tx),
          -- typically within tens of blocks. Forward-biased window.
          AND f.block_number BETWEEN s2.block_number - 5 AND s2.block_number + 250
        ORDER BY ABS(f.block_number - s2.block_number) ASC, f.log_index ASC
        LIMIT 1
      ) f ON TRUE
      WHERE s2.onchain_amount_usd IS NULL
    ) match
    WHERE s.request_id = match.request_id
      AND match.amount_usd IS NOT NULL
  `;
  const updated = result.count ?? 0;
  if (updated > 0) {
    console.log(`[link-sellbacks] attributed ${updated} sellbacks to on-chain payouts`);
    sql.notify('market_tick', '').catch(() => {});
  }
  return updated;
}

/**
 * Quick audit: print top-N wallets by net realized P&L (on-chain) vs the
 * dashboard's view-derived net, sorted by absolute drift.
 */
export async function auditUsdmDrift(limit = 20): Promise<void> {
  const rows = await sql<Array<{
    wallet: string;
    handle: string | null;
    db_net: string;
    chain_net: string;
    chain_in: string;
    chain_out: string;
    drift: string;
  }>>`
    WITH db AS (
      SELECT
        p.wallet,
        MAX(p.username) AS handle,
        (COALESCE(SUM(pe.payout_usd) FILTER (WHERE pe.status = 'sold_back'), 0)
          - COALESCE(SUM(p.price_usd), 0))::numeric(18,2) AS db_net
      FROM pulls p
      JOIN pulls_enriched pe USING (request_id)
      GROUP BY p.wallet
    ),
    chain AS (
      SELECT
        wallet,
        SUM(amount_usd) FILTER (WHERE direction = 'in')  AS chain_in,
        SUM(amount_usd) FILTER (WHERE direction = 'out') AS chain_out,
        (COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'in'),  0)
          - COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'out'), 0))::numeric(18,2) AS chain_net
      FROM usdm_flows
      GROUP BY wallet
    )
    SELECT
      d.wallet, d.handle,
      d.db_net::text,
      COALESCE(c.chain_net, 0)::text  AS chain_net,
      COALESCE(c.chain_in,  0)::text  AS chain_in,
      COALESCE(c.chain_out, 0)::text  AS chain_out,
      (d.db_net - COALESCE(c.chain_net, 0))::text AS drift
    FROM db d
    LEFT JOIN chain c USING (wallet)
    ORDER BY ABS(d.db_net - COALESCE(c.chain_net, 0)) DESC
    LIMIT ${limit}
  `;

  console.log('\n[audit] DB-derived net vs on-chain realized net (sorted by |drift|):\n');
  console.log('handle              wallet                  db_net      chain_net   chain_in    chain_out   drift');
  console.log('-'.repeat(115));
  for (const r of rows) {
    const handle = (r.handle ?? '').padEnd(18).slice(0, 18);
    const wallet = r.wallet.slice(0, 16) + '…';
    const fmt = (s: string) => `$${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.padStart(11);
    console.log(`${handle}  ${wallet}  ${fmt(r.db_net)}  ${fmt(r.chain_net)}  ${fmt(r.chain_in)}  ${fmt(r.chain_out)}  ${fmt(r.drift)}`);
  }
}
