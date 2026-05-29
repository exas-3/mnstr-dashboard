-- 013: payout_usd in pulls_enriched now sources from on-chain USDm.
--
-- Previously: payout_usd was computed live as `current_fmv × tier_rate` for
-- every sold-back pull. That drifted whenever MnStr re-priced an FMV — the
-- view returned a different dollar amount on each read.
--
-- After sql/012 backfilled sellbacks.onchain_amount_usd from usdm_flows
-- (99.7% of historical sellbacks matched), we have the actual USDm the
-- protocol paid the player at sellback time. Switch the view to read it.
--
-- Backward-compat: if a sellback exists but onchain_amount_usd is NULL
-- (the 0.3% unmatched edge cases, or new sellbacks before the link backfill
-- runs), fall back to the old `fmv × tier_rate` calc so existing UI doesn't
-- show blank payouts.
--
-- paper_payout_usd is unchanged — it's `fmv_at_pull_usd × tier_rate`, used
-- by getTierEconomics for paper-EV math, and is intentionally static.

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
  -- On-chain truth first; fall back to fmv × rate for unmatched legacy rows.
  CASE
    WHEN s.request_id IS NULL THEN NULL
    WHEN s.onchain_amount_usd IS NOT NULL THEN s.onchain_amount_usd
    WHEN p.tier = 'Starter'   THEN ROUND(p.fmv_usd * 0.87, 2)
    WHEN p.tier = 'Premium'   THEN ROUND(p.fmv_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'     THEN ROUND(p.fmv_usd * 0.95, 2)
    WHEN p.tier = 'Adventure' THEN ROUND(p.fmv_usd * 0.90, 2)
    ELSE                           ROUND(p.fmv_usd * 0.85, 2)
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
  ) AS marketplace_sold
FROM pulls p
LEFT JOIN sellbacks s ON s.request_id = p.request_id;
