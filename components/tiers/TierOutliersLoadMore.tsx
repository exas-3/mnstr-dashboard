'use client';

/* Outliers list with a "Show more" button beneath it. Server SSRs the
 * first 5 rows (biggest pulls by FMV); each click appends up to 10 more
 * via /api/tiers/[tier]/outliers until the tier's distinct-card history
 * is exhausted. */

import { useState } from 'react';
import OutlierRow from './OutlierRow';
import { Mono } from '../primitives';
import EmptyState from '../EmptyState';
import type { TierOutlier } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function TierOutliersLoadMore({
  tier,
  initialRows,
  totalOutliers,
}: {
  tier: string;
  initialRows: TierOutlier[];
  totalOutliers: number;
}) {
  const [rows, setRows] = useState<TierOutlier[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, totalOutliers - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tiers/${encodeURIComponent(tier)}/outliers?offset=${rows.length}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: TierOutlier[] };
      setRows(prev => {
        const seen = new Set(prev.map(r => r.card_slug));
        const fresh = data.rows.filter(r => r.card_slug && !seen.has(r.card_slug));
        return [...prev, ...fresh];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) {
    return <EmptyState title="NO PULLS" />;
  }

  return (
    <>
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {rows.map((o, i) => (
          <OutlierRow key={o.card_slug ?? i} outlier={o} first={i === 0} />
        ))}
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
            {loading ? 'LOADING…' : `SHOW ${nextBatch} MORE · ${remaining.toLocaleString('en-US')} LEFT`}
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
