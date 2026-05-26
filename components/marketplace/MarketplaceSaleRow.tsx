import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import type { MarketplaceSale } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 6) + '…' + a.slice(-4);
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const m = MONTHS[d.getUTCMonth()];
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${m} ${day} · ${h}:${min}`;
}

export default function MarketplaceSaleRow({ sale, first }: { sale: MarketplaceSale; first?: boolean }) {
  const img = sale.card_slug ? `/img/${sale.card_slug}` : sale.card_image_front;
  const title = sale.card_title ?? sale.serial_number;
  // Premium relative to vault FMV (positive = sold above FMV).
  const premium = sale.card_fmv != null && sale.card_fmv > 0
    ? (sale.price_usd - sale.card_fmv) / sale.card_fmv
    : null;
  const premiumColor =
    premium == null ? 'var(--fg-4)'
    : premium >= 0 ? 'var(--positive)'
    : 'var(--tier-magenta)';

  const inner = (
    <div
      className="grid items-center gap-2.5 px-3 py-2.5"
      style={{
        gridTemplateColumns: '46px 1fr auto',
        borderTop: first ? 'none' : '1px dashed var(--line-soft)',
      }}
    >
      <div
        style={{
          aspectRatio: '5/7',
          background: img
            ? `center/contain no-repeat url("${img}"), var(--bg-3)`
            : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 4px, oklch(0.22 0.01 70) 4px, oklch(0.22 0.01 70) 8px)',
          border: '1px solid var(--line)',
        }}
      />
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
        >
          {title}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {sale.card_grading && (
            <>
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>{sale.card_grading}</Mono>
              <span style={{ color: 'var(--fg-4)' }}>·</span>
            </>
          )}
          <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
            buyer {shortAddr(sale.buyer)}
          </Mono>
          {sale.card_tier && (
            <TierTag tier={sale.card_tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono style={{ fontSize: 13, color: 'var(--accent)', display: 'block' }}>
          {usd(sale.price_usd, sale.price_usd < 100 ? 2 : 0)}
        </Mono>
        {premium != null && (
          <Mono style={{ fontSize: 9, color: premiumColor, display: 'block', marginTop: 1 }}>
            {premium >= 0 ? '+' : ''}{(premium * 100).toFixed(1)}% vs FMV
          </Mono>
        )}
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.08em', marginTop: 2, display: 'block' }}>
          {fmtDate(sale.bought_at)}
        </Mono>
      </div>
    </div>
  );

  if (sale.card_slug) {
    return (
      <Link href={`/cards/${sale.card_slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
