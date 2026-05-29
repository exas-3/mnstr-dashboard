-- 011: wallet_pnl view — single source of truth for per-wallet P&L.
--
-- Replaces the leaderboard's old formula
--   net = SUM(payout_usd) FILTER (status='sold_back') - SUM(price_usd)
-- which silently drifts every time MnStr re-prices an FMV (the view computes
-- payout_usd live as fmv_usd × tier_rate).
--
-- New formula:
--   realized_net = SUM(usdm_flows.IN  from operator)
--                - SUM(usdm_flows.OUT to operator)        ← on-chain ground truth
--   held_paper   = SUM(held cards × current_fmv × tier_rate)  ← mark-to-market on inventory
--   total_net    = realized_net + held_paper
--
-- Realized side is stable: once a sellback transfer is on-chain, its dollar
-- amount never changes. Held side still moves with MnStr's FMV re-quotes,
-- but only for cards the player hasn't sold yet — which is correct
-- mark-to-market behavior for unrealized positions.

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
    END), 0) AS held_paper
  FROM pulls_enriched
  WHERE status = 'holding' AND fmv_usd IS NOT NULL
  GROUP BY wallet
)
SELECT
  COALESCE(r.wallet, h.wallet) AS wallet,
  COALESCE(r.realized_in,  0)::numeric(18,2)                                                       AS realized_in,
  COALESCE(r.realized_out, 0)::numeric(18,2)                                                       AS realized_out,
  (COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))::numeric(18,2)                        AS realized_net,
  COALESCE(h.held_paper, 0)::numeric(18,2)                                                         AS held_paper,
  ((COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0)) + COALESCE(h.held_paper, 0))::numeric(18,2) AS total_net
FROM realized r
FULL OUTER JOIN held h USING (wallet);
