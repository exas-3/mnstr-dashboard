'use client';

/* Pull history list with a "Show more" button on the card detail page.
 * Server SSR's the first 20 rows (newest first); this component appends
 * 10 more per click via /api/cards/[slug]/pulls until the card's total
 * pull count is exhausted. */

import { useState } from 'react';
import CardHistoryRow from './CardHistoryRow';
import { Mono } from '../primitives';
import type { CardHistoryEntry } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function CardHistoryLoadMore({
  slug,
  initialRows,
  totalPulls,
}: {
  slug: string;
  initialRows: CardHistoryEntry[];
  totalPulls: number;
}) {
  const [rows, setRows] = useState<CardHistoryEntry[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, totalPulls - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${slug}/pulls?offset=${rows.length}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: CardHistoryEntry[] };
      setRows(prev => {
        const seen = new Set(prev.map(r => r.request_id));
        const fresh = data.rows.filter(r => !seen.has(r.request_id));
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
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS</Mono>
          </div>
        ) : (
          rows.map((h, i) => <CardHistoryRow key={h.request_id} h={h} first={i === 0} />)
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
