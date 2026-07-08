-- Persistent guild timers and multi-channel welcome/goodbye messages

CREATE TABLE IF NOT EXISTS deelo.guild_timers (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  message TEXT NOT NULL,
  fires_at TIMESTAMPTZ NOT NULL,
  repeat_ms BIGINT,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guild_timers_due_idx
  ON deelo.guild_timers (fires_at)
  WHERE sent = FALSE;

CREATE TABLE IF NOT EXISTS deelo.guild_messages (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('welcome', 'goodbye')),
  channel_id TEXT NOT NULL,
  message TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guild_messages_guild_kind_idx
  ON deelo.guild_messages (guild_id, kind);

ALTER TABLE deelo.guild_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.guild_messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON deelo.guild_timers TO service_role;
GRANT ALL ON deelo.guild_messages TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA deelo TO service_role;
