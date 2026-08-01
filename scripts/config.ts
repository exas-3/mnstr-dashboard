import 'dotenv/config';
import { TIERS } from '../lib/tiers.js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function deriveWsUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:\/\//, 'wss://');
}

const ALCHEMY_RPC = required('ALCHEMY_RPC');

export const config = {
  databaseUrl: required('DATABASE_URL'),
  chainId: Number(process.env.CHAIN_ID ?? 4326),
  rpcUrl: process.env.RPC_URL ?? 'https://mainnet.megaeth.com/rpc',
  alchemyRpc: ALCHEMY_RPC,
  // Separate Alchemy endpoint for heavy backfill scans (eth_getLogs over wide
  // block ranges). Keeps the live-indexer's rate budget on `alchemyRpc`
  // untouched. Falls back to alchemyRpc if not set.
  alchemyRpcBackfill: process.env.ALCHEMY_RPC_BACKFILL ?? ALCHEMY_RPC,
  // Alchemy supports the same key over wss:// — used by the live indexer
  // (scripts/ws.ts). Override via ALCHEMY_WS_URL if your provider is different.
  alchemyWsUrl: process.env.ALCHEMY_WS_URL ?? deriveWsUrl(ALCHEMY_RPC),
  etherscanKey: required('ETHERSCAN_KEY'),
  mnstrApi: process.env.MNSTR_API ?? 'https://api.mnstr.xyz',

  enrichConcurrency: Number(process.env.ENRICH_CONCURRENCY ?? 4),
  enrichRps: Number(process.env.ENRICH_RPS ?? 8),
  // Cadence of the RECONCILE poll (used as a backstop for WS gaps). Default
  // 5min since the WS listener handles real-time. Pre-WS default was 10s.
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 300_000),
  restatusAgeHours: Number(process.env.RESTATUS_AGE_HOURS ?? 24),
};

// PlayAssigned(address indexed player, uint256 indexed playId, uint256 amount)
// Emitted on each pull; `amount` (in event data) is the USDm wei transferred.
export const PLAY_ASSIGNED_TOPIC =
  '0xf0a783fd17159ab0464ae887e036ba490797120366316042a0bbd0ae35d982ad';

// NFTSoldBack(address indexed player, uint256 indexed playId) — sell-back of the card
// pulled at `playId`. NOT a new pull (same playId already in PlayAssigned). Tracked
// separately if/when we add a sell-back table; not indexed into `pulls`.
export const NFT_SOLD_BACK_TOPIC =
  '0x470edf61f207ead5df345d69e26eca28753ddbc48914228dcd4202d9d9dcea51';

// NFTRedeemed(address indexed player, uint256 indexed requestId) — fires when
// the player redeems their card for physical shipment. After this, the card
// has left the protocol's vault and should be excluded from held-FMV / paper-
// payout liability math. keccak256("NFTRedeemed(address,uint256)").
export const NFT_REDEEMED_TOPIC =
  '0x14c9b4d4f4cc58cdc10083ad4d08288a39df874bbf3e4e0846f3fd1352d48c87';

export const PULL_TOPICS = [PLAY_ASSIGNED_TOPIC] as const;

// ERC-20 Transfer(address indexed from, address indexed to, uint256 value)
// — used to mirror on-chain USDm flows for realized P&L ground truth.
export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export type PaymentType = 'usdm';

export function paymentFromTopic(_topic0: string): PaymentType {
  return 'usdm';
}

// OffchainGacha contracts on MegaETH (created by operator 0x61fccfc...).
//
// Canonical per-tier data (address, deploy block, entry price USDm, buyback
// rate, UI labels) lives in lib/tiers.ts — the single source of truth for
// the TS side. Re-exported under the historical name so every scripts/*
// import keeps working unchanged. Add a new pack in lib/tiers.ts, not here.
export const GACHA_CONTRACTS = TIERS;

export type { Tier } from '../lib/tiers.js';

// Operator EOA — receives pack USDm, pays sell-backs.
export const OPERATOR_EOA = '0x61fccfc0279b09c387608eff56fd9187e61d2874';

// USDm payment token (18 decimals).
export const USDM_ADDRESS = '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7';

// CardMarketplace contract — secondary-market sales + operator price updates.
// First on-chain activity observed around block 15,762,915 (2026-04). Using a
// conservative deploy_block below that.
export const MARKETPLACE_ADDRESS = '0x5db1075782527e5ddacfdd816ea0c59b8c6eaad3';
export const MARKETPLACE_DEPLOY_BLOCK = 15_500_000;

// CardBought(string serial, address indexed buyer, uint256 priceWei)
export const CARD_BOUGHT_TOPIC =
  '0x4e8de887b846167bea81588aedd478296923fd65277008e44d2ff85545b916f7';

// CardPriceUpdated(string serial, uint256 oldPriceWei, uint256 newPriceWei)
export const CARD_PRICE_UPDATED_TOPIC =
  '0x3a5a3d7b60979d02e985ddfeda71bca0b0e22de6f155a42f44e13b5a7d865470';

export const MARKETPLACE_TOPICS = [CARD_BOUGHT_TOPIC, CARD_PRICE_UPDATED_TOPIC] as const;
