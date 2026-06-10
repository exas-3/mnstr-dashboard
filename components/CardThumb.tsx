import { type CSSProperties, type ReactNode } from 'react';

/* Shared 5:7 card-image box used by every feed row / grid tile.
 *
 * The proxied image renders as a real <img> so it can lazy-load — off-screen
 * thumbnails aren't fetched on first paint, which trims the initial request
 * count. It sits *under* any overlay `children` (price pills, grade badges)
 * via `isolation:isolate` + a negative z-index, so callers don't need to
 * z-index every overlay element. `var(--bg-3)` backs the letterboxing of the
 * `contain` fit; a diagonal-stripe placeholder shows when there's no image
 * (card-less pulls). Pass `eager` for above-the-fold images (hero, big-hit
 * banner) so they load immediately at high priority. */

const PLACEHOLDER =
  'repeating-linear-gradient(135deg, oklch(0.27 0.012 70), oklch(0.27 0.012 70) 5px, oklch(0.22 0.01 70) 5px, oklch(0.22 0.01 70) 10px)';

interface Props {
  img?: string | null;
  alt?: string | null;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export default function CardThumb({ img, alt, eager, className, style, children }: Props) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        isolation: 'isolate',
        aspectRatio: '5/7',
        background: img ? 'var(--bg-3)' : PLACEHOLDER,
        ...style,
      }}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={alt ?? ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          style={{
            position: 'absolute',
            inset: 0,
            height: '100%',
            width: '100%',
            objectFit: 'contain',
            zIndex: -1,
          }}
        />
      )}
      {children}
    </div>
  );
}
