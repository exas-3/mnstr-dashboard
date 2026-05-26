/* Live polling endpoint for the Live route's 5s client poll. Returns the
 * newest pulls + a 24h KPI snapshot. No-store to bypass any HTTP caching;
 * the daemon (npm run poller) keeps the DB fresh on its own loop.
 *
 * `?limit=N` lets the client widen the visible feed (clamped to [10, 200]).
 * Defaults to 30 (matches the initial SSR'd feed). */

import { NextResponse } from 'next/server';
import { getKpisFor, getLiveFeed, getLatestIndexedBlock } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(10, rawLimit))
    : DEFAULT_LIMIT;

  const [kpis, feed, latestBlock] = await Promise.all([
    getKpisFor('24h'),
    getLiveFeed(limit),
    getLatestIndexedBlock(),
  ]);

  return NextResponse.json(
    {
      kpis,
      feed,
      latestBlock,
      serverNow: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
