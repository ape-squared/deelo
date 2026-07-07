import { getDiscordClientId } from '@/lib/runtime-env';

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

/** Client-safe path — resolves invite URL on the server via /api/invite */
export function inviteApiPath(guildId?: string): string {
  if (!guildId) return '/api/invite';
  return `/api/invite?guild_id=${encodeURIComponent(guildId)}`;
}
