-- Append-only FMV history per card. Written by scripts/fmv.ts on a slow
-- (~hourly) cadence, but only when a card's FMV actually changes vs the last
-- snapshot, so the series stays compact and reads as clean step changes.
-- Charting consumes this later; for now it's purely a log.

CREATE TABLE IF NOT EXISTS card_fmv_snapshots (
  card_slug   TEXT NOT NULL REFERENCES cards(slug),
  fmv_usd     NUMERIC NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_slug, observed_at)
);

CREATE INDEX IF NOT EXISTS card_fmv_snap_slug_time_idx
  ON card_fmv_snapshots (card_slug, observed_at DESC);
