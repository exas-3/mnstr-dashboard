import { type CSSProperties } from 'react';

/* Pulsing placeholder block for route loading skeletons (app/**\/loading.tsx).
 * Matches the surface of real tiles/rows (--bg-2 + --line-soft) so the swap to
 * real content is seamless. */
export function Sk({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse ${className ?? ''}`}
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line-soft)', ...style }}
    />
  );
}
