-- 008: snapshot FMV at pull time so paper P&L stops drifting.
--
-- pulls.fmv_usd is overwritten on every enrich (vault re-appraisals). That
-- makes paper P&L shift retroactively whenever MnStr re-prices a card —
-- which isn't what "paper" should measure. The protocol's commitment is
-- the buyback price at the MOMENT of pull (= fmv-at-pull × tier-rate),
-- locked in. Later FMV drift is market noise, not protocol economics.
--
-- New column `fmv_at_pull_usd`:
--   - one-time snapshot of fmv_usd for every pull already in the DB
--     (we don't have historical FMVs for them — this is the best we can do)
--   - enrich.ts will only populate it when NULL going forward (first enrich
--     after a new pull). Subsequent enrichments leave it alone.
--
-- `fmv_usd` keeps its current behaviour (latest vault appraisal — used for
-- "Vault FMV (holding)" which IS meant to mark-to-market).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATE WHERE NULL.

ALTER TABLE pulls ADD COLUMN IF NOT EXISTS fmv_at_pull_usd numeric;

UPDATE pulls
SET fmv_at_pull_usd = fmv_usd
WHERE fmv_at_pull_usd IS NULL AND fmv_usd IS NOT NULL;

-- Existing column order must be preserved for CREATE OR REPLACE — new columns
-- (fmv_at_pull_usd) are appended at the end, AFTER paper_payout_usd which was
-- already the last column in 007. paper_payout_usd here now uses the new
-- at-pull snapshot instead of the live fmv.

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
  -- paper_payout_usd: protocol's hypothetical buyback commitment AT PULL TIME
  -- (frozen fmv_at_pull_usd × tier rate). Doesn't drift with later vault re-appraisals.
  CASE
    WHEN p.fmv_at_pull_usd IS NULL THEN NULL
    WHEN p.tier = 'Starter'        THEN ROUND(p.fmv_at_pull_usd * 0.87, 2)
    WHEN p.tier = 'Premium'        THEN ROUND(p.fmv_at_pull_usd * 0.91, 2)
    WHEN p.tier = 'Ultra'          THEN ROUND(p.fmv_at_pull_usd * 0.95, 2)
    WHEN p.tier = 'Adventure'      THEN ROUND(p.fmv_at_pull_usd * 0.90, 2)
    ELSE                                ROUND(p.fmv_at_pull_usd * 0.85, 2)
  END AS paper_payout_usd,
  p.fmv_at_pull_usd
FROM pulls p
LEFT JOIN sellbacks s ON s.request_id = p.request_id;
