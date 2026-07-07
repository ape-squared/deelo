-- Web dashboard, admin panel, and subscription tracking

CREATE TABLE IF NOT EXISTS syntax.dashboard_users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  discriminator TEXT,
  avatar TEXT,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syntax.subscriptions (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL REFERENCES syntax.guilds(id) ON DELETE CASCADE,
  purchaser_discord_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'premium_plus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  amount_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  interval TEXT DEFAULT 'month',
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deelo.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS syntax.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES deelo.admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_guild ON syntax.subscriptions(guild_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON syntax.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_dashboard_users_last_login ON syntax.dashboard_users(last_login DESC);

GRANT ALL ON syntax.dashboard_users TO service_role;
GRANT ALL ON syntax.subscriptions TO service_role;
GRANT ALL ON deelo.admin_users TO service_role;
GRANT ALL ON syntax.admin_audit_log TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA syntax TO service_role;

ALTER TABLE syntax.dashboard_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deelo.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin users can read their own row via authenticated role (when using Supabase Auth JWT)
CREATE POLICY admin_users_self ON deelo.admin_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY admin_audit_admin ON syntax.admin_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM deelo.admin_users WHERE id = auth.uid()));
