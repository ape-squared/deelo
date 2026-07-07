-- Syntax Discord Bot schema (isolated in `syntax` schema)

CREATE SCHEMA IF NOT EXISTS syntax;

-- Guild settings
CREATE TABLE IF NOT EXISTS syntax.guilds (
  id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT ',',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'premium_plus')),
  plan_expires_at TIMESTAMPTZ,
  mod_log_channel TEXT,
  welcome_channel TEXT,
  welcome_message TEXT,
  goodbye_channel TEXT,
  goodbye_message TEXT,
  mute_role TEXT,
  jail_role TEXT,
  autorole TEXT,
  starboard_channel TEXT,
  starboard_threshold INTEGER DEFAULT 3,
  levels_enabled BOOLEAN DEFAULT TRUE,
  levels_channel TEXT,
  levels_multiplier REAL DEFAULT 1.0,
  snipe_enabled BOOLEAN DEFAULT TRUE,
  automod_enabled BOOLEAN DEFAULT FALSE,
  antinuke_enabled BOOLEAN DEFAULT FALSE,
  antinuke_threshold INTEGER DEFAULT 5,
  antiraid_enabled BOOLEAN DEFAULT FALSE,
  antiraid_min_age INTEGER DEFAULT 7,
  antiraid_avatar BOOLEAN DEFAULT FALSE,
  fake_permissions_enabled BOOLEAN DEFAULT FALSE,
  voicemaster_category TEXT,
  voicemaster_join_channel TEXT,
  voicemaster_interface_channel TEXT,
  voicemaster_default_name TEXT DEFAULT '{user.display_name}''s vc',
  voicemaster_default_bitrate INTEGER DEFAULT 64,
  voicemaster_join_role TEXT,
  bump_channel TEXT,
  bump_interval INTEGER DEFAULT 7200000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.users (
  id TEXT PRIMARY KEY,
  lastfm_username TEXT,
  custom_prefix TEXT,
  plan TEXT DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS syntax.member_xp (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  last_xp_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS syntax.mod_cases (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.warnings (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.auto_responders (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  response TEXT NOT NULL,
  match_type TEXT DEFAULT 'contains',
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS syntax.reaction_roles (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  role_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS syntax.button_roles (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  label TEXT NOT NULL,
  role_id TEXT NOT NULL,
  style TEXT DEFAULT 'primary'
);

CREATE TABLE IF NOT EXISTS syntax.level_rewards (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS syntax.counters (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  type TEXT NOT NULL,
  format TEXT DEFAULT '{count}'
);

CREATE TABLE IF NOT EXISTS syntax.filters (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  action TEXT DEFAULT 'delete',
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS syntax.giveaways (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  host_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winners_count INTEGER DEFAULT 1,
  ends_at TIMESTAMPTZ NOT NULL,
  ended BOOLEAN DEFAULT FALSE,
  required_role TEXT
);

CREATE TABLE IF NOT EXISTS syntax.giveaway_entries (
  giveaway_id BIGINT NOT NULL REFERENCES syntax.giveaways(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  PRIMARY KEY (giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS syntax.tickets (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  panel_name TEXT,
  claimed_by TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS syntax.ticket_panels (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  category_id TEXT,
  support_role TEXT,
  form_json JSONB
);

CREATE TABLE IF NOT EXISTS syntax.ticket_blacklist (
  guild_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  PRIMARY KEY (guild_id, target_id)
);

CREATE TABLE IF NOT EXISTS syntax.voicemaster_channels (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  locked BOOLEAN DEFAULT FALSE,
  ghosted BOOLEAN DEFAULT FALSE,
  user_limit INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS syntax.afk_users (
  user_id TEXT PRIMARY KEY,
  reason TEXT,
  since TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.command_aliases (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  command TEXT NOT NULL,
  UNIQUE (guild_id, alias)
);

CREATE TABLE IF NOT EXISTS syntax.social_feeds (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  username TEXT NOT NULL,
  last_post_id TEXT
);

CREATE TABLE IF NOT EXISTS syntax.vanity_roles (
  guild_id TEXT NOT NULL,
  vanity_string TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, vanity_string)
);

CREATE TABLE IF NOT EXISTS syntax.reaction_triggers (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  emoji TEXT NOT NULL,
  match_type TEXT DEFAULT 'exact'
);

CREATE TABLE IF NOT EXISTS syntax.event_toggles (
  guild_id TEXT NOT NULL,
  event TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (guild_id, event)
);

CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON syntax.mod_cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_mod_cases_user ON syntax.mod_cases(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_xp_guild ON syntax.member_xp(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON syntax.tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON syntax.giveaways(guild_id);

-- RLS: bot uses service_role key (bypasses RLS). Enable for defense-in-depth.
ALTER TABLE syntax.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.member_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.mod_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.auto_responders ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.reaction_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.button_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.level_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.ticket_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.ticket_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.voicemaster_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.afk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.command_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.social_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.vanity_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.reaction_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.event_toggles ENABLE ROW LEVEL SECURITY;

-- Grant access to service_role (used by the bot backend)
GRANT USAGE ON SCHEMA syntax TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA syntax TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA syntax TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA syntax GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA syntax GRANT ALL ON SEQUENCES TO service_role;
