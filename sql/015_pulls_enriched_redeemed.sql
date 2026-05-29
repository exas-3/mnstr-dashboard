-- 015: pulls_enriched.status now surfaces 'redeemed' for physically-shipped cards.
--
-- The full status hierarchy:
--   sold_back  — player sold the card back to the protocol for USDm credit
--   redeemed   — player redeemed the card for physical shipment (no longer in vault)
--   holding    — card is still in the player's vault, still claimable
--
-- Held FMV / paper payout queries should filter to status='holding' only.
-- Sold-back gets the on-chain payout (sql/013). Redeemed contributes nothing
-- to either side — the protocol shipped a physical card, end of story.
--
-- `claimed_at` and `redemption_tx_hash` appended at the end so CREATE OR
-- REPLACE VIEW doesn't reject column reorder.

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
  -- Payout: on-chain truth for sellbacks; fall back to fmv × rate; NULL for
  -- holding or redeemed (no cash equivalent for the player).
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
  ) AS marketplace_sold,
  r.claimed_at,
  r.tx_hash AS redemption_tx_hash
FROM pulls p
LEFT JOIN sellbacks   s ON s.request_id = p.request_id
LEFT JOIN redemptions r ON r.request_id = p.request_id;
