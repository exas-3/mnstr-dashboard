import {
  config,
  PULL_TOPICS,
  NFT_SOLD_BACK_TOPIC,
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

function topicToAddress(topic: string): string {
  return ('0x' + topic.slice(-40)).toLowerCase();
}

function decode(log: EtherscanLog): PlayAssignedLog {
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
  return logs.map(l => ({
    contract: l.address.toLowerCase(),
    blockNumber: parseInt(l.blockNumber, 16),
    txHash: l.transactionHash,
    logIndex: parseInt(l.logIndex, 16),
    timestamp: parseInt(l.timeStamp, 16),
    player: topicToAddress(l.topics[1]),
    requestId: BigInt(l.topics[2]),
  }));
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

function decodeCardBought(log: EtherscanLog): CardBoughtLog {
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

function decodeCardPriceUpdated(log: EtherscanLog): CardPriceUpdatedLog {
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
