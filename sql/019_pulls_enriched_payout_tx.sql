-- 019: pulls_enriched — surface the payout tx + fix the payout fallback.
--
-- Changes vs sql/015:
--   1. payout_usd fallback now uses fmv_at_pull_usd (the price frozen at pull
--      time) instead of the live fmv_usd. Sellbacks are priced against the FMV
--      at sell time, which is far closer to pull-time FMV than to today's
--      re-quoted value — using live fmv produced payouts that exceeded the
--      pull-time FMV (impossible for a ≤100% buyback). On-chain amount still
--      wins whenever we have it.
--   2. payout_tx_hash appended (the matched on-chain USDm transfer tx), so the
--      UI can link a sold-back row to the actual payout on the explorer.

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
