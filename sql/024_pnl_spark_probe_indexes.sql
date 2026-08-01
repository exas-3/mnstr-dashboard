-- 024: indexes for the P&L-spark "naked cash" probes (pnlSparkForWallets and
-- getWalletPnlSeries in lib/queries/wallets.ts).
--
-- At default work_mem (4MB) the three NOT (… AND EXISTS(…)) subplans over
-- pulls / marketplace_sales / sellbacks don't fit as hashed subplans and fall
-- back to correlated per-row re-execution — ~14.4M buffer accesses, 20-30s+,
-- which is what took /wallets down (2026-08-01). These make every probe an
-- index lookup so the plan stays fast in both modes.
--
-- Plain CREATE INDEX, not CONCURRENTLY — the migration runner wraps each file
-- in a transaction. The SHARE lock blocks indexer writes for the few seconds
-- of each build; acceptable at 100-200k rows per table. Superseded
-- single-column indexes are NOT dropped here: DROP INDEX takes ACCESS
-- EXCLUSIVE for the rest of the transaction (housekeeping for a later 025).

-- The shared client ships a 30s session statement_timeout (db/client.ts);
-- lift it for this transaction so an index build can't be killed mid-run.
SET LOCAL statement_timeout = 0;

CREATE INDEX IF NOT EXISTS pulls_wallet_block_idx
  ON pulls (wallet, block_number);

CREATE INDEX IF NOT EXISTS marketplace_sales_buyer_block_idx
  ON marketplace_sales (buyer, block_number);

-- Partial: the probe is payout_tx_hash = f.tx_hash, which implies NOT NULL
-- (same style as sellbacks_onchain_amount_idx in sql/012).
CREATE INDEX IF NOT EXISTS sellbacks_payout_tx_idx
  ON sellbacks (payout_tx_hash) WHERE payout_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS usdm_flows_wallet_ts_idx
  ON usdm_flows (wallet, ts);
