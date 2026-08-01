import type { Metadata } from 'next';
import { countMarketplaceSales, getMarketplaceKpis, getMarketplaceSales } from '@/lib/queries';
import { KpiTile, Mono, SectionHead, tierLabel } from '@/components/primitives';
import FilterChips from '@/components/cards/FilterChips';
import MarketplaceLoadMore from '@/components/marketplace/MarketplaceLoadMore';
import { abbrUsd } from '@/lib/format';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Marketplace · Secondary sales',
  description:
    'Secondary-market activity on the MnStr CardMarketplace contract. Every card resale indexed on-chain — buyer, price, premium vs vault FMV.',
  alternates: { canonical: '/marketplace' },
};

const INITIAL_PAGE = 20;

const TIER_CHIPS = [
  { id: 'all'       as const, label: 'All tiers' },
  { id: 'Starter'   as const, label: 'Starter'   },
  { id: 'Great'     as const, label: 'Great'     },
  { id: 'Premium'   as const, label: 'Monster'   },
  { id: 'Ultra'     as const, label: 'Ultra'     },
  { id: 'Adventure' as const, label: 'Adventure' },
  { id: 'Outlaw'    as const, label: 'Outlaw'    },
];

type Tier = (typeof TIER_CHIPS)[number]['id'];

function isTier(v: unknown): v is Tier {
  return v === 'all' || v === 'Starter' || v === 'Premium' || v === 'Ultra' || v === 'Adventure' || v === 'Great' || v === 'Outlaw';
}

function buildHref(tier: Tier): string {
  return tier === 'all' ? '/marketplace' : `/marketplace?tier=${tier}`;
}

interface Search {
  tier?: string;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const tier: Tier = isTier(params.tier) ? params.tier : 'all';

  // KPIs stay all-time; the tier chip only filters the ledger below. The
  // filtered count keeps the "Show more" remaining number honest.
  const [kpis, sales, filteredTotal] = await Promise.all([
    getMarketplaceKpis(),
    getMarketplaceSales(0, INITIAL_PAGE, tier === 'all' ? null : tier),
    tier === 'all' ? null : countMarketplaceSales(tier),
  ]);
  const ledgerTotal = filteredTotal ?? kpis.sales;

  const volume = abbrUsd(kpis.volumeUsd);
  const avg = abbrUsd(kpis.avgUsd);
  const volume7d = abbrUsd(kpis.volume7dUsd);

  return (
    <div className="pb-6">
      <h1 className="sr-only">MnStr marketplace — secondary card sales</h1>
      <div className="px-3 pt-3.5">
        <Mono style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.18em' }}>
          MARKETPLACE
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
          Secondary sales
        </div>
        <Mono style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block' }}>
          CardBought events from 0x5db1075…6eaad3 on MegaETH
        </Mono>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 pt-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Sales · all-time" value={kpis.sales.toLocaleString('en-US')} />
        <KpiTile label="Volume · all-time" value={volume.value} unit={volume.unit} />
        <KpiTile label="Avg price" value={avg.value} unit={avg.unit} />
        <KpiTile label="Distinct buyers" value={kpis.buyers.toLocaleString('en-US')} />
        <KpiTile label="Sales · 7d" value={kpis.sales7d.toLocaleString('en-US')} />
        <KpiTile label="Volume · 7d" value={volume7d.value} unit={volume7d.unit} />
      </div>

      <FilterChips chips={TIER_CHIPS} value={tier} build={buildHref} />

      <SectionHead
        tag="LEDGER"
        title={tier === 'all' ? 'Recent sales' : `Recent sales · ${tierLabel(tier)}`}
        right={`${sales.length} OF ${ledgerTotal.toLocaleString('en-US')}`}
      />
      {/* key: reset appended pages when the tier filter changes. */}
      <MarketplaceLoadMore
        key={tier}
        initialRows={sales}
        totalSales={ledgerTotal}
        tier={tier === 'all' ? undefined : tier}
      />

      {/* Caveat footer */}
      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Sales are <span style={{ color: 'var(--fg-3)' }}>CardBought</span> events on the marketplace contract. Each row = one slab changing hands; multiple resales of the same slab show as separate rows.
          <br />
          † <span style={{ color: 'var(--fg-3)' }}>vs buyback</span> compares the sale price to the slab&apos;s vault appraisal <span style={{ color: 'var(--fg-3)' }}>as of the sale</span> (hourly FMV snapshots) × the tier&apos;s buyback rate. <span style={{ color: 'var(--fg-3)' }}>≈</span> marks sales that predate snapshotting — approximated with the current FMV instead.
        </Mono>
      </div>
    </div>
  );
}
