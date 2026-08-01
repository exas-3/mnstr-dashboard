'use client';

/* Marketplace sales list with a "Show more" button. First 20 SSR'd; each
 * click appends 20 more via /api/marketplace/sales until the dataset is
 * exhausted. Matches the load-more pattern used on Wallet detail / Tiers
 * outliers / Card history pages. */

import { useEffect } from 'react';
import MarketplaceSaleRow from './MarketplaceSaleRow';
import LoadMoreButton from '../LoadMoreButton';
import { usePagedList } from '../usePagedList';
import { Mono } from '../primitives';
import type { MarketplaceSale } from '@/lib/queries';

const PAGE_SIZE = 20;
// SSE backstop — refetch the head every 5 min in case the stream goes dark.
const POLL_MS = 5 * 60 * 1000;
// Floor between SSE-triggered head refreshes — indexer bursts collapse into
// one fetch per window (trailing, so the last event still lands).
const MIN_FETCH_GAP_MS = 3_000;

const keyOf = (r: MarketplaceSale) => `${r.tx_hash}:${r.log_index}`;

export default function MarketplaceLoadMore({
  initialRows,
  totalSales,
  tier,
}: {
  initialRows: MarketplaceSale[];
  totalSales: number;
  /** Active tier filter — forwarded to /api/marketplace/sales. Call sites
   * remount with key={tier} so `rows` resets when the filter changes. */
  tier?: string;
}) {
  const { rows, setRows, remaining, nextBatch, loading, error, loadMore } =
    usePagedList<MarketplaceSale>({
      url: '/api/marketplace/sales',
      params: { tier },
      mode: 'offset',
      pageSize: PAGE_SIZE,
      initialRows,
      total: totalSales,
      keyOf,
    });

  const tierQs = tier ? `&tier=${encodeURIComponent(tier)}` : '';

  // Fresh page-1 fetch — used by SSE pushes + the 5-min HTTP backstop to
  // prepend new sales onto the existing list without disturbing pagination.
  // Merges by (tx_hash, log_index) so dupes from overlapping fetches collapse.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let lastFetch = 0;
    let throttleTimer: number | null = null;
    async function refreshHead() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/marketplace/sales?offset=0${tierQs}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { rows: MarketplaceSale[] };
        if (cancelled) return;
        setRows(prev => {
          const seen = new Set(prev.map(keyOf));
          const fresh = data.rows.filter(r => !seen.has(keyOf(r)));
          return fresh.length === 0 ? prev : [...fresh, ...prev];
        });
      } catch {
      } finally {
        inFlight = false;
      }
    }
    // Trailing throttle for SSE pushes — see LivePulse for the same pattern.
    function scheduleRefresh() {
      if (throttleTimer !== null) return;
      const wait = Math.max(0, lastFetch + MIN_FETCH_GAP_MS - Date.now());
      throttleTimer = window.setTimeout(() => {
        throttleTimer = null;
        lastFetch = Date.now();
        void refreshHead();
      }, wait);
    }
    const id = window.setInterval(refreshHead, POLL_MS);
    const es = new EventSource('/api/live/stream');
    const onMarket = () => scheduleRefresh();
    es.addEventListener('market', onMarket);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (throttleTimer !== null) window.clearTimeout(throttleTimer);
      es.removeEventListener('market', onMarket);
      es.close();
    };
  }, [tierQs, setRows]);

  return (
    <>
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {rows.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO SALES YET</Mono>
          </div>
        ) : (
          rows.map((sale, i) => (
            <MarketplaceSaleRow key={keyOf(sale)} sale={sale} first={i === 0} />
          ))
        )}
      </div>

      <LoadMoreButton
        show={nextBatch > 0}
        label={`SHOW ${nextBatch} MORE · ${remaining.toLocaleString('en-US')} LEFT`}
        loading={loading}
        error={error}
        onClick={loadMore}
      />
    </>
  );
}
