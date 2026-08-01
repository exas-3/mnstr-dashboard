'use client';

import Link from 'next/link';
import { Mono } from '../primitives';
import { useHoverImagePopover } from '../HoverImagePopover';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { HitRow } from '@/lib/queries';

const TIER_COLOR: Record<string, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
  Great:     'var(--tier-green)',
  Outlaw:    'var(--tier-violet)',
};

/* One tile in the wallet detail "Top FMV pulls" collection grid. Hovering
 * surfaces a magnified card preview that follows the cursor. */
export default function CollectionTile({ row }: { row: HitRow }) {
  const fmv = Number(row.fmv_usd ?? 0);
  const hot = fmv >= 1000;
  const img = cardImageUrl(row.card_slug, row.card_image_front, 240);
  const preview = cardImageUrl(row.card_slug, row.card_image_front, 480);
  const fmvLabel = fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0);

  const { handlers, popover } = useHoverImagePopover({
    image: img,
    previewImage: preview,
    title: row.card_title,
    amount: `$${fmvLabel}`,
    hot,
  });

  return (
    <>
      <Link href={row.card_slug ? `/cards/${row.card_slug}` : '#'} {...handlers}>
        <CardThumb
          img={img}
          alt={row.card_title}
          className="flex flex-col justify-between p-1.5"
          style={{
            border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
            boxShadow: hot
              ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 0 18px color-mix(in oklch, var(--accent) 12%, transparent)'
              : 'none',
          }}
        >
          <div className="flex items-start justify-between">
            <Mono
              style={{
                fontSize: 8,
                color: TIER_COLOR[row.tier] ?? 'var(--fg-3)',
                letterSpacing: '0.1em',
              }}
            >
              {row.tier.toUpperCase()[0]}
            </Mono>
          </div>
          <Mono
            style={{
              fontSize: 11,
              color: 'var(--fg)',
              background: 'color-mix(in oklch, var(--bg) 70%, transparent)',
              padding: '1px 4px',
              alignSelf: 'flex-start',
            }}
          >
            ${fmvLabel}
          </Mono>
        </CardThumb>
      </Link>
      {popover}
    </>
  );
}
