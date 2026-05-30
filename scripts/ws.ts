/* WebSocket-first indexer for MnStr.
 *
 * Subscribes to MegaETH logs via Alchemy WS and inserts new events into
 * Postgres within ~200ms of confirmation. The Etherscan-based pollOnce()
 * runs as a 5-minute reconcile to plug any gaps from WS reconnects.
 *
 * Topology:
 *   - eth_subscribe(logs) with all 4 gacha contracts + the marketplace
 *     contract, filtered to our 4 topic[0] values (PlayAssigned,
 *     NFTSoldBack, CardBought, CardPriceUpdated).
 *   - One subscription per (address, topic) pair would be simpler but Alchemy
 *     caps the per-key subscription count, so we use a single multi-topic
 *     subscription.
 *   - Reconnect with exponential backoff (1s → 30s cap) on any close/error.
 *   - Block timestamps are fetched lazily via the existing HTTPS Alchemy
 *     endpoint and cached so we don't re-fetch for events in the same block.
 *
 * Dedup is free — every insert path uses ON CONFLICT, so doubly-indexed
 * events (WS + reconcile) just no-op the second time.
 */

import { config, GACHA_CONTRACTS, MARKETPLACE_ADDRESS,
  PLAY_ASSIGNED_TOPIC, NFT_SOLD_BACK_TOPIC,
  CARD_BOUGHT_TOPIC, CARD_PRICE_UPDATED_TOPIC,
  type Tier } from './config.js';
import { decode, decodeSellback, decodeCardBought, decodeCardPriceUpdated,
  type RawLog } from './chain.js';
import { insertPullLogs } from './backfill.js';
import { insertSellbacks } from './sellbacks.js';
import { insertSales, insertPriceUpdates } from './marketplace.js';
import { enrichOne } from './enrich.js';

// Retry the fast-enrich on a short backoff while mnstr hasn't assigned the
// card yet (enrichOne → 'no_card'). ~5s,10s,20s,40s,80s,160s ≈ 5min total,
// after which the per-reconcile enrichRecentMissing backstop takes over.
const FAST_ENRICH_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 80_000, 160_000];
function scheduleFastEnrich(requestId: bigint): void {
  let attempt = 0;
  const tick = () => {
    enrichOne(requestId)
      .then(r => {
        if (r === 'no_card' && attempt < FAST_ENRICH_DELAYS_MS.length) {
          setTimeout(tick, FAST_ENRICH_DELAYS_MS[attempt++]);
        }
      })
      .catch(err => {
        console.warn(`[ws] fast-enrich ${requestId} failed (reconcile will retry):`, err instanceof Error ? err.message : err);
        if (attempt < FAST_ENRICH_DELAYS_MS.length) setTimeout(tick, FAST_ENRICH_DELAYS_MS[attempt++]);
      });
  };
  setTimeout(tick, FAST_ENRICH_DELAYS_MS[attempt++]);
}

interface AlchemyWsLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;       // hex
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;  // hex
  logIndex: string;          // hex
  removed: boolean;
}

const ADDRESSES = [
  ...GACHA_CONTRACTS.map(c => c.address.toLowerCase()),
  MARKETPLACE_ADDRESS.toLowerCase(),
];

const TOPIC_SET = new Set([
  PLAY_ASSIGNED_TOPIC,
  NFT_SOLD_BACK_TOPIC,
  CARD_BOUGHT_TOPIC,
  CARD_PRICE_UPDATED_TOPIC,
]);

const TIER_BY_ADDRESS: Map<string, Tier> = new Map(
  GACHA_CONTRACTS.map(c => [c.address.toLowerCase(), c.tier]),
);
const PRICE_BY_ADDRESS: Map<string, number> = new Map(
  GACHA_CONTRACTS.map(c => [c.address.toLowerCase(), c.priceUsd]),
);

const blockTsCache = new Map<number, number>();
const BLOCK_CACHE_CAP = 2000;

