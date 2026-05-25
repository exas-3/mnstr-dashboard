import type { Metadata } from 'next';
import {
  getTierEconomics,
  getTierFMVDistribution,
  getSoldBackRateOverTime,
  getTierOutliers,
} from '@/lib/queries';
import { Lbl, Mono, SectionHead } from '@/components/primitives';
import TierPicker from '@/components/tiers/TierPicker';
import TierHeroRow from '@/components/tiers/TierHeroRow';
import ViolinChart from '@/components/tiers/ViolinChart';
import SoldBackChart from '@/components/tiers/SoldBackChart';
import EconGrid from '@/components/tiers/EconGrid';
import OutlierRow from '@/components/tiers/OutlierRow';
import type { TierEconomics } from '@/lib/queries';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tiers · Pack economics',
  description:
    'Player expected value, sold-back rates, and FMV distribution for every MnStr pack tier — Starter, Monster, Ultra, Adventure.',
  alternates: { canonical: '/tiers' },
};

const TIER_ORDER = ['Starter', 'Premium', 'Ultra', 'Adventure'] as const;
type TierName = (typeof TIER_ORDER)[number];

function isTier(v: unknown): v is TierName {
  return v === 'Starter' || v === 'Premium' || v === 'Ultra' || v === 'Adventure';
}

function usd(n: number, frac = 0): string {
  if (!Number.isFinite(n)) return '–';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: frac,
    minimumFractionDigits: frac,
  });
}

function abbrUsd(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

interface Search { tier?: string }

export default async function TiersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const tier: TierName = isTier(params.tier) ? params.tier : 'Premium';
  // House edge + EV are paper-based: every pull's hypothetical sell-back at
  // current FMV × the tier's buyback rate, regardless of whether the player
  // has actually sold yet. Realised would punish tiers with high hold rates
  // (their liabilities look smaller than they really are) and reward tiers
  // with quick sell-backs — both misleading reads of the protocol's edge.
  const mode = 'paper';

  const [econ, dist, soldBackTrend, outliers, econStarter, econPremium, econUltra, econAdventure] =
    await Promise.all([
      getTierEconomics(tier, mode),
      getTierFMVDistribution(tier),
      getSoldBackRateOverTime(tier, 12),
      getTierOutliers(tier, 5),
      getTierEconomics('Starter', mode),
      getTierEconomics('Premium', mode),
      getTierEconomics('Ultra', mode),
      getTierEconomics('Adventure', mode),
    ]);

  const econs: Record<string, TierEconomics> = {
    Starter: econStarter,
    Premium: econPremium,
    Ultra: econUltra,
    Adventure: econAdventure,
  };

  return (
    <div className="pb-6">
      {/* Desktop: 3-up tier comparison. Mobile/tablet: TierPicker. */}
      <TierHeroRow econs={econs} active={tier} />
      <div className="lg:hidden">
        <TierPicker value={tier} />
      </div>

      {/* Player-EV hero — only on mobile/tablet (the hero row replaces it on lg+).
       * Diverging bar: zero at center, positive (player advantage) fills right
       * in green, negative (house advantage) fills left in magenta.  */}
      {(() => {
        const evPct = -econ.edge * 100;            // flip sign: house edge → player EV
        const playerWins = evPct >= 0;
        const evColor = playerWins ? 'var(--positive)' : 'var(--tier-magenta)';
        const RANGE = 15;                          // ± 15% covers realistic values
        const fillPct = Math.min(100, (Math.abs(evPct) / RANGE) * 50);  // 0..50 of half-bar
        return (
          <div
            className="mx-3 mt-3 px-3.5 py-3.5 lg:hidden"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
          >
            <Lbl style={{ fontSize: 8.5 }}>Player EV</Lbl>
            <div className="mt-1 flex items-baseline justify-between">
              <Mono style={{ fontSize: 36, color: evColor, letterSpacing: '-0.02em' }}>
                {playerWins ? '+' : '−'}{Math.abs(evPct).toFixed(1)}%
              </Mono>
              <div className="text-right">
                <Mono style={{ fontSize: 11, color: 'var(--fg-2)', display: 'block' }}>
                  EV ${econ.ev.toFixed(econ.ev < 100 ? 2 : 0)}
                </Mono>
                <Mono style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                  vs ${econ.price.toLocaleString('en-US')}
                </Mono>
              </div>
            </div>
            <div
              className="mt-3"
              style={{ height: 6, background: 'var(--bg-3)', position: 'relative', overflow: 'hidden' }}
            >
              {/* Center marker */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--line-soft)' }} />
              {/* Fill: right side if positive, left side if negative */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: playerWins ? '50%' : `${50 - fillPct}%`,
                  width: `${fillPct}%`,
                  background: evColor,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between">
              <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>−{RANGE}%</Mono>
              <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>0%</Mono>
              <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>+{RANGE}%</Mono>
            </div>
          </div>
        );
      })()}

      {/* Violin + Sold-back trend — side-by-side on lg+ */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-3 lg:px-2">
        <div>
          <SectionHead tag="DIST" title="Pulled FMV distribution" right="LOG SCALE" />
          <ViolinChart data={dist} />
        </div>
        <div>
          <SectionHead tag="TREND" title="Sold-back rate over time" right="12 WK" />
          <SoldBackChart data={soldBackTrend} weeks={12} />
        </div>
      </div>

      {/* Econ grid */}
      <SectionHead tag="BOOK" title="Pack economics" />
      <EconGrid
        items={[
          { label: 'Cycled in',           value: abbrUsd(econ.revenue) },
          { label: 'Vault FMV (holding)', value: abbrUsd(econ.vaultFmv) },
          { label: 'Payouts',             value: abbrUsd(econ.payouts), tone: 'pos' },
          { label: 'House P&L',           value: abbrUsd(econ.pnlHouse), tone: 'pos' },
          {
            label: 'Median FMV',
            value: econ.median !== null ? usd(econ.median, econ.median < 100 ? 2 : 0) : '–',
          },
          {
            label: 'P25 — P75',
            value:
              econ.p25 !== null && econ.p75 !== null
                ? `${usd(econ.p25, econ.p25 < 100 ? 2 : 0)} — ${usd(econ.p75, econ.p75 < 100 ? 2 : 0)}`
                : '–',
          },
          { label: 'Sold-back rate', value: `${(econ.sellbackRate * 100).toFixed(1)}%` },
          { label: 'Hit > price',    value: `${(econ.hitAbovePriceRate * 100).toFixed(1)}%`, tone: 'pos' },
        ]}
      />

      {/* Outliers */}
      <SectionHead tag="OUTLIERS" title="Biggest pulls · this tier" right="ALL-TIME" />
      <div className="mx-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
        {outliers.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>NO PULLS</Mono>
          </div>
        ) : (
          outliers.map((o, i) => <OutlierRow key={o.card_slug ?? i} outlier={o} first={i === 0} />)
        )}
      </div>

      {/* Caveat footer */}
      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Distribution uses <span style={{ color: 'var(--fg-3)' }}>MnStr FMV</span> at time of pull.
          <br />
          † Pack economics are paper-mode — every pull&apos;s hypothetical sell-back (FMV × buyback rate) counts as a payout, whether sold yet or not.
        </Mono>
      </div>
    </div>
  );
}
