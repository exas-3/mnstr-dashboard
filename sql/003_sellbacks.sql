-- 003: sellbacks table. One row per NFTSoldBack event on an OffchainGacha contract.
-- Joined to `pulls` by request_id (= the original playId being sold back).
-- Payout is derived (not stored) as fmv_usd * 0.85 — see pulls_enriched view in 004.

CREATE TABLE IF NOT EXISTS sellbacks (
  request_id    NUMERIC(78,0) PRIMARY KEY REFERENCES pulls(request_id),
  player        TEXT NOT NULL,
  block_number  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL,
  log_index     INT NOT NULL,
  sold_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS sellbacks_player_idx  ON sellbacks (player);
CREATE INDEX IF NOT EXISTS sellbacks_sold_at_idx ON sellbacks (sold_at DESC);
