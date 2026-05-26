import type { Metadata } from 'next';
import { getMarketplaceKpis, getMarketplaceSales } from '@/lib/queries';
import { KpiTile, Mono, SectionHead } from '@/components/primitives';
import MarketplaceLoadMore from '@/components/marketplace/MarketplaceLoadMore';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Marketplace · Secondary sales',
  description:
    'Secondary-market activity on the MnStr CardMarketplace contract. Every card resale indexed on-chain — buyer, price, premium vs vault FMV.',
  alternates: { canonical: '/marketplace' },
};

const INITIAL_PAGE = 20;

function abbrUsd(n: number): { value: string; unit?: string } {
  if (n >= 1_000_000) return { value: `$${(n / 1_000_000).toFixed(2)}`, unit: 'M' };
  if (n >= 1_000)     return { value: `$${(n / 1_000).toFixed(1)}`,    unit: 'k' };
  return { value: `$${Math.round(n).toLocaleString('en-US')}` };
}

export default async function MarketplacePage() {
  const [kpis, sales] = await Promise.all([
    getMarketplaceKpis(),
    getMarketplaceSales(0, INITIAL_PAGE),
  ]);

  const volume = abbrUsd(kpis.volumeUsd);
  const avg = abbrUsd(kpis.avgUsd);
  const volume24h = abbrUsd(kpis.volume24hUsd);

  return (
    <div className="pb-6">
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
        <KpiTile label="Sales · 24h" value={kpis.sales24h.toLocaleString('en-US')} />
        <KpiTile label="Volume · 24h" value={volume24h.value} unit={volume24h.unit} />
      </div>

      <SectionHead
        tag="LEDGER"
        title="Recent sales"
        right={`${sales.length} OF ${kpis.sales.toLocaleString('en-US')}`}
      />
      <MarketplaceLoadMore initialRows={sales} totalSales={kpis.sales} />

      {/* Caveat footer */}
      <div className="mt-6 px-4 pt-4 pb-2" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        <Mono style={{ fontSize: 9.5, color: 'var(--fg-4)', lineHeight: 1.7 }}>
          † Sales are <span style={{ color: 'var(--fg-3)' }}>CardBought</span> events on the marketplace contract. Each row = one slab changing hands; multiple resales of the same slab show as separate rows.
          <br />
          † <span style={{ color: 'var(--fg-3)' }}>vs FMV</span> compares the sale price to the slab&apos;s most recent vault appraisal, not the FMV at sale time.
        </Mono>
      </div>
    </div>
  );
}
