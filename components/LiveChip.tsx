'use client';

/* Header LIVE indicator that actually admits staleness.
 *
 * Polls /api/health (cheap: one MAX() + one state-key read) on mount and
 * every 5 minutes. The health route keys off the poller's last successful
 * reconcile, so a quota-stalled indexer (PM2 "online", every call erroring)
 * flips this chip to STALE within ~15 minutes instead of pulsing green over
 * frozen data. Renders LIVE during SSR/hydration and only downgrades after
 * a mounted fetch, so there's no hydration mismatch. */

import { useEffect, useState } from 'react';
import { Mono } from './primitives';

type Freshness = 'live' | 'stale' | 'offline';

const CHECK_MS = 5 * 60 * 1000;
const OFFLINE_AFTER_SEC = 60 * 60;

export function useFreshness(): { freshness: Freshness; ageSec: number | null } {
  const [freshness, setFreshness] = useState<Freshness>('live');
  const [ageSec, setAgeSec] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        const j = (await res.json()) as { stale?: boolean; pollerAgeSec?: number | null };
        if (cancelled) return;
        setAgeSec(j.pollerAgeSec ?? null);
        if (!j.stale) setFreshness('live');
        else setFreshness((j.pollerAgeSec ?? Infinity) > OFFLINE_AFTER_SEC ? 'offline' : 'stale');
      } catch {
        // Health route unreachable — the page itself would be too; don't flap.
      }
    }
    void check();
    const id = window.setInterval(check, CHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { freshness, ageSec };
}

export const FRESHNESS_COLOR: Record<Freshness, string> = {
  live: 'var(--positive)',
  stale: 'var(--accent)',
  offline: 'var(--fg-4)',
};

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  live: 'LIVE',
  stale: 'STALE',
  offline: 'OFFLINE',
};

export default function LiveChip() {
  const { freshness } = useFreshness();
  return (
    <span className="inline-flex items-center gap-1.5" title={freshness === 'live' ? 'indexer healthy' : 'indexer delayed — data may be stale'}>
      <span
        className="live-dot"
        style={freshness !== 'live' ? { background: FRESHNESS_COLOR[freshness], animation: 'none' } : undefined}
      />
      <Mono style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em', marginRight: 4 }}>
        {FRESHNESS_LABEL[freshness]}
      </Mono>
    </span>
  );
}
