import { NextResponse } from 'next/server';
import { getDiscordOAuthConfig, probeDiscordOAuthCredentials, sanitizeOAuthSecret } from '@/lib/discord-oauth';
import { env as readEnv } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';

/** Public OAuth config check — helps verify Dokploy env without exposing secrets. */
export async function GET(req: Request) {
  const config = getDiscordOAuthConfig(req.headers);
  const rawSecret = readEnv('DISCORD_CLIENT_SECRET')?.trim() ?? '';
  const secret = sanitizeOAuthSecret(rawSecret);
  const secretHadQuotes = rawSecret.length > 0 && rawSecret !== secret;

  const probe = secret
    ? await probeDiscordOAuthCredentials(config.redirectUri)
    : { ok: false as const, reason: 'unconfigured' as const };

  const ok = Boolean(config.clientId && secret && probe.ok && config.redirectUri);

  return NextResponse.json({
    ok,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    appUrl: config.appUrl,
    clientSecretConfigured: secret.length > 0,
    clientSecretValid: probe.ok,
    secretHadQuotes,
    hint: !secret
      ? 'Set DISCORD_CLIENT_SECRET on the web container (not just the bot).'
      : probe.reason === 'invalid_client'
        ? 'Discord rejected the client secret. In Developer Portal → OAuth2, reset the client secret and paste the new value into Dokploy web env as DISCORD_CLIENT_SECRET (no quotes). Redeploy web.'
        : secretHadQuotes
          ? 'Secret had wrapping quotes — we strip them automatically after redeploy; prefer pasting without quotes in Dokploy.'
          : !config.clientId
            ? 'Set DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID.'
            : ok
              ? 'OAuth credentials verified with Discord.'
              : 'Check NEXT_PUBLIC_APP_URL / APP_URL and OAuth redirect URI in Developer Portal.',
  });
}
