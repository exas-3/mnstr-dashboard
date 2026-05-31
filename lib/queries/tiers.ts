import { sql } from '@/db/client';
import { type TimeWindowKey, intervalFor, WINDOW_INTERVAL } from './shared';

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
export type EvBasis = 'buyback' | 'fmv';

export interface TierEconomics {
  tier: string;
  price: number;
  pulls: number;
  revenue: number;
  payouts: number;       // realised or paper, using the selected ev basis
  pnlHouse: number;      // revenue - payouts
  edge: number;          // pnlHouse / revenue (for selected basis)
  ev: number;            // payouts / pulls (for selected basis)
  // FMV-basis counterparts — `ev` and `edge` mirror these when basis='fmv'.
  // Surfaced separately so the page can render both bases without a re-fetch.
  edgeBuyback: number;
  evBuyback: number;
  edgeFmv: number;
  evFmv: number;
  sellbackRate: number;  // sold_back / total
  hitAbovePriceRate: number;
  median: number | null;
  mean: number | null;   // average FMV — surfaces right-tail skew vs median
  p25: number | null;
  p75: number | null;
  vaultFmv: number;      // sum of fmv for holding pulls (= unrealised exposure side)
}

/* Per-tier economics with both EV bases pre-computed.
 *   buyback EV = paper_payout_usd  (= fmv_at_pull × per-tier buyback rate)
 *   FMV EV     = fmv_at_pull_usd   (raw market value, ignores buyback discount)
 * Caller picks which to display via the `basis` arg; the other is still
 * returned (edgeBuyback / evBuyback vs edgeFmv / evFmv) so the page can
 * render both without a second query. */
