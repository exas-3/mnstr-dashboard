-- mnstr-indexer schema v1

CREATE TABLE IF NOT EXISTS cards (
  slug              TEXT PRIMARY KEY,
  title             TEXT,
  year              INT,
  card_set          TEXT,
  player            TEXT,
  grading           TEXT,
  grading_company   TEXT,
  serial_number     TEXT,
  category          TEXT,
  image_front       TEXT,
  image_back        TEXT,
  list_price_usd    NUMERIC,
  remote_id         TEXT,
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pulls (
  request_id        NUMERIC(78,0) PRIMARY KEY,
  tier              TEXT NOT NULL,
  contract          TEXT NOT NULL,
  wallet            TEXT NOT NULL,
  block_number      BIGINT NOT NULL,
  tx_hash           TEXT NOT NULL,
  log_index         INT NOT NULL,
  price_usd         NUMERIC,
  pulled_at         TIMESTAMPTZ NOT NULL,

  -- API enrichment
  fmv_usd           NUMERIC,
  payout_usd        NUMERIC,
  status            TEXT,
  card_slug         TEXT REFERENCES cards(slug),
  username          TEXT,
  user_slug         TEXT,
  referral_code     TEXT,
  enriched_at       TIMESTAMPTZ,
  status_checked_at TIMESTAMPTZ,

  UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS pulls_wallet_idx     ON pulls (wallet);
CREATE INDEX IF NOT EXISTS pulls_tier_time_idx  ON pulls (tier, pulled_at DESC);
CREATE INDEX IF NOT EXISTS pulls_user_slug_idx  ON pulls (user_slug);
CREATE INDEX IF NOT EXISTS pulls_card_slug_idx  ON pulls (card_slug);
CREATE INDEX IF NOT EXISTS pulls_holding_idx    ON pulls (status_checked_at NULLS FIRST)
  WHERE status IS NULL OR status = 'holding';

CREATE TABLE IF NOT EXISTS indexer_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  snapshot_at   TIMESTAMPTZ NOT NULL,
  rank          INT NOT NULL,
  user_id       INT NOT NULL,
  username      TEXT,
  slug          TEXT,
  total_points  NUMERIC,
  points_today  NUMERIC,
  PRIMARY KEY (snapshot_at, user_id)
);

CREATE INDEX IF NOT EXISTS leaderboard_user_idx ON leaderboard_snapshots (user_id, snapshot_at DESC);