async function fetchBlockTimestamp(blockHex: string): Promise<number> {
  const blockNum = parseInt(blockHex, 16);
  const cached = blockTsCache.get(blockNum);
  if (cached != null) return cached;
  // Retry on transient failures or 0-timestamp responses. Pre-2026-05-27 we had
  // 6 epoch-zero pulls in the DB because the first attempt returned 0 and we
  // didn't retry — keeping the retry tight (3 attempts, ~250ms backoff) since
  // we're on the WS hot path and reconcile will catch anything we drop.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(config.alchemyRpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: [blockHex, false],
      }),
    });
    const j = await res.json();
    const tsHex = j?.result?.timestamp;
    if (tsHex && tsHex !== '0x0') {
      const ts = parseInt(tsHex, 16);
      blockTsCache.set(blockNum, ts);
      if (blockTsCache.size > BLOCK_CACHE_CAP) {
        const trim = Array.from(blockTsCache.keys()).slice(0, BLOCK_CACHE_CAP / 4);
        for (const k of trim) blockTsCache.delete(k);
      }
      return ts;
    }
    await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
  }
  // 3 retries exhausted — throw so handleLog skips this insert. The reconcile
  // poll (which uses Etherscan, separate code path) will fill it in later.
  throw new Error(`eth_getBlockByNumber returned no timestamp for block ${blockHex}`);
}

async function toRawLog(wsLog: AlchemyWsLog): Promise<RawLog> {
  const timestampSec = await fetchBlockTimestamp(wsLog.blockNumber);
  return {
    address: wsLog.address,
    topics: wsLog.topics,
    data: wsLog.data,
    blockNumber: wsLog.blockNumber,
    timeStamp: '0x' + timestampSec.toString(16),
    logIndex: wsLog.logIndex,
    transactionHash: wsLog.transactionHash,
    transactionIndex: wsLog.transactionIndex,
  };
}

async function handleLog(wsLog: AlchemyWsLog): Promise<void> {
  if (wsLog.removed) return;
  const topic0 = wsLog.topics[0];
  if (!TOPIC_SET.has(topic0)) return;
  const raw = await toRawLog(wsLog);
  const address = wsLog.address.toLowerCase();

  if (topic0 === PLAY_ASSIGNED_TOPIC) {
    const tier = TIER_BY_ADDRESS.get(address);
    const priceUsd = PRICE_BY_ADDRESS.get(address);
    if (!tier || priceUsd == null) {
      console.warn(`[ws] PlayAssigned from unknown contract ${address} — skipping`);
      return;
    }
    const decoded = decode(raw);
    const inserted = await insertPullLogs(
      { tier, address, deployBlock: 0, priceUsd },
      [decoded],
    );
    if (inserted > 0) {
      console.log(`[ws] PULL  ${tier.padEnd(9)} req=${decoded.requestId} wallet=${decoded.wallet.slice(0, 8)}…`);
      // Fast-enrich path: kick off card/user lookup in the background so the
      // dashboard's Live feed sees the title + image + username within seconds
      // instead of waiting for the reconcile poll. The first 5s delay gives
      // MnStr's own indexer time to surface the pull; if the card isn't
      // assigned yet (`no_card`) we retry on a short backoff (~5m total) so the
      // newest pull fills in promptly rather than waiting for the 24h restatus.
      scheduleFastEnrich(decoded.requestId);
    }
  } else if (topic0 === NFT_SOLD_BACK_TOPIC) {
    const decoded = decodeSellback(raw);
    const { inserted, orphans } = await insertSellbacks([decoded]);
    if (inserted > 0) {
      console.log(`[ws] SELL  req=${decoded.requestId} player=${decoded.player.slice(0, 8)}…`);
    } else if (orphans > 0) {
      // The matching pull hasn't landed yet; the reconcile poll will pick it up.
      console.log(`[ws] sell orphan req=${decoded.requestId} (pull not in DB yet)`);
    }
  } else if (topic0 === CARD_BOUGHT_TOPIC) {
    const decoded = decodeCardBought(raw);
    const inserted = await insertSales([decoded]);
    if (inserted > 0) {
      console.log(`[ws] BUY   serial=${decoded.serial} buyer=${decoded.buyer.slice(0, 8)}… $${(Number(decoded.priceWei) / 1e18).toFixed(2)}`);
    }
  } else if (topic0 === CARD_PRICE_UPDATED_TOPIC) {
    const decoded = decodeCardPriceUpdated(raw);
    const inserted = await insertPriceUpdates([decoded]);
    if (inserted > 0) {
      console.log(`[ws] PRICE serial=${decoded.serial} $${(Number(decoded.oldPriceWei) / 1e18).toFixed(2)} → $${(Number(decoded.newPriceWei) / 1e18).toFixed(2)}`);
    }
  }
}

