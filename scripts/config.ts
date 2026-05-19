import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  chainId: Number(process.env.CHAIN_ID ?? 4326),
  rpcUrl: process.env.RPC_URL ?? 'https://mainnet.megaeth.com/rpc',
  alchemyRpc: required('ALCHEMY_RPC'),
  etherscanKey: required('ETHERSCAN_KEY'),
  mnstrApi: process.env.MNSTR_API ?? 'https://api.mnstr.xyz',

  enrichConcurrency: Number(process.env.ENRICH_CONCURRENCY ?? 4),
  enrichRps: Number(process.env.ENRICH_RPS ?? 8),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
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

export const PULL_TOPICS = [PLAY_ASSIGNED_TOPIC] as const;

export type PaymentType = 'usdm';

export function paymentFromTopic(_topic0: string): PaymentType {
  return 'usdm';
}

// OffchainGacha contracts on MegaETH (created by operator 0x61fccfc...)
// (tier name, address, deployment block, entry price USDm)
export const GACHA_CONTRACTS = [
  {
    tier: 'Starter',
    address: '0xdea1d72f08d83e36946128603d4cd0a180a938a9',
    deployBlock: 13_479_640,
    priceUsd: 50,
  },
  {
    tier: 'Premium',
    address: '0x6a786932b1ca83e2343b85483101c5b820860ac4',
    deployBlock: 13_479_705,
    priceUsd: 250,
  },
  {
    tier: 'Ultra',
    address: '0xebb285b5cd4610d0f6dc538379a7027f02274ca2',
    deployBlock: 13_479_710,
    priceUsd: 1250,
  },
] as const;

export type Tier = (typeof GACHA_CONTRACTS)[number]['tier'];

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
