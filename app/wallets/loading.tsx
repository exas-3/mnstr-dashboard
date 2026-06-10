import { Sk } from '@/components/Skeleton';

/* Leaderboard-shaped skeleton for /wallets — its query is the slowest in the
 * app (~1s, recomputed per request since the page is dynamic on searchParams),
 * so a close-fitting placeholder keeps the tab from feeling frozen on click.
 * Mirrors WalletsPage: sort bar, search, 3 KPIs, ladder chart, ranked rows. */
export default function WalletsLoading() {
  return (
    <div className="pb-6" aria-busy="true" aria-label="Loading wallets">
      <Sk className="mx-3 mt-3" style={{ height: 36 }} />
      <Sk className="mx-3 mt-2" style={{ height: 34 }} />
      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <Sk style={{ height: 72 }} />
        <Sk style={{ height: 72 }} />
        <Sk style={{ height: 72 }} />
      </div>
      <Sk className="mx-3 mt-3" style={{ height: 168 }} />
      <div className="mx-3 mt-3 flex flex-col gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Sk key={i} style={{ height: 46 }} />
        ))}
      </div>
    </div>
  );
}
