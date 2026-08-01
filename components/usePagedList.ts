'use client';

/* Shared state machine behind every progressive "load more" list.
 *
 * Pattern: the server SSRs the first page; this hook fetches further pages
 * from an /api route and appends them without a route change (URL params
 * stay stable). Two pagination styles:
 *   - 'page'   — ?page=N endpoints returning { rows, total }. The buffer
 *                starts empty (the SSR'd first page is rendered by the server
 *                above the client component); `remaining` re-syncs against
 *                the server total on every fetch.
 *   - 'offset' — ?offset=N endpoints returning { rows }. The buffer is
 *                seeded with the SSR'd rows and `remaining` is derived from
 *                the caller-supplied `total`.
 *
 * Defensive dedupe: any fetched row whose `keyOf` was already appended is
 * dropped, so overlapping fetches can't render duplicate React keys. In
 * 'page' mode the SSR'd first page is shown by the server above the hook's
 * buffer, so we never see those keys here — we only need to dedupe within
 * our own pages. Rows with a falsy key are dropped entirely (e.g. tier
 * outliers with a NULL card_slug).
 */

import { useState } from 'react';

export type PagedListOptions<T> = {
  /** Endpoint base — path params (slug / addr / tier) baked in by the caller. */
  url: string;
  /** Extra query params; falsy values are omitted. */
  params?: Record<string, string | undefined>;
  pageSize: number;
  /** Stable identity per row for the defensive dedupe. */
  keyOf: (row: T) => string | null | undefined;
} & (
  | {
      mode: 'page';
      /** Rows still uncounted after the SSR'd page(s). */
      initialRemaining: number;
      /** Last page index already shown (0-based). Server SSRs page 0. */
      initialPage: number;
    }
  | {
      mode: 'offset';
      /** SSR'd rows — seed the buffer; offsets continue from rows.length. */
      initialRows: T[];
      /** Total dataset size; `remaining` = total − rows shown. */
      total: number;
    }
);

export function usePagedList<T>(opts: PagedListOptions<T>) {
  const { url, params, pageSize, keyOf } = opts;
  const [rows, setRows] = useState<T[]>(opts.mode === 'offset' ? opts.initialRows : []);
  const [page, setPage] = useState(opts.mode === 'page' ? opts.initialPage : 0);
  const [pagedRemaining, setPagedRemaining] = useState(
    opts.mode === 'page' ? opts.initialRemaining : 0,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining =
    opts.mode === 'offset' ? Math.max(0, opts.total - rows.length) : pagedRemaining;
  const nextBatch = Math.min(remaining, pageSize);

  async function loadMore() {
    if (loading || remaining === 0) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (opts.mode === 'page') qs.set('page', String(page + 1));
      else qs.set('offset', String(rows.length));
      for (const [k, v] of Object.entries(params ?? {})) {
        if (v) qs.set(k, v);
      }
      const res = await fetch(`${url}?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rows: T[]; total: number };
      setRows(prev => {
        const seen = new Set(prev.map(keyOf));
        const fresh = data.rows.filter(r => {
          const k = keyOf(r);
          return !!k && !seen.has(k);
        });
        return [...prev, ...fresh];
      });
      if (opts.mode === 'page') {
        setPage(p => p + 1);
        // rows.length is the pre-append length (closure state) + the raw
        // fetched count — i.e. what the server has handed out so far,
        // independent of any dedupe drops.
        const shown = (opts.initialPage + 1) * pageSize + rows.length + data.rows.length;
        setPagedRemaining(Math.max(0, data.total - shown));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }

  return { rows, setRows, remaining, nextBatch, loading, error, loadMore };
}
