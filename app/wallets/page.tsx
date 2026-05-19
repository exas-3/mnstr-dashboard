import {
  getLeaderboard,
  getLeaderboardKpis,
  getLadder,
  type WalletSort,
} from '@/lib/queries';
import { KpiTile, Mono, SectionHead } from '@/components/primitives';
import SortBar from '@/components/wallets/SortBar';
import WalletSearchBar from '@/components/wallets/WalletSearchBar';
import PnlLadder from '@/components/wallets/PnlLadder';
import LeaderboardRow from '@/components/wallets/LeaderboardRow';
import WalletsLoadMore from '@/components/wallets/WalletsLoadMore';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const PAGE_SIZE = 25;

function isSort(v: unknown): v is WalletSort {
  return v === 'pnl' || v === 'spend' || v === 'pulls';
}

interface Search {
  sort?: string;
  q?: string;
  page?: string;
}

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const sort: WalletSort = isSort(params.sort) ? params.sort : 'pnl';
  const q = params.q?.trim() ?? '';

  // SSR the first page only. Additional pages are loaded client-side via
  // /api/wallets and the WalletsLoadMore component, so the user stays put.
  const [board, kpis, ladder] = await Promise.all([
    getLeaderboard(sort, 0, PAGE_SIZE, q || undefined),
    getLeaderboardKpis(),
    getLadder(sort, 25),
  ]);

  const sortLabel = sort === 'pnl' ? 'net p&l' : sort === 'spend' ? 'spend' : 'pulls';
  const remaining = Math.max(0, board.total - board.rows.length);

  return (
    <div className="pb-6">
      <SortBar value={sort} q={q || undefined} />
      <WalletSearchBar count={board.total} />

      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <KpiTile label="Wallets" value={kpis.walletsTotal.toLocaleString('en-US')} />
        <KpiTile label="Top 1% spend" value={`${(kpis.top1PctShare * 100).toFixed(0)}%`} />
        <KpiTile label="Winners" value={`${(kpis.winnersPct * 100).toFixed(0)}%`} />
      </div>

      <SectionHead
        tag="01 · LADDER"
        title={sort === 'pnl' ? 'Winners vs losers' : sort === 'spend' ? 'Top spenders' : 'Most pulls'}
        right={sort === 'pnl' ? `${ladder.length.toLocaleString('en-US')} WALLETS` : 'TOP 25'}
      />
      <PnlLadder rows={ladder} sort={sort} />

      <SectionHead
        tag="02 · TABLE"
        title={`Sorted by ${sortLabel}`}
        right={`${board.total.toLocaleString('en-US')} WALLETS`}
      />
      {board.rows.length === 0 ? (
        <EmptyState title="NO WALLETS" sub="No handle or address matched." />
      ) : (
        <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
          {board.rows.map((r, i) => (
            <LeaderboardRow key={r.wallet} row={r} first={i === 0} sort={sort} />
          ))}
        </div>
      )}

      {!q && board.rows.length > 0 && (
        <WalletsLoadMore
          sort={sort}
          q={q || undefined}
          initialRemaining={remaining}
          initialPage={0}
        />
      )}

      <div className="mt-4 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Net P&L = sold-back payouts − pack spend. Holding pulls aren&apos;t counted (use paper mode on Tiers for that).
          <br />
          † Handle ↔ wallet from MnStr profile; public, voluntary.
        </Mono>
      </div>
    </div>
  );
}
