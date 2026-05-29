-- 018: capture the payout tx + widen the sellback→USDm match window.
--
-- The ±5 block window in sql/012 was too tight: on MegaETH the USDm payout
-- transfer can settle ~10-30 blocks after the NFTSoldBack event (separate
-- ERC-4337 tx), so many sellbacks were left with onchain_amount_usd = NULL
-- and the view fabricated a fmv × rate payout instead. We now:
--   * store the matched payout tx hash (for explorer links), and
--   * widen the window to [block-5, block+250] (payouts come after the
--     sellback), re-matching ALL rows so amounts + tx hashes are consistent.

ALTER TABLE sellbacks ADD COLUMN IF NOT EXISTS payout_tx_hash text;

UPDATE sellbacks s
SET onchain_amount_usd = match.amount_usd,
    payout_tx_hash     = match.tx_hash
FROM (
  SELECT
    s2.request_id,
    f.amount_usd,
    f.tx_hash
  FROM sellbacks s2
  LEFT JOIN LATERAL (
    SELECT f.amount_usd, f.tx_hash
    FROM usdm_flows f
    WHERE f.wallet = s2.player
      AND f.direction = 'in'
      AND f.block_number BETWEEN s2.block_number - 5 AND s2.block_number + 250
    ORDER BY ABS(f.block_number - s2.block_number) ASC, f.log_index ASC
    LIMIT 1
  ) f ON TRUE
) match
WHERE s.request_id = match.request_id
  AND match.amount_usd IS NOT NULL;
