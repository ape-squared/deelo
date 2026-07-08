import { DISCORD_API } from '@/lib/discord-api';
import { getDiscordBotToken } from '@/lib/discord-bot';
import { getDiscordInviteUrl, getDiscordServerId } from '@/lib/runtime-env';
import { getPlatformStaffByDiscordId } from '@/lib/platform-staff';

/** Official Deelo Discord server — required for dashboard & suggestions. */
export const DEFAULT_OFFICIAL_GUILD_ID = '1523831534799425576';

export function getOfficialGuildId(): string {
  return (
    process.env.OFFICIAL_GUILD_ID?.trim() ||
    getDiscordServerId()?.trim() ||
    process.env.SUPPORT_GUILD_ID?.trim() ||
    DEFAULT_OFFICIAL_GUILD_ID
  );
}

export function getOfficialGuildInviteUrl(): string {
  return getDiscordInviteUrl() || `https://discord.gg/deelo`;
}

const memberCache = new Map<string, { member: boolean; expires: number }>();
const CACHE_MS = 60_000;

function parseOwnerIds(): Set<string> {
  const raw = process.env.OWNER_IDS || process.env.PLATFORM_OWNER_IDS || '';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export async function isOwnerDiscordId(discordId: string): Promise<boolean> {
  return parseOwnerIds().has(discordId);
}

/** Platform staff and owners bypass the official-server requirement. */
export async function canBypassOfficialGuildRequirement(discordId: string): Promise<boolean> {
  if (await isOwnerDiscordId(discordId)) return true;
  const staff = await getPlatformStaffByDiscordId(discordId);
  return Boolean(staff);
}

export async function isMemberOfOfficialGuild(discordId: string): Promise<boolean> {
  if (await canBypassOfficialGuildRequirement(discordId)) return true;

  const cached = memberCache.get(discordId);
  if (cached && cached.expires > Date.now()) return cached.member;

  const token = getDiscordBotToken();
  const guildId = getOfficialGuildId();
  if (!token) {
    console.warn('[official-guild] No bot token — cannot verify membership');
    return false;
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    const member = res.ok;
    memberCache.set(discordId, { member, expires: Date.now() + CACHE_MS });
    return member;
  } catch (err) {
    console.error('[official-guild] membership check failed:', err);
    return false;
  }
}

export function invalidateOfficialGuildCache(discordId: string) {
  memberCache.delete(discordId);
}
