-- 022: hot-path indexes + materialize wallet_pnl.
--
-- (a) Indexes matching the actual read patterns in lib/queries — the global
--     live feed (ORDER BY pulled_at DESC, request_id DESC LIMIT n, polled
--     every ~5s) and every per-wallet / per-card history list were seq-scan +
--     sort because the only time index led with `tier`.
-- (b) cards.serial_number gets the UNIQUE index the whole marketplace linkage
--     already assumes (slug ↔ serial is 1:1 per CLAUDE.md) — a violating
--     upsert now fails loudly instead of silently corrupting P&L.
-- (c) wallet_pnl becomes a MATERIALIZED VIEW. As a plain view its full
--     aggregation (all of usdm_flows + a pass over pulls_enriched + the
--     marketplace CTEs) re-ran on EVERY join — leaderboard pages, KPIs,
--     wallet-detail rank (each page view), search. Its inputs only move on
--     the 5-min reconcile, so the poller refreshes it once per cycle
--     (REFRESH MATERIALIZED VIEW CONCURRENTLY — needs the UNIQUE index) and
--     every consumer becomes an indexed join. Definition is byte-identical
--     to the view from sql/021.

CREATE INDEX IF NOT EXISTS pulls_pulled_at_idx     ON pulls (pulled_at DESC, request_id DESC);
CREATE INDEX IF NOT EXISTS pulls_wallet_time_idx   ON pulls (wallet, pulled_at DESC);
CREATE INDEX IF NOT EXISTS pulls_card_slug_time_idx ON pulls (card_slug, pulled_at DESC);
-- Superseded by the composite indexes above (equality lookups use them too).
DROP INDEX IF EXISTS pulls_wallet_idx;
DROP INDEX IF EXISTS pulls_card_slug_idx;

CREATE UNIQUE INDEX IF NOT EXISTS cards_serial_uq
  ON cards (serial_number) WHERE serial_number IS NOT NULL;

DROP VIEW IF EXISTS wallet_pnl;

CREATE MATERIALIZED VIEW wallet_pnl AS
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
      WHEN tier = 'Great'     THEN fmv_usd * 0.90
      WHEN tier = 'Outlaw'    THEN fmv_usd * 0.92
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

-- Required by REFRESH MATERIALIZED VIEW CONCURRENTLY (and makes every
-- `LEFT JOIN wallet_pnl wp ON wp.wallet = ...` an index lookup).
CREATE UNIQUE INDEX wallet_pnl_wallet_uq ON wallet_pnl (wallet);
