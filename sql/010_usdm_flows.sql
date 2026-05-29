-- 010: on-chain USDm transfer flows for player wallets.
--
-- Realized P&L derived from pulls.price_usd / pulls_enriched.payout_usd is a
-- view of mnstr's off-chain books. The protocol re-prices FMV after sellback,
-- so payout_usd drifts retroactively on every enrich pass. The ground truth
-- is on-chain: every USDm transfer between a player wallet and mnstr's
-- operator EOA / gacha contracts / marketplace is settled in real cash.
--
-- This table mirrors those transfers, wallet-centric:
--
--   direction = 'in'   → operator/gacha/marketplace paid the player
--               'out'  → player paid the protocol
--
-- Sums per wallet give a stable, ahistorical net realized P&L that doesn't
-- drift on FMV re-quotes. The leaderboard query will switch to this once
-- the backfill is validated.

CREATE TABLE IF NOT EXISTS usdm_flows (
  block_number  bigint        NOT NULL,
  tx_hash       text          NOT NULL,
  log_index     integer       NOT NULL,
  ts            timestamptz   NOT NULL,
  wallet        text          NOT NULL,           -- non-operator side (the player)
  direction     text          NOT NULL CHECK (direction IN ('in', 'out')),
  amount_usd    numeric(28,6) NOT NULL,
  counterparty  text          NOT NULL,           -- 'operator' | 'gacha_<tier>' | 'marketplace'
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS usdm_flows_wallet_idx       ON usdm_flows (wallet);
CREATE INDEX IF NOT EXISTS usdm_flows_ts_idx           ON usdm_flows (ts);
CREATE INDEX IF NOT EXISTS usdm_flows_block_idx        ON usdm_flows (block_number);
CREATE INDEX IF NOT EXISTS usdm_flows_counterparty_idx ON usdm_flows (counterparty);
