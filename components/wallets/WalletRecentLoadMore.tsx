'use client';

/* Unified activity feed for /wallets/[addr] — pulls + marketplace trades
 * (buy / sell) interleaved, ordered DESC by timestamp. First 12 SSR'd,
 * "Show more" appends 10 at a time via /api/wallets/[addr]/activity until
 * the combined pool is empty. */

import { useState } from 'react';
import WalletActivityRow from './WalletActivityRow';
import PremiumModeToggle from '../PremiumModeToggle';
import LoadMoreButton from '../LoadMoreButton';
import { usePagedList } from '../usePagedList';
import { Mono } from '../primitives';
import type { PremiumMode } from '@/lib/buyback';
import type { WalletActivity } from '@/lib/queries';

const PAGE_SIZE = 10;

export default function WalletRecentLoadMore({
  wallet,
  initialRows,
  totalEvents,
}: {
  wallet: string;
  initialRows: WalletActivity[];
  totalEvents: number;
}) {
  const { rows, remaining, nextBatch, loading, error, loadMore } = usePagedList<WalletActivity>({
    url: `/api/wallets/${wallet}/activity`,
    mode: 'offset',
    pageSize: PAGE_SIZE,
    initialRows,
    total: totalEvents,
    keyOf: r => `${r.kind}:${r.event_id}`,
  });
  const [premiumMode, setPremiumMode] = useState<PremiumMode>('buyback');
  const hasSales = rows.some(r => r.kind === 'sale_buy' || r.kind === 'sale_sell');

  return (
    <>
      {hasSales && (
        <PremiumModeToggle mode={premiumMode} onChange={setPremiumMode} />
      )}
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {rows.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO ACTIVITY</Mono>
          </div>
        ) : (
          rows.map((ev, i) => (
            <WalletActivityRow
              key={`${ev.kind}:${ev.event_id}`}
              ev={ev}
              first={i === 0}
              premiumMode={premiumMode}
            />
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
