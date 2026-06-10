'use client';

import Link from 'next/link';
import { Mono, type Tier } from '../primitives';
import { useHoverImagePopover } from '../HoverImagePopover';
import { cardImageUrl } from '@/lib/img';
import CardThumb from '../CardThumb';
import type { CardListItem } from '@/lib/queries';

const TIER_COLOR: Record<string, string> = {
  Starter:   'var(--tier-blue)',
  Premium:   'var(--accent)',
  Ultra:     'var(--tier-magenta)',
  Adventure: 'var(--tier-cyan)',
};

export default function CardWallTile({ card }: { card: CardListItem }) {
  const hot = (card.fmv ?? 0) >= 1000;
  const tier = (card.top_tier ?? 'Starter') as Tier;
  const tc = TIER_COLOR[tier];

  const img = cardImageUrl(card.slug, card.image_front, 240);
  const preview = cardImageUrl(card.slug, card.image_front, 480);
  const fmv = card.fmv ?? 0;
  const fmvLabel = fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0);
  // Hover preview — default 2xl:hidden gate (large screens have big enough
  // tiles to read without a magnifier).
  const { handlers, popover } = useHoverImagePopover({
    image: img,
    previewImage: preview,
    title: card.title,
    amount: card.fmv !== null ? `$${fmvLabel}` : '',
    hot,
  });

  return (
    <>
    <Link href={`/cards/${card.slug}`} className="block" {...handlers}>
      <CardThumb
        img={img}
        alt={card.title}
        className="flex flex-col justify-between p-1.5"
        style={{
          border: `1px solid ${hot ? 'color-mix(in oklch, var(--accent) 53%, transparent)' : 'var(--line)'}`,
          boxShadow: hot
            ? '0 0 0 1px color-mix(in oklch, var(--accent) 13%, transparent), 0 0 22px color-mix(in oklch, var(--accent) 12%, transparent)'
            : 'none',
        }}
      >
        <div className="flex items-start justify-between">
          <Mono
            style={{
              fontSize: 8,
              color: 'var(--accent)',
              letterSpacing: '0.1em',
              background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
              padding: '1px 4px',
            }}
          >
            {card.grading ?? 'PSA'}
          </Mono>
          <Mono
            style={{
              fontSize: 8,
              color: tc,
              letterSpacing: '0.1em',
              background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
              padding: '1px 4px',
            }}
          >
            {tier[0]}
          </Mono>
        </div>
        <div className="flex items-baseline justify-between">
          {card.fmv !== null && (
            <Mono
              style={{
                fontSize: 12,
                color: 'var(--fg)',
                background: 'color-mix(in oklch, var(--bg) 70%, transparent)',
                padding: '1px 4px',
              }}
            >
              ${card.fmv >= 1000 ? Math.round(card.fmv).toLocaleString('en-US') : card.fmv.toFixed(0)}
            </Mono>
          )}
          {card.pulls > 1 && (
            <Mono
              style={{
                fontSize: 8.5,
                color: 'var(--fg-3)',
                background: 'color-mix(in oklch, var(--bg) 70%, transparent)',
                padding: '1px 4px',
              }}
            >
              ×{card.pulls}
            </Mono>
          )}
        </div>
      </CardThumb>
    </Link>
    {popover}
    </>
  );
}
