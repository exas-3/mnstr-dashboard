-- 005: CardMarketplace contract event indexing.
-- Two events:
--   CardBought(string serial, address indexed buyer, uint256 priceWei)
--     -> marketplace_sales (rare: ~12 over 2 months in observed window)
--   CardPriceUpdated(string serial, uint256 oldPriceWei, uint256 newPriceWei)
--     -> marketplace_price_history (frequent: operator micro-adjusts list prices)
-- `serial` is the card's PSA cert / serial number — joinable to cards.serial_number.

CREATE TABLE IF NOT EXISTS marketplace_sales (
  block_number   BIGINT NOT NULL,
  tx_hash        TEXT NOT NULL,
  log_index      INT NOT NULL,
  serial_number  TEXT NOT NULL,
  buyer          TEXT NOT NULL,
  price_usd      NUMERIC NOT NULL,
  bought_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS marketplace_sales_serial_idx ON marketplace_sales (serial_number);
CREATE INDEX IF NOT EXISTS marketplace_sales_buyer_idx  ON marketplace_sales (buyer);
CREATE INDEX IF NOT EXISTS marketplace_sales_time_idx   ON marketplace_sales (bought_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_price_history (
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  serial_number   TEXT NOT NULL,
  old_price_usd   NUMERIC NOT NULL,
  new_price_usd   NUMERIC NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS mph_serial_time_idx ON marketplace_price_history (serial_number, updated_at DESC);
CREATE INDEX IF NOT EXISTS mph_time_idx        ON marketplace_price_history (updated_at DESC);
