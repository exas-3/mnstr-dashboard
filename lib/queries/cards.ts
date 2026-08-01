import { cache } from 'react';
import { sql } from '@/db/client';
import { escapeLike } from './shared';

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
  tier?: 'Starter' | 'Premium' | 'Ultra' | 'Adventure' | 'Great' | 'Outlaw' | 'all';
  q?: string;
  page: number;
  pageSize: number;
}): Promise<CardsList> {
  const { view, tier = 'all', q, page, pageSize } = opts;
  const offset = page * pageSize;
  const ql = q?.trim().toLowerCase();

  const tierWhere = tier === 'all' ? sql`` : sql`AND p.tier = ${tier}`;
  const searchHaving = ql
    ? sql`AND (LOWER(c.title) LIKE ${'%' + escapeLike(ql) + '%'}
              OR LOWER(COALESCE(c.card_set, '')) LIKE ${'%' + escapeLike(ql) + '%'}
              OR LOWER(COALESCE(c.serial_number, '')) LIKE ${escapeLike(ql) + '%'}
              OR LOWER(c.slug) LIKE ${'%' + escapeLike(ql) + '%'})`
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
  last_fmv: number | null;          // current vault FMV (latest appraisal across instances)
  fmv_at_last_pull: number | null;  // frozen fmv_at_pull_usd of the most recent pull
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

// React cache(): shared execution between generateMetadata and the page body
// (same rationale as getWalletDetail).
export const getCardDetail = cache(async function getCardDetail(
  slug: string,
): Promise<CardDetail | null> {
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

  const [agg] = await sql<Array<{ pulls: number; last_fmv: string | null; fmv_at_last_pull: string | null; held: number; mp_owned: boolean }>>`
    SELECT
      COUNT(*)::int                                  AS pulls,
      MAX(fmv_usd)::text                             AS last_fmv,
      (
        SELECT fmv_at_pull_usd::text
        FROM pulls_enriched
        WHERE card_slug = ${slug} AND fmv_at_pull_usd IS NOT NULL
        ORDER BY pulled_at DESC
        LIMIT 1
      )                                              AS fmv_at_last_pull,
      COUNT(*) FILTER (WHERE status = 'holding')::int AS held,
      -- A marketplace-bought slab is currently held by its latest buyer (same
      -- rule wallet_pnl uses). Counting only 'holding' pulls would mislabel a
      -- card that every puller sold back but the vault then resold as
      -- "sold-back", even though a player now owns it.
      COALESCE(bool_or(marketplace_sold), false)     AS mp_owned
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
    fmv_at_last_pull: agg?.fmv_at_last_pull ? Number(agg.fmv_at_last_pull) : null,
    in_vault: (agg?.held ?? 0) > 0 || (agg?.mp_owned ?? false),
    history,
    comparables: comparables.map(c => ({
      slug: c.slug,
      title: c.title,
      grading: c.grading,
      fmv: c.fmv ? Number(c.fmv) : null,
      pulls: c.pulls,
    })),
  };
});

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
      payout_tx: string | null;   // on-chain USDm transfer tx that delivered the payout
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
    payout_tx: string | null;
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
        NULL::text                         AS sale_card_fmv,
        p.payout_tx_hash                   AS payout_tx
      FROM pulls_enriched p
      WHERE p.card_slug = ${slug}

      UNION ALL

      SELECT
        'sale'::text                       AS kind,
        ms.bought_at::text                 AS ts,
        ms.tx_hash || ':' || ms.log_index  AS event_id,
        NULL                               AS request_id,
        card_meta.tier                     AS tier,
        NULL                               AS wallet,
        NULL                               AS username,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        NULL                               AS payout_usd,
        NULL                               AS status,
        ms.tx_hash                         AS tx_hash,
        ms.log_index                       AS log_index,
        ms.buyer                           AS buyer,
        -- Marketplace is custodial: the protocol sells from its own vault, so
        -- there is no real player-seller. We used to infer one as the most
        -- recent prior puller, which mislabeled the last puller of a pooled
        -- slug as the "seller" of every later sale of that serial. Emit NULL →
        -- the UI renders "MnStr vault".
        NULL::text                         AS seller_wallet,
        NULL::text                         AS seller_handle,
        ms.price_usd::text                 AS sale_price_usd,
        card_meta.fmv_usd::text            AS sale_card_fmv,
        NULL::text                         AS payout_tx
      FROM marketplace_sales ms
      JOIN cards c ON c.serial_number = ms.serial_number
      -- Card-level attributes (tier + current FMV) for the premium calc; any
      -- pull of this slug carries them. This is NOT a seller.
      LEFT JOIN LATERAL (
        SELECT p.tier, p.fmv_usd
        FROM pulls p
        WHERE p.card_slug = c.slug
        ORDER BY p.pulled_at DESC
        LIMIT 1
      ) card_meta ON TRUE
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
        payout_tx: r.payout_tx,
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
 * Card FMV history — the card's MnStr FMV over time
 * ───────────────────────────────────────────────────────────── */

export interface CardFmvPoint {
  ts: number;  // epoch ms
  fmv: number; // MnStr FMV at this instant, USD
}

/* One card's FMV over time. Two observation streams, merged + sorted: every
 * pull froze the card's FMV (fmv_at_pull_usd) at that moment — covering the
 * whole history, including before the hourly poll — and the hourly snapshots
 * (fmv_usd, since 2026-05-28). Consecutive equal values are collapsed; the
 * series ends at "now" at the live FMV (= the page's MnStr FMV = MAX fmv_usd). */
export async function getCardFmvHistory(slug: string): Promise<CardFmvPoint[]> {
  const rows = await sql<Array<{ t: string; fmv: string }>>`
    SELECT t::text, fmv::text FROM (
      -- pull appraisals, collapsed to the points where the FMV changed
      SELECT pulled_at AS t, fmv_at_pull_usd AS fmv FROM (
        SELECT pulled_at, fmv_at_pull_usd,
               lag(fmv_at_pull_usd) OVER (ORDER BY pulled_at) AS prev
        FROM pulls WHERE card_slug = ${slug} AND fmv_at_pull_usd IS NOT NULL
      ) z WHERE prev IS DISTINCT FROM fmv_at_pull_usd
      UNION ALL
      -- hourly snapshots
      SELECT observed_at AS t, fmv_usd AS fmv FROM card_fmv_snapshots WHERE card_slug = ${slug}
    ) obs
    ORDER BY t`;
  if (rows.length === 0) return [];

  const [cur] = await sql<Array<{ fmv: string | null }>>`
    SELECT MAX(fmv_usd)::text AS fmv FROM pulls WHERE card_slug = ${slug}`;

  const out: CardFmvPoint[] = [];
  let lastFmv = NaN;
  for (const r of rows) {
    const fmv = Number(r.fmv);
    if (fmv === lastFmv) continue; // collapse consecutive equal observations
    out.push({ ts: Date.parse(r.t), fmv: Math.round(fmv * 100) / 100 });
    lastFmv = fmv;
  }
  // Always extend to "now" at the live FMV: an unchanged card then draws a flat
  // first-pull→now line (two points) instead of a lone dot, and a card last
  // appraised a while ago carries its value to the present.
  const currentFmv = cur?.fmv != null ? Number(cur.fmv) : NaN;
  if (Number.isFinite(currentFmv)) {
    out.push({ ts: Date.now(), fmv: Math.round(currentFmv * 100) / 100 });
  }
  return out;
}

