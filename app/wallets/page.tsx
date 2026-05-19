import { getLeaderboard, getLeaderboardKpis, type WalletSort } from '@/lib/queries';
import { KpiTile, Mono } from '@/components/primitives';
import SortBar from '@/components/wallets/SortBar';
import WalletSearchBar from '@/components/wallets/WalletSearchBar';
import LeaderboardSection from '@/components/wallets/LeaderboardSection';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const PAGE_SIZE = 25;

function isSort(v: unknown): v is WalletSort {
  return v === 'pnl' || v === 'spend' || v === 'pulls';
}

interface Search {
  sort?: string;
  q?: string;
}

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const sort: WalletSort = isSort(params.sort) ? params.sort : 'pnl';
  const q = params.q?.trim() ?? '';

  // SSR the first page only. LeaderboardSection (client) owns the rest:
  // ladder + table render from the same row state, both grow when the user
  // clicks Load More. Cap is 500 rows total.
  const [board, kpis] = await Promise.all([
    getLeaderboard(sort, 0, PAGE_SIZE, q || undefined),
    getLeaderboardKpis(),
  ]);

  const sortLabel = sort === 'pnl' ? 'net p&l' : sort === 'spend' ? 'spend' : 'pulls';

  return (
    <div className="pb-6">
      <SortBar value={sort} q={q || undefined} />
      <WalletSearchBar count={board.total} />

      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <KpiTile label="Wallets" value={kpis.walletsTotal.toLocaleString('en-US')} />
        <KpiTile label="Top 1% spend" value={`${(kpis.top1PctShare * 100).toFixed(0)}%`} />
        <KpiTile label="Winners" value={`${(kpis.winnersPct * 100).toFixed(0)}%`} />
      </div>

      {/* key={sort+q} forces a fresh client instance per sort/search, so the
       * "expanded to 100 rows" state on one tab doesn't leak into another. */}
      <LeaderboardSection
        key={`${sort}|${q}`}
        sort={sort}
        q={q || undefined}
        initialRows={board.rows}
        initialTotal={board.total}
        sortLabel={sortLabel}
      />

      <div className="mt-4 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Net P&L = sold-back payouts − pack spend. Holding pulls aren&apos;t counted (use paper mode on Tiers for that).
          <br />
          † Handle ↔ wallet from MnStr profile; public, voluntary.
          <br />
          † Ladder y-axis is logarithmic — keeps the long tail readable.
        </Mono>
      </div>
    </div>
  );
}
