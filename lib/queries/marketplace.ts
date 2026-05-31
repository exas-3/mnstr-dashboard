import { sql } from '@/db/client';

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
  sales7d: number;
  volume7dUsd: number;
}

export async function getMarketplaceKpis(): Promise<MarketplaceKpis> {
  const [r] = await sql<Array<{
    sales: number;
    buyers: number;
    volume: string;
    sales_7d: number;
    volume_7d: string;
  }>>`
    SELECT
      COUNT(*)::int                                                                         AS sales,
      COUNT(DISTINCT buyer)::int                                                            AS buyers,
      COALESCE(SUM(price_usd), 0)::text                                                     AS volume,
      COUNT(*) FILTER (WHERE bought_at >= now() - interval '7 days')::int                   AS sales_7d,
      COALESCE(SUM(price_usd) FILTER (WHERE bought_at >= now() - interval '7 days'), 0)::text AS volume_7d
    FROM marketplace_sales
  `;
  const sales = r?.sales ?? 0;
  const volumeUsd = Number(r?.volume ?? 0);
  return {
    sales,
    buyers: r?.buyers ?? 0,
    volumeUsd,
    avgUsd: sales > 0 ? volumeUsd / sales : 0,
    sales7d: r?.sales_7d ?? 0,
    volume7dUsd: Number(r?.volume_7d ?? 0),
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
      card_meta.tier                           AS card_tier,
      card_meta.fmv_usd::text                  AS card_fmv,
      -- Custodial marketplace: no real player-seller (the protocol sells from
      -- its vault). We used to infer one as the most recent prior puller, which
      -- mislabeled the last puller of a pooled slug as the seller of every
      -- later sale. Emit NULL → the UI renders "MnStr vault".
      NULL::text                               AS seller_wallet,
      NULL::text                               AS seller_handle
    FROM marketplace_sales ms
    LEFT JOIN cards c ON c.serial_number = ms.serial_number
    -- Card-level attributes (tier + current FMV) for the premium calc; any pull
    -- of this slug carries them. NOT a seller.
    LEFT JOIN LATERAL (
      SELECT p.tier, p.fmv_usd
      FROM pulls p
      WHERE p.card_slug = c.slug
      ORDER BY p.pulled_at DESC
      LIMIT 1
    ) card_meta ON TRUE
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

