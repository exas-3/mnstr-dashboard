import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getKpisFor,
  getVelocityByTier,
  getHouseFlowSeries,
  getTierStats,
  getTopHits,
  getTopHitsDeduped,
  getTopHitsDedupedCount,
  getLiveFeed,
  getLatestIndexedBlock,
  type TimeWindowKey,
} from '@/lib/queries';
import { getState } from '@/db/client';
import { KpiTile, Mono, SectionHead } from '@/components/primitives';
import VelocityChart from '@/components/VelocityChart';
import HouseFlowChart from '@/components/pulse/HouseFlowChart';
import TierStrip from '@/components/pulse/TierStrip';
import LivePulse from '@/components/live/LivePulse';
import BigHitsLoadMore from '@/components/pulse/BigHitsLoadMore';
import BigHitBanner from '@/components/BigHitBanner';
import { cardImageUrl } from '@/lib/img';
import { abbrUsd, agoShort, shortAddr } from '@/lib/format';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pulse — live MnStr Pokémon TCG & One Piece gacha analytics',
  description:
    'Live snapshot of MnStr pack pulls, big hits, and house economics for graded Pokémon TCG and One Piece collectible cards. Real-time push from chain.',
  alternates: { canonical: '/' },
};

const WINDOWS: Array<{ key: TimeWindowKey; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d',  label: '7D'  },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

/* Velocity chart granularity + span per window:
 *   24h  → 24 hourly buckets (last 24 hours)
 *   7d   → 7 daily buckets
 *   30d  → 30 daily buckets
 *   all  → 90 daily buckets (capped — full all-time gets too wide) */
const VELOCITY_SPAN: Record<TimeWindowKey, { span: number; granularity: 'day' | 'hour' }> = {
  '1h':  { span: 7,  granularity: 'day'  },    // not used on Pulse but satisfies the type
  '24h': { span: 24, granularity: 'hour' },
  '7d':  { span: 7,  granularity: 'day'  },
  '30d': { span: 30, granularity: 'day'  },
  all:   { span: 90, granularity: 'day'  },
};

interface Search { w?: string }

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const window: TimeWindowKey =
    params.w === '24h' ? '24h'
    : params.w === '7d' ? '7d'
    : params.w === '30d' ? '30d'
    : 'all';

  const [kpis, velocity, houseFlow, tiers, topHits, topHitsDeduped, topHitsDedupedTotal, live, liveKpis, latestBlock, lastPollOk] = await Promise.all([
    getKpisFor(window),
    getVelocityByTier(VELOCITY_SPAN[window].span, VELOCITY_SPAN[window].granularity),
    // House-flow chart shares Velocity's bucket grid (same span/granularity).
    getHouseFlowSeries(VELOCITY_SPAN[window].span, VELOCITY_SPAN[window].granularity),
    getTierStats(window),
    // Single-pull list — used by the BigHitBanner because it needs a specific
    // pulled_at timestamp ("14s ago") and a single puller.
    getTopHits(window, 5),
    // Deduped by card — first 10 SSR'd for Big Hits, paginated via the
    // BigHitsLoadMore client component. 2× FMV/price filter baked into
    // getTopHitsDeduped.
    getTopHitsDeduped(window, 10),
    getTopHitsDedupedCount(window),
    // 30-item feed + 24h KPIs for the embedded <LivePulse> below. The embed
    // is locked to 24h regardless of Pulse's window toggle (it's the "Live
    // now" snapshot, not the chosen-window-aggregate).
    getLiveFeed(30),
    getKpisFor('24h'),
    getLatestIndexedBlock(),
    getState('last_poll_ok').catch(() => null),
  ]);

  const liveInitial = {
    kpis: liveKpis,
    feed: live,
    latestBlock,
    serverNow: new Date().toISOString(),
    lastPollOk,
  };

  const cycled = abbrUsd(kpis.usdmCycledUsd);
  const payouts = abbrUsd(kpis.payoutUsd);

  // $1k+ pull banner = the biggest pull-time FMV in the window (topHits is
  // already ordered by fmv_at_pull_usd DESC), shown only if it cleared $1k at
  // pull time AND happened within the last 48h — on wide windows (30D/ALL)
  // the top hit can be months old, and a stale pull flashing as breaking
  // news on the landing page is dishonest.
  const bigHitCandidate = topHits.find(h => Number(h.fmv_at_pull_usd ?? 0) >= 1000) ?? null;
  const bigHit =
    bigHitCandidate &&
    Date.now() - new Date(bigHitCandidate.pulled_at).getTime() <= 48 * 3600 * 1000
      ? bigHitCandidate
      : null;
  const winLabel = WINDOWS.find(w => w.key === window)?.label ?? '24H';

  return (
    <div className="pb-6">
      {bigHit && (
        <BigHitBanner
          pull={{
            ago: `${agoShort(bigHit.pulled_at).toUpperCase()} AGO`,
            title: bigHit.card_title ?? `Pull #${bigHit.request_id.slice(0, 6)}`,
            who: bigHit.username ? `@${bigHit.username}` : shortAddr(bigHit.wallet),
            tier: bigHit.tier.toUpperCase(),
            // FMV frozen at pull time (falls back to current if not yet snapshotted).
            fmv: Math.round(Number(bigHit.fmv_at_pull_usd ?? bigHit.fmv_usd ?? 0)).toLocaleString('en-US'),
            imageUrl: cardImageUrl(bigHit.card_slug, bigHit.card_image_front, 480),
            href: bigHit.card_slug ? `/cards/${bigHit.card_slug}` : undefined,
          }}
        />
      )}

      {/* Time-window toggle. The "NOW · weekday/date · UTC block" header that
       * used to sit to the left was removed; only the window pivot remains. */}
      <div className="flex justify-end px-3 pt-3.5">
        <div className="inline-flex" style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}>
          {WINDOWS.map((w, i) => {
            const on = w.key === window;
            // ALL is the bare `/` (default); other windows append ?w=.
            const href = w.key === 'all' ? '/' : `/?w=${w.key}`;
            return (
              <Link
                key={w.key}
                href={href}
                style={{
                  padding: '5px 10px',
                  background: on ? 'var(--bg-3)' : 'transparent',
                  borderRight: i === WINDOWS.length - 1 ? 'none' : '1px solid var(--line-soft)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.1em',
                  color: on ? 'var(--accent)' : 'var(--fg-3)',
                }}
              >
                {w.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Single linear column on all screen sizes. Big Hits sits between
       * Tiers and Live so the "what just happened" digest comes before the
       * live-firehose. */}
      <div>
        {/* 6 KPI tiles */}
        <div className="grid grid-cols-2 gap-2 px-3 pt-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label={`Packs · ${winLabel}`} value={kpis.packs.toLocaleString('en-US')} />
          <KpiTile label={`USDm · ${winLabel}`} value={cycled.value} unit={cycled.unit} />
          <KpiTile label={`Payouts · ${winLabel}`} value={payouts.value} unit={payouts.unit} />
          <KpiTile label={`Wallets · ${winLabel}`} value={kpis.walletsActive.toLocaleString('en-US')} />
          <KpiTile label={`Big hits · ${winLabel}`} value={kpis.bigHits.toLocaleString('en-US')} delta="fmv ≥ $1k" />
          {(() => {
            const h = abbrUsd(kpis.heldFmvUsd);
            return (
              <KpiTile
                label={`Held FMV · ${winLabel}`}
                value={h.value}
                unit={h.unit}
                delta="outstanding"
              />
            );
          })()}
        </div>

        {/* Velocity */}
        {(() => {
          const { span, granularity } = VELOCITY_SPAN[window];
          const unit = granularity === 'hour' ? 'H' : 'D';
          const titleNoun = granularity === 'hour' ? 'Packs/hour' : 'Packs/day';
          // For the ALL window, show the actual word "ALL" instead of the
          // synthetic "90D" cap since the user selected all-time.
          const backdrop = window === 'all' ? 'ALL' : `${span}${unit}`;
          return (
            <>
              <SectionHead tag="VELOCITY" title={`${titleNoun}, stacked`} right={`${backdrop} BACKDROP`} />
              <VelocityChart data={velocity} span={span} granularity={granularity} />
            </>
          );
        })()}

        {/* House flow — operator-routed USDm cashflow from the house's side:
         * intake bars up, payout bars down, cumulative net line on top.
         * Same bucket grid as Velocity (VELOCITY_SPAN). */}
        {(() => {
          const { span, granularity } = VELOCITY_SPAN[window];
          const unit = granularity === 'hour' ? 'H' : 'D';
          const backdrop = window === 'all' ? 'ALL' : `${span}${unit}`;
          return (
            <>
              <SectionHead tag="HOUSE FLOW" title="USDm intake vs payouts" right={`${backdrop} BACKDROP`} />
              <HouseFlowChart data={houseFlow} span={span} granularity={granularity} />
            </>
          );
        })()}

        {/* Tier strip */}
        <SectionHead tag="TIERS" title="Edge by tier" right={winLabel} />
        <TierStrip stats={tiers} />

        {/* Big Hits — FMV ≥ 2× pack price, deduped by card. Show more loads 10
         * additional per click via /api/pulse/big-hits. */}
        <SectionHead
          tag="BIG HITS"
          title={`Top hits · ${winLabel}`}
          right="FMV ≥ 2× PACK PRICE"
        />
        <BigHitsLoadMore
          // `key` so the component remounts when the window toggle changes —
          // otherwise React preserves the internal `rows` state (which was
          // seeded from the OLD initialRows) and the list keeps showing the
          // previous window's pulls until Show More is clicked.
          key={window}
          window={window}
          initialRows={topHitsDeduped}
          total={topHitsDedupedTotal}
        />

        {/* Embedded live stream. Locked to 24h regardless of Pulse window.
         * The component subscribes to /api/live/stream (SSE push) and refetches
         * /api/live on each push; 5-min HTTP poll backstop in case SSE dies. */}
        <LivePulse initial={liveInitial} embed />
      </div>

      {/* Caveat footer */}
      <div
        className="mt-6 px-4 pt-4 pb-2"
        style={{ borderTop: '1px dashed var(--line-soft)' }}
      >
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † <span style={{ color: 'var(--fg-3)' }}>MnStr FMV</span> is the value the vault assigns each card.
          <br />
          † Cards are physical, not NFTs. Chain stores a payment receipt only.
          <br />
          † House flow counts operator-routed USDm only.
        </Mono>
      </div>
    </div>
  );
}
