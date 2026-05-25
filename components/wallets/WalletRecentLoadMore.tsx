'use client';

/* Recent-pulls list with a "Show more" button beneath it on the wallet
 * detail page. Server SSR's the first 12 rows (newest first); this
 * component appends 10 more per click via /api/wallets/[addr]/pulls
 * until the wallet's history is exhausted. */

import { useState } from 'react';
import HitRowItem from '../pulse/HitRowItem';
import { Mono } from '../primitives';
import type { HitRow } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function WalletRecentLoadMore({
  wallet,
  initialRows,
  totalPulls,
}: {
  wallet: string;
  initialRows: HitRow[];
  totalPulls: number;
}) {
  const [rows, setRows] = useState<HitRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, totalPulls - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallets/${wallet}/pulls?offset=${rows.length}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: HitRow[] };
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
          rows.map((h, i) => <HitRowItem key={h.request_id} hit={h} first={i === 0} />)
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
            {loading
              ? 'LOADING…'
              : `SHOW ${nextBatch} MORE · ${remaining.toLocaleString('en-US')} LEFT`}
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
