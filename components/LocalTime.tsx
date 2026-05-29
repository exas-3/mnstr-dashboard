'use client';

/* Centralized local-time rendering.
 *
 * Why this exists: Next.js SSR renders on a server in a fixed timezone, but
 * each browser may be in a different one. We want the dashboard to display
 * times in the user's local clock without any UTC / city labels.
 *
 * Hydration pattern: every renderer outputs a UTC string during SSR (and the
 * client's first render, when `mounted = false`). The `useEffect` flips
 * `mounted` post-hydration, triggering a re-render with the user's local time.
 * SSR + first-pass client render produce byte-identical HTML, so React doesn't
 * throw a hydration mismatch. The visible swap UTC → local is brief and
 * happens at the same instant for every <LocalTime> on the page.
 *
 * No Intl.DateTimeFormat — Node's ICU and V8's ICU emit different strings for
 * the same input in some locales, which breaks hydration. Manual formatters
 * sidestep that entirely. */

import { useEffect, useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export type LocalTimeFormat =
  | 'time'              // 14:32
  | 'date'              // May 27
  | 'date-weekday'      // Wed · May 27
  | 'date-long'         // Wednesday, May 27
  | 'datetime'          // May 27 · 14:32
  | 'datetime-year'     // 27 May 2026 · 14:32 (used by card activity for older pulls)
  | 'hour-bucket';      // May 27 · 14:00

export function formatLocal(iso: string | Date, format: LocalTimeFormat, local: boolean): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = local ? d.getMonth() : d.getUTCMonth();
  const day = local ? d.getDate() : d.getUTCDate();
  const year = local ? d.getFullYear() : d.getUTCFullYear();
  const wday = local ? d.getDay() : d.getUTCDay();
  const hours = local ? d.getHours() : d.getUTCHours();
  const mins = local ? d.getMinutes() : d.getUTCMinutes();
  switch (format) {
    case 'time':           return `${pad(hours)}:${pad(mins)}`;
    case 'date':           return `${MONTHS[month]} ${day}`;
    case 'date-weekday':   return `${WEEKDAYS_SHORT[wday]} · ${MONTHS[month]} ${day}`;
    case 'date-long':      return `${WEEKDAYS_LONG[wday]}, ${MONTHS[month]} ${day}`;
    case 'datetime':       return `${MONTHS[month]} ${day} · ${pad(hours)}:${pad(mins)}`;
    case 'datetime-year':  return `${day} ${MONTHS[month]} ${year} · ${pad(hours)}:${pad(mins)}`;
    case 'hour-bucket':    return `${MONTHS[month]} ${day} · ${pad(hours)}:00`;
  }
}

/* React component variant — opt-in hydration-safe local clock. */
export default function LocalTime({ iso, format }: { iso: string | Date; format: LocalTimeFormat }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{formatLocal(iso, format, mounted)}</>;
}

/* Hook for chart-axis labels and other inline formatting where a component
 * isn't ergonomic. Returns a stable formatter that re-binds when `mounted`
 * flips, so consumers can pass dates directly to it. */
export function useLocalFormatter(): (iso: string | Date, format: LocalTimeFormat) => string {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (iso, format) => formatLocal(iso, format, mounted);
}

/* Ticking now-clock. Server passes the initial ISO it captured (so SSR and
 * client hydration agree byte-for-byte). Client takes over after mount and
 * displays the user's actual local clock, refreshing every 30s. */
export function LocalClock({ initialIso, format = 'time' }: { initialIso: string; format?: LocalTimeFormat }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) {
    // Pre-mount: render the server's UTC capture so SSR matches first-pass
    // client render. Once `now` populates, the user's local clock takes over.
    return <>{formatLocal(initialIso, format, false)}</>;
  }
  return <>{formatLocal(now, format, true)}</>;
}
