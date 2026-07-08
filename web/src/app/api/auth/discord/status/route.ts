import { NextResponse } from 'next/server';
import { getDiscordOAuthConfig } from '@/lib/discord-oauth';

export const dynamic = 'force-dynamic';

/** Public OAuth config check — helps verify Dokploy env without exposing secrets. */
export async function GET(req: Request) {
  const config = getDiscordOAuthConfig(req.headers);
  const ok = Boolean(config.clientId && config.clientSecretConfigured && config.redirectUri);

  return NextResponse.json({
    ok,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    appUrl: config.appUrl,
    clientSecretConfigured: config.clientSecretConfigured,
    hint: !config.clientSecretConfigured
      ? 'Set DISCORD_CLIENT_SECRET on the web container (not just the bot).'
      : !config.clientId
        ? 'Set DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID.'
        : ok
          ? 'OAuth env looks configured. Register redirectUri exactly in Discord Developer Portal → OAuth2 → Redirects.'
          : 'Check NEXT_PUBLIC_APP_URL / APP_URL.',
  });
}
