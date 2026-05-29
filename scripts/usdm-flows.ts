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

// A payout transfer can land a few blocks BEFORE its NFTSoldBack event
// (observed min delta −5) and typically lands ~1 block after (observed max
// +203). MAX_FORWARD bounds how far ahead we'll reach so a missing payout
// can't make a sellback steal the next card's (much later) payout.
const PAYOUT_SLACK_BACK = 5;
const PAYOUT_MAX_FORWARD = 1000;

/**
 * Per-sellback on-chain attribution: set `sellbacks.onchain_amount_usd` +
 * `payout_tx_hash` to the actual USDm transfer that paid the player.
 *
 * Payouts are individual operator→player ERC-20 transfers — one per card,
 * settling ~1 block after the NFTSoldBack event in a separate tx (verified
 * on-chain). A nearest-block match lets sibling sellbacks from the same player
 * collide on one transfer (double-count) while orphaning the rest (under-
 * count). Instead we assign greedily in time order, **consuming each transfer
 * at most once**: walk a player's sellbacks oldest-first and take the earliest
 * not-yet-used USDm-in transfer at/after the event (within the slack window).
 *
 * This is a full recompute (not NULL-only): it's idempotent and self-correcting
 * when new sellbacks/payouts arrive between runs. Run after every usdm-flows
 * backfill / from the poll loop. Sellbacks left unassigned keep NULL, and the
 * pulls_enriched view falls back to fmv_at_pull × tier_rate for those.
 */
export async function linkSellbacksOnchain(): Promise<number> {
  const sellbacks = await sql<
    { request_id: string; player: string; block_number: string; amt: string | null; tx: string | null }[]
  >`
    SELECT request_id::text AS request_id, player, block_number::text AS block_number,
           onchain_amount_usd::text AS amt, payout_tx_hash AS tx
    FROM sellbacks
    ORDER BY player, block_number, log_index
  `;
  const flows = await sql<
    { player: string; block_number: string; tx_hash: string; amount_usd: string }[]
  >`
    SELECT wallet AS player, block_number::text AS block_number, tx_hash, amount_usd::text AS amount_usd
    FROM usdm_flows
    WHERE direction = 'in'
    ORDER BY wallet, block_number, log_index
  `;

  // Bucket payout transfers by player, preserving (block, log_index) order.
  const byPlayer = new Map<string, { block: number; tx: string; amount: string }[]>();
  for (const f of flows) {
    let arr = byPlayer.get(f.player);
    if (!arr) { arr = []; byPlayer.set(f.player, arr); }
    arr.push({ block: Number(f.block_number), tx: f.tx_hash, amount: f.amount_usd });
  }

  // Greedy one-to-one assignment, then diff against the stored values so we
  // only write rows that actually change.
  const changed: { request_id: string; amount: string | null; tx: string | null }[] = [];
  let curPlayer = '';
  let transfers: { block: number; tx: string; amount: string }[] = [];
  let ti = 0;
  for (const sb of sellbacks) {
    if (sb.player !== curPlayer) {
      curPlayer = sb.player;
      transfers = byPlayer.get(curPlayer) ?? [];
      ti = 0;
    }
    const sbBlock = Number(sb.block_number);
    // A transfer before this sellback's window can't belong to it — nor to any
    // later sellback (those have higher blocks) — so skip it permanently.
    while (ti < transfers.length && transfers[ti].block < sbBlock - PAYOUT_SLACK_BACK) ti++;
    let amount: string | null = null;
    let tx: string | null = null;
    if (ti < transfers.length && transfers[ti].block <= sbBlock + PAYOUT_MAX_FORWARD) {
      amount = transfers[ti].amount;
      tx = transfers[ti].tx;
      ti++;
    }
    const sameAmt =
      (sb.amt == null && amount == null) ||
      (sb.amt != null && amount != null && Number(sb.amt) === Number(amount));
    const sameTx = (sb.tx ?? null) === (tx ?? null);
    if (!sameAmt || !sameTx) changed.push({ request_id: sb.request_id, amount, tx });
  }

  if (changed.length === 0) return 0;

  const CHUNK = 2000;
  for (let i = 0; i < changed.length; i += CHUNK) {
    const slice = changed.slice(i, i + CHUNK);
    await sql`
      UPDATE sellbacks s
      SET onchain_amount_usd = u.amount,
          payout_tx_hash     = u.tx
      FROM unnest(
        ${slice.map(c => c.request_id)}::numeric[],
        ${slice.map(c => c.amount)}::numeric[],
        ${slice.map(c => c.tx)}::text[]
      ) AS u(request_id, amount, tx)
      WHERE s.request_id = u.request_id
    `;
  }

  console.log(`[link-sellbacks] reassigned ${changed.length} sellbacks (one-to-one payout match)`);
  sql.notify('market_tick', '').catch(() => {});
  return changed.length;
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
