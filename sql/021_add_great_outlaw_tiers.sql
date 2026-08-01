-- 021: add the Great + Outlaw gacha tiers to the per-tier buyback CASE arms.
--
-- Two new packs went live after Adventure and were missing from the indexer's
-- hardcoded GACHA_CONTRACTS list (so their pulls weren't being indexed at all):
--   Great  (Pokemon,   $100, buyback 90%)  contract 0x79dd7da8…
--   Outlaw (One Piece, $500, buyback 92%)  contract 0xd7119f72…
--
-- Source of truth for the rates: mnstr.xyz /packs API `buybackRatePct`.
-- Mirrored in scripts/config.ts GACHA_CONTRACTS, lib/buyback.ts and
-- lib/queries/tiers.ts — keep all in sync.
--
-- Re-issues the CURRENT live definitions of pulls_enriched (was sql/019) and
-- wallet_pnl (was sql/020), unchanged except for the two new WHEN arms. Column
-- order is preserved (CREATE OR REPLACE VIEW can only append columns). Both are
-- idempotent.

CREATE OR REPLACE VIEW pulls_enriched AS
SELECT
  p.request_id,
  p.tier,
  p.contract,
  p.wallet,
  p.block_number,
  p.tx_hash,
  p.log_index,
  p.price_usd,
  p.pulled_at,
  p.fmv_usd,
  p.card_slug,
  p.username,
  p.user_slug,
  p.referral_code,
  p.enriched_at,
  p.payment_type,
  p.amount_wei,
  CASE
    WHEN s.request_id  IS NOT NULL THEN 'sold_back'
    WHEN r.request_id  IS NOT NULL THEN 'redeemed'
    ELSE 'holding'
  END AS status,
  -- Payout: on-chain truth for sellbacks; fall back to fmv_at_pull × rate
  -- (stable, pull-time basis); NULL for holding or redeemed.
  CASE
    WHEN s.request_id IS NULL THEN NULL
    WHEN s.onchain_amount_usd IS NOT NULL THEN s.onchain_amount_usd
    WHEN p.tier = 'Starter'   THEN ROUND(p.fmv_at_pull_usd * 0.87, 2)
    WHEN p.tier = 'Premium'   THEN ROUND(p.fmv_at_pull_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'     THEN ROUND(p.fmv_at_pull_usd * 0.95, 2)
    WHEN p.tier = 'Adventure' THEN ROUND(p.fmv_at_pull_usd * 0.90, 2)
    WHEN p.tier = 'Great'     THEN ROUND(p.fmv_at_pull_usd * 0.90, 2)
    WHEN p.tier = 'Outlaw'    THEN ROUND(p.fmv_at_pull_usd * 0.92, 2)
    ELSE                           ROUND(p.fmv_at_pull_usd * 0.85, 2)
  END AS payout_usd,
  s.sold_at,
  s.tx_hash AS sellback_tx_hash,
  CASE
    WHEN p.fmv_at_pull_usd IS NULL THEN NULL
    WHEN p.tier = 'Starter'        THEN ROUND(p.fmv_at_pull_usd * 0.87, 2)
    WHEN p.tier = 'Premium'        THEN ROUND(p.fmv_at_pull_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'          THEN ROUND(p.fmv_at_pull_usd * 0.95, 2)
    WHEN p.tier = 'Adventure'      THEN ROUND(p.fmv_at_pull_usd * 0.90, 2)
    WHEN p.tier = 'Great'          THEN ROUND(p.fmv_at_pull_usd * 0.90, 2)
    WHEN p.tier = 'Outlaw'         THEN ROUND(p.fmv_at_pull_usd * 0.92, 2)
    ELSE                                ROUND(p.fmv_at_pull_usd * 0.85, 2)
  END AS paper_payout_usd,
  p.fmv_at_pull_usd,
  EXISTS (
    SELECT 1
    FROM cards c
    JOIN marketplace_sales ms ON ms.serial_number = c.serial_number
    WHERE c.slug = p.card_slug
  ) AS marketplace_sold,
  r.claimed_at,
  r.tx_hash AS redemption_tx_hash,
  s.payout_tx_hash
FROM pulls p
LEFT JOIN sellbacks   s ON s.request_id = p.request_id
LEFT JOIN redemptions r ON r.request_id = p.request_id;

CREATE OR REPLACE VIEW wallet_pnl AS
WITH realized AS (
  SELECT
    wallet,
    COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'in'),  0) AS realized_in,
    COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'out'), 0) AS realized_out
  FROM usdm_flows
  GROUP BY wallet
),
held AS (
  SELECT
    wallet,
    COALESCE(SUM(CASE
      WHEN tier = 'Starter'   THEN fmv_usd * 0.87
      WHEN tier = 'Premium'   THEN fmv_usd * 0.91
      WHEN tier = 'Ultra'     THEN fmv_usd * 0.95
      WHEN tier = 'Adventure' THEN fmv_usd * 0.90
      WHEN tier = 'Great'     THEN fmv_usd * 0.90
      WHEN tier = 'Outlaw'    THEN fmv_usd * 0.92
      ELSE                         fmv_usd * 0.85
    END), 0) AS held_paper,
    COALESCE(SUM(fmv_usd), 0) AS held_fmv
  FROM pulls_enriched
  WHERE status = 'holding' AND fmv_usd IS NOT NULL
  GROUP BY wallet
),
mp_owner AS (
  -- Latest buyer per serial = its current marketplace owner.
  SELECT DISTINCT ON (serial_number)
    serial_number, buyer AS wallet
  FROM marketplace_sales
  ORDER BY serial_number, block_number DESC, log_index DESC
),
mp_held AS (
  SELECT o.wallet, COALESCE(SUM(cf.fmv), 0) AS mp_held_fmv
  FROM mp_owner o
  JOIN cards c ON c.serial_number = o.serial_number
  LEFT JOIN LATERAL (
    SELECT MAX(p.fmv_usd) AS fmv FROM pulls p WHERE p.card_slug = c.slug
  ) cf ON TRUE
  WHERE cf.fmv IS NOT NULL
  GROUP BY o.wallet
)
SELECT
  COALESCE(r.wallet, h.wallet, m.wallet) AS wallet,
  COALESCE(r.realized_in,  0)::numeric(18,2)                                                       AS realized_in,
  COALESCE(r.realized_out, 0)::numeric(18,2)                                                       AS realized_out,
  (COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))::numeric(18,2)                        AS realized_net,
  COALESCE(h.held_paper, 0)::numeric(18,2)                                                         AS held_paper,
  ((COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))
    + COALESCE(h.held_fmv, 0) + COALESCE(m.mp_held_fmv, 0))::numeric(18,2)                          AS total_net,
  COALESCE(h.held_fmv, 0)::numeric(18,2)                                                           AS held_fmv,
  COALESCE(m.mp_held_fmv, 0)::numeric(18,2)                                                        AS mp_held_fmv
FROM realized r
FULL OUTER JOIN held h    USING (wallet)
FULL OUTER JOIN mp_held m USING (wallet);
