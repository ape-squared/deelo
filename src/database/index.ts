import { getSupabase } from './supabase';
import type { PlanTier } from '../config/plans';

export interface GuildSettings {
  id: string;
  prefix: string;
  plan: PlanTier;
  plan_expires_at: string | null;
  mod_log_channel: string | null;
  welcome_channel: string | null;
  welcome_message: string | null;
  goodbye_channel: string | null;
  goodbye_message: string | null;
  mute_role: string | null;
  jail_role: string | null;
  autorole: string | null;
  starboard_channel: string | null;
  starboard_threshold: number;
  levels_enabled: boolean;
  levels_channel: string | null;
  levels_multiplier: number;
  snipe_enabled: boolean;
  automod_enabled: boolean;
  antinuke_enabled: boolean;
  antinuke_threshold: number;
  antiraid_enabled: boolean;
  antiraid_min_age: number;
  antiraid_avatar: boolean;
  fake_permissions_enabled: boolean;
  voicemaster_category: string | null;
  voicemaster_join_channel: string | null;
  voicemaster_interface_channel: string | null;
  voicemaster_default_name: string;
  voicemaster_default_bitrate: number;
  voicemaster_join_role: string | null;
  bump_channel: string | null;
  bump_interval: number;
  extra_config?: Record<string, unknown> | null;
}

const DEFAULT_GUILD: Omit<GuildSettings, 'id'> = {
  prefix: ',',
  plan: 'free',
  plan_expires_at: null,
  mod_log_channel: null,
  welcome_channel: null,
  welcome_message: null,
  goodbye_channel: null,
  goodbye_message: null,
  mute_role: null,
  jail_role: null,
  autorole: null,
  starboard_channel: null,
  starboard_threshold: 3,
  levels_enabled: true,
  levels_channel: null,
  levels_multiplier: 1.0,
  snipe_enabled: true,
  automod_enabled: false,
  antinuke_enabled: false,
  antinuke_threshold: 5,
  antiraid_enabled: false,
  antiraid_min_age: 7,
  antiraid_avatar: false,
  fake_permissions_enabled: false,
  voicemaster_category: null,
  voicemaster_join_channel: null,
  voicemaster_interface_channel: null,
  voicemaster_default_name: "{user.display_name}'s vc",
  voicemaster_default_bitrate: 64,
  voicemaster_join_role: null,
  bump_channel: null,
  bump_interval: 7200000,
};

export async function getGuild(guildId: string): Promise<GuildSettings> {
  const { data, error } = await getSupabase().from('guilds').select('*').eq('id', guildId).maybeSingle();
  if (error) throw error;
  if (data) return data as GuildSettings;

  const { error: upsertError } = await getSupabase()
    .from('guilds')
    .upsert({ id: guildId }, { onConflict: 'id', ignoreDuplicates: true });
  if (upsertError) throw upsertError;

  const { data: created, error: fetchError } = await getSupabase()
    .from('guilds')
    .select('*')
    .eq('id', guildId)
    .single();
  if (fetchError) throw fetchError;
  return created as GuildSettings;
}

export async function updateGuild(guildId: string, updates: Partial<GuildSettings>): Promise<void> {
  await getGuild(guildId);
  const { id: _id, ...rest } = updates;
  if (Object.keys(rest).length === 0) return;
  const { error } = await getSupabase().from('guilds').update(rest).eq('id', guildId);
  if (error) throw error;
}

