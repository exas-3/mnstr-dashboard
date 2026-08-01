'use client';

/* Shared LOAD MORE / SHOW MORE button + error line for the paged lists
 * (see usePagedList). Two size variants preserve the originals exactly:
 *   - 'lg' — the /cards wall (and the legacy link-variant LoadMore).
 *   - 'sm' — tier outliers / card history / wallet activity / marketplace /
 *            big hits.
 */

import { Mono } from './primitives';

export default function LoadMoreButton({
  show,
  label,
  loading,
  error,
  onClick,
  size = 'sm',
}: {
  /** Whether the button row renders at all (remaining/nextBatch > 0). */
  show: boolean;
  /** Idle label, e.g. `SHOW 10 MORE · 42 LEFT`. */
  label: string;
  loading: boolean;
  error: string | null;
  onClick: () => void;
  size?: 'sm' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    <>
      {show && (
        <div className={lg ? 'px-4 pt-5 pb-2 text-center' : 'px-4 pt-3 pb-1 text-center'}>
          <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={lg ? 'inline-block' : undefined}
            style={{
              padding: lg ? '10px 18px' : '8px 16px',
              color: loading ? 'var(--fg-4)' : 'var(--accent)',
              border: `1px solid ${loading ? 'var(--line)' : 'color-mix(in oklch, var(--accent) 33%, transparent)'}`,
              background: loading ? 'transparent' : 'color-mix(in oklch, var(--accent) 5%, transparent)',
              fontFamily: 'var(--font-mono)',
              fontSize: lg ? 10.5 : 10,
              letterSpacing: '0.14em',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'LOADING…' : label}
          </button>
        </div>
      )}

      {error && (
        <div className={lg ? 'px-4 pt-2 pb-2 text-center' : 'px-4 pt-2 pb-1 text-center'}>
          <Mono style={{ fontSize: 9.5, color: 'var(--negative)' }}>{error}</Mono>
        </div>
      )}
    </>
  );
}
