'use client';

import Link from 'next/link';
import { Mono, type Tier } from '../primitives';
import { useHoverImagePopover } from '../HoverImagePopover';
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

  const img = card.slug ? `/img/${card.slug}` : card.image_front;
  const fmv = card.fmv ?? 0;
  const fmvLabel = fmv >= 1000 ? Math.round(fmv).toLocaleString('en-US') : fmv.toFixed(0);
  // Hover preview — default 2xl:hidden gate (large screens have big enough
  // tiles to read without a magnifier).
  const { handlers, popover } = useHoverImagePopover({
    image: img,
    title: card.title,
    amount: card.fmv !== null ? `$${fmvLabel}` : '',
    hot,
  });

  return (
    <>
    <Link href={`/cards/${card.slug}`} className="block" {...handlers}>
      <div
        className="relative flex flex-col justify-between p-1.5"
        style={{
          aspectRatio: '5/7',
          background: img
            ? `center/contain no-repeat url("${img}"), var(--bg-3)`
            : 'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)',
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
      </div>
    </Link>
    {popover}
    </>
  );
}
