import { cache } from 'react';
import { sql } from '@/db/client';
import { ttlCache, ttlRefresh } from './cache';
import { escapeLike } from './shared';
import { WALLETS_PAGE_SIZE } from '@/lib/constants';
import type { HitRow } from './overview';

/* ─────────────────────────────────────────────────────────────
 * Wallets — leaderboard, KPIs, detail.
 *
 *   Net P&L = realized on-chain USDm cashflow (from `wallet_pnl` view)
 *             + held cards marked to current FMV × per-tier buyback rate.
 *   Spend   = on-chain USDm OUT to mnstr operator (wallet_pnl.realized_out),
 *             which matches SUM(pulls.price_usd) per audit.
 *   Pulls   = COUNT(*).
 *
 * Pre-2026-05-26: net was derived from pulls_enriched.payout_usd, which the
 * view recomputed live as fmv_usd × tier_rate. That drifted on every MnStr
 * FMV re-quote, even for cards that had already been sold back. Switched to
 * the on-chain ground truth via sql/010_usdm_flows + sql/011_wallet_pnl.
 *
 * Sort options: 'pnl' | 'spend' | 'pulls'.
 * ───────────────────────────────────────────────────────────── */

export type WalletSort = 'pnl' | 'spend' | 'pulls';

export interface WalletRow {
  wallet: string;
  handle: string | null;       // username when known, else null (caller renders fallback)
  user_slug: string | null;
  pulls: number;
  spend: number;               // on-chain USDm sent to mnstr operator
  payout: number;              // on-chain USDm received from mnstr operator
  net: number;                 // realized_net + held_fmv (held inventory at raw FMV)
  realizedNet: number;         // on-chain realized cashflow only
  heldPaper: number;           // held-card buyback value (current_fmv × tier_rate)
  spark: number[];             // 12-bucket spark (weekly pulls or weekly net depending on context)
  rank: number;                // rank in current sort order
}

export interface LeaderboardKpis {
  walletsTotal: number;
  top1PctShare: number;        // 0..1 — share of spend held by top 1% wallets
  winnersPct: number;          // 0..1 — fraction of wallets with net > 0
}

/* ── helpers ──────────────────────────────────────────────── */

// ORDER BY against the underlying numeric expressions, not the text-cast
// aliases — otherwise PG sorts lexically and "-100" > "+92". `pnl` uses the
// on-chain-derived total (realized + held paper) from wallet_pnl view.
const ORDER_EXPR: Record<WalletSort, string> = {
  pnl:   'COALESCE(wp.total_net, 0)',
  spend: 'COALESCE(wp.realized_out, SUM(p.price_usd))',
  pulls: 'COUNT(*)',
};

/* ─────────────────────────────────────────────────────────────
 * Leaderboard — paged.
 * Search matches against username OR wallet prefix.
 * ───────────────────────────────────────────────────────────── */

export interface LeaderboardPage {
  rows: WalletRow[];
  total: number;        // total matching wallets (for "X wallets" + pagination)
}

// 60s in-process cache for the heavy, slowly-changing board aggregation (it
// recomputes pulls_enriched + wallet_pnl + per-wallet sparklines per request).
// Searches (q) bypass it — rare, expected live, and would grow the key space.
// ttlCache is stale-while-revalidate, so only the first request after a reload
// actually waits; the board only moves as the poller indexes new pulls.
const LEADERBOARD_TTL_MS = 60_000;

export function getLeaderboard(
  sort: WalletSort,
  page: number,
  pageSize: number,
  q?: string,
): Promise<LeaderboardPage> {
  if (q && q.trim()) return computeLeaderboard(sort, page, pageSize, q);
  return ttlCache(`lb:${sort}:${page}:${pageSize}`, LEADERBOARD_TTL_MS, () =>
    computeLeaderboard(sort, page, pageSize));
}

// Background refresh: recompute the default board (pnl, page 0) + KPIs on a
// fixed 60s cadence, so every request reads an always-warm, <60s-fresh value
// from cache — the board is computed once a minute, never per request. Other
// sorts/pages stay request-driven via ttlCache (≤ once per TTL). Started once
// at server boot by instrumentation.ts; ttlRefresh coalesces so an overlapping
// tick can't stack a second compute.
const SSR_PAGE_SIZE = WALLETS_PAGE_SIZE;
// The timer refreshes every LEADERBOARD_TTL_MS; store the timed entries with a
// longer TTL so they never lapse between ticks — no request falls into a stale
// window and triggers a second, off-cadence recompute. Exactly one compute per
// minute, with cushion if a tick is ever late or slow.
const LEADERBOARD_REFRESH_TTL_MS = LEADERBOARD_TTL_MS * 3;

