import Link from 'next/link';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import { premiumFraction, type PremiumMode } from '@/lib/buyback';
import type { WalletActivity } from '@/lib/queries';

function shortAddr(a: string): string {
  return a.slice(0, 4) + '…' + a.slice(-4);
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

/* One row in the wallet's interleaved activity feed.
 * - kind='pull'      — the wallet pulled a card from a pack
 * - kind='sale_buy'  — the wallet bought a slab on the marketplace
 * - kind='sale_sell' — the wallet's previously-pulled slab was bought by someone else */
export default function WalletActivityRow({
  ev,
  first,
  premiumMode = 'buyback',
}: {
  ev: WalletActivity;
  first?: boolean;
  premiumMode?: PremiumMode;
}) {
  const title = ev.card_title ?? 'unknown card';
  const img = ev.card_slug ? `/img/${ev.card_slug}` : ev.card_image_front;
  const inner = (
    <div
      className="grid items-center gap-2.5 px-3 py-2"
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
          <Mono
            style={{
              fontSize: 9,
              color: ev.kind === 'pull' ? 'var(--accent)' : ev.kind === 'sale_buy' ? 'var(--positive)' : 'var(--tier-magenta)',
              letterSpacing: '0.14em',
            }}
          >
            {ev.kind === 'pull' ? 'PULLED' : ev.kind === 'sale_buy' ? 'BOUGHT' : 'SOLD'}
          </Mono>
          {ev.kind !== 'pull' && (
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
              {ev.kind === 'sale_buy' ? 'from' : 'to'}{' '}
              {ev.counterparty_wallet
                ? (ev.counterparty_handle
                    ? `@${ev.counterparty_handle}`
                    : shortAddr(ev.counterparty_wallet))
                : 'MnStr vault'}
            </Mono>
          )}
          {ev.tier && (
            <TierTag tier={ev.tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {ev.kind === 'pull' ? (
          <>
            <Mono style={{ fontSize: 12, color: 'var(--accent)', display: 'block' }}>
              {ev.fmv_usd != null ? usd(ev.fmv_usd, ev.fmv_usd < 100 ? 2 : 0) : '–'}
            </Mono>
            <div className="mt-0.5">
              <StatusPill status={ev.status} />
            </div>
          </>
        ) : (
          <>
            <Mono
              style={{
                fontSize: 12,
                color: ev.kind === 'sale_buy' ? 'var(--tier-magenta)' : 'var(--positive)',
                display: 'block',
              }}
            >
              {ev.kind === 'sale_buy' ? '-' : '+'}
              {usd(ev.sale_price_usd, ev.sale_price_usd < 100 ? 2 : 0)}
            </Mono>
            {(() => {
              const p = premiumFraction(ev.sale_price_usd, ev.sale_card_fmv, ev.tier, premiumMode);
              if (p == null) return null;
              const pColor = p >= 0 ? 'var(--positive)' : 'var(--tier-magenta)';
              const label = premiumMode === 'buyback' ? 'vs buyback' : 'vs FMV';
              return (
                <Mono style={{ fontSize: 9, color: pColor, display: 'block', marginTop: 1 }}>
                  {p >= 0 ? '+' : ''}{(p * 100).toFixed(1)}% {label}
                </Mono>
              );
            })()}
          </>
        )}
        <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.08em', marginTop: 2, display: 'block' }}>
          {fmtDate(ev.ts)}
        </Mono>
      </div>
    </div>
  );

  if (ev.card_slug) {
    return (
      <Link href={`/cards/${ev.card_slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
