'use client';

/* Client-side progressive Load More for the /wallets leaderboard.
 *
 * Pattern: the server renders the first page (25 rows). This component holds
 * state for additional pages fetched from /api/wallets and appends them to the
 * DOM without a route change. URL params stay stable.
 */

import { useState } from 'react';
import { Mono } from '../primitives';
import LeaderboardRow from './LeaderboardRow';
import type { WalletRow, WalletSort } from '@/lib/queries';

const PAGE_SIZE = 25;

export default function WalletsLoadMore({
  sort,
  q,
  initialRemaining,
  initialPage,
}: {
  sort: WalletSort;
  q?: string;
  /** Wallets still uncounted after the SSR'd first page. */
  initialRemaining: number;
  /** Last page index already shown (0-based). Server SSRs page 0. */
  initialPage: number;
}) {
  const [rows, setRows] = useState<WalletRow[]>([]);
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
      if (sort !== 'pnl') params.set('sort', sort);
      if (q) params.set('q', q);
      const res = await fetch(`/api/wallets?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: WalletRow[]; total: number };
      // Defensive dedupe: drop any wallet we've already appended. The SSR'd
      // first page is shown by the server above this component, so we don't
      // see those keys here — only need to dedupe within our own buffer.
      setRows(prev => {
        const seen = new Set(prev.map(r => r.wallet));
        const fresh = data.rows.filter(r => !seen.has(r.wallet));
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
        <div
          className="mx-3"
          style={{ background: 'var(--bg-2)', borderLeft: '1px solid var(--line-soft)', borderRight: '1px solid var(--line-soft)' }}
        >
          {rows.map(r => (
            <LeaderboardRow key={r.wallet} row={r} />
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
