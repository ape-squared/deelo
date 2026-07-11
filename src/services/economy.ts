import type { GuildMember } from 'discord.js';
import {
  getGuild,
  getMemberBalance,
  getEconomyShopItems,
  logEconomyTransaction,
  type EconomyShopItemRow,
  type GuildSettings,
  type MemberBalanceRow,
} from '../database';
import { getSupabase } from '../database/supabase';

export { getEconomyShopItems };

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const WORK_MESSAGES = [
  'delivered packages',
  'washed dishes at the diner',
  'streamed for 3 viewers',
  'fixed a leaky faucet',
  'walked dogs in the park',
  'coded a Discord bot feature',
  'moderated a chaotic chat',
  'sold handmade stickers',
  'mined virtual ore',
  'babysat a guild full of gremlins',
];

export function formatCurrency(amount: number, currency: string): string {
  return `**${amount.toLocaleString()}** ${currency}`;
}

export function economyConfig(guild: GuildSettings) {
  return {
    enabled: guild.economy_enabled ?? true,
    currency: guild.economy_currency_name || 'coins',
    dailyMin: guild.economy_daily_min ?? 100,
    dailyMax: guild.economy_daily_max ?? 500,
    workMin: guild.economy_work_min ?? 50,
    workMax: guild.economy_work_max ?? 200,
    workCooldownMs: guild.economy_work_cooldown_ms ?? 3_600_000,
    transferTaxPercent: guild.economy_transfer_tax_percent ?? 0,
    startingBalance: guild.economy_starting_balance ?? 0,
  };
}

export async function isEconomyEnabled(guildId: string): Promise<{ enabled: boolean; guild: GuildSettings }> {
  const guild = await getGuild(guildId);
  return { enabled: guild.economy_enabled ?? true, guild };
}

