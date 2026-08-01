'use client';

/* Big Hits list with a "Show more" button. First page SSR'd from the
 * Pulse server component, each click appends 10 more via /api/pulse/big-hits
 * (window-scoped). Pool is filtered to FMV ≥ 2× pack price. */

import OutlierRow from '../tiers/OutlierRow';
import LoadMoreButton from '../LoadMoreButton';
import { usePagedList } from '../usePagedList';
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
  const { rows, nextBatch, loading, error, loadMore } = usePagedList<TierOutlier>({
    url: '/api/pulse/big-hits',
    params: { w: window },
    mode: 'offset',
    pageSize: PAGE_SIZE,
    initialRows,
    total,
    keyOf: r => r.card_slug ?? `${r.card_title}|${r.fmv_usd}`,
  });

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

      <LoadMoreButton
        show={nextBatch > 0}
        label="SHOW MORE"
        loading={loading}
        error={error}
        onClick={loadMore}
      />
    </>
  );
}
