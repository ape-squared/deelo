import { getDiscordClientId, tryGetDiscordClientId } from '@/lib/runtime-env';

export const DISCORD_BOT_PERMISSIONS = '8866461766385655';

/** Server-side Discord bot invite URL (reads client id from runtime env) */
export function buildInviteUrl(clientId: string, guildId?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: DISCORD_BOT_PERMISSIONS,
    integration_type: '0',
    scope: 'bot',
  });
  if (guildId) params.set('guild_id', guildId);
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function getInviteUrl(guildId?: string): string {
  return buildInviteUrl(getDiscordClientId(), guildId);
}

/** Safe for static generation — returns null when client id is missing at build time */
export function tryGetInviteUrl(guildId?: string): string | null {
  const id = tryGetDiscordClientId();
  if (!id) return null;
  return buildInviteUrl(id, guildId);
}

type UtmParams = Record<string, string | undefined>;

/** Client-safe path — resolves invite URL on the server via /api/invite */
export function inviteApiPath(guildId?: string, utm?: UtmParams): string {
  const params = new URLSearchParams();
  if (guildId) params.set('guild_id', guildId);
  if (utm) {
    for (const [key, value] of Object.entries(utm)) {
      if (value) params.set(key, value);
    }
  }
  const q = params.toString();
  return q ? `/api/invite?${q}` : '/api/invite';
}
