-- 020: credit marketplace-bought slabs to the buyer's held inventory.
--
-- The cash side of marketplace activity is already in P&L (buyers pay the
-- operator EOA, captured in usdm_flows as 'out'). But a buyer's purchased slab
-- was never added to held FMV, so a marketplace buyer looked like a pure loss.
--
-- Fix: the current owner of a marketplace serial = its latest buyer. Credit
-- that wallet with the slab's current FMV (raw, matching held_fmv). Cards
-- re-sold by the buyer drop out (someone else becomes the latest buyer).
-- The sell side is intentionally untouched: marketplace inventory is sold by
-- the protocol from its own vault (no player "seller" payout exists on-chain),
-- so there's nothing to deduct from a player's held inventory.
--
-- Appends mp_held_fmv; total_net now = realized_net + held_fmv + mp_held_fmv.

CREATE OR REPLACE VIEW wallet_pnl AS
WITH realized AS (
  SELECT
    wallet,
    COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'in'),  0) AS realized_in,
    COALESCE(SUM(amount_usd) FILTER (WHERE direction = 'out'), 0) AS realized_out
  FROM usdm_flows
  GROUP BY wallet
),
held AS (
  SELECT
    wallet,
    COALESCE(SUM(CASE
      WHEN tier = 'Starter'   THEN fmv_usd * 0.87
      WHEN tier = 'Premium'   THEN fmv_usd * 0.91
      WHEN tier = 'Ultra'     THEN fmv_usd * 0.95
      WHEN tier = 'Adventure' THEN fmv_usd * 0.90
      ELSE                         fmv_usd * 0.85
    END), 0) AS held_paper,
    COALESCE(SUM(fmv_usd), 0) AS held_fmv
  FROM pulls_enriched
  WHERE status = 'holding' AND fmv_usd IS NOT NULL
  GROUP BY wallet
),
mp_owner AS (
  -- Latest buyer per serial = its current marketplace owner.
  SELECT DISTINCT ON (serial_number)
    serial_number, buyer AS wallet
  FROM marketplace_sales
  ORDER BY serial_number, block_number DESC, log_index DESC
),
mp_held AS (
  SELECT o.wallet, COALESCE(SUM(cf.fmv), 0) AS mp_held_fmv
  FROM mp_owner o
  JOIN cards c ON c.serial_number = o.serial_number
  LEFT JOIN LATERAL (
    SELECT MAX(p.fmv_usd) AS fmv FROM pulls p WHERE p.card_slug = c.slug
  ) cf ON TRUE
  WHERE cf.fmv IS NOT NULL
  GROUP BY o.wallet
)
SELECT
  COALESCE(r.wallet, h.wallet, m.wallet) AS wallet,
  COALESCE(r.realized_in,  0)::numeric(18,2)                                                       AS realized_in,
  COALESCE(r.realized_out, 0)::numeric(18,2)                                                       AS realized_out,
  (COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))::numeric(18,2)                        AS realized_net,
  COALESCE(h.held_paper, 0)::numeric(18,2)                                                         AS held_paper,
  ((COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))
    + COALESCE(h.held_fmv, 0) + COALESCE(m.mp_held_fmv, 0))::numeric(18,2)                          AS total_net,
  COALESCE(h.held_fmv, 0)::numeric(18,2)                                                           AS held_fmv,
  COALESCE(m.mp_held_fmv, 0)::numeric(18,2)                                                        AS mp_held_fmv
FROM realized r
FULL OUTER JOIN held h    USING (wallet)
FULL OUTER JOIN mp_held m USING (wallet);
