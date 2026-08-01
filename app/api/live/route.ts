/* Live polling endpoint for the Live route's 5s client poll. Returns the
 * newest pulls + a 24h KPI snapshot. No-store to bypass any HTTP caching;
 * the daemon (npm run poller) keeps the DB fresh on its own loop.
 *
 * `?limit=N` lets the client widen the visible feed (clamped to [10, 200]).
 * Defaults to 30 (matches the initial SSR'd feed). */

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { getState } from '@/db/client';
import { getKpisFor, getLiveFeed, getLatestIndexedBlock } from '@/lib/queries';
import { ttlCache } from '@/lib/queries/cache';
import { LIVE_FEED_MAX } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = LIVE_FEED_MAX;

export const GET = apiHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(10, rawLimit))
    : DEFAULT_LIMIT;

  // Every connected client polls this on SSE ticks — during a pull burst
  // that's N clients × one 3-KPI + feed recompute every ~3s. A 2.5s
  // in-process TTL (keyed by limit; the client quantizes limit in
  // FEED_PAGE_STEP steps) collapses that to one recompute per tick total.
  const payload = await ttlCache(`live:${limit}`, 2_500, async () => {
    const [kpis, feed, latestBlock, lastPollOk] = await Promise.all([
      getKpisFor('24h'),
      getLiveFeed(limit),
      getLatestIndexedBlock(),
      // Poller heartbeat — advanced only by a fully-successful reconcile. The
      // client compares it to serverNow (both server clocks, no client skew)
      // to decide whether the "STREAM LIVE" indicator should admit staleness.
      getState('last_poll_ok').catch(() => null),
    ]);
    return {
      kpis,
      feed,
      latestBlock,
      serverNow: new Date().toISOString(),
      lastPollOk,
    };
  });

  return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } });
});
