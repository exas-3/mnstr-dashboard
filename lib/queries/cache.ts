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

// Bound the key space. Keys are partly request-derived (search q, page,
// limit), so an unbounded map is a slow leak; evict the oldest-inserted
// entries once past the cap (Map preserves insertion order — delete+set on
// write keeps recently-written keys at the tail).
const MAX_ENTRIES = 200;

function evictIfNeeded(): void {
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) return;
    store.delete(oldest);
  }
}

function put<T>(key: string, value: T, ttlMs: number): void {
  store.delete(key);
  store.set(key, { value, expires: Date.now() + ttlMs, refreshing: false });
  evictIfNeeded();
}

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
        .then(value => put(key, value, ttlMs))
        .catch(() => { hit.refreshing = false; }); // keep serving stale on error
    }
    return hit.value;
  }

  // Cold: compute once per key — concurrent cold callers coalesce onto the
  // same in-flight promise instead of stampeding the DB (e.g. a burst of
  // /api/live polls right after a reload).
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      const value = await fn();
      put(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
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
      put(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}
