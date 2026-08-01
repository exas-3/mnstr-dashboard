'use client';

import Link from 'next/link';
import { Mono, TierTag, type Tier } from '../primitives';
import { useHoverImagePopover } from '../HoverImagePopover';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { TierOutlier } from '@/lib/queries';
import { shortAddr } from '@/lib/format';

export default function OutlierRow({ outlier, first }: { outlier: TierOutlier; first?: boolean }) {
  const fmv = outlier.fmv_usd;
  const hot = fmv >= 1000;
  const fmvLabel =
    fmv >= 10000 ? Math.round(fmv).toLocaleString('en-US')
    : fmv.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Thumb + title link to the card detail. Pullers and tier tag are siblings
  // — keeps the HTML valid (no nested <a>).
  const cardHref = outlier.card_slug ? `/cards/${outlier.card_slug}` : null;
  const thumbImg = cardImageUrl(outlier.card_slug, outlier.card_image_front, 120);
  const previewImg = cardImageUrl(outlier.card_slug, outlier.card_image_front, 480);

  // Hover preview — small-thumb rows benefit from a magnifier at any screen
  // size, so disable the default 2xl gate via alwaysVisible.
  const { handlers, popover } = useHoverImagePopover({
    image: thumbImg,
    previewImage: previewImg,
    title: outlier.card_title,
    amount: `$${fmvLabel}`,
    hot,
    alwaysVisible: true,
  });

  const titleEl = (
    <div
      className="truncate"
      style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg)' }}
    >
      {outlier.card_title ?? 'unknown card'}
    </div>
  );

  return (
    <div
      className="relative grid items-center gap-2.5 px-3 py-2"
      style={{
        gridTemplateColumns: '46px 1fr 64px',
        borderTop: first ? 'none' : '1px dashed var(--line-soft)',
      }}
      {...handlers}
    >
      {cardHref ? (
        <Link href={cardHref}>
          <Thumb img={thumbImg} alt={outlier.card_title} hot={hot} />
        </Link>
      ) : (
        <Thumb img={thumbImg} alt={outlier.card_title} hot={hot} />
      )}

      <div className="min-w-0">
        {cardHref ? (
          <Link href={cardHref} className="hover:underline">
            {titleEl}
          </Link>
        ) : (
          titleEl
        )}
        <div className="mt-1 flex items-center gap-1.5">
          {outlier.card_set && (
            <>
              <Mono style={{ fontSize: 9, color: 'var(--fg-3)' }}>{outlier.card_set}</Mono>
              <span style={{ color: 'var(--fg-4)' }}>·</span>
            </>
          )}
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-3)',
              minWidth: 0,
            }}
          >
            {outlier.pullers.length === 0 ? (
              <span style={{ color: 'var(--fg-4)' }}>—</span>
            ) : (
              outlier.pullers.map((p, i) => {
                const label = p.username ? `@${p.username}` : shortAddr(p.wallet);
                return (
                  <span key={p.wallet}>
                    {i > 0 && <span style={{ color: 'var(--fg-4)' }}>, </span>}
                    <Link
                      href={`/wallets/${p.wallet}`}
                      className="hover:underline"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      {label}
                    </Link>
                  </span>
                );
              })
            )}
          </span>
          <TierTag tier={outlier.tier as Tier} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: 7.5 }} />
        </div>
      </div>

      <Mono style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'right' }}>
        ${fmvLabel}
        {outlier.pull_count > 1 && (
          <span style={{ color: 'var(--fg-4)', fontSize: 9, marginLeft: 4 }}>
            ×{outlier.pull_count}
          </span>
        )}
      </Mono>

      {popover}
    </div>
  );
}

function Thumb({ img, alt, hot }: { img: string | null; alt: string | null | undefined; hot: boolean }) {
  return (
    <CardThumb
      img={img}
      alt={alt}
      style={{ border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}` }}
    />
  );
}
