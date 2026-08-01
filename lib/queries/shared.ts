/* Shared across the query modules: time-window helpers + the window key type.
 * Re-exported from the @/lib/queries barrel. */

export type TimeWindowKey = '1h' | '24h' | '7d' | '30d' | 'all';

export const WINDOW_INTERVAL: Record<TimeWindowKey, string> = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  all: '10 years',
};

export function intervalFor(window: TimeWindowKey): string {
  return WINDOW_INTERVAL[window];
}

/* Escape LIKE metacharacters in user-supplied search text so `%`/`_` in a
 * query string match literally instead of acting as wildcards (a bare "%"
 * would otherwise match — and rank — every row). Values are parameterized,
 * so this is about match semantics, not injection. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, m => '\\' + m);
}

/* Clamp a user-supplied offset/page query param: NaN-safe, non-negative, and
 * bounded so a crafted ?offset=10000000 can't force a full-table scan through
 * a LIMIT/OFFSET pagination path. */
export function clampOffset(raw: string | null, max = 10_000): number {
  const n = parseInt(raw ?? '0', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

