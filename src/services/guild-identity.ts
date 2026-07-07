import type { Client, Guild } from 'discord.js';

function getExtraConfigPath(config: Record<string, unknown> | undefined | null, path: string): unknown {
  if (!config) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, config);
}

export interface BotAppearance {
  nickname: string | null;
  embedColor: number | null;
  embedFooter: string | null;
}

const applyCache = new Map<string, { hash: string; at: number }>();
const APPLY_COOLDOWN_MS = 30_000;

function appearanceFromExtra(extra: Record<string, unknown> | undefined | null): BotAppearance {
  const nicknameRaw = getExtraConfigPath(extra ?? {}, 'bot.nickname');
  const colorRaw = getExtraConfigPath(extra ?? {}, 'bot.embed_color');
  const footerRaw = getExtraConfigPath(extra ?? {}, 'bot.embed_footer');

  let embedColor: number | null = null;
  if (typeof colorRaw === 'string' && /^[0-9a-fA-F]{6}$/.test(colorRaw)) {
    embedColor = parseInt(colorRaw, 16);
  }

  return {
    nickname: typeof nicknameRaw === 'string' && nicknameRaw.trim() ? nicknameRaw.trim().slice(0, 32) : null,
    embedColor,
    embedFooter: typeof footerRaw === 'string' && footerRaw.trim() ? footerRaw.trim().slice(0, 80) : null,
  };
}

function appearanceHash(a: BotAppearance): string {
  return JSON.stringify(a);
}

export function getBotAppearance(extra: Record<string, unknown> | undefined | null): BotAppearance {
  return appearanceFromExtra(extra);
}

export async function applyGuildBotIdentity(
  guild: Guild,
  extra: Record<string, unknown> | undefined | null,
  plan?: 'free' | 'premium' | 'premium_plus',
): Promise<void> {
  const me = guild.members.me;
  if (!me) return;

  const isPremium = plan === 'premium' || plan === 'premium_plus';
  if (!isPremium) {
    if (me.nickname) {
      try {
        await me.setNickname(null);
      } catch (err) {
        console.warn(`[guild-identity] failed to clear nickname in ${guild.id}:`, err);
      }
    }
    return;
  }

  const appearance = appearanceFromExtra(extra);
  const hash = appearanceHash(appearance);
  const cached = applyCache.get(guild.id);
  if (cached && cached.hash === hash && Date.now() - cached.at < APPLY_COOLDOWN_MS) return;

  try {
    const desiredNick = appearance.nickname;
    if (me.nickname !== desiredNick) {
      await me.setNickname(desiredNick);
    }
    applyCache.set(guild.id, { hash, at: Date.now() });
  } catch (err) {
    console.warn(`[guild-identity] failed to set nickname in ${guild.id}:`, err);
  }
}

export async function ensureGuildBotIdentity(
  guild: Guild,
  extra: Record<string, unknown> | undefined | null,
  plan?: 'free' | 'premium' | 'premium_plus',
): Promise<void> {
  await applyGuildBotIdentity(guild, extra, plan);
}

export async function syncAllGuildIdentities(client: Pick<Client, 'guilds'>): Promise<void> {
  const { getSupabase } = await import('../database/supabase');
  const { getGuildPlan } = await import('../database');
  const ids = [...client.guilds.cache.keys()];
  if (!ids.length) return;

  const { data } = await getSupabase()
    .from('guilds')
    .select('id, extra_config')
    .in('id', ids);

  const byId = new Map((data ?? []).map((row) => [row.id as string, row.extra_config as Record<string, unknown> | null]));

  for (const guild of client.guilds.cache.values()) {
    const plan = await getGuildPlan(guild.id);
    await applyGuildBotIdentity(guild, byId.get(guild.id) ?? null, plan);
  }
}
