-- Premium redeem codes (admin-created, redeemed via bot or dashboard)

CREATE TABLE IF NOT EXISTS syntax.redeem_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('premium', 'premium_plus')),
  days INTEGER NOT NULL DEFAULT 30 CHECK (days > 0 AND days <= 3650),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES deelo.admin_users(id) ON DELETE SET NULL,
  notes TEXT,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.redeem_code_uses (
  id BIGSERIAL PRIMARY KEY,
  code_id BIGINT NOT NULL REFERENCES syntax.redeem_codes(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL REFERENCES syntax.guilds(id) ON DELETE CASCADE,
  redeemed_by TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON syntax.redeem_codes (code);
CREATE INDEX IF NOT EXISTS idx_redeem_code_uses_guild ON syntax.redeem_code_uses (guild_id);

GRANT ALL ON syntax.redeem_codes TO service_role;
GRANT ALL ON syntax.redeem_code_uses TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA syntax TO service_role;

ALTER TABLE syntax.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.redeem_code_uses ENABLE ROW LEVEL SECURITY;
