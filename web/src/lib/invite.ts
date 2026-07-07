import { DISCORD_APPLICATION_ID, getDiscordClientId } from '@/lib/discord-config';

export const DISCORD_CLIENT_ID = DISCORD_APPLICATION_ID;
export const DISCORD_BOT_PERMISSIONS = '8866461766385655';

export function getInviteUrl(guildId?: string): string {
  const params = new URLSearchParams({
    client_id: getDiscordClientId(),
    permissions: DISCORD_BOT_PERMISSIONS,
    integration_type: '0',
    scope: 'bot',
  });
  if (guildId) params.set('guild_id', guildId);
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
