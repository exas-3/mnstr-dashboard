'use client';

import { useEffect } from 'react';
import { Mono } from '@/components/primitives';

/* Segment error boundary for /wallets. Without one, a thrown server render
 * (e.g. a DB statement timeout) bubbles to Next's unstyled default
 * "Application error" screen. Styling mirrors EmptyState + the Load More
 * button; the Shell/layout persists, only this content region swaps. */
export default function WalletsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[wallets] page render failed:', error);
  }, [error]);

  return (
    <div
      className="mx-3 my-6 px-4 py-10 text-center"
      style={{ border: '1px dashed var(--line)', background: 'var(--bg-2)' }}
    >
      <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.2em', display: 'block' }}>
        LEADERBOARD UNAVAILABLE
      </Mono>
      <div
        className="mt-2"
        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)' }}
      >
        The wallets board took too long to compute. It usually recovers within a minute.
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-block"
        style={{
          padding: '10px 18px',
          color: 'var(--accent)',
          border: '1px solid color-mix(in oklch, var(--accent) 33%, transparent)',
          background: 'color-mix(in oklch, var(--accent) 5%, transparent)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '0.14em',
          cursor: 'pointer',
        }}
      >
        RETRY
      </button>
    </div>
  );
}
