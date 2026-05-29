-- 017: net P&L now marks held inventory at raw FMV, not buyback value.
--
-- Old: total_net = realized_net + held_paper   (held × per-tier buyback rate)
-- New: total_net = realized_net + held_fmv      (held × raw FMV, no discount)
--
-- held_paper is retained (the wallet detail page still shows it as the
-- "Held · buyback" sub-tile), and held_fmv is appended so total_net can use
-- it. CREATE OR REPLACE VIEW keeps the existing columns in order and only
-- appends held_fmv at the end.

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
)
SELECT
  COALESCE(r.wallet, h.wallet) AS wallet,
  COALESCE(r.realized_in,  0)::numeric(18,2)                                                       AS realized_in,
  COALESCE(r.realized_out, 0)::numeric(18,2)                                                       AS realized_out,
  (COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0))::numeric(18,2)                        AS realized_net,
  COALESCE(h.held_paper, 0)::numeric(18,2)                                                         AS held_paper,
  ((COALESCE(r.realized_in, 0) - COALESCE(r.realized_out, 0)) + COALESCE(h.held_fmv, 0))::numeric(18,2) AS total_net,
  COALESCE(h.held_fmv, 0)::numeric(18,2)                                                           AS held_fmv
FROM realized r
FULL OUTER JOIN held h USING (wallet);
