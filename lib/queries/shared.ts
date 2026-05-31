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

