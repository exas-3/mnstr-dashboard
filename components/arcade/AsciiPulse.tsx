/* Arcade-themed Pulse layout. Same data as the Foil Pulse, different chrome:
 * ASCII boxes, block-char velocity, terminal-style log lines. */

import Link from 'next/link';
import { AsciiBox, AsciiCaveat, AsciiHead, AsciiKpi, AsciiTier, AsciiTimePivot, type AsciiWindow } from './primitives';
import AsciiVelocity from './AsciiVelocity';
import AsciiLive from './AsciiLive';
import type { HitRow, Kpis, TierStats, TimeWindowKey, VelocityPoint } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(d / 1000));
  if (s < 60) return `T-${String(s).padStart(3, '0')}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `T-${String(m).padStart(2, '0')}m`;
  const h = Math.round(m / 60);
  return `T-${String(h).padStart(2, '0')}h`;
}

function usd(n: number, frac = 0): string {
  if (!Number.isFinite(n)) return '–';
  const sign = n < 0 ? '-$' : '$';
  return sign + Math.abs(n).toLocaleString('en-US', {
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

function abbrUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function asciiSlug(s: string | null): string {
  if (!s) return 'unknown';
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);
}

const WINDOW_LABELS: Record<TimeWindowKey, AsciiWindow> = {
  '1h':  '24H',  // Pulse doesn't have 1h
  '24h': '24H',
  '7d':  '7D',
  '30d': '30D',
  all:   'ALL',
};

const TF_FROM_WINDOW: Record<AsciiWindow, TimeWindowKey> = {
  '24H': '24h',
  '7D':  '7d',
  '30D': '30d',
  ALL:   'all',
};

export interface ArcadePulseData {
  window: TimeWindowKey;
  kpis: Kpis;
  velocity: VelocityPoint[];
  velocityDays: number;
  velocityGranularity?: 'day' | 'hour';
  tiers: TierStats[];
  topHits: HitRow[];
  live: HitRow[];
  bigHit: HitRow | null;
  latestBlock: { block: number; tier: string } | null;
  // Initial data for the embedded <AsciiLive> at the bottom of the page.
  // Kpis are 24h regardless of `window` (the embed is the live snapshot).
  liveInitial: {
    kpis: Kpis;
    feed: HitRow[];
    latestBlock: { block: number; tier: string } | null;
    serverNow: string;
  };
}

export default function AsciiPulse({ data }: { data: ArcadePulseData }) {
  const { window, kpis, velocity, velocityDays, velocityGranularity = 'day', tiers, topHits, bigHit, latestBlock, liveInitial } = data;
  const winLabel = WINDOW_LABELS[window];
  const now = new Date();
  const dateLine = `${String(now.getUTCDate()).padStart(2, '0')}.${
    ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][now.getUTCMonth()]
  }.${now.getUTCFullYear()}`;
  const utc = new Date().toISOString().slice(11, 16);

  return (
    <div className="pb-6">
      {bigHit && (
        <AsciiBox title="JACKPOT.NEW" glow>
          <div
            className="grid items-baseline gap-2"
            style={{ gridTemplateColumns: '1fr auto', fontFamily: 'var(--font-mono)' }}
          >
            <div>
              <div style={{ color: 'var(--accent)', fontSize: 10, letterSpacing: '0.18em' }}>
                ★ {ago(bigHit.pulled_at)}
              </div>
              {bigHit.card_slug ? (
                <Link
                  href={`/cards/${bigHit.card_slug}`}
                  className="mt-1 hover:underline"
                  style={{ color: 'var(--fg)', fontSize: 13, letterSpacing: '0.04em', lineHeight: 1.2, display: 'block' }}
                >
                  {asciiSlug(bigHit.card_title)}.{(bigHit.tier ?? 'ult').toLowerCase()}
                </Link>
              ) : (
                <div
                  className="mt-1"
                  style={{ color: 'var(--fg)', fontSize: 13, letterSpacing: '0.04em', lineHeight: 1.2 }}
                >
                  {asciiSlug(bigHit.card_title)}.{(bigHit.tier ?? 'ult').toLowerCase()}
                </div>
              )}
              <div className="mt-1" style={{ color: 'var(--fg-3)', fontSize: 10 }}>
                {bigHit.username ? `@${bigHit.username}` : shortAddr(bigHit.wallet)} ·{' '}
                <AsciiTier tier={bigHit.tier as 'Starter' | 'Premium' | 'Ultra' | 'Adventure'} />
              </div>
            </div>
            <div style={{ color: 'var(--accent)', fontSize: 18, textAlign: 'right' }}>
              ${Math.round(Number(bigHit.fmv_usd ?? 0)).toLocaleString('en-US')}
            </div>
          </div>
        </AsciiBox>
      )}

      {/* Today header + TimePivot */}
      <div className="flex items-end gap-2.5 px-3.5 pt-4" style={{ fontFamily: 'var(--font-mono)' }}>
        <div className="flex-1">
          <div style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '0.14em' }}>
            NOW
          </div>
          <div
            className="mt-1"
            style={{
              color: 'var(--fg)',
              fontSize: 20,
              textShadow: '0 0 8px color-mix(in oklch, var(--accent) 40%, transparent)',
            }}
          >
            {dateLine} // {utc} UTC
          </div>
          <div className="mt-1" style={{ color: 'var(--fg-4)', fontSize: 9.5 }}>
            {latestBlock && `block ${latestBlock.block.toLocaleString('en-US')} // `}
            poll T+? // arcade
          </div>
        </div>
        <AsciiTimePivot
          value={winLabel}
          build={o => {
            const k = TF_FROM_WINDOW[o];
            return k === '24h' ? '/' : `/?w=${k}`;
          }}
        />
      </div>

      {/* KPI grid */}
      <div className="grid gap-1.5 px-3.5 pt-3 grid-cols-2 sm:grid-cols-3">
        <AsciiKpi label={`PACKS.${winLabel}`} value={kpis.packs.toLocaleString('en-US')} />
        <AsciiKpi label={`USDM.${winLabel}`} value={abbrUsd(kpis.usdmCycledUsd)} />
        <AsciiKpi label={`PAYOUTS.${winLabel}`} value={abbrUsd(kpis.payoutUsd)} />
        <AsciiKpi label={`WALLETS.${winLabel}`} value={kpis.walletsActive.toLocaleString('en-US')} />
        <AsciiKpi label="PACKS.ALL" value={kpis.packsAllTime.toLocaleString('en-US')} delta="cumulative" />
        <AsciiKpi label="USDM.ALL" value={abbrUsd(kpis.usdmCycledAllTimeUsd)} delta="cumulative" />
      </div>

      <AsciiVelocity data={velocity} span={velocityDays} granularity={velocityGranularity} />

      {/* Tier table */}
      <AsciiBox title="TIERS.PLAYER_EV">
        <table style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 10.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--fg-4)' }}>
              <td style={{ paddingBottom: 6 }}>TIER</td>
              <td>PRICE</td>
              <td>EV</td>
              <td style={{ textAlign: 'right' }}>PLAYER.EV</td>
            </tr>
          </thead>
          <tbody>
            {tiers.map(t => {
              const code = t.tier === 'Starter' ? 'STA' : t.tier === 'Premium' ? 'MON' : t.tier === 'Ultra' ? 'ULT' : 'ADV';
              const evColor = t.edge <= 0 ? 'var(--positive)' : 'var(--tier-magenta)';
              return (
                <tr key={t.tier} style={{ borderTop: '1px dotted var(--fg-4)' }}>
                  <td style={{ color: 'var(--fg)', paddingTop: 4, paddingBottom: 4 }}>{code}</td>
                  <td style={{ color: 'var(--fg-2)' }}>${t.price.toLocaleString('en-US')}</td>
                  <td style={{ color: 'var(--fg-2)' }}>${t.evUsd.toFixed(t.evUsd < 100 ? 2 : 0)}</td>
                  <td style={{ color: evColor, textAlign: 'right' }}>
                    {t.edge <= 0 ? '+' : '-'}{Math.abs(t.edge * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AsciiBox>

      {/* Embedded /live experience — full hero + stream log + 24h KPIs,
       * polls /api/live every 5s on its own. */}
      <div className="px-3 pt-1 pb-1.5 flex items-baseline justify-between" style={{ color: 'var(--accent)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em' }}>
          ● STREAM.LIVE
        </span>
        <Link href="/live" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em' }}>
          [ENTER] OPEN FULLSCREEN →
        </Link>
      </div>
      <AsciiLive initial={liveInitial} embed />

      {/* Top hits */}
      <AsciiBox title="TOP_HITS.7D">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
          {topHits.map((h, i) => {
            const fmv = Number(h.fmv_usd ?? 0);
            const hot = fmv >= 1000;
            const tierCode = h.tier === 'Starter' ? 'STA' : h.tier === 'Premium' ? 'MON' : 'ULT';
            const inner = (
              <div
                className="grid items-baseline gap-2"
                style={{
                  gridTemplateColumns: '1fr 60px 70px',
                  padding: '6px 0',
                  borderTop: i === 0 ? 'none' : '1px dashed var(--fg-4)',
                  color: hot ? 'var(--accent)' : 'var(--fg-2)',
                }}
              >
                <span className="truncate">{asciiSlug(h.card_title)}</span>
                <span style={{ color: 'var(--fg-4)' }}>{tierCode}</span>
                <span style={{ textAlign: 'right', color: hot ? 'var(--accent)' : 'var(--fg)' }}>
                  ${fmv >= 10000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            );
            return h.card_slug ? (
              <Link key={h.request_id} href={`/cards/${h.card_slug}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={h.request_id}>{inner}</div>
            );
          })}
        </div>
      </AsciiBox>

      <AsciiCaveat
        lines={[
          "MnStr FMV is the vault's appraisal, not market consensus.",
          'cards are physical PSA slabs. chain stores receipt only.',
        ]}
      />
    </div>
  );
}

// Re-export the section head for callers that want to use it inline outside of AsciiBox.
export { AsciiHead };