function randomBetween(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function msUntilReady(lastAt: string | null, cooldownMs: number): number {
  if (!lastAt) return 0;
  const elapsed = Date.now() - new Date(lastAt).getTime();
  return Math.max(0, cooldownMs - elapsed);
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = Math.floor((ms % 60_000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

async function setBalance(
  guildId: string,
  userId: string,
  balance: number,
  patch: Partial<Pick<MemberBalanceRow, 'last_daily_at' | 'last_work_at'>> = {},
): Promise<number> {
  const { error } = await getSupabase()
    .from('member_balance')
    .update({ balance, ...patch })
    .eq('guild_id', guildId)
    .eq('user_id', userId);
  if (error) throw error;
  return balance;
}

export async function adjustMemberBalance(
  guildId: string,
  userId: string,
  delta: number,
  opts: {
    type: string;
    startingBalance?: number;
    targetUserId?: string;
    itemId?: number;
    moderatorId?: string;
    note?: string;
    patch?: Partial<Pick<MemberBalanceRow, 'last_daily_at' | 'last_work_at'>>;
  },
): Promise<{ balance: number; previous: number }> {
  const member = await getMemberBalance(guildId, userId, opts.startingBalance ?? 0);
  const previous = member.balance;
  const balance = Math.max(0, previous + delta);
  await setBalance(guildId, userId, balance, opts.patch ?? {});
  await logEconomyTransaction({
    guild_id: guildId,
    user_id: userId,
    type: opts.type,
    amount: delta,
    balance_after: balance,
    target_user_id: opts.targetUserId,
    item_id: opts.itemId,
    moderator_id: opts.moderatorId,
    note: opts.note,
  });
  return { balance, previous };
}

export async function claimDaily(guildId: string, userId: string): Promise<
  | { ok: true; amount: number; balance: number; currency: string }
  | { ok: false; reason: 'disabled' | 'cooldown'; waitMs?: number; currency?: string }
> {
  const { enabled, guild } = await isEconomyEnabled(guildId);
  const cfg = economyConfig(guild);
  if (!enabled) return { ok: false, reason: 'disabled' };

  const member = await getMemberBalance(guildId, userId, cfg.startingBalance);
  const waitMs = msUntilReady(member.last_daily_at, DAILY_COOLDOWN_MS);
  if (waitMs > 0) return { ok: false, reason: 'cooldown', waitMs, currency: cfg.currency };

  const amount = randomBetween(cfg.dailyMin, cfg.dailyMax);
  const { balance } = await adjustMemberBalance(guildId, userId, amount, {
    type: 'daily',
    startingBalance: cfg.startingBalance,
    patch: { last_daily_at: new Date().toISOString() },
  });
  return { ok: true, amount, balance, currency: cfg.currency };
}

export async function claimWork(guildId: string, userId: string): Promise<
  | { ok: true; amount: number; balance: number; currency: string; message: string }
  | { ok: false; reason: 'disabled' | 'cooldown'; waitMs?: number; currency?: string }
> {
  const { enabled, guild } = await isEconomyEnabled(guildId);
  const cfg = economyConfig(guild);
  if (!enabled) return { ok: false, reason: 'disabled' };

  const member = await getMemberBalance(guildId, userId, cfg.startingBalance);
  const waitMs = msUntilReady(member.last_work_at, cfg.workCooldownMs);
  if (waitMs > 0) return { ok: false, reason: 'cooldown', waitMs, currency: cfg.currency };

  const amount = randomBetween(cfg.workMin, cfg.workMax);
  const message = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];
  const { balance } = await adjustMemberBalance(guildId, userId, amount, {
    type: 'work',
    startingBalance: cfg.startingBalance,
    note: message,
    patch: { last_work_at: new Date().toISOString() },
  });
  return { ok: true, amount, balance, currency: cfg.currency, message };
}

export async function transferBalance(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
): Promise<
  | { ok: true; sent: number; received: number; tax: number; currency: string }
  | { ok: false; reason: 'disabled' | 'invalid' | 'self' | 'insufficient'; currency?: string }
> {
  if (amount <= 0 || !Number.isFinite(amount)) return { ok: false, reason: 'invalid' };
  if (fromUserId === toUserId) return { ok: false, reason: 'self' };

  const { enabled, guild } = await isEconomyEnabled(guildId);
  const cfg = economyConfig(guild);
  if (!enabled) return { ok: false, reason: 'disabled' };

  const sender = await getMemberBalance(guildId, fromUserId, cfg.startingBalance);
  if (sender.balance < amount) return { ok: false, reason: 'insufficient', currency: cfg.currency };

  const tax = Math.floor(amount * (cfg.transferTaxPercent / 100));
  const received = amount - tax;

  await adjustMemberBalance(guildId, fromUserId, -amount, {
    type: 'pay',
    startingBalance: cfg.startingBalance,
    targetUserId: toUserId,
    note: tax > 0 ? `tax ${tax}` : undefined,
  });
  await adjustMemberBalance(guildId, toUserId, received, {
    type: 'pay_received',
    startingBalance: cfg.startingBalance,
    targetUserId: fromUserId,
    note: tax > 0 ? `tax ${tax}` : undefined,
  });

  return { ok: true, sent: amount, received, tax, currency: cfg.currency };
}

export async function adminSetBalance(
  guildId: string,
  userId: string,
  amount: number,
  moderatorId: string,
  mode: 'give' | 'take' | 'set',
): Promise<{ balance: number; delta: number; currency: string }> {
  const guild = await getGuild(guildId);
  const cfg = economyConfig(guild);
  const member = await getMemberBalance(guildId, userId, cfg.startingBalance);

  let delta = 0;
  let next = member.balance;
  if (mode === 'give') {
    delta = amount;
    next = member.balance + amount;
  } else if (mode === 'take') {
    delta = -Math.min(amount, member.balance);
    next = Math.max(0, member.balance - amount);
  } else {
    next = Math.max(0, amount);
    delta = next - member.balance;
  }

  await setBalance(guildId, userId, next);
  await logEconomyTransaction({
    guild_id: guildId,
    user_id: userId,
    type: `admin_${mode}`,
    amount: delta,
    balance_after: next,
    moderator_id: moderatorId,
  });

  return { balance: next, delta, currency: cfg.currency };
}

export async function resetEconomyBalances(guildId: string, userId?: string): Promise<number> {
  let query = getSupabase().from('member_balance').delete().eq('guild_id', guildId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.select('user_id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function getBalanceLeaderboard(guildId: string, limit = 10) {
  const { data, error } = await getSupabase()
    .from('member_balance')
    .select('user_id, balance')
    .eq('guild_id', guildId)
    .order('balance', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

function findShopItem(items: EconomyShopItemRow[], query: string): EconomyShopItemRow | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const byId = items.find((i) => String(i.id) === q);
  if (byId) return byId;
  return items.find((i) => i.name.toLowerCase() === q)
    ?? items.find((i) => i.name.toLowerCase().includes(q));
}

export async function purchaseShopItem(
  guildId: string,
  userId: string,
  query: string,
  member?: GuildMember,
): Promise<
  | { ok: true; item: EconomyShopItemRow; balance: number; currency: string }
  | { ok: false; reason: 'disabled' | 'not_found' | 'insufficient' | 'out_of_stock' | 'role_error'; currency?: string }
> {
  const { enabled, guild } = await isEconomyEnabled(guildId);
  const cfg = economyConfig(guild);
  if (!enabled) return { ok: false, reason: 'disabled' };

  const items = await getEconomyShopItems(guildId, true);
  const item = findShopItem(items, query);
  if (!item) return { ok: false, reason: 'not_found', currency: cfg.currency };

  if (item.stock !== null && item.stock <= 0) return { ok: false, reason: 'out_of_stock', currency: cfg.currency };

  const balanceRow = await getMemberBalance(guildId, userId, cfg.startingBalance);
  if (balanceRow.balance < item.price) return { ok: false, reason: 'insufficient', currency: cfg.currency };

  const { balance } = await adjustMemberBalance(guildId, userId, -item.price, {
    type: 'buy',
    startingBalance: cfg.startingBalance,
    itemId: item.id,
    note: item.name,
  });

  if (item.stock !== null) {
    await getSupabase()
      .from('economy_shop_items')
      .update({ stock: item.stock - 1 })
      .eq('id', item.id)
      .eq('guild_id', guildId);
  }

  if (item.role_id && member) {
    try {
      if (!member.roles.cache.has(item.role_id)) {
        await member.roles.add(item.role_id, 'Economy shop purchase');
      }
    } catch {
      await adjustMemberBalance(guildId, userId, item.price, {
        type: 'refund',
        startingBalance: cfg.startingBalance,
        itemId: item.id,
        note: `refund: could not grant role for ${item.name}`,
      });
      return { ok: false, reason: 'role_error', currency: cfg.currency };
    }
  }

  return { ok: true, item, balance, currency: cfg.currency };
}

export function renderShopList(items: EconomyShopItemRow[], currency: string): string {
  if (!items.length) return 'No shop items yet. Admins can add items on the dashboard or with `,economy shop add`.';
  return items.map((item) => {
    const role = item.role_id ? ` · <@&${item.role_id}>` : '';
    const stock = item.stock === null ? '' : ` · stock **${item.stock}**`;
    const desc = item.description ? `\n${item.description}` : '';
    return `**#${item.id}** ${item.name} — ${formatCurrency(item.price, currency)}${role}${stock}${desc}`;
  }).join('\n\n');
}
