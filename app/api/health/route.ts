/* Health endpoint for external pingers (UptimeRobot / healthchecks.io) and
 * the UI staleness badge.
 *
 * The failure mode this exists for: the poller process stays "online" in PM2
 * while every RPC call errors (documented Alchemy monthly-quota stall), so the
 * site silently serves frozen data. The poller advances the `last_poll_ok`
 * indexer_state key only after a fully-successful reconcile — this route turns
 * that heartbeat into an HTTP status an external monitor can alert on.
 *
 * 200 = DB reachable AND the poller completed a reconcile recently.
 * 503 = DB unreachable, heartbeat missing, or heartbeat older than the
 *       threshold (poller wedged/stalled — data on the site is going stale). */

import { NextResponse } from 'next/server';
import { sql, getState } from '@/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Reconcile cadence is 5 min; 15 min = 3 missed cycles.
const STALE_AFTER_MS = 15 * 60 * 1000;

const NO_STORE = { 'cache-control': 'no-store' };

export async function GET() {
  try {
    const [row] = await sql<Array<{ latest_pull: string | null }>>`
      SELECT MAX(pulled_at)::text AS latest_pull FROM pulls
    `;
    const lastOk = await getState('last_poll_ok');
    const pollerAgeMs = lastOk ? Date.now() - Date.parse(lastOk) : null;
    const stale = pollerAgeMs === null || !Number.isFinite(pollerAgeMs) || pollerAgeMs > STALE_AFTER_MS;

    return NextResponse.json(
      {
        ok: !stale,
        stale,
        lastPollOk: lastOk,
        pollerAgeSec: pollerAgeMs !== null && Number.isFinite(pollerAgeMs) ? Math.round(pollerAgeMs / 1000) : null,
        latestPullAt: row?.latest_pull ?? null,
      },
      { status: stale ? 503 : 200, headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { ok: false, stale: true, error: 'db unreachable' },
      { status: 503, headers: NO_STORE },
    );
  }
}
