'use client';

/* Marketplace sales list with a "Show more" button. First 20 SSR'd; each
 * click appends 20 more via /api/marketplace/sales until the dataset is
 * exhausted. Matches the load-more pattern used on Wallet detail / Tiers
 * outliers / Card history pages. */

import { useState } from 'react';
import MarketplaceSaleRow from './MarketplaceSaleRow';
import { Mono } from '../primitives';
import type { MarketplaceSale } from '@/lib/queries';

const PAGE_SIZE = 20;

export default function MarketplaceLoadMore({
  initialRows,
  totalSales,
}: {
  initialRows: MarketplaceSale[];
  totalSales: number;
}) {
  const [rows, setRows] = useState<MarketplaceSale[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, totalSales - rows.length);
  const nextBatch = Math.min(remaining, PAGE_SIZE);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/sales?offset=${rows.length}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: MarketplaceSale[] };
      setRows(prev => {
        const seen = new Set(prev.map(r => `${r.tx_hash}:${r.log_index}`));
        const fresh = data.rows.filter(r => !seen.has(`${r.tx_hash}:${r.log_index}`));
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
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO SALES YET</Mono>
          </div>
        ) : (
          rows.map((sale, i) => (
            <MarketplaceSaleRow key={`${sale.tx_hash}:${sale.log_index}`} sale={sale} first={i === 0} />
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
