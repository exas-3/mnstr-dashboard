import {
  getTierEconomics,
  getTierFMVDistribution,
  getSoldBackRateOverTime,
  getTierOutliers,
} from '@/lib/queries';
import { Lbl, Mono, SectionHead } from '@/components/primitives';
import TierPicker from '@/components/tiers/TierPicker';
import ViolinChart from '@/components/tiers/ViolinChart';
import SoldBackChart from '@/components/tiers/SoldBackChart';
import EconGrid from '@/components/tiers/EconGrid';
import OutlierRow from '@/components/tiers/OutlierRow';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const TIER_ORDER = ['Starter', 'Premium', 'Ultra'] as const;
type TierName = (typeof TIER_ORDER)[number];

function isTier(v: unknown): v is TierName {
  return v === 'Starter' || v === 'Premium' || v === 'Ultra';
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
  // House P&L on Tiers always shows the realised view — the paper view was
  // a "what would the books look like if everyone sold today" hypothetical
  // and felt out of place next to the other figures.
  const mode = 'realised';

  const [econ, dist, soldBackTrend, outliers] = await Promise.all([
    getTierEconomics(tier, mode),
    getTierFMVDistribution(tier),
    getSoldBackRateOverTime(tier, 12),
    getTierOutliers(tier, 5),
  ]);

  return (
    <div className="pb-6">
      <TierPicker value={tier} />

      {/* House-edge hero */}
      <div
        className="mx-3 mt-3 px-3.5 py-3.5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
      >
        <Lbl style={{ fontSize: 8.5 }}>House edge</Lbl>
        <div className="mt-1 flex items-baseline justify-between">
          <Mono style={{ fontSize: 36, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            {(econ.edge * 100).toFixed(1)}%
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
          style={{
            height: 6,
            background: 'var(--bg-3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${Math.min(100, Math.max(0, (econ.edge * 100) / 30 * 100))}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-dim))',
            }}
          />
        </div>
        <div className="mt-1 flex justify-between">
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>0%</Mono>
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)' }}>30%</Mono>
        </div>
      </div>

      {/* Violin */}
      <SectionHead tag="01 · DIST" title="Pulled FMV distribution" right="LOG SCALE" />
      <ViolinChart data={dist} />

      {/* Sold-back trend */}
      <SectionHead tag="02 · TREND" title="Sold-back rate over time" right="12 WK" />
      <SoldBackChart data={soldBackTrend} weeks={12} />

      {/* Econ grid */}
      <SectionHead tag="03 · BOOK" title="Pack economics" />
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
      <SectionHead tag="04 · OUTLIERS" title="Biggest pulls · this tier" right="ALL-TIME" />
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
          † Pack economics are realised only — pack revenue minus payouts on sold-back pulls.
        </Mono>
      </div>
    </div>
  );
}
