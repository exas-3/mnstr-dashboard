'use client';

import { useEffect } from 'react';
import { Mono } from '@/components/primitives';

/* Root error boundary — catches thrown renders in any segment that lacks its
 * own error.tsx (e.g. /wallets/[addr], whose P&L series query shares the
 * heavy shape that took /wallets down). Same Foil treatment as EmptyState. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] page render failed:', error);
  }, [error]);

  return (
    <div
      className="mx-3 my-6 px-4 py-10 text-center"
      style={{ border: '1px dashed var(--line)', background: 'var(--bg-2)' }}
    >
      <Mono style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.2em', display: 'block' }}>
        SOMETHING BROKE
      </Mono>
      <div
        className="mt-2"
        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-3)' }}
      >
        This section failed to load. It usually recovers on retry.
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
