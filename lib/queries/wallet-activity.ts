import { sql } from '@/db/client';

/* ─────────────────────────────────────────────────────────────
 * Wallet activity — pulls by this wallet + protocol sellbacks + marketplace
 * slabs it bought. (No marketplace sell side: the marketplace is custodial,
 * the protocol sells from its own vault, so a player is never a marketplace
 * seller.) Powers "Recent history" on /wallets/[addr].
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
      // Protocol buyback — the wallet sold a pulled card back to the vault.
      // Its own feed row (the payout event); the original pull row keeps its
      // sold_back status pill.
      kind: 'sellback';
      ts: string;
      event_id: string;
      request_id: string;
      tier: string;
      card_slug: string | null;
      card_title: string | null;
      card_set: string | null;
      card_image_front: string | null;
      card_grading: string | null;
      payout_usd: number;
      payout_tx_hash: string | null;
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
      -- Protocol sellbacks get their own feed row (the payout event) on top
      -- of the original pull row, whose pill just flips to sold_back.
      + (SELECT COUNT(*)::int FROM pulls_enriched
         WHERE wallet = ${addr} AND status = 'sold_back' AND sold_at IS NOT NULL)
      -- No marketplace sell-side for players (custodial market sells from the
      -- protocol vault), so only pulls + sellbacks + buys count.
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
    kind: 'pull' | 'sellback' | 'sale_buy' | 'sale_sell';
    ts: string;
    event_id: string;
    request_id: string | null;
    tier: string | null;
    price_usd: string | null;
    fmv_usd: string | null;
    payout_usd: string | null;
    payout_tx_hash: string | null;
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
        NULL::text                         AS payout_tx_hash,
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

      -- Protocol sellback — the wallet sold a pulled card back to the vault.
      -- Booked at the payout-settlement tx when linked (same convention as
      -- getWalletPnlSeries); the GREATEST clamps a bogus 1970 sold_at (a
      -- sellback can't precede its pull). payout_usd already falls back to
      -- fmv_at_pull × tier rate for unlinked sellbacks (view, sql/015).
      SELECT
        'sellback'::text                   AS kind,
        COALESCE(pf.ts, GREATEST(pe.sold_at, pe.pulled_at))::text AS ts,
        pe.request_id::text                AS event_id,
        pe.request_id::text                AS request_id,
        pe.tier                            AS tier,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        pe.payout_usd::text                AS payout_usd,
        pe.payout_tx_hash                  AS payout_tx_hash,
        NULL                               AS status,
        NULL                               AS tx_hash,
        NULL::int                          AS log_index,
        NULL::text                         AS counterparty_wallet,
        NULL::text                         AS counterparty_handle,
        NULL                               AS sale_price_usd,
        NULL                               AS sale_card_fmv,
        pe.card_slug                       AS card_slug,
        c.title                            AS card_title,
        c.card_set                         AS card_set,
        c.image_front                      AS card_image_front,
        c.grading                          AS card_grading
      FROM pulls_enriched pe
      LEFT JOIN cards c ON c.slug = pe.card_slug
      LEFT JOIN usdm_flows pf ON pf.tx_hash = pe.payout_tx_hash AND pf.direction = 'in'
      WHERE pe.wallet = ${addr} AND pe.status = 'sold_back' AND pe.sold_at IS NOT NULL

      UNION ALL

      SELECT
        'sale_buy'::text                   AS kind,
        ms.bought_at::text                 AS ts,
        ms.tx_hash || ':' || ms.log_index  AS event_id,
        NULL                               AS request_id,
        card_meta.tier                     AS tier,
        NULL                               AS price_usd,
        NULL                               AS fmv_usd,
        NULL                               AS payout_usd,
        NULL                               AS payout_tx_hash,
        NULL                               AS status,
        ms.tx_hash                         AS tx_hash,
        ms.log_index                       AS log_index,
        -- Custodial marketplace: the buyer bought from the protocol's vault,
        -- not from another player. Emit NULL → the UI renders "MnStr vault".
        NULL::text                         AS counterparty_wallet,
        NULL::text                         AS counterparty_handle,
        ms.price_usd::text                 AS sale_price_usd,
        card_meta.fmv_usd::text            AS sale_card_fmv,
        c.slug                             AS card_slug,
        c.title                            AS card_title,
        c.card_set                         AS card_set,
        c.image_front                      AS card_image_front,
        c.grading                          AS card_grading
      FROM marketplace_sales ms
      LEFT JOIN cards c ON c.serial_number = ms.serial_number
      -- Card-level attrs (tier + current FMV) for the premium calc. NOT a seller.
      LEFT JOIN LATERAL (
        SELECT p.tier, p.fmv_usd
        FROM pulls p
        WHERE p.card_slug = c.slug
        ORDER BY p.pulled_at DESC LIMIT 1
      ) card_meta ON TRUE
      WHERE ms.buyer = ${addr}

      -- NOTE: no 'sale_sell' branch. The marketplace is custodial (the protocol
      -- sells its own vault inventory), so a player is never a marketplace
      -- seller. We used to synthesize "sold to X" rows for the inferred prior
      -- puller, which fabricated sells that never happened.
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
    if (r.kind === 'sellback') {
      return {
        kind: 'sellback',
        ts: r.ts,
        event_id: r.event_id,
        request_id: r.request_id!,
        tier: r.tier!,
        card_slug: r.card_slug,
        card_title: r.card_title,
        card_set: r.card_set,
        card_image_front: r.card_image_front,
        card_grading: r.card_grading,
        payout_usd: Number(r.payout_usd ?? 0),
        payout_tx_hash: r.payout_tx_hash,
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

