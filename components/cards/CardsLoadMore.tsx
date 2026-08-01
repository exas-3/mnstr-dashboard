'use client';

/* Client-side progressive Load More for the /cards wall.
 *
 * Server SSRs the first page; this component appends additional pages by
 * fetching /api/cards (see usePagedList for the shared mechanics).
 */

import CardWallTile from './CardWallTile';
import LoadMoreButton from '../LoadMoreButton';
import { usePagedList } from '../usePagedList';
import type { CardListItem, CardView } from '@/lib/queries';

const PAGE_SIZE = 24;

type Tier = 'all' | 'Starter' | 'Premium' | 'Ultra' | 'Adventure' | 'Great' | 'Outlaw';

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
  const { rows, remaining, loading, error, loadMore } = usePagedList<CardListItem>({
    url: '/api/cards',
    params: {
      view: view !== 'top' ? view : undefined,
      tier: tier !== 'all' ? tier : undefined,
      q: q || undefined,
    },
    mode: 'page',
    pageSize: PAGE_SIZE,
    initialRemaining,
    initialPage,
    keyOf: c => c.slug,
  });

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

      <LoadMoreButton
        show={remaining > 0}
        size="lg"
        label={`LOAD MORE · ${remaining.toLocaleString('en-US')} LEFT`}
        loading={loading}
        error={error}
        onClick={loadMore}
      />
    </>
  );
}
