/* Live polling endpoint for the Live route's 5s client poll. Returns the
 * newest pulls + a 1h KPI snapshot. No-store to bypass any HTTP caching;
 * the daemon (npm run poller) keeps the DB fresh on its own loop. */

import { NextResponse } from 'next/server';
import { getKpisFor, getLiveFeed, getLatestIndexedBlock } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [kpis, feed, latestBlock] = await Promise.all([
    getKpisFor('24h'),
    getLiveFeed(30),
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
