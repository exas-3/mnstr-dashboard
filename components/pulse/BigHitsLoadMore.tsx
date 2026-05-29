'use client';

/* Big Hits list with a "Show more" button. First page SSR'd from the
 * Pulse server component, each click appends 10 more via /api/pulse/big-hits
 * (window-scoped). Pool is filtered to FMV ≥ 2× pack price. */

import { useState } from 'react';
import OutlierRow from '../tiers/OutlierRow';
import { Mono } from '../primitives';
import type { TierOutlier, TimeWindowKey } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function BigHitsLoadMore({
  window,
  initialRows,
  total,
}: {
  window: TimeWindowKey;
  initialRows: TierOutlier[];
  total: number;
}) {
  const [rows, setRows] = useState<TierOutlier[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, total - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pulse/big-hits?w=${window}&offset=${rows.length}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: TierOutlier[] };
      setRows(prev => {
        const seen = new Set(prev.map(r => r.card_slug ?? `${r.card_title}|${r.fmv_usd}`));
        const fresh = data.rows.filter(r => !seen.has(r.card_slug ?? `${r.card_title}|${r.fmv_usd}`));
        return [...prev, ...fresh];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {rows.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO BIG HITS IN WINDOW</Mono>
          </div>
        ) : (
          rows.map((o, i) => <OutlierRow key={o.card_slug ?? i} outlier={o} first={i === 0} />)
        )}
      </div>

      {nextBatch > 0 && (
        <div className="px-4 pt-3 pb-1 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: '8px 16px',
              color: loading ? 'var(--fg-4)' : 'var(--accent)',
              border: `1px solid ${loading ? 'var(--line)' : 'color-mix(in oklch, var(--accent) 33%, transparent)'}`,
              background: loading ? 'transparent' : 'color-mix(in oklch, var(--accent) 5%, transparent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'LOADING…' : 'SHOW MORE'}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 pt-2 pb-1 text-center">
          <Mono style={{ fontSize: 9.5, color: 'var(--negative)' }}>{error}</Mono>
        </div>
      )}
    </>
  );
}
