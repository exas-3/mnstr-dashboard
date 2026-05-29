-- 014: physical redemption tracking.
--
-- When a player redeems a card for physical shipment, the gacha contract
-- emits NFTRedeemed(player, requestId). The card leaves the protocol's
-- custody — it's no longer "in the vault" and should NOT contribute to
-- held FMV or paper-payout liability calculations.
--
-- Shape mirrors sellbacks: request_id is the link back to the original pull.
-- The pulls_enriched view (sql/015) will surface status='redeemed' for any
-- pull with a row here.

CREATE TABLE IF NOT EXISTS redemptions (
  request_id    numeric(78) PRIMARY KEY,   -- matches pulls.request_id
  player        text         NOT NULL,
  block_number  bigint       NOT NULL,
  tx_hash       text         NOT NULL,
  log_index     integer      NOT NULL,
  claimed_at    timestamptz  NOT NULL
);

CREATE INDEX IF NOT EXISTS redemptions_player_idx ON redemptions (player);
CREATE INDEX IF NOT EXISTS redemptions_block_idx  ON redemptions (block_number);
CREATE UNIQUE INDEX IF NOT EXISTS redemptions_tx_log_idx ON redemptions (tx_hash, log_index);
