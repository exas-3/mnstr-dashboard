import type { Metadata } from 'next';
import LivePulse from '@/components/live/LivePulse';
import AsciiLive from '@/components/arcade/AsciiLive';
import { getKpisFor, getLiveFeed, getLatestIndexedBlock } from '@/lib/queries';
import { getTheme } from '@/lib/server-theme';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live · MnStr stream',
  description:
    'Real-time stream of MnStr pack pulls. Big hits ≥ $1k FMV flash and pin for 30 seconds. 5-second polling.',
  alternates: { canonical: '/live' },
};

interface Search {
  embed?: string;
}

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const embed = params.embed === '1' || params.embed === 'true';

  const [theme, kpis, feed, latestBlock] = await Promise.all([
    getTheme(),
    getKpisFor('24h'),
    getLiveFeed(30),
    getLatestIndexedBlock(),
  ]);

  const initial = { kpis, feed, latestBlock, serverNow: new Date().toISOString() };

  if (theme === 'arcade') {
    return <AsciiLive initial={initial} embed={embed} />;
  }
  return <LivePulse initial={initial} embed={embed} />;
}