export async function getGuildPlan(guildId: string): Promise<PlanTier> {
  const guild = await getGuild(guildId);

  const { data: subscription } = await getSupabase()
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('guild_id', guildId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  const guildExpired = guild.plan_expires_at && new Date(guild.plan_expires_at).getTime() < now;
  const subActive = subscription?.status === 'active'
    && (!subscription.expires_at || new Date(subscription.expires_at).getTime() > now);

  let plan: PlanTier = guildExpired ? 'free' : guild.plan;
  let expiresAt: string | null = guildExpired ? null : guild.plan_expires_at;

  if (subActive) {
    const subPlan = subscription!.plan as PlanTier;
    const rank = { free: 0, premium: 1, premium_plus: 2 };
    if (rank[subPlan] >= rank[plan]) {
      plan = subPlan;
      expiresAt = subscription!.expires_at ?? null;
    }
  }

  if (plan !== guild.plan || expiresAt !== guild.plan_expires_at) {
    await updateGuild(guildId, { plan, plan_expires_at: expiresAt });
  } else if (guildExpired && guild.plan !== 'free') {
    await updateGuild(guildId, { plan: 'free', plan_expires_at: null });
    return 'free';
  }

  return plan;
}

export async function setGuildPlan(guildId: string, plan: PlanTier, expiresAt?: string): Promise<void> {
  await updateGuild(guildId, { plan, plan_expires_at: expiresAt ?? null });
}

export async function getPrefix(guildId: string): Promise<string> {
  const guild = await getGuild(guildId);
  return guild.prefix || ',';
}

export async function getMemberXp(guildId: string, userId: string) {
  const { data, error } = await getSupabase()
    .from('member_xp')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { error: upsertError } = await getSupabase()
    .from('member_xp')
    .upsert({ guild_id: guildId, user_id: userId }, { onConflict: 'guild_id,user_id', ignoreDuplicates: true });
  if (upsertError) throw upsertError;

  const { data: created, error: fetchError } = await getSupabase()
    .from('member_xp')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();
  if (fetchError) throw fetchError;
  return created;
}

export async function addXp(
  guildId: string,
  userId: string,
  amount: number
): Promise<{ xp: number; level: number; leveledUp: boolean }> {
  const member = await getMemberXp(guildId, userId);
  const newXp = member.xp + amount;
  const newLevel = Math.floor(0.1 * Math.sqrt(newXp));
  const leveledUp = newLevel > member.level;

  const { error } = await getSupabase()
    .from('member_xp')
    .update({
      xp: newXp,
      level: newLevel,
      messages: member.messages + 1,
      last_xp_at: new Date().toISOString(),
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);
  if (error) throw error;

  return { xp: newXp, level: newLevel, leveledUp };
}

export async function addModCase(
  guildId: string,
  userId: string,
  moderatorId: string,
  type: string,
  reason?: string,
  duration?: number
): Promise<number> {
  const { data, error } = await getSupabase()
    .from('mod_cases')
    .insert({ guild_id: guildId, user_id: userId, moderator_id: moderatorId, type, reason, duration })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getModCases(guildId: string, userId?: string, limit = 10) {
  let query = getSupabase().from('mod_cases').select('*').eq('guild_id', guildId).order('created_at', { ascending: false }).limit(limit);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getModCase(caseId: number, guildId: string) {
  const { data, error } = await getSupabase().from('mod_cases').select('*').eq('id', caseId).eq('guild_id', guildId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function addWarning(guildId: string, userId: string, moderatorId: string, reason?: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('warnings')
    .insert({ guild_id: guildId, user_id: userId, moderator_id: moderatorId, reason })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getWarnings(guildId: string, userId: string) {
  const { data, error } = await getSupabase()
    .from('warnings')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function clearWarnings(guildId: string, userId: string): Promise<number> {
  const { data, error } = await getSupabase().from('warnings').delete().eq('guild_id', guildId).eq('user_id', userId).select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function isEventEnabled(guildId: string, event: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('event_toggles').select('enabled').eq('guild_id', guildId).eq('event', event).maybeSingle();
  if (error) throw error;
  return data ? data.enabled : true;
}

export async function toggleEvent(guildId: string, event: string, enabled: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('event_toggles')
    .upsert({ guild_id: guildId, event, enabled }, { onConflict: 'guild_id,event' });
  if (error) throw error;
}

export async function countAutoResponders(guildId: string): Promise<number> {
  const { count, error } = await getSupabase().from('auto_responders').select('*', { count: 'exact', head: true }).eq('guild_id', guildId);
  if (error) throw error;
  return count ?? 0;
}

export async function countCounters(guildId: string): Promise<number> {
  const { count, error } = await getSupabase().from('counters').select('*', { count: 'exact', head: true }).eq('guild_id', guildId);
  if (error) throw error;
  return count ?? 0;
}

export async function countActiveGiveaways(guildId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('giveaways')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('ended', false);
  if (error) throw error;
  return count ?? 0;
}

export async function countFilters(guildId: string): Promise<number> {
  const { count, error } = await getSupabase().from('filters').select('*', { count: 'exact', head: true }).eq('guild_id', guildId);
  if (error) throw error;
  return count ?? 0;
}

export async function getAutoResponders(guildId: string) {
  const { data, error } = await getSupabase().from('auto_responders').select('*').eq('guild_id', guildId).eq('enabled', true);
  if (error) throw error;
  return data ?? [];
}

export async function countReactionTriggers(guildId: string): Promise<number> {
  const { count, error } = await getSupabase().from('reaction_triggers').select('*', { count: 'exact', head: true }).eq('guild_id', guildId);
  if (error) throw error;
  return count ?? 0;
}

export async function getReactionTriggers(guildId: string) {
  const { data, error } = await getSupabase().from('reaction_triggers').select('*').eq('guild_id', guildId).order('id');
  if (error) throw error;
  return data ?? [];
}

export async function getFilters(guildId: string) {
  const { data, error } = await getSupabase().from('filters').select('*').eq('guild_id', guildId).eq('enabled', true);
  if (error) throw error;
  return data ?? [];
}

export async function setAfk(userId: string, reason: string | null): Promise<void> {
  if (reason === null) {
    await getSupabase().from('afk_users').delete().eq('user_id', userId);
    return;
  }
  await getSupabase().from('afk_users').upsert({ user_id: userId, reason, since: new Date().toISOString() });
}

export async function getAfk(userId: string) {
  const { data, error } = await getSupabase().from('afk_users').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export { testConnection } from './supabase';
