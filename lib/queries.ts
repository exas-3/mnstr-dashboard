/* Typed query helpers — every helper SELECTs explicit columns. The mocked
 * shapes from the prototype map onto these. Pulse + Live are the v1 surface
 * (Phase 1k). Tiers/Wallets/Cards helpers land in v1.1.
 *
 * Time windows: '24h' / '7d' / '30d' / 'all'. 'all' uses the deploy-block era.
 */

import { sql } from '@/db/client';

export type TimeWindowKey = '1h' | '24h' | '7d' | '30d' | 'all';

const WINDOW_INTERVAL: Record<TimeWindowKey, string> = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
  all: '10 years',
};

function intervalFor(window: TimeWindowKey): string {
  return WINDOW_INTERVAL[window];
}

/* ─────────────────────────────────────────────────────────────
 * KPIs — Pulse header tiles
 * ───────────────────────────────────────────────────────────── */

export interface Kpis {
  packs: number;
  packsAllTime: number;
  usdmCycledUsd: number;       // sum(price_usd) for window
  usdmCycledAllTimeUsd: number;
  payoutUsd: number;            // sum(payout_usd) for sold-back in window
  walletsActive: number;        // distinct wallets in window
}

export async function getKpisFor(window: TimeWindowKey): Promise<Kpis> {
  const interval = intervalFor(window);
  const [w] = await sql<Array<{
    packs: number;
    cycled: string;
    payout: string;
    wallets: number;
  }>>`
    SELECT
      COUNT(*)::int                                                          AS packs,
      COALESCE(SUM(price_usd), 0)::text                                      AS cycled,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text AS payout,
      COUNT(DISTINCT wallet)::int                                            AS wallets
    FROM pulls_enriched
    WHERE pulled_at >= now() - ${interval}::interval
  `;
  const [a] = await sql<Array<{ packs: number; cycled: string }>>`
    SELECT
      COUNT(*)::int                     AS packs,
      COALESCE(SUM(price_usd), 0)::text AS cycled
    FROM pulls_enriched
  `;
  return {
    packs: w?.packs ?? 0,
    packsAllTime: a?.packs ?? 0,
    usdmCycledUsd: Number(w?.cycled ?? 0),
    usdmCycledAllTimeUsd: Number(a?.cycled ?? 0),
    payoutUsd: Number(w?.payout ?? 0),
    walletsActive: w?.wallets ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Velocity by tier — daily pulls per tier, for the stacked-area chart
 * ───────────────────────────────────────────────────────────── */

export interface VelocityPoint {
  day: string;          // ISO date YYYY-MM-DD
  starter: number;
  premium: number;
  ultra: number;
  adventure: number;
}

export async function getVelocityByTier(days = 30): Promise<VelocityPoint[]> {
  const rows = await sql<Array<{ day: string; tier: string; pulls: number }>>`
    SELECT
      to_char(date_trunc('day', pulled_at), 'YYYY-MM-DD') AS day,
      tier,
      COUNT(*)::int                                        AS pulls
    FROM pulls_enriched
    WHERE pulled_at >= now() - (${days} || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1
  `;
  const byDay = new Map<string, VelocityPoint>();
  for (const r of rows) {
    const cur = byDay.get(r.day) ?? { day: r.day, starter: 0, premium: 0, ultra: 0, adventure: 0 };
    if (r.tier === 'Starter')        cur.starter = r.pulls;
    else if (r.tier === 'Premium')   cur.premium = r.pulls;
    else if (r.tier === 'Ultra')     cur.ultra = r.pulls;
    else if (r.tier === 'Adventure') cur.adventure = r.pulls;
    byDay.set(r.day, cur);
  }
  return [...byDay.values()];
}

/* ─────────────────────────────────────────────────────────────
 * Tier strip — pulls + EV (avg payout per pull) + edge per tier
 * ───────────────────────────────────────────────────────────── */

export interface TierStats {
  tier: string;
  price: number;
  pulls: number;
  evUsd: number;        // avg hypothetical payout per pull (fmv × tier-rate / pulls)
  edge: number;         // 1 - hypothetical_payout/revenue (paper mode)
}

/* Pulse TierStrip stats. Uses PAPER payouts (every pull's hypothetical
 * sell-back value at the current FMV) — not realised — so a tier where
 * players are still holding their cards doesn't show an artificially-high
 * house edge just because the liabilities haven't crystallised yet. */
export async function getTierStats(window: TimeWindowKey = 'all'): Promise<TierStats[]> {
  const windowWhere = window === 'all' ? sql`` : sql`WHERE pulled_at >= now() - ${intervalFor(window)}::interval`;
  return sql<TierStats[]>`
    SELECT
      tier,
      MAX(price_usd)::float                                                            AS price,
      COUNT(*)::int                                                                    AS pulls,
      (COALESCE(SUM(paper_payout_usd), 0)::float / NULLIF(COUNT(*), 0))                AS "evUsd",
      (1 - COALESCE(SUM(paper_payout_usd), 0)::float / NULLIF(SUM(price_usd), 0))      AS edge
    FROM pulls_enriched
    ${windowWhere}
    GROUP BY tier
    ORDER BY MAX(price_usd)
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Top hits — biggest payouts in window
 * ───────────────────────────────────────────────────────────── */

export interface HitRow {
  request_id: string;
  tier: string;
  card_slug: string | null;
  card_title: string | null;
  card_set: string | null;
  card_image_front: string | null;
  username: string | null;
  user_slug: string | null;
  wallet: string;
  price_usd: string;
  fmv_usd: string | null;
  payout_usd: string | null;
  status: string;
  pulled_at: string;
}

export async function getTopHits(window: TimeWindowKey, limit = 5): Promise<HitRow[]> {
  return sql<HitRow[]>`
    SELECT
      p.request_id::text         AS request_id,
      p.tier,
      p.card_slug,
      c.title                    AS card_title,
      c.card_set                 AS card_set,
      c.image_front              AS card_image_front,
      p.username,
      p.user_slug,
      p.wallet,
      p.price_usd::text          AS price_usd,
      p.fmv_usd::text            AS fmv_usd,
      p.payout_usd::text         AS payout_usd,
      p.status,
      p.pulled_at::text          AS pulled_at
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.fmv_usd IS NOT NULL
      AND p.pulled_at >= now() - ${intervalFor(window)}::interval
    ORDER BY p.fmv_usd DESC
    LIMIT ${limit}
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Live feed — newest pulls (for Live route and Pulse ticker)
 * ───────────────────────────────────────────────────────────── */

export async function getLiveFeed(limit = 30): Promise<HitRow[]> {
  return sql<HitRow[]>`
    SELECT
      p.request_id::text         AS request_id,
      p.tier,
      p.card_slug,
      c.title                    AS card_title,
      c.card_set                 AS card_set,
      c.image_front              AS card_image_front,
      p.username,
      p.user_slug,
      p.wallet,
      p.price_usd::text          AS price_usd,
      p.fmv_usd::text            AS fmv_usd,
      p.payout_usd::text         AS payout_usd,
      p.status,
      p.pulled_at::text          AS pulled_at
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    ORDER BY p.pulled_at DESC
    LIMIT ${limit}
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Tier economics — Realised vs Paper mode.
 *
 *   realised = only sold-back pulls have a payout.
 *               payouts = SUM(payout_usd) FILTER (status='sold_back')
 *   paper    = assume every pull eventually sells at fmv * buybackRate(tier).
 *               payouts = SUM(fmv * rate) over all pulls with fmv
 *               (Starter 0.87 · Premium 0.91 · Ultra 0.95 · Adventure 0.90)
 *
 * edge = (revenue - payouts) / revenue
 * EV   = payouts / pulls
 * ───────────────────────────────────────────────────────────── */

export type PnlMode = 'realised' | 'paper';

export interface TierEconomics {
  tier: string;
  price: number;
  pulls: number;
  revenue: number;
  payouts: number;       // realised or paper
  pnlHouse: number;      // revenue - payouts
  edge: number;          // pnlHouse / revenue
  ev: number;            // payouts / pulls
  sellbackRate: number;  // sold_back / total
  hitAbovePriceRate: number;
  median: number | null;
  mean: number | null;   // average FMV — surfaces right-tail skew vs median
  p25: number | null;
  p75: number | null;
  vaultFmv: number;      // sum of fmv for holding pulls (= unrealised exposure side)
}

/* Per-tier buyback rate (% of FMV paid out on sell-back). Single source of
 * truth lives in the SQL view (sql/007_*.sql) — `paper_payout_usd` already
 * applies the right per-tier multiplier. */
export async function getTierEconomics(tier: string, mode: PnlMode): Promise<TierEconomics> {
  const [r] = await sql<Array<{
    price: string;
    pulls: number;
    revenue: string;
    payouts_realised: string;
    payouts_paper: string;
    sold_back: number;
    hit_above_price: number;
    median: string | null;
    mean: string | null;
    p25: string | null;
    p75: string | null;
    vault_fmv: string;
  }>>`
    SELECT
      MAX(price_usd)::text                                                    AS price,
      COUNT(*)::int                                                           AS pulls,
      COALESCE(SUM(price_usd), 0)::text                                       AS revenue,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text  AS payouts_realised,
      COALESCE(SUM(paper_payout_usd), 0)::text                                AS payouts_paper,
      COUNT(*) FILTER (WHERE status = 'sold_back')::int                       AS sold_back,
      COUNT(*) FILTER (WHERE fmv_at_pull_usd >= price_usd)::int               AS hit_above_price,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY fmv_at_pull_usd)::text     AS median,
      AVG(fmv_at_pull_usd) FILTER (WHERE fmv_at_pull_usd IS NOT NULL)::text   AS mean,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY fmv_at_pull_usd)::text     AS p25,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY fmv_at_pull_usd)::text     AS p75,
      COALESCE(SUM(fmv_usd) FILTER (WHERE status = 'holding'), 0)::text       AS vault_fmv
    FROM pulls_enriched
    WHERE tier = ${tier}
  `;
  const pulls = r?.pulls ?? 0;
  const revenue = Number(r?.revenue ?? 0);
  const payouts = mode === 'realised' ? Number(r?.payouts_realised ?? 0) : Number(r?.payouts_paper ?? 0);
  const soldBack = r?.sold_back ?? 0;
  const hitAbovePrice = r?.hit_above_price ?? 0;
  return {
    tier,
    price: Number(r?.price ?? 0),
    pulls,
    revenue,
    payouts,
    pnlHouse: revenue - payouts,
    edge: revenue > 0 ? (revenue - payouts) / revenue : 0,
    ev: pulls > 0 ? payouts / pulls : 0,
    sellbackRate: pulls > 0 ? soldBack / pulls : 0,
    hitAbovePriceRate: pulls > 0 ? hitAbovePrice / pulls : 0,
    median: r?.median ? Number(r.median) : null,
    mean: r?.mean ? Number(r.mean) : null,
    p25: r?.p25 ? Number(r.p25) : null,
    p75: r?.p75 ? Number(r.p75) : null,
    vaultFmv: Number(r?.vault_fmv ?? 0),
  };
}

/* ─────────────────────────────────────────────────────────────
 * Tier FMV distribution — log-scale histogram for the violin.
 * Returns counts per bin; the chart computes the silhouette.
 * ───────────────────────────────────────────────────────────── */

export interface FmvBin {
  log10Mid: number;   // center of the bin in log10($)
  count: number;
}

export interface FmvDistribution {
  bins: FmvBin[];
  n: number;
  price: number;
  median: number | null;
  outliers: Array<{ slug: string | null; title: string | null; fmv: number; username: string | null; wallet: string }>;
}

export async function getTierFMVDistribution(tier: string): Promise<FmvDistribution> {
  // 24 bins from log10($1) to log10($100,000)
  const BIN_MIN = 0;
  const BIN_MAX = 5;
  const BIN_COUNT = 24;
  const bins = await sql<Array<{ bin: number; count: number }>>`
    WITH p AS (
      SELECT fmv_usd FROM pulls_enriched
      WHERE tier = ${tier} AND fmv_usd IS NOT NULL AND fmv_usd > 0
    )
    SELECT
      width_bucket(log(fmv_usd), ${BIN_MIN}, ${BIN_MAX}, ${BIN_COUNT})::int AS bin,
      COUNT(*)::int                                                          AS count
    FROM p
    GROUP BY 1
    ORDER BY 1
  `;
  const [meta] = await sql<Array<{ n: number; price: string; median: string | null }>>`
    SELECT
      COUNT(*) FILTER (WHERE fmv_usd IS NOT NULL)::int                       AS n,
      MAX(price_usd)::text                                                   AS price,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY fmv_usd)::text             AS median
    FROM pulls_enriched WHERE tier = ${tier}
  `;
  const outliers = await sql<Array<{ slug: string | null; title: string | null; fmv: string; username: string | null; wallet: string }>>`
    SELECT
      p.card_slug AS slug,
      c.title     AS title,
      p.fmv_usd::text AS fmv,
      p.username,
      p.wallet
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.tier = ${tier} AND p.fmv_usd IS NOT NULL
    ORDER BY p.fmv_usd DESC
    LIMIT 1
  `;

  const binStep = (BIN_MAX - BIN_MIN) / BIN_COUNT;
  const points: FmvBin[] = [];
  for (let i = 1; i <= BIN_COUNT; i++) {
    const found = bins.find(b => b.bin === i);
    points.push({
      log10Mid: BIN_MIN + (i - 0.5) * binStep,
      count: found?.count ?? 0,
    });
  }
  return {
    bins: points,
    n: meta?.n ?? 0,
    price: Number(meta?.price ?? 0),
    median: meta?.median ? Number(meta.median) : null,
    outliers: outliers.map(o => ({
      slug: o.slug,
      title: o.title,
      fmv: Number(o.fmv),
      username: o.username,
      wallet: o.wallet,
    })),
  };
}

/* ─────────────────────────────────────────────────────────────
 * Sold-back rate over time — weekly bucketed series.
 * Returns up to N most recent buckets.
 * ───────────────────────────────────────────────────────────── */

export interface SoldBackPoint {
  bucket: string;     // ISO date of bucket start (week)
  rate: number;       // 0..1
}

export async function getSoldBackRateOverTime(tier: string, weeks = 12): Promise<SoldBackPoint[]> {
  return sql<SoldBackPoint[]>`
    SELECT
      to_char(date_trunc('week', pulled_at), 'YYYY-MM-DD') AS bucket,
      (COUNT(*) FILTER (WHERE status = 'sold_back')::float
        / NULLIF(COUNT(*), 0))                              AS rate
    FROM pulls_enriched
    WHERE tier = ${tier}
      AND pulled_at >= now() - (${weeks} * 7 || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Tier outliers — biggest pulls by FMV, deduped by card.
 * Multiple wallets that pulled the same card share a single row;
 * `pullers` lists all of them so the UI can render them inline.
 * ───────────────────────────────────────────────────────────── */

export interface TierOutlierPuller {
  username: string | null;
  user_slug: string | null;
  wallet: string;
}

export interface TierOutlier {
  card_slug: string | null;
  tier: string;
  card_title: string | null;
  card_set: string | null;
  card_image_front: string | null;
  price_usd: number;
  fmv_usd: number;
  pull_count: number;       // number of times this exact card was pulled
  pullers: TierOutlierPuller[];
}

/* On the Tiers outliers list, "outlier" means a card whose FMV beat the
 * pack price by at least 2× — i.e. a noteworthy win, not just any card a
 * player pulled. Mirrored in getTierOutlierCount so the totals stay in
 * sync with the load-more pagination. */
const OUTLIER_FMV_MULT = 2;

export function getTierOutliers(tier: string, limit = 5, offset = 0): Promise<TierOutlier[]> {
  return getOutliers({ tier, limit, offset, minFmvMultiplier: OUTLIER_FMV_MULT });
}

/* Distinct-card count for the outliers list — drives the "Show more" cap
 * on the Tiers page so we know when to hide the button. */
export async function getTierOutlierCount(tier: string): Promise<number> {
  const [r] = await sql<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT card_slug
      FROM pulls_enriched
      WHERE tier = ${tier} AND fmv_usd IS NOT NULL AND card_slug IS NOT NULL
      GROUP BY card_slug
      HAVING MAX(fmv_usd) >= ${OUTLIER_FMV_MULT} * MAX(price_usd)
    ) t
  `;
  return r?.n ?? 0;
}

/* Top hits deduped by card across all tiers in a time window.
 * Same shape + same renderer (OutlierRow) as Tiers outliers — used by Pulse.
 * No 2x filter here — the Pulse "Big Hits" list is meant to be a chronological
 * highlight reel, not just noteworthy beats. */
export function getTopHitsDeduped(window: TimeWindowKey, limit = 5): Promise<TierOutlier[]> {
  return getOutliers({ window, limit });
}

async function getOutliers({
  tier,
  window,
  limit,
  offset = 0,
  minFmvMultiplier,
}: {
  tier?: string;
  window?: TimeWindowKey;
  limit: number;
  offset?: number;
  minFmvMultiplier?: number;
}): Promise<TierOutlier[]> {
  const tierWhere = tier ? sql`AND p.tier = ${tier}` : sql``;
  const subTierWhere = tier ? sql`AND p2.tier = ${tier}` : sql``;
  const windowWhere = window
    ? sql`AND p.pulled_at >= now() - ${WINDOW_INTERVAL[window]}::interval`
    : sql``;
  const rows = await sql<Array<{
    card_slug: string | null;
    tier: string;
    card_title: string | null;
    card_set: string | null;
    card_image_front: string | null;
    price_usd: string;
    fmv_usd: string;
    pull_count: number;
    pullers: TierOutlierPuller[];
  }>>`
    SELECT
      p.card_slug,
      -- Use the tier from the highest-fmv pull when callers don't pre-filter
      -- by tier. Sub-select avoids GROUP BY adding to the key.
      (SELECT p2.tier FROM pulls_enriched p2
        WHERE p2.card_slug = p.card_slug
          ${subTierWhere}
        ORDER BY p2.fmv_usd DESC LIMIT 1)                              AS tier,
      MAX(c.title)                                                     AS card_title,
      MAX(c.card_set)                                                  AS card_set,
      MAX(c.image_front)                                               AS card_image_front,
      MAX(p.price_usd)::text                                           AS price_usd,
      MAX(p.fmv_usd)::text                                             AS fmv_usd,
      COUNT(*)::int                                                    AS pull_count,
      jsonb_agg(DISTINCT jsonb_build_object(
        'username',  p.username,
        'user_slug', p.user_slug,
        'wallet',    p.wallet
      )) FILTER (WHERE p.wallet IS NOT NULL)                            AS pullers
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.fmv_usd IS NOT NULL AND p.card_slug IS NOT NULL
      ${tierWhere}
      ${windowWhere}
    GROUP BY p.card_slug
    ${minFmvMultiplier ? sql`HAVING MAX(p.fmv_usd) >= ${minFmvMultiplier} * MAX(p.price_usd)` : sql``}
    ORDER BY MAX(p.fmv_usd) DESC, p.card_slug ASC
    OFFSET ${offset}
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    card_slug: r.card_slug,
    tier: r.tier,
    card_title: r.card_title,
    card_set: r.card_set,
    card_image_front: r.card_image_front,
    price_usd: Number(r.price_usd),
    fmv_usd: Number(r.fmv_usd),
    pull_count: r.pull_count,
    pullers: r.pullers ?? [],
  }));
}

