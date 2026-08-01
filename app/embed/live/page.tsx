/* Chromeless live-feed embed for OBS streamers — /embed/live.
 *
 * Bare route: Shell detects the /embed prefix and skips all nav chrome, so
 * this page is just <LivePulse> on the site background. The initial payload
 * mirrors app/page.tsx's liveInitial (30-item feed + 24h KPI snapshot); the
 * component then keeps itself fresh via /api/live/stream SSE + poll backstop. */

import type { Metadata } from 'next';
import LivePulse from '@/components/live/LivePulse';
import { getKpisFor, getLiveFeed, getLatestIndexedBlock } from '@/lib/queries';
import { getState } from '@/db/client';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live embed',
  // Chromeless duplicate of the Pulse live section — keep it out of indexes.
  robots: { index: false, follow: false },
};

export default async function EmbedLivePage() {
  const [kpis, feed, latestBlock, lastPollOk] = await Promise.all([
    getKpisFor('24h'),
    getLiveFeed(30),
    getLatestIndexedBlock(),
    getState('last_poll_ok').catch(() => null),
  ]);

  const initial = {
    kpis,
    feed,
    latestBlock,
    serverNow: new Date().toISOString(),
    lastPollOk,
  };

  return <LivePulse initial={initial} embed />;
}
