import type { Metadata } from 'next';
import {
  getTierEconomics,
  getTierFMVDistribution,
  getSoldBackRateOverTime,
  getTierOutliers,
  getTierOutlierCount,
} from '@/lib/queries';
import { Lbl, Mono, SectionHead } from '@/components/primitives';
import TierPicker from '@/components/tiers/TierPicker';
import TierHeroRow from '@/components/tiers/TierHeroRow';
import EvBasisToggle from '@/components/tiers/EvBasisToggle';
import BuybackRatesTable from '@/components/tiers/BuybackRatesTable';
import TierFmvBarChart from '@/components/tiers/TierFmvBarChart';
import SoldBackChart from '@/components/tiers/SoldBackChart';
import EconGrid from '@/components/tiers/EconGrid';
import TierOutliersLoadMore from '@/components/tiers/TierOutliersLoadMore';
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

interface Search { tier?: string; ev?: string }

export default async function TiersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const tier: TierName = isTier(params.tier) ? params.tier : 'Premium';
  // EV basis: 'buyback' (default) values cards at fmv_at_pull × tier_rate
  // (what mnstr would actually pay on sellback). 'fmv' uses raw FMV (the
  // headline value mnstr displays). Buyback is the realizable number, FMV
  // is the "paper" value if you could exit at displayed price.
  const basis = params.ev === 'fmv' ? 'fmv' : 'buyback';
  // House edge + EV are paper-based: every pull's hypothetical sell-back at
  // current FMV × the tier's buyback rate, regardless of whether the player
  // has actually sold yet. Realised would punish tiers with high hold rates
  // (their liabilities look smaller than they really are) and reward tiers
  // with quick sell-backs — both misleading reads of the protocol's edge.
  const mode = 'paper';

  const [econ, dist, soldBackTrend, outliers, outliersTotal, econStarter, econPremium, econUltra, econAdventure] =
    await Promise.all([
      getTierEconomics(tier, mode, basis),
      getTierFMVDistribution(tier, basis),
      getSoldBackRateOverTime(tier),
      getTierOutliers(tier, 5),
      getTierOutlierCount(tier),
      getTierEconomics('Starter', mode, basis),
      getTierEconomics('Premium', mode, basis),
      getTierEconomics('Ultra', mode, basis),
      getTierEconomics('Adventure', mode, basis),
    ]);

  const econs: Record<string, TierEconomics> = {
    Starter: econStarter,
    Premium: econPremium,
    Ultra: econUltra,
    Adventure: econAdventure,
  };

  return (
    <div className="pb-6">
      {/* Per-tier buyback rate reference. Source of truth lives in sql/006. */}
      <BuybackRatesTable />

      {/* EV basis toggle — BUYBACK (default) vs FMV. Drives the headline
       * Player EV numbers in the hero row + mobile diverging bar below. */}
      <EvBasisToggle basis={basis} tier={tier} />

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
          <SectionHead
            tag="DIST"
            title={basis === 'buyback' ? 'Pulled buyback distribution' : 'Pulled FMV distribution'}
            right="LOG SCALE"
          />
          <TierFmvBarChart data={dist} basis={basis} />
        </div>
        <div>
          <SectionHead tag="TREND" title="Sold-back rate over time" right="DAILY · ALL" />
          <SoldBackChart data={soldBackTrend} />
        </div>
      </div>

      {/* Econ grid */}
      <SectionHead tag="BOOK" title="Pack economics" />
      <EconGrid
        items={[
          { label: 'Cycled in',           value: abbrUsd(econ.revenue) },
          { label: 'Vault FMV (holding)', value: abbrUsd(econ.vaultFmv) },
          { label: 'Payouts (paper)',     value: abbrUsd(econ.payouts) },
          // Player P&L = -House P&L. Positive when players win on average.
          {
            label: 'Player P&L',
            value: abbrUsd(-econ.pnlHouse),
            tone: -econ.pnlHouse >= 0 ? 'pos' : 'neg',
          },
          {
            label: 'Median FMV',
            value: econ.median !== null ? usd(econ.median, econ.median < 100 ? 2 : 0) : '–',
          },
          {
            label: 'Mean FMV',
            value: econ.mean !== null ? usd(econ.mean, econ.mean < 100 ? 2 : 0) : '–',
          },
          { label: 'Sold-back rate', value: `${(econ.sellbackRate * 100).toFixed(1)}%` },
          { label: 'Hit > price',    value: `${(econ.hitAbovePriceRate * 100).toFixed(1)}%`, tone: 'pos' },
        ]}
      />

      {/* Outliers — distinct cards where FMV ≥ 2× pack price. First 5 SSR'd;
       * "Show more" appends 10 at a time via /api/tiers/[tier]/outliers
       * until the filtered pool is exhausted. */}
      <SectionHead
        tag="OUTLIERS"
        title="Biggest pulls · FMV ≥ 2× pack price"
        right={`${outliers.length} OF ${outliersTotal.toLocaleString('en-US')}`}
      />
      <TierOutliersLoadMore tier={tier} initialRows={outliers} totalOutliers={outliersTotal} />

      {/* Caveat footer */}
      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Distribution uses <span style={{ color: 'var(--fg-3)' }}>MnStr FMV</span> at time of pull.
        </Mono>
      </div>
    </div>
  );
}
