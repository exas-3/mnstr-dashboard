import {
  config,
  PULL_TOPICS,
  NFT_SOLD_BACK_TOPIC,
  NFT_REDEEMED_TOPIC,
  CARD_BOUGHT_TOPIC,
  CARD_PRICE_UPDATED_TOPIC,
  paymentFromTopic,
  type PaymentType,
} from './config.js';
import { RateLimiter } from './api.js';

// Etherscan v2 free tier: 5 calls/sec advertised, but we see "Max calls per sec (3/sec)" at higher rates.
// Keep a healthy margin.
const etherscanLimiter = new RateLimiter(2.5);

export interface PlayAssignedLog {
  contract: string;        // contract address (lowercase)
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;       // unix seconds
  wallet: string;          // player address (lowercase) — from topic[1]
  requestId: bigint;       // playId — from topic[2]
  amount: bigint;          // USDm wei (0 for 'credit' pulls)
  payment: PaymentType;    // 'usdm' (PlayAssigned) | 'credit' (NFTSoldBack)
}

interface EtherscanLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;   // hex
  timeStamp: string;     // hex unix seconds
  gasPrice: string;
  gasUsed: string;
  logIndex: string;      // hex
  transactionHash: string;
  transactionIndex: string;
}

const BASE = 'https://api.etherscan.io/v2/api';

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  await etherscanLimiter.take();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (attempt < 5) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        return fetchJson(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    // Network errors (socket closed, DNS, etc.) — retry with backoff.
    if (attempt < 5) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      return fetchJson(url, attempt + 1);
    }
    throw e;
  }
}

export function topicToAddress(topic: string): string {
  return ('0x' + topic.slice(-40)).toLowerCase();
}

/* Both `EtherscanLog` (REST poll) and `AlchemyWsLog` (websocket) share the
 * same field set EXCEPT WS logs lack `timeStamp` (you fetch that from the
 * block separately). These two adapters let the WS path reuse the same
 * decoders. */
export type RawLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;        // hex unix seconds
  logIndex: string;
  transactionHash: string;
  transactionIndex: string;
};

export function decode(log: RawLog): PlayAssignedLog {
  return {
    contract: log.address.toLowerCase(),
    blockNumber: parseInt(log.blockNumber, 16),
    txHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    timestamp: parseInt(log.timeStamp, 16),
    wallet: topicToAddress(log.topics[1]),
    requestId: BigInt(log.topics[2]),
    // Credit-paid pulls have empty `data` (no USDm transferred).
    amount: log.data && log.data !== '0x' ? BigInt(log.data) : 0n,
    payment: paymentFromTopic(log.topics[0]),
  };
}

/**
 * Fetch all pull-related logs (PlayAssigned + NFTSoldBack) for one contract
 * in [fromBlock, toBlock]. Etherscan returns max 1000 per page; we paginate
 * until we get < 1000. Caller must dedupe on (tx_hash, log_index) since we
 * re-fetch the last block on each full page to avoid skipping logs past the
 * page boundary.
 */
export async function getPullLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<PlayAssignedLog[]> {
  const out: PlayAssignedLog[] = [];
  for (const topic of PULL_TOPICS) {
    const logs = await fetchTopicLogs(address, topic, fromBlock, toBlock);
    for (const l of logs) out.push(decode(l));
  }
  return out;
}

async function fetchTopicLogs(
  address: string,
  topic: string,
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const out: EtherscanLog[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const page = await fetchPage(address, topic, cursor, toBlock);
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < 1000) break;
    const lastBlock = parseInt(page[page.length - 1].blockNumber, 16);
    if (lastBlock === cursor) {
      throw new Error(
        `fetchTopicLogs: >=1000 logs in single block ${lastBlock} for ${address} topic ${topic}; reduce CHUNK_BLOCKS`,
      );
    }
    cursor = lastBlock;
  }
  return out;
}

async function fetchPage(
  address: string,
  topic0: string,
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const url = new URL(BASE);
  url.searchParams.set('chainid', String(config.chainId));
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('address', address);
  url.searchParams.set('topic0', topic0);
  url.searchParams.set('fromBlock', String(fromBlock));
  url.searchParams.set('toBlock', String(toBlock));
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', '1000');
  url.searchParams.set('apikey', config.etherscanKey);

  return fetchPageWithRetry(url.toString());
}

