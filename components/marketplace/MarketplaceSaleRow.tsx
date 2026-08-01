'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import { premiumFraction } from '@/lib/buyback';
import LocalTime from '../LocalTime';
import { useHoverImagePopover } from '../HoverImagePopover';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { MarketplaceSale } from '@/lib/queries';
import { shortAddr, usd } from '@/lib/format';

/* Card-side link target — internal card page when we have metadata, else the
 * mnstr.xyz slab page (orphan slabs have no cards.* row to link to). Kept as
 * a fragment-level wrapper so the buyer can be its own <Link> without
 * nesting anchors. */
function CardLink({
  sale,
  className,
  style,
  children,
}: {
  sale: MarketplaceSale;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (sale.card_slug) {
    return (
      <Link href={`/cards/${sale.card_slug}`} className={className} style={style}>
        {children}
      </Link>
    );
  }
  // Orphan slab — link to mnstr.xyz where the slab page lives, so users can
  // still see what was sold even though our DB has no metadata.
  return (
    <a
      href={`https://mnstr.xyz/cards/${sale.serial_number}/`}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}

export default function MarketplaceSaleRow({ sale, first }: { sale: MarketplaceSale; first?: boolean }) {
  // Orphan = the slab was sold without ever being pulled from a pack — so the
  // seller side of the trade is MnStr itself (direct vault sale), not a
  // player. The buyer / price / on-chain tx are still real; we just don't
  // have card metadata since cards.* is populated by the pull enrich step.
  const orphan = !sale.card_slug;
  const img = cardImageUrl(sale.card_slug, sale.card_image_front, 120);
  const preview = cardImageUrl(sale.card_slug, sale.card_image_front, 480);
  const title = sale.card_title ?? `Vault sale · #${sale.serial_number}`;
  const subtitle = sale.card_grading ?? (orphan ? 'sold direct from MnStr vault' : null);
  // Premium vs the protocol's buyback price (FMV × tier rate) — i.e. what the
  // seller would have received from the protocol instead. Default mode here
  // is fixed; the toggle lives on /cards + /wallets Recent history sections.
  // Reference FMV is the appraisal AS OF the sale (fmv_at_sale, from hourly
  // snapshots) so historical rows don't re-price on every re-quote. Sales
  // that predate snapshotting fall back to current FMV, flagged with "≈".
  const approxFmv = sale.fmv_at_sale == null;
  const premium = premiumFraction(
    sale.price_usd,
    sale.fmv_at_sale ?? sale.card_fmv,
    sale.card_tier,
    'buyback',
  );
  const premiumColor =
    premium == null ? 'var(--fg-4)'
    : premium >= 0 ? 'var(--positive)'
    : 'var(--tier-magenta)';
  // Hover preview — magnified card image follows cursor. Hidden at 2xl+.
  const { handlers, popover } = useHoverImagePopover({
    image: img,
    previewImage: preview,
    title,
    amount: usd(sale.price_usd, sale.price_usd < 100 ? 2 : 0),
    hot: sale.price_usd >= 1000,
    alwaysVisible: true,
  });

  // Split row (see CardActivityRow) — thumb / title / price columns link to
  // the card, but the buyer is a real <Link> to its wallet page, so we never
  // nest an anchor inside an anchor.
  return (
    <>
      <div
        className="grid items-center gap-2.5 px-3 py-2.5"
        style={{
          gridTemplateColumns: '46px 1fr auto',
          borderTop: first ? 'none' : '1px dashed var(--line-soft)',
        }}
        {...handlers}
      >
        <CardLink sale={sale} className="block">
          <CardThumb img={img} alt={title} style={{ border: '1px solid var(--line)' }} />
        </CardLink>
        <div className="min-w-0">
          <CardLink sale={sale} className="block">
            <div
              className="truncate"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
            >
              {title}
            </div>
          </CardLink>
          <div className="mt-1 flex items-center gap-1.5">
            {subtitle && (
              <>
                <Mono style={{ fontSize: 9, color: orphan ? 'var(--fg-4)' : 'var(--fg-3)', fontStyle: orphan ? 'italic' : 'normal' }}>
                  {subtitle}
                </Mono>
                <span style={{ color: 'var(--fg-4)' }}>·</span>
              </>
            )}
            <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>
              {sale.seller_wallet ? (
                <>
                  {sale.seller_handle ? `@${sale.seller_handle}` : shortAddr(sale.seller_wallet)}
                </>
              ) : (
                <span style={{ color: 'var(--fg-4)' }}>MnStr vault</span>
              )}
              <span style={{ color: 'var(--fg-4)', margin: '0 4px' }}>→</span>
              <Link href={`/wallets/${sale.buyer}`} style={{ color: 'var(--fg-3)' }}>
                {shortAddr(sale.buyer)}
              </Link>
            </Mono>
            {sale.card_tier && (
              <TierTag tier={sale.card_tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
            )}
          </div>
        </div>
        <CardLink sale={sale} className="block" style={{ textAlign: 'right' }}>
          <Mono style={{ fontSize: 13, color: 'var(--accent)', display: 'block' }}>
            {usd(sale.price_usd, sale.price_usd < 100 ? 2 : 0)}
          </Mono>
          {premium != null && (
            <Mono style={{ fontSize: 9, color: premiumColor, display: 'block', marginTop: 1 }}>
              {approxFmv ? '≈' : ''}{premium >= 0 ? '+' : ''}{(premium * 100).toFixed(1)}% vs buyback
            </Mono>
          )}
          <Mono style={{ fontSize: 8.5, color: 'var(--fg-4)', letterSpacing: '0.08em', marginTop: 2, display: 'block' }}>
            <LocalTime iso={sale.bought_at} format="datetime" />
          </Mono>
        </CardLink>
      </div>
      {popover}
    </>
  );
}
