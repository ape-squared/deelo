-- Flexible guild/user storage for extended command features

ALTER TABLE syntax.guilds ADD COLUMN IF NOT EXISTS extra_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE syntax.users ADD COLUMN IF NOT EXISTS extra_config JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS syntax.reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  guild_id TEXT,
  message TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.saved_embeds (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  embed_json JSONB NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE (guild_id, name)
);

CREATE TABLE IF NOT EXISTS syntax.mod_notes (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.autoroles (
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, role_id)
);

GRANT ALL ON syntax.reminders TO service_role;
GRANT ALL ON syntax.saved_embeds TO service_role;
GRANT ALL ON syntax.mod_notes TO service_role;
GRANT ALL ON syntax.autoroles TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA syntax TO service_role;

ALTER TABLE syntax.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.saved_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.mod_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.autoroles ENABLE ROW LEVEL SECURITY;
