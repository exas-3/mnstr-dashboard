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
import LiveTickerStrip from '@/components/pulse/LiveTickerStrip';
import OutlierRow from '@/components/tiers/OutlierRow';
import BigHitBanner from '@/components/BigHitBanner';
import AsciiPulse from '@/components/arcade/AsciiPulse';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const WINDOWS: Array<{ key: TimeWindowKey; label: string }> = [
  { key: '24h', label: '24H' },
  { key: '7d',  label: '7D'  },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

const VELOCITY_DAYS: Record<TimeWindowKey, number> = {
  '1h':  7,    // not used on Pulse but satisfies the type
  '24h': 14,   // show 2 weeks backdrop with the 24h headline
  '7d':  30,
  '30d': 30,
  all:   90,
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

  const [theme, kpis, velocity, tiers, topHits, topHitsDeduped, live, latestBlock] = await Promise.all([
    getTheme(),
    getKpisFor(window),
    getVelocityByTier(VELOCITY_DAYS[window]),
    getTierStats(),
    // Single-pull list — used by the BigHitBanner because it needs a specific
    // pulled_at timestamp ("14s ago") and a single puller.
    getTopHits('7d', 5),
    // Deduped by card — used by the Big Hits section so a card pulled twice
    // doesn't take two rows; pullers are comma-separated.
    getTopHitsDeduped('7d', 5),
    getLiveFeed(8),
    getLatestIndexedBlock(),
  ]);

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
          velocityDays: VELOCITY_DAYS[window],
          tiers,
          topHits,
          live,
          bigHit,
          latestBlock,
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
            imageUrl: bigHit.card_image_front,
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

      {/* 6 KPI tiles */}
      <div className="grid grid-cols-2 gap-2 px-3 pt-3 sm:grid-cols-3">
        <KpiTile label={`Packs · ${winLabel}`} value={kpis.packs.toLocaleString('en-US')} />
        <KpiTile label={`USDm · ${winLabel}`} value={cycled.value} unit={cycled.unit} />
        <KpiTile label={`Payouts · ${winLabel}`} value={payouts.value} unit={payouts.unit} />
        <KpiTile label={`Wallets · ${winLabel}`} value={kpis.walletsActive.toLocaleString('en-US')} />
        <KpiTile label="Packs · all-time" value={kpis.packsAllTime.toLocaleString('en-US')} delta="cumulative" />
        <KpiTile label="USDm · all-time" value={allCycled.value} unit={allCycled.unit} delta="cumulative" />
      </div>

      {/* Velocity */}
      <SectionHead tag="01 · VELOCITY" title="Packs/day, stacked" right={`${VELOCITY_DAYS[window]}D BACKDROP`} />
      <VelocityChart data={velocity} days={VELOCITY_DAYS[window]} />

      {/* Tier strip */}
      <SectionHead tag="02 · TIERS" title="Edge by tier" right="ALL-TIME" />
      <TierStrip stats={tiers} />

      {/* Live ticker */}
      <SectionHead
        tag="03 · LIVE"
        title="Recent pulls"
        right={
          <Link href="/live" style={{ color: 'var(--accent)' }}>
            OPEN STREAM →
          </Link>
        }
      />
      <LiveTickerStrip items={live} />

      {/* Top hits */}
      <SectionHead tag="04 · BIG HITS" title="Top hits · 7d" right="MNSTR FMV" />
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {topHitsDeduped.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS IN WINDOW</Mono>
          </div>
        ) : (
          topHitsDeduped.map((o, i) => <OutlierRow key={o.card_slug ?? i} outlier={o} first={i === 0} />)
        )}
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
