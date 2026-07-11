-- Guild economy: balances, shop, and transaction log

ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_currency_name TEXT DEFAULT 'coins';
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_daily_min INTEGER DEFAULT 100;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_daily_max INTEGER DEFAULT 500;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_work_min INTEGER DEFAULT 50;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_work_max INTEGER DEFAULT 200;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_work_cooldown_ms INTEGER DEFAULT 3600000;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_transfer_tax_percent INTEGER DEFAULT 0;
ALTER TABLE deelo.guilds ADD COLUMN IF NOT EXISTS economy_starting_balance BIGINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS deelo.member_balance (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  balance BIGINT DEFAULT 0,
  last_daily_at TIMESTAMPTZ,
  last_work_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS deelo.economy_shop_items (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price > 0),
  role_id TEXT,
  stock INTEGER,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deelo.economy_transactions (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT,
  target_user_id TEXT,
  item_id BIGINT,
  moderator_id TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_balance_guild_balance
  ON deelo.member_balance (guild_id, balance DESC);

CREATE INDEX IF NOT EXISTS idx_economy_shop_items_guild
  ON deelo.economy_shop_items (guild_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_economy_transactions_guild_created
  ON deelo.economy_transactions (guild_id, created_at DESC);
