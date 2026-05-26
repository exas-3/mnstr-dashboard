'use client';

/* Unified activity feed for /cards/[slug] — pulls + marketplace sales,
 * ordered DESC by timestamp. First 20 SSR'd, "Show more" appends 10 at
 * a time via /api/cards/[slug]/activity until the combined pool is empty. */

import { useState } from 'react';
import CardActivityRow from './CardActivityRow';
import { Mono } from '../primitives';
import type { CardActivity } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function CardHistoryLoadMore({
  slug,
  initialRows,
  totalEvents,
}: {
  slug: string;
  initialRows: CardActivity[];
  totalEvents: number;
}) {
  const [rows, setRows] = useState<CardActivity[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, totalEvents - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${slug}/activity?offset=${rows.length}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: CardActivity[] };
      setRows(prev => {
        const seen = new Set(prev.map(r => `${r.kind}:${r.event_id}`));
        const fresh = data.rows.filter(r => !seen.has(`${r.kind}:${r.event_id}`));
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
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO ACTIVITY</Mono>
          </div>
        ) : (
          rows.map((ev, i) => (
            <CardActivityRow key={`${ev.kind}:${ev.event_id}`} ev={ev} first={i === 0} />
          ))
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
