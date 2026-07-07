-- Prevent multiple active subscriptions per guild
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active_per_guild
  ON syntax.subscriptions (guild_id)
  WHERE status = 'active';
