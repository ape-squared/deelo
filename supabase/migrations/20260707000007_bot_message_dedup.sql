-- Cross-instance command dedup (prevents duplicate replies when multiple bot processes run)

CREATE TABLE IF NOT EXISTS deelo.bot_message_dedup (
  message_id TEXT PRIMARY KEY,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_message_dedup_claimed_at
  ON deelo.bot_message_dedup (claimed_at);

ALTER TABLE deelo.bot_message_dedup ENABLE ROW LEVEL SECURITY;
GRANT ALL ON deelo.bot_message_dedup TO service_role;