/* ─────────────────────────────────────────────────────────────
 * Wallets — leaderboard, KPIs, detail.
 *
 *   Net P&L = realised payouts (sold-back × per-tier buyback × FMV
 *             via pulls_enriched view) − spend on packs.
 *   Spend   = SUM(price_usd).
 *   Pulls   = COUNT(*).
 *
 * Sort options: 'pnl' | 'spend' | 'pulls'.
 * ───────────────────────────────────────────────────────────── */

export type WalletSort = 'pnl' | 'spend' | 'pulls';

export interface WalletRow {
  wallet: string;
  handle: string | null;       // username when known, else null (caller renders fallback)
  user_slug: string | null;
  pulls: number;
  spend: number;
  payout: number;              // realised payout total
  net: number;
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
// aliases — otherwise PG sorts lexically and "-100" > "+92".
const ORDER_EXPR: Record<WalletSort, string> = {
  pnl:   'COALESCE(SUM(payout_usd) FILTER (WHERE status = \'sold_back\'), 0) - SUM(price_usd)',
  spend: 'SUM(price_usd)',
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

export async function getLeaderboard(
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
    ? sql`HAVING LOWER(COALESCE(MAX(username), '')) LIKE ${'%' + ql + '%'}
           OR LOWER(wallet) LIKE ${ql + '%'}`
    : sql``;

  const rows = await sql<Array<{
    wallet: string;
    handle: string | null;
    user_slug: string | null;
    pulls: number;
    spend: string;
    payout: string;
    net: string;
  }>>`
    SELECT
      wallet,
      MAX(username)  AS handle,
      MAX(user_slug) AS user_slug,
      COUNT(*)::int                                                                     AS pulls,
      COALESCE(SUM(price_usd), 0)::text                                                 AS spend,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text            AS payout,
      (COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)
        - COALESCE(SUM(price_usd), 0))::text                                            AS net
    FROM pulls_enriched
    GROUP BY wallet
    ${filterSql}
    ${orderSql}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const [count] = await sql<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total FROM (
      SELECT wallet
      FROM pulls_enriched
      GROUP BY wallet
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
  const rows = await sql<Array<{ wallet: string; day: string; pulls: number; spend: string; net: string }>>`
    SELECT
      wallet,
      to_char(date_trunc('day', pulled_at), 'YYYY-MM-DD')                                       AS day,
      COUNT(*)::int                                                                              AS pulls,
      SUM(price_usd)::text                                                                       AS spend,
      (COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0) - SUM(price_usd))::text AS net
    FROM pulls_enriched
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
    const delta =
      sort === 'spend' ? Number(r.spend)
      : sort === 'pulls' ? r.pulls
      : Number(r.net);
    runningSum += delta;
    map.get(r.wallet)!.push(runningSum);
  }
  return map;
}

