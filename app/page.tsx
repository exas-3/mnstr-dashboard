import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getKpisFor,
  getVelocityByTier,
  getTierStats,
  getTopHits,
  getTopHitsDeduped,
  getLiveFeed,
  getLatestIndexedBlock,
  type TimeWindowKey,
} from '@/lib/queries';
import { getTheme } from '@/lib/server-theme';
import { KpiTile, Mono, SectionHead } from '@/components/primitives';
import VelocityChart from '@/components/VelocityChart';
import TierStrip from '@/components/pulse/TierStrip';
import LivePulse from '@/components/live/LivePulse';
import OutlierRow from '@/components/tiers/OutlierRow';
import BigHitBanner from '@/components/BigHitBanner';
import AsciiPulse from '@/components/arcade/AsciiPulse';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pulse — live MnStr gacha analytics on MegaETH',
  description:
    'Live snapshot of MnStr pack pulls, big hits, and house economics on the MegaETH chain. Updated every 5 seconds.',
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

function usd(n: number, frac = 0): string {
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

function abbrUsd(n: number): { value: string; unit?: string } {
  if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(2)}`, unit: 'M' };
  if (n >= 1_000)     return { value: `$${(n / 1_000).toFixed(1)}`,    unit: 'k' };
  return { value: usd(n) };
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(d / 1000));
  if (s < 60) return `${s}S AGO`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}M AGO`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}H AGO`;
  return `${Math.round(h / 24)}D AGO`;
}

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

interface Search { w?: string }

export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const window: TimeWindowKey =
    params.w === '7d' ? '7d'
    : params.w === '30d' ? '30d'
    : params.w === 'all' ? 'all'
    : '24h';

  const [theme, kpis, velocity, tiers, topHits, topHitsDeduped, live, liveKpis, latestBlock] = await Promise.all([
    getTheme(),
    getKpisFor(window),
    getVelocityByTier(VELOCITY_SPAN[window].span, VELOCITY_SPAN[window].granularity),
    getTierStats(window),
    // Single-pull list — used by the BigHitBanner because it needs a specific
    // pulled_at timestamp ("14s ago") and a single puller.
    getTopHits(window, 5),
    // Deduped by card — used by the Big Hits section so a card pulled twice
    // doesn't take two rows; pullers are comma-separated.
    getTopHitsDeduped(window, 5),
    // 30-item feed + 24h KPIs for the embedded <LivePulse> below. The embed
    // is locked to 24h regardless of Pulse's window toggle (it's the "Live
    // now" snapshot, not the chosen-window-aggregate).
    getLiveFeed(30),
    getKpisFor('24h'),
    getLatestIndexedBlock(),
  ]);

  const liveInitial = {
    kpis: liveKpis,
    feed: live,
    latestBlock,
    serverNow: new Date().toISOString(),
  };

  const cycled = abbrUsd(kpis.usdmCycledUsd);
  const payouts = abbrUsd(kpis.payoutUsd);
  const allCycled = abbrUsd(kpis.usdmCycledAllTimeUsd);

  // Big hit banner: latest top hit if ≥ $1k FMV and resolved (sold_back) or fresh
  const bigHit = topHits.find(h => Number(h.fmv_usd ?? 0) >= 1000) ?? null;
  const winLabel = WINDOWS.find(w => w.key === window)?.label ?? '24H';

  if (theme === 'arcade') {
    return (
      <AsciiPulse
        data={{
          window,
          kpis,
          velocity,
          velocityDays: VELOCITY_SPAN[window].span,
          velocityGranularity: VELOCITY_SPAN[window].granularity,
          tiers,
          topHits,
          live,
          bigHit,
          latestBlock,
          liveInitial,
        }}
      />
    );
  }

  return (
    <div className="pb-6">
      {bigHit && (
        <BigHitBanner
          pull={{
            ago: ago(bigHit.pulled_at),
            title: bigHit.card_title ?? `Pull #${bigHit.request_id.slice(0, 6)}`,
            who: bigHit.username ? `@${bigHit.username}` : shortAddr(bigHit.wallet),
            tier: bigHit.tier.toUpperCase(),
            fmv: Math.round(Number(bigHit.fmv_usd ?? 0)).toLocaleString('en-US'),
            imageUrl: bigHit.card_slug ? `/img/${bigHit.card_slug}` : bigHit.card_image_front,
            href: bigHit.card_slug ? `/cards/${bigHit.card_slug}` : undefined,
          }}
        />
      )}

      {/* Today header + TimePivot */}
      <div className="flex items-end gap-2.5 px-3 pt-3.5">
        <div className="flex-1">
          <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.18em' }}>
            NOW
          </Mono>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 22,
              color: 'var(--fg)',
              marginTop: 4,
              letterSpacing: '-0.015em',
            }}
          >
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block' }}>
            UTC {new Date().toISOString().slice(11, 16)}
            {latestBlock && ` · block ${latestBlock.block.toLocaleString('en-US')}`}
          </Mono>
        </div>
        <div className="inline-flex" style={{ border: '1px solid var(--line-soft)', background: 'var(--bg-2)' }}>
          {WINDOWS.map((w, i) => {
            const on = w.key === window;
            const href = w.key === '24h' ? '/' : `/?w=${w.key}`;
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
          <KpiTile label="Packs · all-time" value={kpis.packsAllTime.toLocaleString('en-US')} delta="cumulative" />
          <KpiTile label="USDm · all-time" value={allCycled.value} unit={allCycled.unit} delta="cumulative" />
        </div>

        {/* Velocity */}
        {(() => {
          const { span, granularity } = VELOCITY_SPAN[window];
          const unit = granularity === 'hour' ? 'H' : 'D';
          const titleNoun = granularity === 'hour' ? 'Packs/hour' : 'Packs/day';
          return (
            <>
              <SectionHead tag="VELOCITY" title={`${titleNoun}, stacked`} right={`${span}${unit} BACKDROP`} />
              <VelocityChart data={velocity} span={span} granularity={granularity} />
            </>
          );
        })()}

        {/* Tier strip */}
        <SectionHead tag="TIERS" title="Edge by tier" right={winLabel} />
        <TierStrip stats={tiers} />

        {/* Big Hits — moved above Live so the day's highlight reel reads first */}
        <SectionHead tag="BIG HITS" title={`Top hits · ${winLabel}`} right="MNSTR FMV" />
        <div
          className="mx-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
        >
          {topHitsDeduped.length === 0 ? (
            <div className="px-3 py-5 text-center">
              <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS IN WINDOW</Mono>
            </div>
          ) : (
            topHitsDeduped.map((o, i) => <OutlierRow key={o.card_slug ?? i} outlier={o} first={i === 0} />)
          )}
        </div>

        {/* Embedded live stream — full /live experience inline. Locked to
         * 24h regardless of Pulse window. The component polls /api/live
         * every 5s on its own. */}
        <SectionHead
          tag="LIVE"
          title="Live stream"
          right={
            <Link href="/live" style={{ color: 'var(--accent)' }}>
              OPEN FULLSCREEN →
            </Link>
          }
        />
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
        </Mono>
      </div>
    </div>
  );
}
