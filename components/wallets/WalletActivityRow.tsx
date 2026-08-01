'use client';

import Link from 'next/link';
import { Mono, StatusPill, TierTag, type Tier } from '../primitives';
import { premiumFraction, type PremiumMode } from '@/lib/buyback';
import LocalTime from '../LocalTime';
import { useHoverImagePopover } from '../HoverImagePopover';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { WalletActivity } from '@/lib/queries';
import { shortAddr, usd } from '@/lib/format';

/* One row in the wallet's interleaved activity feed.
 * - kind='pull'      — the wallet pulled a card from a pack
 * - kind='sellback'  — the wallet sold a pulled card back to the protocol vault
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
  const img = cardImageUrl(ev.card_slug, ev.card_image_front, 120);
  const preview = cardImageUrl(ev.card_slug, ev.card_image_front, 480);
  // Hover preview — magnified card image follows the cursor. Hidden at 2xl+.
  const amount =
    ev.kind === 'pull'
      ? (ev.fmv_usd != null ? `$${Math.round(ev.fmv_usd).toLocaleString('en-US')}` : '')
      : ev.kind === 'sellback'
        ? `$${Math.round(ev.payout_usd).toLocaleString('en-US')}`
        : `$${Math.round(ev.sale_price_usd).toLocaleString('en-US')}`;
  const { handlers, popover } = useHoverImagePopover({
    image: img,
    previewImage: preview,
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
      <CardThumb img={img} alt={title} style={{ border: '1px solid var(--line)' }} />
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
        >
          {/* Sellback rows carry an explorer <a> on the amount, so the whole
           * row can't be a <Link> (nested anchors break SSR hydration) — the
           * card link moves onto the title instead. */}
          {ev.kind === 'sellback' && ev.card_slug ? (
            <Link href={`/cards/${ev.card_slug}`} style={{ color: 'var(--fg)' }}>
              {title}
            </Link>
          ) : (
            title
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Mono
            style={{
              fontSize: 9,
              color:
                ev.kind === 'pull' ? 'var(--accent)'
                : ev.kind === 'sellback' || ev.kind === 'sale_buy' ? 'var(--positive)'
                : 'var(--tier-magenta)',
              letterSpacing: '0.14em',
            }}
          >
            {ev.kind === 'pull' ? 'PULLED'
              : ev.kind === 'sellback' ? 'SOLD BACK'
              : ev.kind === 'sale_buy' ? 'BOUGHT'
              : 'SOLD'}
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
          {(ev.kind === 'sale_buy' || ev.kind === 'sale_sell') && (
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
        ) : ev.kind === 'sellback' ? (
          // Realized payout — link straight to the settlement tx when the
          // sellback was matched on-chain (mirrors CardActivityRow).
          ev.payout_tx_hash ? (
            <a
              href={`https://mega.etherscan.io/tx/${ev.payout_tx_hash}`}
              target="_blank"
              rel="noreferrer noopener"
              title="View payout transaction on MegaETH explorer"
            >
              <Mono style={{ fontSize: 12, color: 'var(--positive)', display: 'block' }}>
                +{usd(ev.payout_usd, ev.payout_usd < 100 ? 2 : 0)} ↗
              </Mono>
            </a>
          ) : (
            <Mono style={{ fontSize: 12, color: 'var(--positive)', display: 'block' }}>
              +{usd(ev.payout_usd, ev.payout_usd < 100 ? 2 : 0)}
            </Mono>
          )
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

  // Sellback rows already contain anchors (title + payout tx), so they never
  // get the whole-row <Link> wrapper.
  if (ev.card_slug && ev.kind !== 'sellback') {
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
