'use client';

/* Client-side progressive Load More for the /cards wall.
 *
 * Pattern mirrors components/wallets/WalletsLoadMore.tsx: server SSRs the
 * first page, this component appends additional pages by fetching /api/cards.
 */

import { useState } from 'react';
import CardWallTile from './CardWallTile';
import { Mono } from '../primitives';
import type { CardListItem, CardView } from '@/lib/queries';

const PAGE_SIZE = 24;

type Tier = 'all' | 'Starter' | 'Premium' | 'Ultra' | 'Adventure';

export default function CardsLoadMore({
  view,
  tier,
  q,
  initialRemaining,
  initialPage,
}: {
  view: CardView;
  tier: Tier;
  q?: string;
  initialRemaining: number;
  initialPage: number;
}) {
  const [rows, setRows] = useState<CardListItem[]>([]);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      if (view !== 'top') params.set('view', view);
      if (tier !== 'all') params.set('tier', tier);
      if (q) params.set('q', q);
      const res = await fetch(`/api/cards?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: CardListItem[]; total: number };
      // Defensive dedupe — see WalletsLoadMore for rationale.
      setRows(prev => {
        const seen = new Set(prev.map(r => r.slug));
        const fresh = data.rows.filter(r => !seen.has(r.slug));
        return [...prev, ...fresh];
      });
      setPage(p => p + 1);
      const shown = (initialPage + 1) * PAGE_SIZE + rows.length + data.rows.length;
      setRemaining(Math.max(0, data.total - shown));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  if (initialRemaining === 0 && rows.length === 0) return null;

  return (
    <>
      {rows.length > 0 && (
        <div className="mx-3 mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {rows.map(c => (
            <CardWallTile key={c.slug} card={c} />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="px-4 pt-5 pb-2 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-block"
            style={{
              padding: '10px 18px',
              color: loading ? 'var(--fg-4)' : 'var(--accent)',
              border: `1px solid ${loading ? 'var(--line)' : 'color-mix(in oklch, var(--accent) 33%, transparent)'}`,
              background: loading ? 'transparent' : 'color-mix(in oklch, var(--accent) 5%, transparent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.14em',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'LOADING…' : `LOAD MORE · ${remaining.toLocaleString('en-US')} LEFT`}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 pt-2 pb-2 text-center">
          <Mono style={{ fontSize: 9.5, color: 'var(--negative)' }}>{error}</Mono>
        </div>
      )}
    </>
  );
}