export async function getLeaderboardKpis(): Promise<LeaderboardKpis> {
  const [r] = await sql<Array<{
    total: number;
    top1pct_share: string | null;
    winners: number;
  }>>`
    WITH per_wallet AS (
      SELECT
        wallet,
        SUM(price_usd) AS spend,
        COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0) - SUM(price_usd) AS net
      FROM pulls_enriched
      GROUP BY wallet
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
    return sql<LadderRow[]>`
      SELECT wallet, MAX(username) AS handle, SUM(price_usd)::float AS value
      FROM pulls_enriched
      GROUP BY wallet
      ORDER BY value DESC, wallet ASC
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
  // pnl: top-K wallets by net P&L (winners first, descending).
  return sql<LadderRow[]>`
    SELECT
      wallet,
      MAX(username) AS handle,
      (COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0) - SUM(price_usd))::float AS value
    FROM pulls_enriched
    GROUP BY wallet
    ORDER BY value DESC, wallet ASC
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
  rank: number;
  pulls: number;
  spend: number;
  payout: number;
  net: number;
  vaultFmv: number;
  bigHits: number;
  tierMix: Array<{ tier: string; pulls: number }>;
  collection: HitRow[];     // top fmv pulls (up to 9)
  collectionTotal: number;
  recent: HitRow[];         // newest pulls first (up to 12)
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

export async function getWalletDetail(wallet: string): Promise<WalletDetail | null> {
  const addr = wallet.toLowerCase();
  const [agg] = await sql<Array<{
    handle: string | null;
    user_slug: string | null;
    pulls: number;
    spend: string;
    payout: string;
    vault_fmv: string;
    big_hits: number;
  }>>`
    SELECT
      MAX(username)                                                                       AS handle,
      MAX(user_slug)                                                                      AS user_slug,
      COUNT(*)::int                                                                       AS pulls,
      COALESCE(SUM(price_usd), 0)::text                                                   AS spend,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text              AS payout,
      COALESCE(SUM(fmv_usd) FILTER (WHERE status = 'holding'), 0)::text                   AS vault_fmv,
      COUNT(*) FILTER (WHERE fmv_usd >= 1000)::int                                        AS big_hits
    FROM pulls_enriched
    WHERE wallet = ${addr}
  `;
  if (!agg || agg.pulls === 0) return null;

  // Rank by spend among all wallets
  const [rankRow] = await sql<Array<{ rank: number }>>`
    SELECT rank FROM (
      SELECT wallet, RANK() OVER (ORDER BY SUM(price_usd) DESC) AS rank
      FROM pulls_enriched
      GROUP BY wallet
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

  const spend = Number(agg.spend);
  const payout = Number(agg.payout);
  return {
    wallet: addr,
    handle: agg.handle,
    user_slug: agg.user_slug,
    rank: rankRow?.rank ?? 0,
    pulls: agg.pulls,
    spend,
    payout,
    net: payout - spend,
    vaultFmv: Number(agg.vault_fmv),
    bigHits: agg.big_hits,
    tierMix,
    collection,
    collectionTotal: agg.pulls,
    recent,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Wallet pull rhythm — 12 weekly buckets with a big-hit flag.
 * ───────────────────────────────────────────────────────────── */

export interface WalletRhythmPoint {
  bucket: string;     // YYYY-MM-DD of week start
  pulls: number;
  bigHit: boolean;    // any pull ≥ $1k FMV
}

export async function getWalletPullRhythm(wallet: string, weeks = 12): Promise<WalletRhythmPoint[]> {
  return sql<WalletRhythmPoint[]>`
    SELECT
      to_char(date_trunc('week', pulled_at), 'YYYY-MM-DD')           AS bucket,
      COUNT(*)::int                                                   AS pulls,
      bool_or(fmv_usd >= 1000)                                        AS "bigHit"
    FROM pulls_enriched
    WHERE wallet = ${wallet.toLowerCase()}
      AND pulled_at >= now() - (${weeks} * 7 || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Wallet neighbours — ±k by spend rank.
 * ───────────────────────────────────────────────────────────── */

export interface NeighbourRow {
  rank: number;
  wallet: string;
  handle: string | null;
  pulls: number;
  spend: number;
  net: number;
  current?: boolean;
}

export async function getWalletNeighbours(wallet: string, k = 3): Promise<NeighbourRow[]> {
  const addr = wallet.toLowerCase();
  const rows = await sql<Array<{
    rank: number;
    wallet: string;
    handle: string | null;
    pulls: number;
    spend: string;
    net: string;
    current: boolean;
  }>>`
    WITH per_wallet AS (
      SELECT
        wallet,
        MAX(username) AS handle,
        COUNT(*)::int AS pulls,
        SUM(price_usd)::text AS spend,
        (COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0) - SUM(price_usd))::text AS net,
        RANK() OVER (ORDER BY SUM(price_usd) DESC) AS rank
      FROM pulls_enriched
      GROUP BY wallet
    ),
    me AS (SELECT rank FROM per_wallet WHERE wallet = ${addr})
    SELECT
      pw.rank,
      pw.wallet,
      pw.handle,
      pw.pulls,
      pw.spend,
      pw.net,
      pw.wallet = ${addr} AS current
    FROM per_wallet pw, me
    WHERE pw.rank BETWEEN me.rank - ${k} AND me.rank + ${k}
    ORDER BY pw.rank
  `;
  return rows.map(r => ({
    rank: r.rank,
    wallet: r.wallet,
    handle: r.handle,
    pulls: r.pulls,
    spend: Number(r.spend),
    net: Number(r.net),
    current: r.current,
  }));
}

/* ─────────────────────────────────────────────────────────────
 * Cards — the wall + detail
 *
 * View options:
 *   - 'top'    : highest MnStr FMV
 *   - 'most'   : most-pulled cards (descending pull count)
 *   - 'recent' : recently-pulled cards (descending most-recent pull)
 *
 * Tier filter restricts via the gachaTiers (we approximate using
 * pulls.tier — a card's "tier" is the tier where it was pulled).
 * ───────────────────────────────────────────────────────────── */

export type CardView = 'top' | 'most' | 'recent';

export interface CardListItem {
  slug: string;
  title: string | null;
  card_set: string | null;
  grading: string | null;
  image_front: string | null;
  pulls: number;
  fmv: number | null;
  top_tier: string | null;       // highest tier pulled-on (rank: Ultra > Premium > Starter)
}

export interface CardsList {
  rows: CardListItem[];
  total: number;
}

// Order against the numeric expression, not the ::text alias.
// Each one includes `c.slug` as a stable tiebreaker so paged Load More
// requests don't surface the same card twice.
const CARD_VIEW_ORDER: Record<CardView, string> = {
  top:    'MAX(p.fmv_usd) DESC NULLS LAST, c.slug ASC',
  most:   'COUNT(p.*) DESC, c.slug ASC',
  recent: 'MAX(p.pulled_at) DESC NULLS LAST, c.slug ASC',
};

export async function getCardsList(opts: {
  view: CardView;
  tier?: 'Starter' | 'Premium' | 'Ultra' | 'Adventure' | 'all';
  q?: string;
  page: number;
  pageSize: number;
}): Promise<CardsList> {
  const { view, tier = 'all', q, page, pageSize } = opts;
  const offset = page * pageSize;
  const ql = q?.trim().toLowerCase();

  const tierWhere = tier === 'all' ? sql`` : sql`AND p.tier = ${tier}`;
  const searchHaving = ql
    ? sql`AND (LOWER(c.title) LIKE ${'%' + ql + '%'}
              OR LOWER(COALESCE(c.card_set, '')) LIKE ${'%' + ql + '%'}
              OR LOWER(COALESCE(c.serial_number, '')) LIKE ${ql + '%'}
              OR LOWER(c.slug) LIKE ${'%' + ql + '%'})`
    : sql``;

  const rows = await sql<Array<{
    slug: string;
    title: string | null;
    card_set: string | null;
    grading: string | null;
    image_front: string | null;
    pulls_count: number;
    pulls_fmv_max: string | null;
    last_pulled_at: string | null;
    top_tier: string | null;
  }>>`
    SELECT
      c.slug,
      c.title,
      c.card_set,
      c.grading,
      c.image_front,
      COUNT(p.*)::int                                                     AS pulls_count,
      MAX(p.fmv_usd)::text                                                AS pulls_fmv_max,
      MAX(p.pulled_at)::text                                              AS last_pulled_at,
      (SELECT p2.tier FROM pulls p2
        WHERE p2.card_slug = c.slug
        ORDER BY CASE p2.tier WHEN 'Ultra' THEN 3 WHEN 'Premium' THEN 2 ELSE 1 END DESC
        LIMIT 1)                                                          AS top_tier
    FROM cards c
    JOIN pulls p ON p.card_slug = c.slug
    WHERE 1=1 ${tierWhere} ${searchHaving}
    GROUP BY c.slug
    ORDER BY ${sql.unsafe(CARD_VIEW_ORDER[view])}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const [count] = await sql<Array<{ total: number }>>`
    SELECT COUNT(DISTINCT c.slug)::int AS total
    FROM cards c
    JOIN pulls p ON p.card_slug = c.slug
    WHERE 1=1 ${tierWhere} ${searchHaving}
  `;

  return {
    rows: rows.map(r => ({
      slug: r.slug,
      title: r.title,
      card_set: r.card_set,
      grading: r.grading,
      image_front: r.image_front,
      pulls: r.pulls_count,
      fmv: r.pulls_fmv_max ? Number(r.pulls_fmv_max) : null,
      top_tier: r.top_tier,
    })),
    total: count?.total ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────
 * Card detail
 * ───────────────────────────────────────────────────────────── */

export interface CardDetail {
  slug: string;
  title: string | null;
  card_set: string | null;
  year: number | null;
  grading: string | null;
  grading_company: string | null;
  serial_number: string | null;
  player: string | null;
  image_front: string | null;
  image_back: string | null;
  list_price_usd: number | null;

  pulls_total: number;
  last_fmv: number | null;
  in_vault: boolean;       // any pull still 'holding' → true

  history: CardHistoryEntry[];
  comparables: Array<{
    slug: string;
    title: string | null;
    grading: string | null;
    fmv: number | null;
    pulls: number;
  }>;
}

export interface CardHistoryEntry {
  request_id: string;
  tier: string;
  wallet: string;
  username: string | null;
  user_slug: string | null;
  price_usd: number;
  fmv_usd: number | null;
  payout_usd: number | null;
  status: string;
  pulled_at: string;
}

/* Paginated pull history for a single card — shared between getCardDetail
 * (first 20 SSR) and /api/cards/[slug]/pulls (load-more page size). Sorted
 * by pulled_at DESC with a request_id tie-breaker for deterministic paging. */
export async function getCardPullHistory(
  slug: string,
  offset: number,
  limit: number,
): Promise<CardHistoryEntry[]> {
  const rows = await sql<Array<{
    request_id: string;
    tier: string;
    wallet: string;
    username: string | null;
    user_slug: string | null;
    price_usd: string;
    fmv_usd: string | null;
    payout_usd: string | null;
    status: string;
    pulled_at: string;
  }>>`
    SELECT
      request_id::text AS request_id,
      tier, wallet, username, user_slug,
      price_usd::text AS price_usd,
      fmv_usd::text   AS fmv_usd,
      payout_usd::text AS payout_usd,
      status,
      pulled_at::text AS pulled_at
    FROM pulls_enriched
    WHERE card_slug = ${slug}
    ORDER BY pulled_at DESC, request_id DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;
  return rows.map(h => ({
    request_id: h.request_id,
    tier: h.tier,
    wallet: h.wallet,
    username: h.username,
    user_slug: h.user_slug,
    price_usd: Number(h.price_usd),
    fmv_usd: h.fmv_usd ? Number(h.fmv_usd) : null,
    payout_usd: h.payout_usd ? Number(h.payout_usd) : null,
    status: h.status,
    pulled_at: h.pulled_at,
  }));
}

export async function getCardDetail(slug: string): Promise<CardDetail | null> {
  const [card] = await sql<Array<{
    slug: string;
    title: string | null;
    card_set: string | null;
    year: number | null;
    grading: string | null;
    grading_company: string | null;
    serial_number: string | null;
    player: string | null;
    image_front: string | null;
    image_back: string | null;
    list_price_usd: string | null;
  }>>`
    SELECT slug, title, card_set, year, grading, grading_company, serial_number,
           player, image_front, image_back, list_price_usd::text
    FROM cards WHERE slug = ${slug}
  `;
  if (!card) return null;

  const [agg] = await sql<Array<{ pulls: number; last_fmv: string | null; held: number }>>`
    SELECT
      COUNT(*)::int                                  AS pulls,
      MAX(fmv_usd)::text                             AS last_fmv,
      COUNT(*) FILTER (WHERE status = 'holding')::int AS held
    FROM pulls_enriched WHERE card_slug = ${slug}
  `;

  const history = await getCardPullHistory(slug, 0, 20);

  // Comparables: same card_set, different slug, top by FMV.
  const comparables = card.card_set
    ? await sql<Array<{ slug: string; title: string | null; grading: string | null; fmv: string | null; pulls: number }>>`
        SELECT c.slug, c.title, c.grading,
               MAX(p.fmv_usd)::text AS fmv,
               COUNT(p.*)::int       AS pulls
        FROM cards c
        LEFT JOIN pulls p ON p.card_slug = c.slug
        WHERE c.card_set = ${card.card_set} AND c.slug <> ${slug}
        GROUP BY c.slug
        ORDER BY MAX(p.fmv_usd) DESC NULLS LAST
        LIMIT 6
      `
    : [];

  return {
    slug: card.slug,
    title: card.title,
    card_set: card.card_set,
    year: card.year,
    grading: card.grading,
    grading_company: card.grading_company,
    serial_number: card.serial_number,
    player: card.player,
    image_front: card.image_front,
    image_back: card.image_back,
    list_price_usd: card.list_price_usd ? Number(card.list_price_usd) : null,
    pulls_total: agg?.pulls ?? 0,
    last_fmv: agg?.last_fmv ? Number(agg.last_fmv) : null,
    in_vault: (agg?.held ?? 0) > 0,
    history,
    comparables: comparables.map(c => ({
      slug: c.slug,
      title: c.title,
      grading: c.grading,
      fmv: c.fmv ? Number(c.fmv) : null,
      pulls: c.pulls,
    })),
  };
}

/* ─────────────────────────────────────────────────────────────
 * Vault stats — for the Cards "vault stats" strip
 * ───────────────────────────────────────────────────────────── */

export interface VaultStats {
  cardsTotal: number;       // distinct card slugs we know about
  cardsPulled: number;      // distinct cards with at least 1 pull
}

export async function getVaultStats(): Promise<VaultStats> {
  const [r] = await sql<Array<{ total: number; pulled: number }>>`
    SELECT
      (SELECT COUNT(*)::int FROM cards)                                          AS total,
      (SELECT COUNT(DISTINCT card_slug)::int FROM pulls WHERE card_slug IS NOT NULL) AS pulled
  `;
  return { cardsTotal: r?.total ?? 0, cardsPulled: r?.pulled ?? 0 };
}

/* ─────────────────────────────────────────────────────────────
 * Latest block — for the "block N · k ago" hint in Pulse header
 * ───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
 * Card activity — pull + marketplace events on a single slab,
 * interleaved chronologically. Powers "Recent history" on the
 * card detail page.
 * ───────────────────────────────────────────────────────────── */

export type CardActivity =
  | {
      kind: 'pull';
      ts: string;
      event_id: string;
      request_id: string;
      tier: string;
      wallet: string;
      username: string | null;
      price_usd: number;          // pack price
      fmv_usd: number | null;
      payout_usd: number | null;
      status: string;
    }
  | {
      kind: 'sale';
      ts: string;
      event_id: string;
      tx_hash: string;
      log_index: number;
      buyer: string;
      seller_wallet: string | null;
      seller_handle: string | null;
      sale_price_usd: number;
      sale_card_fmv: number | null;
      tier: string | null;
    };

export async function getCardActivityCount(slug: string): Promise<number> {
  const [r] = await sql<Array<{ n: number }>>`
    SELECT
      (SELECT COUNT(*)::int FROM pulls WHERE card_slug = ${slug})
      + (SELECT COUNT(*)::int FROM marketplace_sales ms
          JOIN cards c ON c.serial_number = ms.serial_number
          WHERE c.slug = ${slug})
    AS n
  `;
  return r?.n ?? 0;
}

export async function getCardActivity(
  slug: string,
  offset: number,
  limit: number,
): Promise<CardActivity[]> {
  const rows = await sql<Array<{
    kind: 'pull' | 'sale';
    ts: string;
    event_id: string;
    // pull
    request_id: string | null;
    tier: string | null;
    wallet: string | null;
    username: string | null;
    price_usd: string | null;
    fmv_usd: string | null;
    payout_usd: string | null;
    status: string | null;
    // sale
    tx_hash: string | null;
    log_index: number | null;
    buyer: string | null;
    seller_wallet: string | null;
    seller_handle: string | null;
    sale_price_usd: string | null;
    sale_card_fmv: string | null;
  }>>`
    SELECT * FROM (
      SELECT
        'pull'::text                       AS kind,
        p.pulled_at::text                  AS ts,
        p.request_id::text                 AS event_id,
        p.request_id::text                 AS request_id,
        p.tier                             AS tier,
        p.wallet                           AS wallet,
        p.username                         AS username,
        p.price_usd::text                  AS price_usd,
        p.fmv_usd::text                    AS fmv_usd,
        p.payout_usd::text                 AS payout_usd,
        p.status                           AS status,
        NULL::text                         AS tx_hash,
        NULL::int                          AS log_index,
        NULL::text                         AS buyer,
        NULL::text                         AS seller_wallet,
        NULL::text                         AS seller_handle,
        NULL::text                         AS sale_price_usd,
        NULL::text                         AS sale_card_fmv
      FROM pulls_enriched p
      WHERE p.card_slug = ${slug}

      UNION ALL

      SELECT
        'sale'::text                       AS kind,
        ms.bought_at::text                 AS ts,
        ms.tx_hash || ':' || ms.log_index  AS event_id,
        NULL                               AS request_id,
        seller.tier                        AS tier,
        NULL                               AS wallet,
        NULL                               AS username,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        NULL                               AS payout_usd,
        NULL                               AS status,
        ms.tx_hash                         AS tx_hash,
        ms.log_index                       AS log_index,
        ms.buyer                           AS buyer,
        seller.wallet                      AS seller_wallet,
        seller.username                    AS seller_handle,
        ms.price_usd::text                 AS sale_price_usd,
        seller.fmv_usd::text               AS sale_card_fmv
      FROM marketplace_sales ms
      JOIN cards c ON c.serial_number = ms.serial_number
      LEFT JOIN LATERAL (
        SELECT p.wallet, p.username, p.tier, p.fmv_usd
        FROM pulls p
        WHERE p.card_slug = c.slug AND p.pulled_at < ms.bought_at
        ORDER BY p.pulled_at DESC
        LIMIT 1
      ) seller ON TRUE
      WHERE c.slug = ${slug}
    ) ev
    ORDER BY ts DESC, event_id DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;

  return rows.map((r): CardActivity => {
    if (r.kind === 'pull') {
      return {
        kind: 'pull',
        ts: r.ts,
        event_id: r.event_id,
        request_id: r.request_id!,
        tier: r.tier!,
        wallet: r.wallet!,
        username: r.username,
        price_usd: Number(r.price_usd ?? 0),
        fmv_usd: r.fmv_usd ? Number(r.fmv_usd) : null,
        payout_usd: r.payout_usd ? Number(r.payout_usd) : null,
        status: r.status ?? 'holding',
      };
    }
    return {
      kind: 'sale',
      ts: r.ts,
      event_id: r.event_id,
      tx_hash: r.tx_hash!,
      log_index: r.log_index ?? 0,
      buyer: r.buyer!,
      seller_wallet: r.seller_wallet,
      seller_handle: r.seller_handle,
      sale_price_usd: Number(r.sale_price_usd ?? 0),
      sale_card_fmv: r.sale_card_fmv ? Number(r.sale_card_fmv) : null,
      tier: r.tier,
    };
  });
}

/* ─────────────────────────────────────────────────────────────
 * Wallet activity — pulls by this wallet + marketplace trades
 * where the wallet was buyer or seller. Powers "Recent history"
 * on /wallets/[addr].
 * ───────────────────────────────────────────────────────────── */

export type WalletActivity =
  | {
      kind: 'pull';
      ts: string;
      event_id: string;
      request_id: string;
      tier: string;
      card_slug: string | null;
      card_title: string | null;
      card_set: string | null;
      card_image_front: string | null;
      card_grading: string | null;
      price_usd: number;
      fmv_usd: number | null;
      payout_usd: number | null;
      status: string;
    }
  | {
      kind: 'sale_buy' | 'sale_sell';
      ts: string;
      event_id: string;
      tx_hash: string;
      log_index: number;
      counterparty_wallet: string | null;  // the OTHER side of the trade
      counterparty_handle: string | null;
      sale_price_usd: number;
      sale_card_fmv: number | null;
      card_slug: string | null;
      card_title: string | null;
      card_set: string | null;
      card_image_front: string | null;
      card_grading: string | null;
      tier: string | null;
    };

export async function getWalletActivityCount(wallet: string): Promise<number> {
  const addr = wallet.toLowerCase();
  const [r] = await sql<Array<{ n: number }>>`
    SELECT
      (SELECT COUNT(*)::int FROM pulls WHERE wallet = ${addr})
      + (SELECT COUNT(*)::int FROM marketplace_sales WHERE buyer = ${addr})
      + (SELECT COUNT(*)::int FROM marketplace_sales ms
          JOIN cards c ON c.serial_number = ms.serial_number
          WHERE (SELECT p.wallet FROM pulls p
                  WHERE p.card_slug = c.slug AND p.pulled_at < ms.bought_at
                  ORDER BY p.pulled_at DESC LIMIT 1) = ${addr})
    AS n
  `;
  return r?.n ?? 0;
}

export async function getWalletActivity(
  wallet: string,
  offset: number,
  limit: number,
): Promise<WalletActivity[]> {
  const addr = wallet.toLowerCase();
  const rows = await sql<Array<{
    kind: 'pull' | 'sale_buy' | 'sale_sell';
    ts: string;
    event_id: string;
    request_id: string | null;
    tier: string | null;
    price_usd: string | null;
    fmv_usd: string | null;
    payout_usd: string | null;
    status: string | null;
    tx_hash: string | null;
    log_index: number | null;
    counterparty_wallet: string | null;
    counterparty_handle: string | null;
    sale_price_usd: string | null;
    sale_card_fmv: string | null;
    card_slug: string | null;
    card_title: string | null;
    card_set: string | null;
    card_image_front: string | null;
    card_grading: string | null;
  }>>`
    SELECT * FROM (
      SELECT
        'pull'::text                       AS kind,
        p.pulled_at::text                  AS ts,
        p.request_id::text                 AS event_id,
        p.request_id::text                 AS request_id,
        p.tier                             AS tier,
        p.price_usd::text                  AS price_usd,
        p.fmv_usd::text                    AS fmv_usd,
        p.payout_usd::text                 AS payout_usd,
        p.status                           AS status,
        NULL::text                         AS tx_hash,
        NULL::int                          AS log_index,
        NULL::text                         AS counterparty_wallet,
        NULL::text                         AS counterparty_handle,
        NULL::text                         AS sale_price_usd,
        NULL::text                         AS sale_card_fmv,
        p.card_slug                        AS card_slug,
        c.title                            AS card_title,
        c.card_set                         AS card_set,
        c.image_front                      AS card_image_front,
        c.grading                          AS card_grading
      FROM pulls_enriched p
      LEFT JOIN cards c ON c.slug = p.card_slug
      WHERE p.wallet = ${addr}

      UNION ALL

      SELECT
        'sale_buy'::text                   AS kind,
        ms.bought_at::text                 AS ts,
        ms.tx_hash || ':' || ms.log_index  AS event_id,
        NULL                               AS request_id,
        seller.tier                        AS tier,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        NULL                               AS payout_usd,
        NULL                               AS status,
        ms.tx_hash                         AS tx_hash,
        ms.log_index                       AS log_index,
        seller.wallet                      AS counterparty_wallet,
        seller.username                    AS counterparty_handle,
        ms.price_usd::text                 AS sale_price_usd,
        seller.fmv_usd::text               AS sale_card_fmv,
        c.slug                             AS card_slug,
        c.title                            AS card_title,
        c.card_set                         AS card_set,
        c.image_front                      AS card_image_front,
        c.grading                          AS card_grading
      FROM marketplace_sales ms
      LEFT JOIN cards c ON c.serial_number = ms.serial_number
      LEFT JOIN LATERAL (
        SELECT p.wallet, p.username, p.tier, p.fmv_usd
        FROM pulls p
        WHERE p.card_slug = c.slug AND p.pulled_at < ms.bought_at
        ORDER BY p.pulled_at DESC LIMIT 1
      ) seller ON TRUE
      WHERE ms.buyer = ${addr}

      UNION ALL

      SELECT
        'sale_sell'::text                  AS kind,
        ms.bought_at::text                 AS ts,
        ms.tx_hash || ':' || ms.log_index  AS event_id,
        NULL                               AS request_id,
        seller.tier                        AS tier,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        NULL                               AS payout_usd,
        NULL                               AS status,
        ms.tx_hash                         AS tx_hash,
        ms.log_index                       AS log_index,
        ms.buyer                           AS counterparty_wallet,
        NULL                               AS counterparty_handle,
        ms.price_usd::text                 AS sale_price_usd,
        seller.fmv_usd::text               AS sale_card_fmv,
        c.slug                             AS card_slug,
        c.title                            AS card_title,
        c.card_set                         AS card_set,
        c.image_front                      AS card_image_front,
        c.grading                          AS card_grading
      FROM marketplace_sales ms
      LEFT JOIN cards c ON c.serial_number = ms.serial_number
      LEFT JOIN LATERAL (
        SELECT p.wallet, p.username, p.tier, p.fmv_usd
        FROM pulls p
        WHERE p.card_slug = c.slug AND p.pulled_at < ms.bought_at
        ORDER BY p.pulled_at DESC LIMIT 1
      ) seller ON TRUE
      WHERE seller.wallet = ${addr}
    ) ev
    ORDER BY ts DESC, event_id DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;

  return rows.map((r): WalletActivity => {
    if (r.kind === 'pull') {
      return {
        kind: 'pull',
        ts: r.ts,
        event_id: r.event_id,
        request_id: r.request_id!,
        tier: r.tier!,
        card_slug: r.card_slug,
        card_title: r.card_title,
        card_set: r.card_set,
        card_image_front: r.card_image_front,
        card_grading: r.card_grading,
        price_usd: Number(r.price_usd ?? 0),
        fmv_usd: r.fmv_usd ? Number(r.fmv_usd) : null,
        payout_usd: r.payout_usd ? Number(r.payout_usd) : null,
        status: r.status ?? 'holding',
      };
    }
    return {
      kind: r.kind,
      ts: r.ts,
      event_id: r.event_id,
      tx_hash: r.tx_hash!,
      log_index: r.log_index ?? 0,
      counterparty_wallet: r.counterparty_wallet,
      counterparty_handle: r.counterparty_handle,
      sale_price_usd: Number(r.sale_price_usd ?? 0),
      sale_card_fmv: r.sale_card_fmv ? Number(r.sale_card_fmv) : null,
      card_slug: r.card_slug,
      card_title: r.card_title,
      card_set: r.card_set,
      card_image_front: r.card_image_front,
      card_grading: r.card_grading,
      tier: r.tier,
    };
  });
}

/* ─────────────────────────────────────────────────────────────
 * Marketplace — secondary-market sales (CardBought events from
 * the CardMarketplace contract). Powers the /marketplace page.
 * ───────────────────────────────────────────────────────────── */

export interface MarketplaceSale {
  tx_hash: string;
  log_index: number;
  block_number: number;
  serial_number: string;
  buyer: string;
  price_usd: number;
  bought_at: string;
  card_slug: string | null;
  card_title: string | null;
  card_set: string | null;
  card_image_front: string | null;
  card_grading: string | null;
  card_tier: string | null;       // tier the slab was last pulled at, if any
  card_fmv: number | null;        // current vault FMV for context vs sale price
  // Seller = wallet of the most recent pull of this slab before bought_at.
  // null when the slab was sold direct from MnStr's vault (no prior pull).
  seller_wallet: string | null;
  seller_handle: string | null;
}

export interface MarketplaceKpis {
  sales: number;
  buyers: number;
  volumeUsd: number;
  avgUsd: number;
  sales24h: number;
  volume24hUsd: number;
}

export async function getMarketplaceKpis(): Promise<MarketplaceKpis> {
  const [r] = await sql<Array<{
    sales: number;
    buyers: number;
    volume: string;
    sales_24h: number;
    volume_24h: string;
  }>>`
    SELECT
      COUNT(*)::int                                                                         AS sales,
      COUNT(DISTINCT buyer)::int                                                            AS buyers,
      COALESCE(SUM(price_usd), 0)::text                                                     AS volume,
      COUNT(*) FILTER (WHERE bought_at >= now() - interval '24 hours')::int                 AS sales_24h,
      COALESCE(SUM(price_usd) FILTER (WHERE bought_at >= now() - interval '24 hours'), 0)::text AS volume_24h
    FROM marketplace_sales
  `;
  const sales = r?.sales ?? 0;
  const volumeUsd = Number(r?.volume ?? 0);
  return {
    sales,
    buyers: r?.buyers ?? 0,
    volumeUsd,
    avgUsd: sales > 0 ? volumeUsd / sales : 0,
    sales24h: r?.sales_24h ?? 0,
    volume24hUsd: Number(r?.volume_24h ?? 0),
  };
}

export async function getMarketplaceSales(offset: number, limit: number): Promise<MarketplaceSale[]> {
  const rows = await sql<Array<{
    tx_hash: string;
    log_index: number;
    block_number: number;
    serial_number: string;
    buyer: string;
    price_usd: string;
    bought_at: string;
    card_slug: string | null;
    card_title: string | null;
    card_set: string | null;
    card_image_front: string | null;
    card_grading: string | null;
    card_tier: string | null;
    card_fmv: string | null;
    seller_wallet: string | null;
    seller_handle: string | null;
  }>>`
    SELECT
      ms.tx_hash,
      ms.log_index,
      ms.block_number,
      ms.serial_number,
      ms.buyer,
      ms.price_usd::text                       AS price_usd,
      ms.bought_at::text                       AS bought_at,
      c.slug                                   AS card_slug,
      c.title                                  AS card_title,
      c.card_set                               AS card_set,
      c.image_front                            AS card_image_front,
      c.grading                                AS card_grading,
      seller.tier                              AS card_tier,
      seller.fmv_usd::text                     AS card_fmv,
      seller.wallet                            AS seller_wallet,
      seller.username                          AS seller_handle
    FROM marketplace_sales ms
    LEFT JOIN cards c ON c.serial_number = ms.serial_number
    -- Lateral join: pull the most recent pull of this slab BEFORE the sale
    -- so we can attribute seller wallet, tier, and FMV in a single pass.
    LEFT JOIN LATERAL (
      SELECT p.tier, p.fmv_usd, p.wallet, p.username
      FROM pulls p
      WHERE p.card_slug = c.slug
        AND p.pulled_at < ms.bought_at
      ORDER BY p.pulled_at DESC
      LIMIT 1
    ) seller ON TRUE
    ORDER BY ms.bought_at DESC, ms.tx_hash DESC, ms.log_index DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    tx_hash: r.tx_hash,
    log_index: r.log_index,
    block_number: r.block_number,
    serial_number: r.serial_number,
    buyer: r.buyer,
    price_usd: Number(r.price_usd),
    bought_at: r.bought_at,
    card_slug: r.card_slug,
    card_title: r.card_title,
    card_set: r.card_set,
    card_image_front: r.card_image_front,
    card_grading: r.card_grading,
    card_tier: r.card_tier,
    card_fmv: r.card_fmv ? Number(r.card_fmv) : null,
    seller_wallet: r.seller_wallet,
    seller_handle: r.seller_handle,
  }));
}

export async function getLatestIndexedBlock(): Promise<{ block: number; tier: string } | null> {
  const [r] = await sql<Array<{ block: number; tier: string }>>`
    SELECT block_number::int AS block, tier
    FROM pulls
    ORDER BY block_number DESC
    LIMIT 1
  `;
  return r ?? null;
}

/* ─────────────────────────────────────────────────────────────
 * Sitemap primitives — bulk slug/addr lists for /sitemap.xml.
 * Each row also carries the latest mtime so search engines can
 * prioritise re-crawls of recently-active entries.
 * ───────────────────────────────────────────────────────────── */

export interface SitemapEntry {
  id: string;
  lastModified: string | null;
}

export async function getAllCardSlugs(): Promise<SitemapEntry[]> {
  return sql<SitemapEntry[]>`
    SELECT
      c.slug                          AS id,
      MAX(p.pulled_at)::text          AS "lastModified"
    FROM cards c
    LEFT JOIN pulls p ON p.card_slug = c.slug
    GROUP BY c.slug
    ORDER BY c.slug
  `;
}

export async function getAllWalletAddrs(): Promise<SitemapEntry[]> {
  return sql<SitemapEntry[]>`
    SELECT
      wallet                          AS id,
      MAX(pulled_at)::text            AS "lastModified"
    FROM pulls_enriched
    GROUP BY wallet
    ORDER BY wallet
  `;
}
