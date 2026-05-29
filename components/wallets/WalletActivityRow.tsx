'use client';

import Link from 'next/link';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import { premiumFraction, type PremiumMode } from '@/lib/buyback';
import LocalTime from '../LocalTime';
import { useHoverImagePopover } from '../HoverImagePopover';
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
  // Hover preview — magnified card image follows the cursor. Hidden at 2xl+.
  const amount =
    ev.kind === 'pull'
      ? (ev.fmv_usd != null ? `$${Math.round(ev.fmv_usd).toLocaleString('en-US')}` : '')
      : `$${Math.round(ev.sale_price_usd).toLocaleString('en-US')}`;
  const { handlers, popover } = useHoverImagePopover({
    image: img,
    title,
    amount,
    hot: ev.kind === 'pull' && ev.fmv_usd != null && ev.fmv_usd >= 1000,
    alwaysVisible: true,
  });

  const inner = (
    <div
      className="grid items-center gap-2.5 px-3 py-2 relative"
      style={{
        gridTemplateColumns: '46px 1fr auto',
        borderTop: first ? 'none' : '1px dashed var(--line-soft)',
      }}
      {...handlers}
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
          {/* Credit-paid pulls have price_usd = 0 (PlayAssigned amount = 0 for
           * the 'credit' payment type per scripts/config.ts). No USDm leaves
           * the wallet, so realized P&L for these pulls is $0 — flag them so
           * "spend" not matching pack count makes sense. */}
          {ev.kind === 'pull' && ev.price_usd === 0 && (
            <Mono
              style={{
                fontSize: 8.5,
                color: 'var(--tier-cyan)',
                letterSpacing: '0.14em',
                padding: '1px 4px',
                border: '1px solid color-mix(in oklch, var(--tier-cyan) 35%, transparent)',
                background: 'color-mix(in oklch, var(--tier-cyan) 7%, transparent)',
              }}
            >
              CREDIT
            </Mono>
          )}
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
          <LocalTime iso={ev.ts} format="datetime" />
        </Mono>
      </div>
    </div>
  );

  if (ev.card_slug) {
    return (
      <>
        <Link href={`/cards/${ev.card_slug}`} className="block">
          {inner}
        </Link>
        {popover}
      </>
    );
  }
  return (
    <>
      {inner}
      {popover}
    </>
  );
}
