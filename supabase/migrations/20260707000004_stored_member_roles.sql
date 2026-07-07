-- Roles saved when members leave (for ,rolerestore)
CREATE TABLE IF NOT EXISTS deelo.stored_member_roles (
  guild_id TEXT NOT NULL REFERENCES deelo.guilds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  nick TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stored_member_roles_guild ON deelo.stored_member_roles(guild_id);

GRANT ALL ON deelo.stored_member_roles TO service_role;
ALTER TABLE deelo.stored_member_roles ENABLE ROW LEVEL SECURITY;
