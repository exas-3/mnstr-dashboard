'use client';

/* Outliers list with a "Show more" button beneath it. Server SSRs the
 * first 5 rows (biggest pulls by FMV); each click appends up to 10 more
 * via /api/tiers/[tier]/outliers until the tier's distinct-card history
 * is exhausted. */

import OutlierRow from './OutlierRow';
import EmptyState from '../EmptyState';
import LoadMoreButton from '../LoadMoreButton';
import { usePagedList } from '../usePagedList';
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
  const { rows, remaining, nextBatch, loading, error, loadMore } = usePagedList<TierOutlier>({
    url: `/api/tiers/${encodeURIComponent(tier)}/outliers`,
    mode: 'offset',
    pageSize: PAGE_SIZE,
    initialRows,
    total: totalOutliers,
    keyOf: o => o.card_slug,
  });

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
