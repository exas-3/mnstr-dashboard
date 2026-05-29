'use client';

/* Shared cursor-following image preview popover.
 *
 * Used by every "card row / tile" component that wants a magnified preview
 * on hover. The popover positions at the cursor with viewport-edge clamping
 * so it can never clip off-screen, and is gated `2xl:hidden` so it stops
 * showing on the largest screens where the inline image is already big
 * enough to read.
 *
 * Usage:
 *
 *   const { handlers, popover } = useHoverImagePopover({
 *     image: '/img/some-slug',
 *     title: 'Card title',
 *     amount: '$1,234',
 *     hot: true,
 *   });
 *   return (
 *     <div {...handlers}>
 *       ...your trigger element (a row, tile, card)...
 *       {popover}
 *     </div>
 *   );
 *
 * The hook returns `null` for `popover` when no image is provided, so callers
 * can pass `null` images without a guard. */

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Mono } from './primitives';

const POPOVER_W = 360;
const POPOVER_OFFSET = 18;
const VIEWPORT_MARGIN = 8;

interface Args {
  image: string | null | undefined;
  title: string | null | undefined;
  amount: string;          // pre-formatted, e.g. "$1,234"
  hot?: boolean;           // amber border for big hits
  alwaysVisible?: boolean; // when true, skip the `2xl:hidden` gate. Use for
                           // small-thumb rows (Big Hits, marketplace ledger,
                           // wallet activity) where even on huge monitors the
                           // 46px thumb is still tiny.
}

interface Result {
  handlers: {
    onMouseMove: ((e: MouseEvent<HTMLElement>) => void) | undefined;
    onMouseLeave: (() => void) | undefined;
  };
  popover: ReactNode | null;
}

export function useHoverImagePopover({ image, title, amount, hot, alwaysVisible = false }: Args): Result {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    if (!image) return;
    const popW = Math.min(POPOVER_W, window.innerWidth - 2 * VIEWPORT_MARGIN);
    // Approximate height: 5:7 image + ~38px footer (title + amount row).
    const popH = popW * (7 / 5) + 38;
    let x = e.clientX + POPOVER_OFFSET;
    let y = e.clientY + POPOVER_OFFSET;
    if (x + popW > window.innerWidth - VIEWPORT_MARGIN) {
      x = e.clientX - popW - POPOVER_OFFSET;
    }
    if (x < VIEWPORT_MARGIN) x = VIEWPORT_MARGIN;
    if (y + popH > window.innerHeight - VIEWPORT_MARGIN) {
      y = window.innerHeight - popH - VIEWPORT_MARGIN;
    }
    if (y < VIEWPORT_MARGIN) y = VIEWPORT_MARGIN;
    setPos({ x, y });
  }
  function onMouseLeave() {
    setPos(null);
  }

  const popoverStyle: CSSProperties = {
    left: pos?.x ?? 0,
    top: pos?.y ?? 0,
    width: `min(${POPOVER_W}px, calc(100vw - ${2 * VIEWPORT_MARGIN}px))`,
  };

  const popoverClass = alwaysVisible
    ? 'pointer-events-none fixed z-50'
    : 'pointer-events-none fixed z-50 2xl:hidden';
  const popover = pos && image ? (
    <div className={popoverClass} style={popoverStyle}>
      <div
        style={{
          aspectRatio: '5/7',
          background: `center/contain no-repeat url("${image}"), var(--bg-3)`,
          border: `1px solid ${hot ? 'var(--accent)' : 'var(--line)'}`,
          boxShadow:
            '0 16px 50px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklch, var(--accent) 10%, transparent)',
        }}
      />
      <div
        className="mt-1.5 px-2 py-1.5 flex items-center justify-between"
        style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
      >
        <Mono
          style={{
            fontSize: 9.5,
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {title ?? 'unknown card'}
        </Mono>
        <Mono style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 8 }}>
          {amount}
        </Mono>
      </div>
    </div>
  ) : null;

  return {
    handlers: image
      ? { onMouseMove, onMouseLeave }
      : { onMouseMove: undefined, onMouseLeave: undefined },
    popover,
  };
}
