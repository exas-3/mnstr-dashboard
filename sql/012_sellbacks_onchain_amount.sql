-- 012: per-trade attribution — link each sellback row to the actual USDm
-- transfer that paid the player, so individual sellback dollar amounts
-- become on-chain ground truth instead of view-derived (fmv × tier_rate).
--
-- The match is wallet + block-window. NFTSoldBack(player, playId) settles via
-- ERC-4337 UserOp; the actual USDm Transfer from operator → player either
-- lives in the same tx (inner call, surfaced via tokentx but not raw receipt
-- logs) or in a nearby block. Using a ±5 block window captures both cases
-- safely on MegaETH's ~10ms block time.
--
-- Once populated, sql/013 will swap pulls_enriched.payout_usd to read from
-- this column, propagating the on-chain truth to every existing query that
-- SELECTs payout_usd.

ALTER TABLE sellbacks ADD COLUMN IF NOT EXISTS onchain_amount_usd numeric(18,6);

CREATE INDEX IF NOT EXISTS sellbacks_onchain_amount_idx
  ON sellbacks (onchain_amount_usd) WHERE onchain_amount_usd IS NOT NULL;

-- Backfill from existing usdm_flows. For each sellback, find the nearest-
-- block USDm IN transfer to the player; LIMIT 1 + ORDER BY block proximity
-- to handle the rare case where mnstr pays multiple sellbacks in adjacent
-- blocks for the same player.
UPDATE sellbacks s
SET onchain_amount_usd = match.amount_usd
FROM (
  SELECT
    s2.request_id,
    (
      SELECT f.amount_usd
      FROM usdm_flows f
      WHERE f.wallet = s2.player
        AND f.direction = 'in'
        AND f.block_number BETWEEN s2.block_number - 5 AND s2.block_number + 5
      ORDER BY ABS(f.block_number - s2.block_number) ASC, f.log_index ASC
      LIMIT 1
    ) AS amount_usd
  FROM sellbacks s2
  WHERE s2.onchain_amount_usd IS NULL
) match
WHERE s.request_id = match.request_id
  AND match.amount_usd IS NOT NULL;
