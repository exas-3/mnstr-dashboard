import { config } from './config.js';

export interface ApiPullCard {
  slug: string;
  title?: string;
  year?: number;
  set?: string;
  player?: string;
  grading?: string;
  gradingCompany?: string;
  serialNumber?: string;
  category?: string;
  image?: string;
  images?: { url: string; position: string }[];
  listPriceUsd?: number;
  fmv?: number;             // MnStr's fair market value, used for sell-back (~85% of fmv)
  canBeSold?: boolean;      // current vault state, not pull state
  isInStock?: boolean;      // current vault state, not pull state
  remoteId?: string;
}

export interface ApiPullUser {
  username?: string;
  slug?: string;
  avatarUrl?: string | null;
  referralCode?: string;
  twitter?: string | null;
}

export interface ApiPull {
  requestId: string;          // decimal uint256 string
  priceUsd?: string | number;
  fmvUsd?: string | number | null;
  payoutUsd?: string | number | null;
  status?: string;
  chainId?: number;
  createdAt?: string;
  type?: string;
  tier?: string;
  user?: ApiPullUser;
  card?: ApiPullCard;
}

interface Envelope<T> {
  data: T;
  metadata?: unknown;
  errors?: unknown;
}

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Origin: 'https://mnstr.xyz',
  Referer: 'https://mnstr.xyz/',
};

async function get<T>(path: string, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.mnstrApi}${path}`, {
      headers: COMMON_HEADERS,
      // No default fetch timeout in Node — a black-holed connection would
      // otherwise wedge the enrich pass indefinitely.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      return get(path, attempt + 1);
    }
    throw e;
  }
  if (!res.ok) {
    // 400 and 404 are permanent client errors — surface them with prefixed messages
    // so callers can treat them as "row missing" rather than retrying forever.
    if (res.status === 404) throw new Error(`404 ${path}`);
    if (res.status === 400) throw new Error(`400 ${path}`);
    if (attempt < 3 && (res.status >= 500 || res.status === 429)) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      return get(path, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

export async function getPull(requestId: bigint | string): Promise<ApiPull | null> {
  try {
    const env = await get<Envelope<ApiPull>>(`/gacha/pulls/${requestId.toString()}`);
    return env.data;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // 400: MnStr's renderer chokes on some playIds (server-side TypeError). Treat
    // as permanent — return null so the caller marks the row as checked.
    if (msg.startsWith('404') || msg.startsWith('400')) return null;
    throw e;
  }
}

export interface LeaderboardEntry {
  userId: number;
  rank: number;
  totalPoints: number;
  pointsToday: number;
  user: { username: string; slug: string; avatarUrl?: string | null; referralCode?: string; twitter?: string | null };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const env = await get<Envelope<LeaderboardEntry[]>>('/leaderboard');
  return env.data;
}

export async function getStats(): Promise<{ packsOpened: number; players: number; totalWon: number }> {
  const env = await get<Envelope<{ packsOpened: number; players: number; totalWon: number }>>('/gacha/stats');
  return env.data;
}

export async function getPrices(): Promise<Record<string, { price: string; priceUsd: string; tier: string; isPlayable: boolean }>> {
  const env = await get<Envelope<Record<string, { price: string; priceUsd: string; tier: string; isPlayable: boolean }>>>('/gacha/prices');
  return env.data;
}

/* One entry from the public /packs catalog. MnStr deploys a separate
 * OffchainGacha contract per pack, so `contractAddress` here is the canonical
 * way to discover a newly-launched gacha. Only the fields we use are typed —
 * the live payload also carries odds, images, rarity bands, etc. */
export interface ApiPack {
  id: number;
  slug: string;
  name: string;
  category: string;
  packType: string;          // 'gacha' for the rip-a-pack contracts
  contractAddress: string;
  priceUsd?: string;
  buybackRatePct?: number;
  enabled: boolean;
  isPlayable: boolean;
}

export async function getPacks(): Promise<ApiPack[]> {
  const env = await get<Envelope<ApiPack[]>>('/packs');
  return env.data;
}

/** Simple token-bucket rate limiter (RPS) */
export class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(private rps: number, private burst = rps) {
    this.tokens = burst;
    this.last = Date.now();
  }
  async take(): Promise<void> {
    while (true) {
      const now = Date.now();
      const elapsed = (now - this.last) / 1000;
      this.tokens = Math.min(this.burst, this.tokens + elapsed * this.rps);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.ceil(((1 - this.tokens) / this.rps) * 1000);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}
