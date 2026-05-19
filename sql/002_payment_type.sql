-- 002: track credit-paid (sell-back-converted) pulls as a second event source.
-- Original PlayAssigned event represents USDm-paid pulls (data carries wei amount).
-- NFTSoldBack event 0x470edf6... is emitted when a sell-back is converted directly
-- into a new play — same playId structure, empty data, no USDm transfer.

ALTER TABLE pulls
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'usdm',
  ADD COLUMN IF NOT EXISTS amount_wei   NUMERIC(78,0);

ALTER TABLE pulls
  ADD CONSTRAINT pulls_payment_type_chk CHECK (payment_type IN ('usdm', 'credit'));

CREATE INDEX IF NOT EXISTS pulls_payment_type_idx ON pulls (payment_type);
