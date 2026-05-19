-- 004: pulls_enriched view. Derives status and payout_usd by left-joining sellbacks.
-- Replaces the empty status/payout_usd columns on the base table (kept for back-compat).

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
  CASE WHEN s.request_id IS NOT NULL THEN 'sold_back' ELSE 'holding' END        AS status,
  CASE WHEN s.request_id IS NOT NULL THEN ROUND(p.fmv_usd * 0.85, 2) ELSE NULL END AS payout_usd,
  s.sold_at,
  s.tx_hash                                                                       AS sellback_tx_hash
FROM pulls p
LEFT JOIN sellbacks s ON s.request_id = p.request_id;