async function refreshLeaderboardCache(): Promise<void> {
  await Promise.all([
    ttlRefresh(`lb:pnl:0:${SSR_PAGE_SIZE}`, LEADERBOARD_REFRESH_TTL_MS, () =>
      computeLeaderboard('pnl', 0, SSR_PAGE_SIZE)),
    ttlRefresh('lb:kpis', LEADERBOARD_REFRESH_TTL_MS, computeLeaderboardKpis),
  ]);
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;
export function startLeaderboardRefresh(): void {
  if (refreshTimer) return;
  const tick = () =>
    refreshLeaderboardCache().catch(err =>
      console.warn('[leaderboard] cache refresh failed:', (err as Error)?.message));
  tick(); // warm immediately on boot
  refreshTimer = setInterval(tick, LEADERBOARD_TTL_MS);
  refreshTimer.unref?.();
}

async function computeLeaderboard(
  sort: WalletSort,
  page: number,
  pageSize: number,
  q?: string,
): Promise<LeaderboardPage> {
  const offset = page * pageSize;
  // Tiebreaker on `wallet` so the same address can't show up in two pages
  // when the primary sort metric has ties. Otherwise React sees duplicate
  // keys after Load More.
  const orderSql = sql`ORDER BY ${sql.unsafe(ORDER_EXPR[sort])} DESC, wallet ASC`;

  const ql = q?.trim().toLowerCase();
  const filterSql = ql
    ? sql`HAVING LOWER(COALESCE(MAX(p.username), '')) LIKE ${'%' + escapeLike(ql) + '%'}
           OR LOWER(p.wallet) LIKE ${escapeLike(ql) + '%'}`
    : sql``;

  const rows = await sql<Array<{
    wallet: string;
    handle: string | null;
    user_slug: string | null;
    pulls: number;
    spend: string;
    payout: string;
    realized_net: string;
    held_paper: string;
    net: string;
  }>>`
    SELECT
      p.wallet                              AS wallet,
      MAX(p.username)                       AS handle,
      MAX(p.user_slug)                      AS user_slug,
      COUNT(*)::int                         AS pulls,
      COALESCE(wp.realized_out, SUM(p.price_usd))::text  AS spend,
      COALESCE(wp.realized_in, 0)::text                  AS payout,
      COALESCE(wp.realized_net, -SUM(p.price_usd))::text AS realized_net,
      COALESCE(wp.held_paper, 0)::text                   AS held_paper,
      COALESCE(wp.total_net, -SUM(p.price_usd))::text    AS net
    FROM pulls_enriched p
    LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
    GROUP BY p.wallet, wp.realized_in, wp.realized_out, wp.realized_net, wp.held_paper, wp.total_net
    ${filterSql}
    ${orderSql}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const [count] = await sql<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total FROM (
      SELECT p.wallet
      FROM pulls_enriched p
      GROUP BY p.wallet
      ${filterSql}
    ) t
  `;

  // Cumulative spark per wallet (one point per active day, sum of the
  // sort metric — pulls, spend or net P&L).
  const wallets = rows.map(r => r.wallet);
  const sparkByWallet = wallets.length > 0
    ? await sparkForWallets(wallets, sort)
    : new Map<string, number[]>();

  return {
    rows: rows.map((r, i) => ({
      wallet: r.wallet,
      handle: r.handle,
      user_slug: r.user_slug,
      pulls: r.pulls,
      spend: Number(r.spend),
      payout: Number(r.payout),
      realizedNet: Number(r.realized_net),
      heldPaper: Number(r.held_paper),
      net: Number(r.net),
      spark: sparkByWallet.get(r.wallet) ?? [],
      rank: offset + i + 1,
    })),
    total: count?.total ?? 0,
  };
}

/* Per-wallet sparkline points — cumulative running total of the chosen
 * metric, daily resolution, starting at the wallet's first pull.
 *
 * The chart axis is each wallet's own timeline: 1 point per active day.
 * Inactive days are skipped (we don't pad with zeros) so the line slope
 * visually maps to "how aggressively did they accumulate while playing".
 */
async function sparkForWallets(
  wallets: string[],
  sort: WalletSort,
): Promise<Map<string, number[]>> {
  // 'pnl' tracks the portfolio-net trajectory (matches the wallet-detail
  // chart's PULLS view: one step per pull/sellback/buy, ends at the headline
  // net), so the leaderboard spark and the big chart agree.
  if (sort === 'pnl') return pnlSparkForWallets(wallets);

  // 'pulls' / 'spend' stay as cumulative daily lines.
  const rows = sort === 'pulls'
    ? await sql<Array<{ wallet: string; day: string; delta: number }>>`
        SELECT
          wallet,
          to_char(date_trunc('day', pulled_at), 'YYYY-MM-DD') AS day,
          COUNT(*)::int                                       AS delta
        FROM pulls_enriched
        WHERE wallet IN ${sql(wallets)}
        GROUP BY wallet, day
        ORDER BY wallet, day
      `
    : await sql<Array<{ wallet: string; day: string; delta: number }>>`
        SELECT
          wallet,
          to_char(date_trunc('day', ts), 'YYYY-MM-DD')                            AS day,
          COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'out'), 0)::float    AS delta
        FROM usdm_flows
        WHERE wallet IN ${sql(wallets)}
        GROUP BY wallet, day
        ORDER BY wallet, day
      `;
  const map = new Map<string, number[]>();
  for (const w of wallets) map.set(w, []);
  let runningSum = 0;
  let runningWallet: string | null = null;
  for (const r of rows) {
    if (r.wallet !== runningWallet) {
      runningSum = 0;
      runningWallet = r.wallet;
    }
    runningSum += Number(r.delta);
    map.get(r.wallet)!.push(runningSum);
  }
  return map;
}

const SPARK_POINTS = 28;
function downsampleSpark(arr: number[], n = SPARK_POINTS): number[] {
  if (arr.length <= n) return arr;
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(arr[Math.round((k / (n - 1)) * (arr.length - 1))]);
  return out;
}

/* Portfolio-net spark per wallet — same merged event model as
 * getWalletPnlSeries (pull = fmv−price, sellback = payout−fmv, marketplace
 * buy = fmv−price, plus naked operator cash), in event order, downsampled.
 * Each spark therefore ends at the wallet's headline Net P&L. */
async function pnlSparkForWallets(wallets: string[]): Promise<Map<string, number[]>> {
  const rows = await sql<Array<{ wallet: string; d: number }>>`
    SELECT wallet, d FROM (
      SELECT wallet, pulled_at AS t,
             (COALESCE(fmv_usd, 0) - COALESCE(price_usd, 0))::float8 AS d
      FROM pulls_enriched WHERE wallet IN ${sql(wallets)}
      UNION ALL
      -- Payout booked here ONLY when the sellback is linked on-chain — the
      -- matched transfer is excluded from the cash branch below. When UNLINKED,
      -- book 0 and let the real USDm-in flow through the cash branch instead
      -- (same guard as getWalletPnlSeries; without it the payout counts twice).
      SELECT pe.wallet, COALESCE(pf.ts, GREATEST(pe.sold_at, pe.pulled_at)),
             ((CASE WHEN pe.payout_tx_hash IS NOT NULL THEN COALESCE(pe.payout_usd, 0) ELSE 0 END)
               - COALESCE(pe.fmv_usd, 0))::float8
      FROM pulls_enriched pe
      LEFT JOIN usdm_flows pf ON pf.tx_hash = pe.payout_tx_hash AND pf.direction = 'in'
      WHERE pe.wallet IN ${sql(wallets)} AND pe.status = 'sold_back' AND pe.sold_at IS NOT NULL
      UNION ALL
      SELECT ms.buyer, ms.bought_at,
             (COALESCE(cf.fmv, 0) - COALESCE(ms.price_usd, 0))::float8
      FROM marketplace_sales ms
      JOIN cards c ON c.serial_number = ms.serial_number
      LEFT JOIN LATERAL (SELECT MAX(p.fmv_usd) AS fmv FROM pulls p WHERE p.card_slug = c.slug) cf ON TRUE
      WHERE ms.buyer IN ${sql(wallets)}
      UNION ALL
      SELECT f.wallet, f.ts,
             (CASE WHEN f.direction = 'in' THEN f.amount_usd ELSE -f.amount_usd END)::float8
      FROM usdm_flows f
      WHERE f.wallet IN ${sql(wallets)}
        AND NOT (f.direction = 'out' AND EXISTS (
          SELECT 1 FROM pulls p WHERE p.wallet = f.wallet AND p.block_number = f.block_number))
        AND NOT (f.direction = 'out' AND EXISTS (
          SELECT 1 FROM marketplace_sales ms WHERE ms.buyer = f.wallet AND ms.block_number = f.block_number))
        AND NOT (f.direction = 'in' AND EXISTS (
          SELECT 1 FROM sellbacks s WHERE s.player = f.wallet AND s.payout_tx_hash = f.tx_hash))
    ) ev ORDER BY wallet, t
  `;
  const full = new Map<string, number[]>();
  for (const w of wallets) full.set(w, []);
  let run = 0;
  let cur: string | null = null;
  for (const r of rows) {
    if (r.wallet !== cur) { run = 0; cur = r.wallet; }
    run += Number(r.d);
    full.get(r.wallet)!.push(Math.round(run * 100) / 100);
  }
  const map = new Map<string, number[]>();
  for (const [w, arr] of full) map.set(w, downsampleSpark(arr));
  return map;
}

/* ─────────────────────────────────────────────────────────────
 * Wallet search — the lightweight query behind /api/search.
 *
 * The overlay only needs (wallet, handle, net, spend, pulls); routing every
 * keystroke through computeLeaderboard also ran the 4-branch P&L-spark UNION
 * for rows whose sparks the search route then threw away, uncached (~1s per
 * keystroke, public endpoint). This aggregates `pulls` directly (no
 * pulls_enriched joins — status/payout aren't needed) against the wallet_pnl
 * matview, and a short TTL collapses hammering on the same query.
 * ───────────────────────────────────────────────────────────── */

export interface WalletSearchRow {
  wallet: string;
  handle: string | null;
  net: number;
  spend: number;
  pulls: number;
}

const SEARCH_TTL_MS = 10_000;

export function searchWallets(q: string, limit: number): Promise<WalletSearchRow[]> {
  const ql = q.trim().toLowerCase();
  if (!ql) return Promise.resolve([]);
  return ttlCache(`wsearch:${ql}:${limit}`, SEARCH_TTL_MS, async () => {
    const rows = await sql<Array<{
      wallet: string;
      handle: string | null;
      net: string;
      spend: string;
      pulls: number;
    }>>`
      SELECT
        p.wallet,
        MAX(p.username)                                    AS handle,
        COALESCE(wp.total_net, -SUM(p.price_usd))::text    AS net,
        COALESCE(wp.realized_out, SUM(p.price_usd))::text  AS spend,
        COUNT(*)::int                                      AS pulls
      FROM pulls p
      LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
      GROUP BY p.wallet, wp.total_net, wp.realized_out
      HAVING LOWER(COALESCE(MAX(p.username), '')) LIKE ${'%' + escapeLike(ql) + '%'}
          OR p.wallet LIKE ${escapeLike(ql) + '%'}
      ORDER BY COALESCE(wp.total_net, -SUM(p.price_usd)) DESC, p.wallet ASC
      LIMIT ${limit}
    `;
    return rows.map(r => ({
      wallet: r.wallet,
      handle: r.handle,
      net: Number(r.net),
      spend: Number(r.spend),
      pulls: r.pulls,
    }));
  });
}

export function getLeaderboardKpis(): Promise<LeaderboardKpis> {
  return ttlCache('lb:kpis', LEADERBOARD_TTL_MS, computeLeaderboardKpis);
}

async function computeLeaderboardKpis(): Promise<LeaderboardKpis> {
  // Spend comes from on-chain USDm OUT (wallet_pnl.realized_out, matches DB
  // sum-of-price_usd per audit). Net comes from wallet_pnl.total_net so the
  // winners % uses the same definition as the leaderboard and detail pages.
  const [r] = await sql<Array<{
    total: number;
    top1pct_share: string | null;
    winners: number;
  }>>`
    WITH per_wallet AS (
      SELECT
        p.wallet,
        COALESCE(wp.realized_out, SUM(p.price_usd))           AS spend,
        COALESCE(wp.total_net,   -SUM(p.price_usd))           AS net
      FROM pulls_enriched p
      LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
      GROUP BY p.wallet, wp.realized_out, wp.total_net
    ),
    ranked AS (
      SELECT *, ntile(100) OVER (ORDER BY spend DESC) AS pct
      FROM per_wallet
    )
    SELECT
      (SELECT COUNT(*)::int FROM per_wallet)                                     AS total,
      (SELECT (SUM(spend) FILTER (WHERE pct = 1) / NULLIF(SUM(spend), 0))::text  FROM ranked) AS top1pct_share,
      (SELECT COUNT(*)::int FROM per_wallet WHERE net > 0)                        AS winners
  `;
  const total = r?.total ?? 0;
  return {
    walletsTotal: total,
    top1PctShare: r?.top1pct_share ? Number(r.top1pct_share) : 0,
    winnersPct: total > 0 ? (r?.winners ?? 0) / total : 0,
  };
}

/* ─────────────────────────────────────────────────────────────
 * P&L ladder — for the diverging-bar chart on /wallets.
 * Top-K by absolute net; sorted with positives first then negatives.
 * ───────────────────────────────────────────────────────────── */

/* Ladder data shape — one bar per row. `value` is the metric (pnl/spend/pulls).
 * For 'pnl' the table returns both winners (positive) and losers (negative);
 * for 'spend' and 'pulls' only the top-K (all positive). */
export interface LadderRow {
  wallet: string;
  handle: string | null;
  value: number;
}

/* Ladder data — mirrors the leaderboard's current sort. Top-K wallets only;
 * value is positive for pnl winners and negative for losers (kept in case we
 * ever re-add the split view), but the renderer ignores sign and shows
 * magnitude as a ranked bar. */
export async function getLadder(sort: WalletSort, k = 500): Promise<LadderRow[]> {
  if (sort === 'spend') {
    // Spend = USDm OUT to operator. Falls back to SUM(price_usd) for wallets
    // not yet captured by the on-chain backfill.
    return sql<LadderRow[]>`
      SELECT
        p.wallet,
        MAX(p.username)                                                      AS handle,
        COALESCE(wp.realized_out, SUM(p.price_usd))::float                   AS value
      FROM pulls_enriched p
      LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
      GROUP BY p.wallet, wp.realized_out
      ORDER BY value DESC, p.wallet ASC
      LIMIT ${k}
    `;
  }
  if (sort === 'pulls') {
    return sql<LadderRow[]>`
      SELECT wallet, MAX(username) AS handle, COUNT(*)::float AS value
      FROM pulls_enriched
      GROUP BY wallet
      ORDER BY value DESC, wallet ASC
      LIMIT ${k}
    `;
  }
  // pnl: top-K wallets by total_net (realized + held paper).
  return sql<LadderRow[]>`
    SELECT
      p.wallet,
      MAX(p.username)                                          AS handle,
      COALESCE(wp.total_net, -SUM(p.price_usd))::float         AS value
    FROM pulls_enriched p
    LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
    GROUP BY p.wallet, wp.total_net
    ORDER BY value DESC, p.wallet ASC
    LIMIT ${k}
  `;
}

/** @deprecated Use {@link getLadder} with sort='pnl' */
export const getPnlLadder = (k = 25) => getLadder('pnl', k);

/* ─────────────────────────────────────────────────────────────
 * Wallet detail
 * ───────────────────────────────────────────────────────────── */

export interface WalletDetail {
  wallet: string;
  handle: string | null;
  user_slug: string | null;
  rank: number;                  // P&L rank in the global leaderboard (1 = top)
  pulls: number;
  spend: number;                 // on-chain USDm OUT to mnstr operator
  payout: number;                // on-chain USDm IN from mnstr operator
  realizedNet: number;           // payout - spend (immutable once on-chain)
  heldPaper: number;             // held cards at buyback rate (current_fmv × tier_rate)
  net: number;                   // realizedNet + held FMV — matches leaderboard total_net
  vaultFmv: number;              // raw FMV of held cards (no buyback adjustment) — for display
  bigHits: number;
  tierMix: Array<{ tier: string; pulls: number }>;
  collection: HitRow[];          // top fmv pulls (up to 9)
  collectionTotal: number;
  recent: HitRow[];              // newest pulls first (up to 12)
}

/* Paginated recent-pulls for a single wallet — used by getWalletDetail for
 * the first page AND by /api/wallets/[addr]/pulls for the "show more"
 * button on the wallet detail page. ORDER BY pulled_at DESC with a
 * tie-breaker on request_id so paged requests are deterministic. */
export async function getWalletRecentPulls(
  wallet: string,
  offset: number,
  limit: number,
): Promise<HitRow[]> {
  const addr = wallet.toLowerCase();
  return sql<HitRow[]>`
    SELECT
      p.request_id::text  AS request_id,
      p.tier,
      p.card_slug,
      c.title             AS card_title,
      c.card_set          AS card_set,
      c.image_front       AS card_image_front,
      p.username, p.user_slug, p.wallet,
      p.price_usd::text   AS price_usd,
      p.fmv_usd::text     AS fmv_usd,
      p.payout_usd::text  AS payout_usd,
      p.status,
      p.pulled_at::text   AS pulled_at
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.wallet = ${addr}
    ORDER BY p.pulled_at DESC, p.request_id DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;
}

// React cache(): generateMetadata and the page body both call this per
// render — without the wrap each ran the full detail aggregation (incl. the
// global RANK() query) twice per request. cache() shares one execution per
// request; raw postgres.js calls get no fetch()-style dedup from Next.
export const getWalletDetail = cache(async function getWalletDetail(
  wallet: string,
): Promise<WalletDetail | null> {
  const addr = wallet.toLowerCase();
  // Aggregations split: pulls-side (pulls, vault_fmv, big_hits) come from
  // pulls_enriched. Realized cashflow (spend, payout, realized_net) +
  // held_paper come from the on-chain-backed wallet_pnl view.
  const [agg] = await sql<Array<{
    handle: string | null;
    user_slug: string | null;
    pulls: number;
    vault_fmv: string;
    big_hits: number;
    spend: string;
    payout: string;
    realized_net: string;
    held_paper: string;
    total_net: string;
    mp_held_fmv: string;
  }>>`
    SELECT
      MAX(p.username)                                                          AS handle,
      MAX(p.user_slug)                                                         AS user_slug,
      COUNT(*)::int                                                            AS pulls,
      -- Held FMV = pulled cards still holding + marketplace-bought slabs the
      -- wallet still owns (mp_held_fmv from wallet_pnl).
      (COALESCE(SUM(p.fmv_usd) FILTER (WHERE p.status = 'holding'), 0)
        + COALESCE(MAX(wp.mp_held_fmv), 0))::text                              AS vault_fmv,
      COUNT(*) FILTER (WHERE p.fmv_usd >= 1000)::int                           AS big_hits,
      COALESCE(MAX(wp.realized_out), SUM(p.price_usd))::text                   AS spend,
      COALESCE(MAX(wp.realized_in), 0)::text                                   AS payout,
      COALESCE(MAX(wp.realized_net), -SUM(p.price_usd))::text                  AS realized_net,
      COALESCE(MAX(wp.held_paper), 0)::text                                    AS held_paper,
      COALESCE(MAX(wp.total_net), -SUM(p.price_usd))::text                     AS total_net,
      COALESCE(MAX(wp.mp_held_fmv), 0)::text                                   AS mp_held_fmv
    FROM pulls_enriched p
    LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
    WHERE p.wallet = ${addr}
  `;
  if (!agg || agg.pulls === 0) return null;

  // P&L rank — matches the leaderboard's default sort (total_net DESC).
  // Restrict to wallets with at least one pull so treasury/mnstr-internal
  // addresses (which have flows but no pulls) don't pollute the ranking.
  const [rankRow] = await sql<Array<{ rank: number }>>`
    SELECT rank FROM (
      SELECT
        p.wallet,
        RANK() OVER (ORDER BY COALESCE(wp.total_net, -SUM(p.price_usd)) DESC) AS rank
      FROM pulls_enriched p
      LEFT JOIN wallet_pnl wp ON wp.wallet = p.wallet
      GROUP BY p.wallet, wp.total_net
    ) t WHERE wallet = ${addr}
  `;
  const tierMix = await sql<Array<{ tier: string; pulls: number }>>`
    SELECT tier, COUNT(*)::int AS pulls FROM pulls_enriched
    WHERE wallet = ${addr}
    GROUP BY tier ORDER BY tier
  `;
  const collection = await sql<HitRow[]>`
    SELECT
      p.request_id::text  AS request_id,
      p.tier,
      p.card_slug,
      c.title             AS card_title,
      c.card_set          AS card_set,
      c.image_front       AS card_image_front,
      p.username, p.user_slug, p.wallet,
      p.price_usd::text   AS price_usd,
      p.fmv_usd::text     AS fmv_usd,
      p.payout_usd::text  AS payout_usd,
      p.status,
      p.pulled_at::text   AS pulled_at
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.wallet = ${addr} AND p.fmv_usd IS NOT NULL
    ORDER BY p.fmv_usd DESC
    LIMIT 9
  `;
  const recent = await getWalletRecentPulls(addr, 0, 12);

  return {
    wallet: addr,
    handle: agg.handle,
    user_slug: agg.user_slug,
    rank: rankRow?.rank ?? 0,
    pulls: agg.pulls,
    spend: Number(agg.spend),
    payout: Number(agg.payout),
    realizedNet: Number(agg.realized_net),
    heldPaper: Number(agg.held_paper),
    net: Number(agg.total_net),
    vaultFmv: Number(agg.vault_fmv),
    bigHits: agg.big_hits,
    tierMix,
    collection,
    collectionTotal: agg.pulls,
    recent,
  };
});

/* ─────────────────────────────────────────────────────────────
 * Wallet P&L series — cumulative "portfolio net" over the wallet's
 * lifetime, one point per event, for the chart on /wallets/[addr].
 *
 * Portfolio net(t) = realized cash(t) + FMV of cards held(t). Each pull /
 * sellback / buy is a SINGLE merged event so the curve steps smoothly:
 *   - pull        Δ = fmv − price            (acquire a card, pay the pack)
 *   - sellback    Δ = payout − fmv           (give the card back, get paid)
 *   - marketplace Δ = fmv − price            (acquire a slab, pay for it)
 * Merging the two legs matters: a sellback's FMV-removal (NFTSoldBack) and its
 * cash payout settle in different txs seconds apart, so emitting them
 * separately made the net momentarily crater (remove $9.6k FMV, then add $7.5k
 * cash) before recovering — a spurious spike. As one event it's just the real
 * −$2.1k step.
 *
 * Any operator↔wallet USDm flow NOT tied to a pull/sellback/buy (deposits,
 * withdrawals, refunds) is added as a `cash` event so the total still converges
 * to realized_net + held_fmv + mp_held_fmv = the headline Net P&L. (Wallet↔
 * wallet transfers never appear here — usdm_flows only mirrors operator legs.)
 * ───────────────────────────────────────────────────────────── */
export interface WalletPnlPoint {
  ts: number;                  // event time, epoch ms (for the time axis)
  i: number;                   // cumulative pull+sell count (the pulls&sells axis)
  net: number;                 // cumulative portfolio net P&L, USD
  kind: 'pull' | 'sellback' | 'cash' | 'buy';
  card?: string | null;        // card title for pull / sellback / buy events
  cardSlug?: string | null;    // card slug (for /img/{slug} in the tooltip)
}

export async function getWalletPnlSeries(wallet: string): Promise<WalletPnlPoint[]> {
  const addr = wallet.toLowerCase();
  const rows = await sql<Array<{ t: string; d: number; kind: 'pull' | 'sellback' | 'cash' | 'buy'; card: string | null; card_slug: string | null }>>`
    -- Pull: acquire a card at its FMV, pay the pack price (one merged step).
    -- A "quick flip" (sold back within 1h) is OMITTED here and booked instead
    -- as one round-trip SELL in the sellback branch — so it reads as a single
    -- red sell, never a pull, and never leaves a candle card-less. The sell
    -- time is taken the way the sellback branch books it (payout tx, else the
    -- clamped sold_at) so the two branches agree on what counts as <1h.
    SELECT pe.pulled_at::text AS t,
           (COALESCE(pe.fmv_usd, 0) - COALESCE(pe.price_usd, 0))::float8 AS d,
           'pull'::text AS kind,
           COALESCE(c.title, pe.card_slug) AS card,
           pe.card_slug AS card_slug
    FROM pulls_enriched pe
    LEFT JOIN cards c ON c.slug = pe.card_slug
    LEFT JOIN usdm_flows pf ON pf.tx_hash = pe.payout_tx_hash AND pf.direction = 'in'
    WHERE pe.wallet = ${addr}
      AND NOT (pe.status = 'sold_back' AND pe.sold_at IS NOT NULL
               AND COALESCE(pf.ts, GREATEST(pe.sold_at, pe.pulled_at)) < pe.pulled_at + interval '1 hour')
    UNION ALL
    -- Sellback: give the card back, receive the payout — booked at the payout
    -- settlement time so the cash and the FMV-removal land together (no spike).
    -- Clamp away any bogus 1970 sold_at (a sellback can't precede its pull).
    -- A quick flip's pull was omitted above, so book the FULL round-trip here
    -- (payout − price); a held sell only books payout − fmv (its pull already
    -- booked fmv − price). Same <1h test as the pull branch's exclusion.
    --
    -- The payout term is booked here ONLY when the sellback is LINKED on-chain
    -- (payout_tx_hash set) — that exact transfer is then excluded from the cash
    -- branch below, so the payout counts once. When UNLINKED (e.g. the payout
    -- settled outside the linker's block window), book 0 here and let the real
    -- transfer flow through the cash branch instead. Otherwise the modeled payout
    -- AND the real USDm-in both count, double-counting the payout — a big
    -- sold-back card then reads as ~2× its value on the chart.
    SELECT COALESCE(pf.ts, GREATEST(pe.sold_at, pe.pulled_at))::text,
           ((CASE WHEN pe.payout_tx_hash IS NOT NULL THEN COALESCE(pe.payout_usd, 0) ELSE 0 END)
             - CASE WHEN COALESCE(pf.ts, GREATEST(pe.sold_at, pe.pulled_at)) < pe.pulled_at + interval '1 hour'
                    THEN COALESCE(pe.price_usd, 0)
                    ELSE COALESCE(pe.fmv_usd, 0) END)::float8,
           'sellback',
           COALESCE(c.title, pe.card_slug),
           pe.card_slug
    FROM pulls_enriched pe
    LEFT JOIN usdm_flows pf ON pf.tx_hash = pe.payout_tx_hash AND pf.direction = 'in'
    LEFT JOIN cards c ON c.slug = pe.card_slug
    WHERE pe.wallet = ${addr} AND pe.status = 'sold_back' AND pe.sold_at IS NOT NULL
    UNION ALL
    -- Marketplace buy: acquire the slab at current FMV, pay the price.
    SELECT ms.bought_at::text,
           (COALESCE(cf.fmv, 0) - COALESCE(ms.price_usd, 0))::float8,
           'buy',
           COALESCE(c.title, c.slug),
           c.slug
    FROM marketplace_sales ms
    JOIN cards c ON c.serial_number = ms.serial_number
    LEFT JOIN LATERAL (SELECT MAX(p.fmv_usd) AS fmv FROM pulls p WHERE p.card_slug = c.slug) cf ON TRUE
    WHERE ms.buyer = ${addr}
    UNION ALL
    -- Naked operator cash: USDm in/out NOT already accounted for by a pull
    -- (pack spend, same block), a marketplace buy (same block), or a sellback
    -- payout (matched tx). These are deposits / withdrawals / refunds.
    SELECT f.ts::text,
           (CASE WHEN f.direction = 'in' THEN f.amount_usd ELSE -f.amount_usd END)::float8,
           'cash',
           NULL::text,
           NULL::text
    FROM usdm_flows f
    WHERE f.wallet = ${addr}
      AND NOT (f.direction = 'out' AND EXISTS (
        SELECT 1 FROM pulls p WHERE p.wallet = f.wallet AND p.block_number = f.block_number))
      AND NOT (f.direction = 'out' AND EXISTS (
        SELECT 1 FROM marketplace_sales ms WHERE ms.buyer = f.wallet AND ms.block_number = f.block_number))
      AND NOT (f.direction = 'in' AND EXISTS (
        SELECT 1 FROM sellbacks s WHERE s.player = f.wallet AND s.payout_tx_hash = f.tx_hash))
    ORDER BY t ASC
  `;
  if (rows.length === 0) return [];

  const series: WalletPnlPoint[] = [];
  let net = 0;
  let seq = 0; // pulls + sells + buys (card events); cash flows don't advance it
  for (const r of rows) {
    if (r.kind !== 'cash') seq++;
    net += r.d;
    series.push({
      ts: Date.parse(r.t),
      i: seq,
      net: Math.round(net * 100) / 100,
      kind: r.kind,
      card: r.card,
      cardSlug: r.card_slug,
    });
  }
  return series;
}

