import { Sk } from '@/components/Skeleton';

/* Instant-navigation fallback shown in the content area while a route's server
 * component renders. The persistent shell (sidebar / header / nav) stays put —
 * only this region swaps — so tabs feel responsive even when a page is slow,
 * and refreshes paint the shell + skeleton immediately. Route-specific
 * skeletons (e.g. app/wallets/loading.tsx) override this with a closer shape. */
export default function Loading() {
  return (
    <div className="pb-6" aria-busy="true" aria-label="Loading">
      <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
        <Sk style={{ height: 72 }} />
        <Sk style={{ height: 72 }} />
        <Sk style={{ height: 72 }} />
      </div>
      <Sk className="mx-3 mt-3" style={{ height: 150 }} />
      <div className="mx-3 mt-3 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Sk key={i} style={{ height: 48 }} />
        ))}
      </div>
    </div>
  );
}
