'use client';

/* Lifts the ladder + leaderboard table + load-more into a single client
 * component so the chart redraws when the user clicks Load More.
 *
 * Server SSRs the first 25 rows and passes them in; the component fetches
 * additional pages from /api/wallets and keeps everything in sync.
 *
 * Hard cap: 500 wallets total (configurable). */

import { useState } from 'react';
import { Mono, SectionHead } from '../primitives';
import LeaderboardRow from './LeaderboardRow';
import PnlLadder from './PnlLadder';
import EmptyState from '../EmptyState';
import type { LadderRow, WalletRow, WalletSort } from '@/lib/queries';

const PAGE_SIZE = 25;
const MAX_ROWS = 500;

export default function LeaderboardSection({
  sort,
  q,
  initialRows,
  initialTotal,
  sortLabel,
}: {
  sort: WalletSort;
  q?: string;
  initialRows: WalletRow[];
  initialTotal: number;
  sortLabel: string;
}) {
  const [rows, setRows] = useState<WalletRow[]>(initialRows);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cap = Math.min(initialTotal, MAX_ROWS);
  const remaining = Math.max(0, cap - rows.length);

  // The ladder consumes the same rows as the table — derived from `rows`.
  const ladderRows: LadderRow[] = rows.map(r => ({
    wallet: r.wallet,
    handle: r.handle,
    value:
      sort === 'spend' ? r.spend
      : sort === 'pulls' ? r.pulls
      : r.net,
  }));

  async function loadMore() {
    if (loading || remaining === 0) return;
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
      setRows(prev => {
        const seen = new Set(prev.map(r => r.wallet));
        const fresh = data.rows.filter(r => !seen.has(r.wallet));
        // honour MAX_ROWS cap
        const merged = [...prev, ...fresh].slice(0, MAX_ROWS);
        return merged;
      });
      setPage(p => p + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="md:px-2">
      <div className="md:min-w-0">
        {/* Ladder: tracks the current table state, redraws as rows grow. */}
        <SectionHead
          tag="LADDER"
          title={
            sort === 'pnl' ? 'Net P&L distribution'
            : sort === 'spend' ? 'Top spenders'
            : 'Most pulls'
          }
          right={`${rows.length.toLocaleString('en-US')} of ${cap.toLocaleString('en-US')}`}
        />
        <PnlLadder rows={ladderRows} sort={sort} />

        {/* Table */}
        <SectionHead
          tag="TABLE"
          title={`Sorted by ${sortLabel}`}
          right={`${initialTotal.toLocaleString('en-US')} WALLETS`}
        />
        {rows.length === 0 ? (
          <EmptyState title="NO WALLETS" sub="No handle or address matched." />
        ) : (
          <div
            className="mx-3 md:mx-0"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
          >
            {rows.map((r, i) => (
              <LeaderboardRow key={r.wallet} row={r} first={i === 0} sort={sort} />
            ))}
          </div>
        )}

        {/* Load more — disabled when we've hit MAX_ROWS or search is active. */}
        {!q && remaining > 0 && (
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

        {/* Cap reached */}
        {!q && remaining === 0 && rows.length >= MAX_ROWS && (
          <div className="px-4 pt-3 pb-2 text-center">
            <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)' }}>
              showing top {MAX_ROWS.toLocaleString('en-US')} of {initialTotal.toLocaleString('en-US')}
            </Mono>
          </div>
        )}

        {error && (
          <div className="px-4 pt-2 pb-2 text-center">
            <Mono style={{ fontSize: 9.5, color: 'var(--negative)' }}>{error}</Mono>
          </div>
        )}
      </div>
    </div>
  );
}