interface SubscribeAck {
  jsonrpc: '2.0';
  id: number;
  result?: string;
  error?: { code: number; message: string };
}

interface SubscriptionMessage {
  jsonrpc: '2.0';
  method: 'eth_subscription';
  params: { subscription: string; result: AlchemyWsLog };
}

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const HEARTBEAT_MS = 30_000;

let backoff = RECONNECT_MIN_MS;
let stopped = false;

function connect(): void {
  if (stopped) return;
  console.log(`[ws] connecting to ${config.alchemyWsUrl.slice(0, 40)}…`);
  const ws = new WebSocket(config.alchemyWsUrl);
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let subscriptionId: string | undefined;

  ws.addEventListener('open', () => {
    console.log('[ws] open — subscribing to logs');
    backoff = RECONNECT_MIN_MS;
    const subMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          address: ADDRESSES,
          topics: [
            [PLAY_ASSIGNED_TOPIC, NFT_SOLD_BACK_TOPIC, CARD_BOUGHT_TOPIC, CARD_PRICE_UPDATED_TOPIC],
          ],
        },
      ],
    };
    ws.send(JSON.stringify(subMsg));

    // Heartbeat: send a no-op request periodically; if the socket is dead the
    // close handler fires and triggers reconnect.
    heartbeat = setInterval(() => {
      try { ws.send(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'net_version', params: [] })); } catch {}
    }, HEARTBEAT_MS);
  });

  ws.addEventListener('message', (ev: MessageEvent) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    } catch (e) {
      console.warn('[ws] non-JSON message dropped');
      return;
    }
    const msg = parsed as SubscribeAck | SubscriptionMessage | { id: number; result?: unknown };

    // Subscription ack
    if ('id' in msg && msg.id === 1 && 'result' in msg && typeof (msg as SubscribeAck).result === 'string') {
      subscriptionId = (msg as SubscribeAck).result;
      console.log(`[ws] subscribed (${subscriptionId?.slice(0, 14)}…) — ${ADDRESSES.length} addrs · 4 topics`);
      return;
    }
    if ('error' in msg && msg.error) {
      console.error(`[ws] subscribe error:`, (msg as SubscribeAck).error);
      ws.close();
      return;
    }
    // Heartbeat ack — ignore
    if ('id' in msg && msg.id === 99) return;

    if ('method' in msg && msg.method === 'eth_subscription') {
      const log = (msg as SubscriptionMessage).params.result;
      handleLog(log).catch(err => {
        console.error('[ws] handleLog failed', err);
      });
    }
  });

  ws.addEventListener('error', (ev: Event) => {
    console.warn('[ws] socket error', (ev as ErrorEvent).message ?? '(no message)');
  });

  ws.addEventListener('close', (ev: CloseEvent) => {
    if (heartbeat) clearInterval(heartbeat);
    console.warn(`[ws] closed (code=${ev.code}). Reconnecting in ${backoff}ms`);
    if (stopped) return;
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
  });
}

export function startWs(): void {
  stopped = false;
  connect();
}

export function stopWs(): void {
  stopped = true;
}
