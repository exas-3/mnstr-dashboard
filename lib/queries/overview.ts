import { sql } from '@/db/client';
import { type TimeWindowKey, intervalFor } from './shared';

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
  bigHits: number;              // pulls with fmv_usd >= $1k in window
  heldFmvUsd: number;           // outstanding FMV liability — sum of fmv for holding pulls in window
}

export async function getKpisFor(window: TimeWindowKey): Promise<Kpis> {
  const interval = intervalFor(window);
  const [w] = await sql<Array<{
    packs: number;
    cycled: string;
    payout: string;
    wallets: number;
    big_hits: number;
    held_fmv: string;
  }>>`
    SELECT
      COUNT(*)::int                                                          AS packs,
      COALESCE(SUM(price_usd), 0)::text                                      AS cycled,
      COALESCE(SUM(payout_usd) FILTER (WHERE status = 'sold_back'), 0)::text AS payout,
      COUNT(DISTINCT wallet)::int                                            AS wallets,
      COUNT(*) FILTER (WHERE fmv_usd >= 1000)::int                           AS big_hits,
      COALESCE(SUM(fmv_usd) FILTER (WHERE status = 'holding'), 0)::text      AS held_fmv
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
    bigHits: w?.big_hits ?? 0,
    heldFmvUsd: Number(w?.held_fmv ?? 0),
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

export type VelocityGranularity = 'day' | 'hour';

/* Per-tier velocity over a recent span. Granularity controls the bucket
 * width — `day` returns YYYY-MM-DD daily buckets, `hour` returns
 * YYYY-MM-DD HH:00 hourly buckets. The 24h window uses hourly so the chart
 * actually has 24 data points instead of a single bar. */
export async function getVelocityByTier(
  span = 30,
  granularity: VelocityGranularity = 'day',
): Promise<VelocityPoint[]> {
  const rows = granularity === 'hour'
    ? await sql<Array<{ day: string; tier: string; pulls: number }>>`
        SELECT
          to_char(date_trunc('hour', pulled_at), 'YYYY-MM-DD HH24:00') AS day,
          tier,
          COUNT(*)::int                                                  AS pulls
        FROM pulls_enriched
        WHERE pulled_at >= now() - (${span} || ' hours')::interval
        GROUP BY 1, 2
        ORDER BY 1
      `
    : await sql<Array<{ day: string; tier: string; pulls: number }>>`
        SELECT
          to_char(date_trunc('day', pulled_at), 'YYYY-MM-DD') AS day,
          tier,
          COUNT(*)::int                                        AS pulls
        FROM pulls_enriched
        WHERE pulled_at >= now() - (${span} || ' days')::interval
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
  fmv_at_pull_usd?: string | null;   // frozen pull-time FMV (populated by getTopHits)
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
      p.fmv_at_pull_usd::text    AS fmv_at_pull_usd,
      p.payout_usd::text         AS payout_usd,
      p.status,
      p.pulled_at::text          AS pulled_at
    FROM pulls_enriched p
    LEFT JOIN cards c ON c.slug = p.card_slug
    WHERE p.fmv_at_pull_usd IS NOT NULL
      AND p.pulled_at >= now() - ${intervalFor(window)}::interval
    ORDER BY p.fmv_at_pull_usd DESC
    LIMIT ${limit}
  `;
}

/* ─────────────────────────────────────────────────────────────
 * Live feed — newest pulls (for Live route and Pulse ticker)
 * ───────────────────────────────────────────────────────────── */

/* Live stream feed — newest pulls first. ORDER includes a request_id tie-
 * breaker because chain blocks can contain multiple pulls that share an
 * identical block-timestamp; without the tiebreaker Postgres returns those
 * in arbitrary order, making the stream grid shuffle every 5s poll. */
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
    ORDER BY p.pulled_at DESC, p.request_id DESC
    LIMIT ${limit}
  `;
}

