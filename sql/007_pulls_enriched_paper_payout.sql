-- 007: add paper_payout_usd to pulls_enriched.
--
-- payout_usd is REALISED: NULL on holding pulls, fmv × tier-rate on sold-back.
-- paper_payout_usd is HYPOTHETICAL: fmv × tier-rate on EVERY pull with fmv,
-- regardless of whether the player has sold yet. It represents the protocol's
-- unrealised liability — the dollars they'd have to pay out if everyone tried
-- to cash in their cards right now.
--
-- House-edge calculations should use paper, not realised — otherwise tiers
-- with low sellback rates look artificially profitable (a tier where players
-- are still holding their winnings has fewer realised payouts so the
-- "realised edge" goes up, even though the protocol's books are unchanged).
--
-- Per-tier rates mirror sql/006 + scripts/config.ts + lib/queries.ts.
-- Re-running is idempotent (CREATE OR REPLACE VIEW). Adding a column at
-- the end is allowed by Postgres' replace-view rules.

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
  CASE WHEN s.request_id IS NOT NULL THEN 'sold_back' ELSE 'holding' END AS status,
  CASE
    WHEN s.request_id IS NULL THEN NULL
    WHEN p.tier = 'Starter'   THEN ROUND(p.fmv_usd * 0.87, 2)
    WHEN p.tier = 'Premium'   THEN ROUND(p.fmv_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'     THEN ROUND(p.fmv_usd * 0.95, 2)
    WHEN p.tier = 'Adventure' THEN ROUND(p.fmv_usd * 0.90, 2)
    ELSE                           ROUND(p.fmv_usd * 0.85, 2)
  END AS payout_usd,
  s.sold_at,
  s.tx_hash AS sellback_tx_hash,
  CASE
    WHEN p.fmv_usd IS NULL    THEN NULL
    WHEN p.tier = 'Starter'   THEN ROUND(p.fmv_usd * 0.87, 2)
    WHEN p.tier = 'Premium'   THEN ROUND(p.fmv_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'     THEN ROUND(p.fmv_usd * 0.95, 2)
    WHEN p.tier = 'Adventure' THEN ROUND(p.fmv_usd * 0.90, 2)
    ELSE                           ROUND(p.fmv_usd * 0.85, 2)
  END AS paper_payout_usd
FROM pulls p
LEFT JOIN sellbacks s ON s.request_id = p.request_id;
