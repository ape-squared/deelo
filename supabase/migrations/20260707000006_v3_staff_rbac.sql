-- Deelo v3: platform staff, guild dashboard delegation, audit

CREATE TABLE IF NOT EXISTS deelo.platform_staff (
  discord_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('lead', 'developer', 'moderator', 'support')),
  display_name TEXT,
  notes TEXT,
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_staff_role ON deelo.platform_staff (role);

CREATE TABLE IF NOT EXISTS deelo.guild_dashboard_members (
  guild_id TEXT NOT NULL REFERENCES deelo.guilds(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'viewer')),
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, discord_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_dashboard_members_discord ON deelo.guild_dashboard_members (discord_id);

CREATE TABLE IF NOT EXISTS deelo.guild_dashboard_audit_log (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES deelo.guilds(id) ON DELETE CASCADE,
  actor_discord_id TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_dashboard_audit_guild ON deelo.guild_dashboard_audit_log (guild_id, created_at DESC);

GRANT ALL ON deelo.platform_staff TO service_role;
GRANT ALL ON deelo.guild_dashboard_members TO service_role;
GRANT ALL ON deelo.guild_dashboard_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE deelo.guild_dashboard_audit_log_id_seq TO service_role;

ALTER TABLE deelo.platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.guild_dashboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.guild_dashboard_audit_log ENABLE ROW LEVEL SECURITY;
