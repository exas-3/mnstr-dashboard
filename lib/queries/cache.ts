/* Tiny in-process cache for expensive, slowly-changing aggregates.
 *
 * The wallet leaderboard recomputes heavy views (pulls_enriched + wallet_pnl)
 * plus per-wallet P&L sparklines on every request (~1s). PM2 runs a single
 * long-lived Next server, so this module-level map is shared across all
 * requests, and the data only moves as the poller indexes new pulls (minutes),
 * so a short TTL is imperceptible.
 *
 * Stale-while-revalidate: once warm, every request returns instantly — a stale
 * hit is served immediately while a single background recompute refreshes it.
 * Only the very first request per key after a reload actually waits. */

interface Entry<T> {
  value: T;
  expires: number;
  refreshing: boolean;
}

// Back the maps with globalThis so they're a single per-process instance shared
// across every bundle — the route handlers and the instrumentation-started
// background refresh load `cache.ts` in separate module graphs, so a plain
// module-level `new Map()` would give each its own (unshared) cache.
const g = globalThis as typeof globalThis & {
  __mnstrCacheStore?: Map<string, Entry<unknown>>;
  __mnstrCacheInflight?: Map<string, Promise<unknown>>;
};
const store = (g.__mnstrCacheStore ??= new Map<string, Entry<unknown>>());
const inflight = (g.__mnstrCacheInflight ??= new Map<string, Promise<unknown>>());

export async function ttlCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit) {
    if (Date.now() < hit.expires) return hit.value; // fresh

    // Stale: trigger at most one background refresh, serve the stale value now.
    if (!hit.refreshing) {
      hit.refreshing = true;
      fn()
        .then(value => store.set(key, { value, expires: Date.now() + ttlMs, refreshing: false }))
        .catch(() => { hit.refreshing = false; }); // keep serving stale on error
    }
    return hit.value;
  }

  // Cold: must compute (only once per key after a reload).
  const value = await fn();
  store.set(key, { value, expires: Date.now() + ttlMs, refreshing: false });
  return value;
}

/* Force a recompute (ignoring any cached TTL), write it to the cache, and
 * coalesce concurrent callers onto a single in-flight compute. Backs the
 * client-side "land the fresh data when ready" revalidation — the board
 * converges to current without every viewer kicking off a separate ~1s query,
 * and the refreshed value also warms the cache that ttlCache (SSR) reads. */
export async function ttlRefresh<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = (async () => {
    try {
      const value = await fn();
      store.set(key, { value, expires: Date.now() + ttlMs, refreshing: false });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
