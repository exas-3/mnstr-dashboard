// One-off: verify the "payout = 0.85 × fmv" rule by comparing derived payouts
// (from pulls_enriched) against actual on-chain USDm Transfer totals from the
// operator EOA, aggregated per player.
//
// Reports:
//   - Global derived total vs global actual total (the headline ratio)
//   - Per-player mismatches above $0.50 absolute / 1% relative
//
// Assumes: payouts to players are exclusively the operator EOA's outbound USDm
// transfers. Other operator-USDm activity (e.g. liquidity, refills) would skew
// per-player totals — but the headline ratio is robust if such flows go to
// non-player addresses (validator-style spot-checks are still worth eyeballing).

import { sql } from '../db/client.js';
import { config, OPERATOR_EOA, USDM_ADDRESS, GACHA_CONTRACTS } from './config.js';
import { getLatestBlock } from './chain.js';
import { RateLimiter } from './api.js';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const limiter = new RateLimiter(2.5);
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const CHUNK = 50_000;
const TOLERANCE_USD = 0.5;
const TOLERANCE_REL = 0.01;

function pad32(addr: string): string {
  return '0x000000000000000000000000' + addr.toLowerCase().replace(/^0x/, '');
}

interface EtherscanLog {
  topics: string[];
  data: string;
  blockNumber: string;
  logIndex: string;
  transactionHash: string;
}

async function fetchOperatorOutboundUsdm(
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const out: EtherscanLog[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const to = Math.min(cursor + CHUNK - 1, toBlock);
    const url = new URL(ETHERSCAN_BASE);
    url.searchParams.set('chainid', String(config.chainId));
    url.searchParams.set('module', 'logs');
    url.searchParams.set('action', 'getLogs');
    url.searchParams.set('address', USDM_ADDRESS);
    url.searchParams.set('topic0', ERC20_TRANSFER_TOPIC);
    url.searchParams.set('topic1', pad32(OPERATOR_EOA));
    url.searchParams.set('topic0_1_opr', 'and');
    url.searchParams.set('fromBlock', String(cursor));
    url.searchParams.set('toBlock', String(to));
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '1000');
    url.searchParams.set('apikey', config.etherscanKey);

    await limiter.take();
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
    const j = (await res.json()) as { status: string; message: string; result: EtherscanLog[] | string };
    if (j.status === '0' && j.message === 'No records found') {
      cursor = to + 1;
      continue;
    }
    if (j.status === '0' && typeof j.result === 'string' && j.result.toLowerCase().includes('rate limit')) {
      // Brief back-off and retry the same chunk.
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    if (!Array.isArray(j.result)) {
      throw new Error(`Etherscan: ${JSON.stringify(j).slice(0, 200)}`);
    }
    out.push(...j.result);
    console.log(`  [usdm] blocks ${cursor}..${to}: fetched=${j.result.length} totalSoFar=${out.length}`);
    if (j.result.length === 1000) {
      const lastBlock = parseInt(j.result[j.result.length - 1].blockNumber, 16);
      if (lastBlock === cursor) {
        throw new Error(`>=1000 USDm logs in single block ${lastBlock}; reduce CHUNK`);
      }
      cursor = lastBlock; // re-fetch this block to capture page-boundary tail
    } else {
      cursor = to + 1;
    }
  }
  return out;
}

async function main() {
  console.log('Loading derived payouts from pulls_enriched...');
  const derivedRows = await sql<{ wallet: string; total: string; n: number }[]>`
    SELECT wallet,
           SUM(payout_usd)::text AS total,
           COUNT(*)::int         AS n
    FROM pulls_enriched
    WHERE status = 'sold_back'
    GROUP BY wallet
  `;
  const derived = new Map<string, { total: number; n: number }>();
  for (const r of derivedRows) {
    derived.set(r.wallet.toLowerCase(), { total: Number(r.total), n: r.n });
  }
  const derivedTotal = [...derived.values()].reduce((s, v) => s + v.total, 0);
  console.log(`  players=${derived.size} sellbacks=${[...derived.values()].reduce((s, v) => s + v.n, 0)} sum=$${derivedTotal.toFixed(2)}`);

  const deployBlock = Math.min(...GACHA_CONTRACTS.map(c => c.deployBlock));
  const head = await getLatestBlock();
  console.log(`\nFetching operator->* USDm transfers, blocks ${deployBlock}..${head}...`);
  const logs = await fetchOperatorOutboundUsdm(deployBlock, head);

  console.log(`\nAggregating actual payouts per recipient...`);
  const actual = new Map<string, { total: number; n: number }>();
  for (const l of logs) {
    const to = ('0x' + l.topics[2].slice(-40)).toLowerCase();
    const amt = Number(BigInt(l.data)) / 1e18;
    const cur = actual.get(to) ?? { total: 0, n: 0 };
    cur.total += amt;
    cur.n += 1;
    actual.set(to, cur);
  }
  const actualTotal = [...actual.values()].reduce((s, v) => s + v.total, 0);
  console.log(`  recipients=${actual.size} transfers=${logs.length} sum=$${actualTotal.toFixed(2)}`);

  console.log(`\n=== HEADLINE ===`);
  console.log(`  derived (sum of fmv*0.85 for sold_back pulls):  $${derivedTotal.toFixed(2)}`);
  console.log(`  actual  (sum of operator->* USDm transfers):    $${actualTotal.toFixed(2)}`);
  if (actualTotal > 0) {
    console.log(`  ratio derived/actual: ${(derivedTotal / actualTotal).toFixed(4)}`);
  }

  console.log(`\n=== PER-PLAYER MISMATCHES (>$${TOLERANCE_USD} and >${(TOLERANCE_REL * 100).toFixed(0)}%) ===`);
  const allPlayers = new Set([...derived.keys(), ...actual.keys()]);
  const mismatches: Array<{ player: string; d: number; a: number; delta: number; rel: number }> = [];
  for (const p of allPlayers) {
    const d = derived.get(p)?.total ?? 0;
    const a = actual.get(p)?.total ?? 0;
    const delta = d - a;
    if (Math.abs(delta) <= TOLERANCE_USD) continue;
    const rel = a === 0 ? 1 : Math.abs(delta) / Math.max(a, d);
    if (rel < TOLERANCE_REL) continue;
    mismatches.push({ player: p, d, a, delta, rel });
  }
  mismatches.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  console.log(`  ${mismatches.length} mismatched players (top 20):`);
  for (const m of mismatches.slice(0, 20)) {
    console.log(`    ${m.player}  derived=$${m.d.toFixed(2)}  actual=$${m.a.toFixed(2)}  delta=$${m.delta.toFixed(2)}  rel=${(m.rel * 100).toFixed(1)}%`);
  }

  await sql.end({ timeout: 5 });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