export async function getTierEconomics(
  tier: string,
  mode: PnlMode,
  basis: EvBasis = 'buyback',
): Promise<TierEconomics> {
  const [r] = await sql<Array<{
    price: string;
    pulls: number;
    valued_pulls: number;
    revenue: string;
    revenue_valued: string;
    payouts_realised: string;
    payouts_paper_buyback: string;
    payouts_paper_fmv: string;
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
      -- valued_pulls = pulls we actually have FMV data for. Mnstr occasionally
      -- leaves a pull with no card assignment (card_slug NULL, fmv=0); those
      -- contribute neither to numerator nor denominator of the EV calc.
      COUNT(*) FILTER (WHERE fmv_at_pull_usd IS NOT NULL)::int                AS valued_pulls,
      COALESCE(SUM(price_usd), 0)::text                                       AS revenue,
      COALESCE(SUM(price_usd) FILTER (WHERE fmv_at_pull_usd IS NOT NULL), 0)::text AS revenue_valued,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text  AS payouts_realised,
      COALESCE(SUM(paper_payout_usd), 0)::text                                AS payouts_paper_buyback,
      COALESCE(SUM(fmv_at_pull_usd), 0)::text                                 AS payouts_paper_fmv,
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
  // Display pulls = total (including never-assigned ones). EV math uses the
  // VALUED pull count so unassigned ghost pulls don't drag the mean down.
  const pulls = r?.pulls ?? 0;
  const valuedPulls = r?.valued_pulls ?? pulls;
  const revenue = Number(r?.revenue ?? 0);
  const revenueValued = Number(r?.revenue_valued ?? revenue);
  // Realised mode always uses on-chain payout (post-sql/013 view).
  // Paper mode swaps between buyback and FMV.
  const payoutsBuyback = mode === 'realised'
    ? Number(r?.payouts_realised ?? 0)
    : Number(r?.payouts_paper_buyback ?? 0);
  const payoutsFmv = Number(r?.payouts_paper_fmv ?? 0);
  const payouts = basis === 'fmv' ? payoutsFmv : payoutsBuyback;
  const soldBack = r?.sold_back ?? 0;
  const hitAbovePrice = r?.hit_above_price ?? 0;
  return {
    tier,
    price: Number(r?.price ?? 0),
    pulls,
    revenue,
    payouts,
    pnlHouse: revenueValued - payouts,
    edge: revenueValued > 0 ? (revenueValued - payouts) / revenueValued : 0,
    ev: valuedPulls > 0 ? payouts / valuedPulls : 0,
    edgeBuyback: revenueValued > 0 ? (revenueValued - payoutsBuyback) / revenueValued : 0,
    evBuyback:   valuedPulls > 0 ? payoutsBuyback / valuedPulls : 0,
    edgeFmv:     revenueValued > 0 ? (revenueValued - payoutsFmv) / revenueValued : 0,
    evFmv:       valuedPulls > 0 ? payoutsFmv / valuedPulls : 0,
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
  mean: number | null;
  // Observed log10 range per tier — each tier's bar chart is fitted to its
  // own [low, high] so Adventure ($90–$870) and Starter ($5–$3k) both get
  // the full chart width instead of sharing a fixed $1–$100k axis.
  logMin: number;
  logMax: number;
  outliers: Array<{ slug: string | null; title: string | null; fmv: number; username: string | null; wallet: string }>;
}

// Per-tier buyback rate. Mirrors sql/006 / sql/013 — kept in TS for cheap
// arithmetic at query time (no view rebuild needed for the basis toggle).
const TIER_BUYBACK_RATE: Record<string, number> = {
  Starter:   0.87,
  Premium:   0.91,
  Ultra:     0.95,
  Adventure: 0.90,
};

export async function getTierFMVDistribution(
  tier: string,
  basis: EvBasis = 'fmv',
): Promise<FmvDistribution> {
  // Multiplier applied to fmv_usd. 'fmv' = raw FMV (mnstr's displayed value).
  // 'buyback' = fmv × per-tier rate — the cash a player would actually receive
  // on sellback. Aligns the distribution with the EV basis toggle on /tiers.
  const rate = basis === 'buyback' ? (TIER_BUYBACK_RATE[tier] ?? 0.85) : 1;

  // Per-tier observed range: log10(min_value)..log10(max_value). Each tier
  // gets its own [low, high] so the bars use the full chart width instead
  // of sitting in a narrow slice of a fixed $1–$100k axis.
  const [range] = await sql<Array<{ log_min: string | null; log_max: string | null }>>`
    SELECT
      log(MIN(fmv_usd) * ${rate})::text AS log_min,
      log(MAX(fmv_usd) * ${rate})::text AS log_max
    FROM pulls_enriched
    WHERE tier = ${tier} AND fmv_usd IS NOT NULL AND fmv_usd > 0
  `;
  const rawMin = range?.log_min ? Number(range.log_min) : 0;
  const rawMax = range?.log_max ? Number(range.log_max) : 5;
  const PAD_LOG = 0.05;
  // Guarantee a minimum span of 0.5 log units (~3×) so tiers with a tight
  // range don't render as a microscopic spike.
  const span = Math.max(rawMax - rawMin, 0.5);
  const center = (rawMin + rawMax) / 2;
  const logMin = (rawMax - rawMin >= 0.5 ? rawMin : center - span / 2) - PAD_LOG;
  const logMax = (rawMax - rawMin >= 0.5 ? rawMax : center + span / 2) + PAD_LOG;
  // High-resolution server bins. The client aggregates these down to a width-
  // dependent count (more bars on wide screens, fewer on narrow), so we want
  // enough granularity here that any reasonable client target divides cleanly.
  const BIN_COUNT = 200;

  const bins = await sql<Array<{ bin: number; count: number }>>`
    WITH p AS (
      SELECT fmv_usd * ${rate} AS value FROM pulls_enriched
      WHERE tier = ${tier} AND fmv_usd IS NOT NULL AND fmv_usd > 0
    )
    SELECT
      width_bucket(log(value), ${logMin}, ${logMax}, ${BIN_COUNT})::int AS bin,
      COUNT(*)::int                                                     AS count
    FROM p
    GROUP BY 1
    ORDER BY 1
  `;
  const [meta] = await sql<Array<{ n: number; price: string; median: string | null; mean: string | null }>>`
    SELECT
      COUNT(*) FILTER (WHERE fmv_usd IS NOT NULL)::int                                AS n,
      MAX(price_usd)::text                                                            AS price,
      (percentile_cont(0.5) WITHIN GROUP (ORDER BY fmv_usd) * ${rate})::text          AS median,
      (AVG(fmv_usd) FILTER (WHERE fmv_usd IS NOT NULL) * ${rate})::text               AS mean
    FROM pulls_enriched WHERE tier = ${tier}
  `;
  const outliers = await sql<Array<{ slug: string | null; title: string | null; fmv: string; username: string | null; wallet: string }>>`
    SELECT
      p.card_slug AS slug,
      c.title     AS title,
      (p.fmv_usd * ${rate})::text AS fmv,
      p.username,
      p.wallet
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.tier = ${tier} AND p.fmv_usd IS NOT NULL
    ORDER BY p.fmv_usd DESC
    LIMIT 1
  `;

  const binStep = (logMax - logMin) / BIN_COUNT;
  const points: FmvBin[] = [];
  for (let i = 1; i <= BIN_COUNT; i++) {
    const found = bins.find(b => b.bin === i);
    points.push({
      log10Mid: logMin + (i - 0.5) * binStep,
      count: found?.count ?? 0,
    });
  }
  return {
    bins: points,
    n: meta?.n ?? 0,
    price: Number(meta?.price ?? 0),
    median: meta?.median ? Number(meta.median) : null,
    mean: meta?.mean ? Number(meta.mean) : null,
    logMin,
    logMax,
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

// Daily sold-back rate from the tier's first pull onward. No lookback window —
// the chart starts at the first pack rip and extends to today. Sparse early
// days (only one or two pulls) can produce 0%/100% spikes; the chart smooths
// visually by interpolating between days, but the raw points are unsmoothed.
export async function getSoldBackRateOverTime(tier: string): Promise<SoldBackPoint[]> {
  return sql<SoldBackPoint[]>`
    SELECT
      to_char(date_trunc('day', pulled_at), 'YYYY-MM-DD') AS bucket,
      (COUNT(*) FILTER (WHERE status = 'sold_back')::float
        / NULLIF(COUNT(*), 0))                             AS rate
    FROM pulls_enriched
    WHERE tier = ${tier}
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
 * 2× FMV-vs-pack-price filter so the list is "noteworthy wins" only, not
 * every card pulled. Matches the Tiers outliers behaviour. */
export function getTopHitsDeduped(
  window: TimeWindowKey,
  limit = 5,
  offset = 0,
): Promise<TierOutlier[]> {
  return getOutliers({ window, limit, offset, minFmvMultiplier: OUTLIER_FMV_MULT });
}

export async function getTopHitsDedupedCount(window: TimeWindowKey): Promise<number> {
  const [r] = await sql<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT card_slug
      FROM pulls_enriched
      WHERE fmv_usd IS NOT NULL AND card_slug IS NOT NULL
        AND pulled_at >= now() - ${intervalFor(window)}::interval
      GROUP BY card_slug
      HAVING MAX(fmv_usd) >= ${OUTLIER_FMV_MULT} * MAX(price_usd)
    ) t
  `;
  return r?.n ?? 0;
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

