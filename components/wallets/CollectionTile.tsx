'use client';

import Link from 'next/link';
import { Mono } from '../primitives';
import { useHoverImagePopover } from '../HoverImagePopover';
import type { HitRow } from '@/lib/queries';

const TIER_COLOR: Record<string, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
};

/* One tile in the wallet detail "Top FMV pulls" collection grid. Hovering
 * surfaces a magnified card preview that follows the cursor. */
export default function CollectionTile({ row }: { row: HitRow }) {
  const fmv = Number(row.fmv_usd ?? 0);
  const hot = fmv >= 1000;
  const img = row.card_slug
    ? `/img/${row.card_slug}`
    : row.card_image_front ?? null;
  const fmvLabel = fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0);

  const { handlers, popover } = useHoverImagePopover({
    image: img,
    title: row.card_title,
    amount: `$${fmvLabel}`,
    hot,
  });

  return (
    <>
      <Link href={row.card_slug ? `/cards/${row.card_slug}` : '#'} {...handlers}>
        <div
          className="relative flex flex-col justify-between p-1.5"
          style={{
            aspectRatio: '5/7',
            background: img
              ? `center/contain no-repeat url("${img}"), var(--bg-3)`
              : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)',
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
        </div>
      </Link>
      {popover}
    </>
  );
}
