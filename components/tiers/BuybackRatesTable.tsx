import { Lbl, Mono } from '../primitives';

/* Per-tier buyback rate reference. Source of truth lives in
 * sql/006_pulls_enriched_per_tier_buyback.sql — kept in sync there. */
const ROWS: Array<{ tier: string; price: number; rate: number; color: string }> = [
  { tier: 'Starter',   price:   50, rate: 0.87, color: 'var(--tier-blue)'    },
  { tier: 'Premium',   price:  250, rate: 0.91, color: 'var(--accent)'       },
  { tier: 'Ultra',     price: 1250, rate: 0.95, color: 'var(--tier-magenta)' },
  { tier: 'Adventure', price:  150, rate: 0.90, color: 'var(--tier-cyan)'    },
];

function abbrUsd(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 1 : 2)}k`;
  return `$${n.toLocaleString('en-US')}`;
}

export default function BuybackRatesTable() {
  return (
    <div
      className="mx-3 mt-2"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}
    >
      <div className="px-3 pt-2.5 pb-1.5 flex items-baseline justify-between">
        <Lbl>Buyback rates</Lbl>
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.14em' }}>
          FMV × RATE = PAYOUT
        </Mono>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderTop: '1px dashed var(--line-soft)' }}>
        {ROWS.map((r, i) => (
          <div
            key={r.tier}
            className="px-3 py-2.5"
            style={{
              borderRight: i === ROWS.length - 1 ? 'none' : '1px dashed var(--line-soft)',
              borderBottom: i < 2 ? '1px dashed var(--line-soft)' : 'none',
            }}
          >
            <Mono
              style={{
                fontSize: 9,
                color: r.color,
                letterSpacing: '0.18em',
                textShadow: `0 0 6px color-mix(in oklch, ${r.color} 25%, transparent)`,
              }}
            >
              {r.tier.toUpperCase()}
            </Mono>
            <div className="mt-1.5 flex items-baseline justify-between">
              <Mono
                style={{
                  fontSize: 20,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                }}
              >
                {(r.rate * 100).toFixed(0)}%
              </Mono>
              <Mono style={{ fontSize: 10, color: 'var(--fg-4)' }}>
                {abbrUsd(r.price)}
              </Mono>
            </div>
          </div>
        ))}
      </div>
      <div
        className="px-3 py-2 sm:hidden"
        style={{ borderTop: '1px dashed var(--line-soft)' }}
      >
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)', lineHeight: 1.5 }}>
          † MnStr advertises 85% floor; observed rates are higher per tier.
        </Mono>
      </div>
      <div
        className="hidden sm:block px-3 py-2"
        style={{ borderTop: '1px dashed var(--line-soft)' }}
      >
        <Mono style={{ fontSize: 9, color: 'var(--fg-4)' }}>
          † MnStr advertises an 85% floor; observed rates are higher per tier.
        </Mono>
      </div>
    </div>
  );
}
