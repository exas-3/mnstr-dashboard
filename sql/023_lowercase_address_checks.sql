-- 023: enforce the lowercase-address invariant at the schema level.
--
-- Every join in the app (pulls ↔ sellbacks ↔ usdm_flows ↔ marketplace_sales,
-- plus the wallet_pnl matview) assumes addresses are stored lowercase; until
-- now that was enforced only by .toLowerCase() calls scattered through the
-- indexer TS. A single missed call would silently split one wallet into two
-- P&L identities. A CHECK makes the violation loud at insert time instead.
--
-- NOT VALID + VALIDATE avoids a long ACCESS EXCLUSIVE table scan lock on the
-- live DB (existing rows verified conforming before this migration shipped).

ALTER TABLE pulls             ADD CONSTRAINT pulls_wallet_lower_chk  CHECK (wallet = lower(wallet)) NOT VALID;
ALTER TABLE pulls             VALIDATE CONSTRAINT pulls_wallet_lower_chk;

ALTER TABLE sellbacks         ADD CONSTRAINT sellbacks_player_lower_chk CHECK (player = lower(player)) NOT VALID;
ALTER TABLE sellbacks         VALIDATE CONSTRAINT sellbacks_player_lower_chk;

ALTER TABLE usdm_flows        ADD CONSTRAINT usdm_flows_wallet_lower_chk CHECK (wallet = lower(wallet)) NOT VALID;
ALTER TABLE usdm_flows        VALIDATE CONSTRAINT usdm_flows_wallet_lower_chk;

ALTER TABLE marketplace_sales ADD CONSTRAINT marketplace_sales_buyer_lower_chk CHECK (buyer = lower(buyer)) NOT VALID;
ALTER TABLE marketplace_sales VALIDATE CONSTRAINT marketplace_sales_buyer_lower_chk;
