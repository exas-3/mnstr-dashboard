-- 006: replace the flat 0.85 buyback constant with the real per-tier rates.
--
-- Source of truth: mnstr.xyz /packs API `buybackRatePct` field. Mirrored
-- here AND in scripts/config.ts GACHA_CONTRACTS — keep both in sync.
--
--   Starter   87%
--   Premium   91%
--   Ultra     95%
--   Adventure 90%
--   <unknown> 85% (defensive fallback for tiers we don't know about)
--
-- Re-running this is idempotent — CREATE OR REPLACE VIEW.

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
  s.tx_hash AS sellback_tx_hash
FROM pulls p
LEFT JOIN sellbacks s ON s.request_id = p.request_id;
