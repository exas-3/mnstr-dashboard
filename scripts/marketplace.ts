import { sql, setState, getState } from '../db/client.js';
import { MARKETPLACE_ADDRESS, MARKETPLACE_DEPLOY_BLOCK } from './config.js';
import {
  getMarketplaceBoughtLogs,
  getMarketplacePriceUpdatedLogs,
  getLatestBlock,
  type CardBoughtLog,
  type CardPriceUpdatedLog,
} from './chain.js';

// Use a smaller chunk than for the gacha contracts. CardPriceUpdated fires in
// bursts (operator re-prices many cards in one block), so we want to be well
// under the 1000-log Etherscan page limit per chunk.
const CHUNK_BLOCKS = 20_000;
const LOOKBACK_BLOCKS = 5_000;

const STATE_KEY = 'last_marketplace_block';

export interface BackfillMarketplaceOpts {
  fromDeploy?: boolean;
}

// Etherscan occasionally returns a malformed `logIndex: "0x"` (parses to NaN) for
// events emitted from contract internal calls. Skip those rows rather than fail
// the whole batch — they're rare and would otherwise collide on the (tx_hash,
// log_index) unique constraint anyway.
function isUsable<T extends { logIndex: number; blockNumber: number }>(l: T, kind: string): boolean {
  if (!Number.isFinite(l.logIndex) || !Number.isFinite(l.blockNumber)) {
    console.warn(`[marketplace] skipping ${kind} with malformed log_index/block (block=${l.blockNumber} logIndex=${l.logIndex})`);
    return false;
  }
  return true;
}

export async function insertSales(logs: CardBoughtLog[]): Promise<number> {
  const usable = logs.filter(l => isUsable(l, 'sale'));
  if (usable.length === 0) return 0;
  const values = usable.map(l => ({
    block_number: l.blockNumber,
    tx_hash: l.txHash,
    log_index: l.logIndex,
    serial_number: l.serial,
    buyer: l.buyer,
    price_usd: (Number(l.priceWei) / 1e18).toFixed(6),
    bought_at: new Date(l.timestamp * 1000),
  }));
  const result = await sql`
    INSERT INTO marketplace_sales ${sql(values,
      'block_number', 'tx_hash', 'log_index',
      'serial_number', 'buyer', 'price_usd', 'bought_at'
    )}
    ON CONFLICT (tx_hash, log_index) DO NOTHING
  `;
  return result.count ?? 0;
}

export async function insertPriceUpdates(logs: CardPriceUpdatedLog[]): Promise<number> {
  const usable = logs.filter(l => isUsable(l, 'price-update'));
  if (usable.length === 0) return 0;
  const values = usable.map(l => ({
    block_number: l.blockNumber,
    tx_hash: l.txHash,
    log_index: l.logIndex,
    serial_number: l.serial,
    old_price_usd: (Number(l.oldPriceWei) / 1e18).toFixed(6),
    new_price_usd: (Number(l.newPriceWei) / 1e18).toFixed(6),
    updated_at: new Date(l.timestamp * 1000),
  }));
  const result = await sql`
    INSERT INTO marketplace_price_history ${sql(values,
      'block_number', 'tx_hash', 'log_index',
      'serial_number', 'old_price_usd', 'new_price_usd', 'updated_at'
    )}
    ON CONFLICT (tx_hash, log_index) DO NOTHING
  `;
  return result.count ?? 0;
}

async function getCheckpoint(): Promise<number> {
  const raw = await getState(STATE_KEY);
  return raw ? Number(raw) : MARKETPLACE_DEPLOY_BLOCK - 1;
}

export async function backfillMarketplace(
  opts: BackfillMarketplaceOpts = {},
  headOverride?: number,
): Promise<void> {
  const latest = headOverride ?? (await getLatestBlock());
  const checkpoint = await getCheckpoint();
  const start = opts.fromDeploy
    ? MARKETPLACE_DEPLOY_BLOCK
    : Math.max(MARKETPLACE_DEPLOY_BLOCK, checkpoint - LOOKBACK_BLOCKS + 1);

  if (start > latest) {
    console.log(`[marketplace] up to date (start=${start} > latest=${latest})`);
    return;
  }

  console.log(
    `[marketplace] ${MARKETPLACE_ADDRESS} blocks ${start}..${latest}` +
      (opts.fromDeploy ? ' (reindex from deploy)' : ''),
  );

  let cursor = start;
  let totalSales = 0;
  let totalPriceUpdates = 0;
  while (cursor <= latest) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, latest);
    const [boughtLogs, priceLogs] = await Promise.all([
      getMarketplaceBoughtLogs(MARKETPLACE_ADDRESS, cursor, to),
      getMarketplacePriceUpdatedLogs(MARKETPLACE_ADDRESS, cursor, to),
    ]);
    const salesInserted = await insertSales(boughtLogs);
    const priceInserted = await insertPriceUpdates(priceLogs);
    totalSales += salesInserted;
    totalPriceUpdates += priceInserted;
    console.log(
      `[marketplace] blocks ${cursor}..${to}: sales=${boughtLogs.length}(+${salesInserted}) prices=${priceLogs.length}(+${priceInserted}) totals=sales:${totalSales} prices:${totalPriceUpdates}`,
    );
    await setState(STATE_KEY, String(to));
    cursor = to + 1;
  }

  console.log(`[marketplace] done. New sales=${totalSales} new price updates=${totalPriceUpdates}`);
}
