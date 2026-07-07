/** Discord bot invite — keep in sync with Developer Portal OAuth2 URL generator */
export const DISCORD_CLIENT_ID = '1188001834305060925';
export const DISCORD_BOT_PERMISSIONS = '8866461766385655';

export function getInviteUrl(guildId?: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || DISCORD_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: DISCORD_BOT_PERMISSIONS,
    integration_type: '0',
    scope: 'bot',
  });
  if (guildId) params.set('guild_id', guildId);
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