/**
 * Fetch ERC-20 Transfer logs on `tokenAddress` where topic1 (from) OR topic2 (to)
 * matches `partyAddress`. Used for indexing USDm flows where one side is mnstr's
 * operator EOA — that's the central settlement point for pulls, sellbacks, and
 * marketplace activity. Returns the union of both legs.
 *
 * Etherscan v2 supports topicX + topicX_Y_opr operators, but we issue two
 * separate scans rather than one combined "topic1=A OR topic2=A" query because
 * Etherscan only supports AND-style combinations across topics, not OR.
 */
async function fetchTransfersByParty(
  tokenAddress: string,
  partyAddress: string,
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const padded = '0x' + partyAddress.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  const [outgoing, incoming] = await Promise.all([
    fetchTransferLogs(tokenAddress, { topic1: padded }, fromBlock, toBlock),
    fetchTransferLogs(tokenAddress, { topic2: padded }, fromBlock, toBlock),
  ]);
  // Dedup by (tx_hash, log_index) in case a self-transfer (party→party)
  // would appear in both legs. None expected in practice, but cheap to guard.
  const seen = new Set<string>();
  const out: EtherscanLog[] = [];
  for (const l of [...outgoing, ...incoming]) {
    const key = `${l.transactionHash}:${l.logIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

async function fetchTransferLogs(
  address: string,
  fixed: { topic1?: string; topic2?: string },
  fromBlock: number,
  toBlock: number,
): Promise<EtherscanLog[]> {
  const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const out: EtherscanLog[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const url = new URL(BASE);
    url.searchParams.set('chainid', String(config.chainId));
    url.searchParams.set('module', 'logs');
    url.searchParams.set('action', 'getLogs');
    url.searchParams.set('address', address);
    url.searchParams.set('topic0', TRANSFER);
    if (fixed.topic1) {
      url.searchParams.set('topic1', fixed.topic1);
      url.searchParams.set('topic0_1_opr', 'and');
    }
    if (fixed.topic2) {
      url.searchParams.set('topic2', fixed.topic2);
      url.searchParams.set('topic0_2_opr', 'and');
    }
    url.searchParams.set('fromBlock', String(cursor));
    url.searchParams.set('toBlock', String(toBlock));
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '1000');
    url.searchParams.set('apikey', config.etherscanKey);
    const page = await fetchPageWithRetry(url.toString());
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < 1000) break;
    const lastBlock = parseInt(page[page.length - 1].blockNumber, 16);
    if (lastBlock === cursor) {
      throw new Error(
        `fetchTransferLogs: >=1000 logs in single block ${lastBlock}; tighten window`,
      );
    }
    cursor = lastBlock;
  }
  return out;
}

async function fetchPageWithRetry(url: string, attempt = 0): Promise<EtherscanLog[]> {
  const resp = await fetchJson<{ status: string; message: string; result: EtherscanLog[] | string }>(url);

  if (resp.status === '0' && resp.message === 'No records found') return [];
  if (resp.status === '0' && typeof resp.result === 'string') {
    // Rate-limit message → back off and retry.
    if (resp.result.toLowerCase().includes('rate limit') && attempt < 5) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      return fetchPageWithRetry(url, attempt + 1);
    }
    throw new Error(`Etherscan error: ${resp.message} / ${resp.result}`);
  }
  if (!Array.isArray(resp.result)) {
    throw new Error(`Etherscan unexpected: ${JSON.stringify(resp).slice(0, 200)}`);
  }
  return resp.result;
}

export interface NFTSoldBackLog {
  contract: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;
  player: string;
  requestId: bigint;
}

export function decodeSellback(log: RawLog): NFTSoldBackLog {
  return {
    contract: log.address.toLowerCase(),
    blockNumber: parseInt(log.blockNumber, 16),
    txHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    timestamp: parseInt(log.timeStamp, 16),
    player: topicToAddress(log.topics[1]),
    requestId: BigInt(log.topics[2]),
  };
}

/**
 * Fetch NFTSoldBack(player, playId) logs for one contract in [fromBlock, toBlock].
 * Same pagination strategy as getPullLogs.
 */
export async function getSellbackLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<NFTSoldBackLog[]> {
  const logs = await fetchTopicLogs(address, NFT_SOLD_BACK_TOPIC, fromBlock, toBlock);
  return logs.map(decodeSellback);
}

// NFTRedeemed shares the same shape as NFTSoldBack — (player, requestId) in
// topics, no event data. Reuses NFTSoldBackLog as the row type.
export type NFTRedeemedLog = NFTSoldBackLog;

export async function getRedemptionLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<NFTRedeemedLog[]> {
  const logs = await fetchTopicLogs(address, NFT_REDEEMED_TOPIC, fromBlock, toBlock);
  return logs.map(decodeSellback);
}

// --- CardMarketplace events ---

export interface CardBoughtLog {
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;
  buyer: string;
  serial: string;
  priceWei: bigint;
}

export interface CardPriceUpdatedLog {
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;
  serial: string;
  oldPriceWei: bigint;
  newPriceWei: bigint;
}

function decodeAbiString(hex: string, offsetBytes: number): string {
  const strSlot = Math.floor(offsetBytes / 32);
  const lenHex = hex.slice(strSlot * 64, (strSlot + 1) * 64);
  const strLen = parseInt(lenHex, 16);
  const startHex = (strSlot + 1) * 64;
  const strHex = hex.slice(startHex, startHex + strLen * 2);
  return Buffer.from(strHex, 'hex').toString('utf8');
}

export function decodeCardBought(log: RawLog): CardBoughtLog {
  const hex = log.data.slice(2);
  const offset = parseInt(hex.slice(0, 64), 16);
  const priceWei = BigInt('0x' + hex.slice(64, 128));
  return {
    blockNumber: parseInt(log.blockNumber, 16),
    txHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    timestamp: parseInt(log.timeStamp, 16),
    buyer: topicToAddress(log.topics[1]),
    serial: decodeAbiString(hex, offset),
    priceWei,
  };
}

export function decodeCardPriceUpdated(log: RawLog): CardPriceUpdatedLog {
  const hex = log.data.slice(2);
  const offset = parseInt(hex.slice(0, 64), 16);
  const oldPriceWei = BigInt('0x' + hex.slice(64, 128));
  const newPriceWei = BigInt('0x' + hex.slice(128, 192));
  return {
    blockNumber: parseInt(log.blockNumber, 16),
    txHash: log.transactionHash,
    logIndex: parseInt(log.logIndex, 16),
    timestamp: parseInt(log.timeStamp, 16),
    serial: decodeAbiString(hex, offset),
    oldPriceWei,
    newPriceWei,
  };
}

export async function getMarketplaceBoughtLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<CardBoughtLog[]> {
  const logs = await fetchTopicLogs(address, CARD_BOUGHT_TOPIC, fromBlock, toBlock);
  return logs.map(decodeCardBought);
}

export async function getMarketplacePriceUpdatedLogs(
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<CardPriceUpdatedLog[]> {
  const logs = await fetchTopicLogs(address, CARD_PRICE_UPDATED_TOPIC, fromBlock, toBlock);
  return logs.map(decodeCardPriceUpdated);
}

export async function getLatestBlock(): Promise<number> {
  const res = await fetch(config.alchemyRpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
  });
  const j = (await res.json()) as { result: string };
  return parseInt(j.result, 16);
}

// --- USDm flow indexing (operator-centric, Alchemy RPC) ---

export interface UsdmFlowLog {
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;
  from: string;            // lowercase 0x40
  to: string;              // lowercase 0x40
  amountWei: bigint;       // USDm has 18 decimals
}

function topicToAddr(topic: string): string {
  return ('0x' + topic.slice(-40)).toLowerCase();
}

interface AlchemyLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  blockTimestamp?: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  removed: boolean;
}

// Alchemy caps eth_getLogs at 10k blocks per call. Same as Etherscan, but
// without the 5-RPS API rate limit — we can fire many in parallel.
const RPC_MAX_BLOCK_RANGE = 10_000;

async function rpcGetLogs(
  rpcUrl: string,
  params: {
    address: string;
    fromBlock: number;
    toBlock: number;
    topics: (string | string[] | null)[];
  },
): Promise<AlchemyLog[]> {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getLogs',
    params: [{
      address: params.address,
      fromBlock: '0x' + params.fromBlock.toString(16),
      toBlock:   '0x' + params.toBlock.toString(16),
      topics:    params.topics,
    }],
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      continue;
    }
    const j = (await res.json()) as { result?: AlchemyLog[]; error?: { code: number; message: string } };
    if (j.error) {
      // Retry on transient errors. Don't retry on "log query range exceeds limit"
      // — the caller chunks below the cap.
      if (j.error.message?.toLowerCase().includes('rate') && attempt < 4) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(`eth_getLogs error: ${j.error.message}`);
    }
    return j.result ?? [];
  }
  throw new Error('eth_getLogs exhausted retries');
}

// Cache block → unix-ts to avoid one eth_getBlockByNumber call per log.
const tsCache = new Map<number, number>();
const TS_CACHE_CAP = 20_000;

async function fetchBlockTs(rpcUrl: string, blockNumber: number): Promise<number> {
  const hit = tsCache.get(blockNumber);
  if (hit != null) return hit;
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber',
      params: ['0x' + blockNumber.toString(16), false],
    }),
  });
  const j = (await res.json()) as { result?: { timestamp: string } };
  const ts = parseInt(j.result?.timestamp ?? '0x0', 16);
  tsCache.set(blockNumber, ts);
  if (tsCache.size > TS_CACHE_CAP) {
    const trim = Array.from(tsCache.keys()).slice(0, TS_CACHE_CAP / 4);
    for (const k of trim) tsCache.delete(k);
  }
  return ts;
}

/**
 * Fetch USDm Transfer logs in [fromBlock, toBlock] where one side is the
 * mnstr operator EOA. Operator is the central settlement point for pulls
 * (player→op), sellbacks (op→player), and marketplace activity (buyer→op,
 * op→seller). Filtering on this single counterparty captures all realized
 * USDm cashflow for players in two RPC calls per chunk.
 *
 * Uses Alchemy's eth_getLogs — server-side topic filtering keeps the result
 * narrow (a few rows per 10k blocks, not the thousands of unrelated USDm
 * transfers per block on megaeth).
 */
export async function getOperatorUsdmFlows(
  usdmAddress: string,
  operatorAddress: string,
  fromBlock: number,
  toBlock: number,
  rpcUrl: string,
): Promise<UsdmFlowLog[]> {
  const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const padded = '0x' + operatorAddress.replace(/^0x/, '').toLowerCase().padStart(64, '0');

  const out: UsdmFlowLog[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const chunkTo = Math.min(cursor + RPC_MAX_BLOCK_RANGE - 1, toBlock);

    // Two parallel queries: operator as `from` (topic1), operator as `to`
    // (topic2). RPC's topics[] field is positional, so we issue separately.
    const [outgoing, incoming] = await Promise.all([
      rpcGetLogs(rpcUrl, {
        address: usdmAddress,
        fromBlock: cursor,
        toBlock: chunkTo,
        topics: [TRANSFER, padded, null],
      }),
      rpcGetLogs(rpcUrl, {
        address: usdmAddress,
        fromBlock: cursor,
        toBlock: chunkTo,
        topics: [TRANSFER, null, padded],
      }),
    ]);

    const seen = new Set<string>();
    const merged: AlchemyLog[] = [];
    for (const l of [...outgoing, ...incoming]) {
      const k = `${l.transactionHash}:${l.logIndex}`;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(l);
    }

    // Resolve timestamps. Alchemy returns `blockTimestamp` inline for newer
    // logs (Mega's modern blocks). Older logs may omit it — fall back to
    // eth_getBlockByNumber with caching.
    for (const l of merged) {
      const block = parseInt(l.blockNumber, 16);
      let ts: number;
      if (l.blockTimestamp) {
        ts = parseInt(l.blockTimestamp, 16);
        tsCache.set(block, ts);
      } else {
        ts = await fetchBlockTs(rpcUrl, block);
      }
      out.push({
        blockNumber: block,
        txHash: l.transactionHash,
        logIndex: parseInt(l.logIndex, 16),
        timestamp: ts,
        from: topicToAddr(l.topics[1]),
        to:   topicToAddr(l.topics[2]),
        amountWei: BigInt(l.data),
      });
    }

    cursor = chunkTo + 1;
  }
  return out;
}
