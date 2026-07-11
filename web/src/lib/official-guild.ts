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

export type OfficialGuildJoinResult =
  | { ok: true; status: 'joined' | 'already_member' }
  | { ok: false; reason: 'disabled' | 'no_bot_token' | 'already_member' | 'missing_scope' | 'forbidden' | 'error' };

/** Add a user to the official support server using guilds.join OAuth consent. */
export async function tryAddUserToOfficialGuild(
  discordId: string,
  userAccessToken: string,
): Promise<OfficialGuildJoinResult> {
  if (process.env.OFFICIAL_GUILD_AUTO_JOIN === 'false') {
    return { ok: false, reason: 'disabled' };
  }

  if (await canBypassOfficialGuildRequirement(discordId)) {
    return { ok: true, status: 'already_member' };
  }

  if (await isMemberOfOfficialGuild(discordId)) {
    return { ok: true, status: 'already_member' };
  }

  const botToken = getDiscordBotToken();
  const guildId = getOfficialGuildId();
  if (!botToken) {
    console.warn('[official-guild] No bot token — cannot auto-join user');
    return { ok: false, reason: 'no_bot_token' };
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: userAccessToken }),
      cache: 'no-store',
    });

    if (res.status === 201) {
      invalidateOfficialGuildCache(discordId);
      return { ok: true, status: 'joined' };
    }
    if (res.status === 204) {
      invalidateOfficialGuildCache(discordId);
      return { ok: true, status: 'already_member' };
    }

    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      console.warn('[official-guild] auto-join denied:', res.status, text.slice(0, 200));
      return { ok: false, reason: res.status === 401 ? 'missing_scope' : 'forbidden' };
    }

    console.error('[official-guild] auto-join failed:', res.status, text.slice(0, 300));
    return { ok: false, reason: 'error' };
  } catch (err) {
    console.error('[official-guild] auto-join error:', err);
    return { ok: false, reason: 'error' };
  }
}
