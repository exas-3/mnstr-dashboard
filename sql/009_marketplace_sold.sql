-- 009: surface marketplace-sold pulls in pulls_enriched.
--
-- A pull can exit the protocol's books two ways:
--   1. NFTSoldBack to the pack contract → status='sold_back', payout_usd set
--   2. Listed on the CardMarketplace → counterparty paid USDm to take the slab,
--      indexed in marketplace_sales by serial_number
--
-- Only (1) currently flips `status`. (2) just sits in marketplace_sales with
-- no link back to pulls. This migration exposes a `marketplace_sold` boolean
-- in the view so the dashboard can surface marketplace-sold rate alongside
-- sold-back rate as two distinct metrics.
--
-- Link path: pulls.card_slug → cards.slug → cards.serial_number →
-- marketplace_sales.serial_number. The EXISTS subquery short-circuits on
-- first match, so multiple resales of the same slab don't double-count.
--
-- Column appended at the end so CREATE OR REPLACE VIEW is happy.

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
