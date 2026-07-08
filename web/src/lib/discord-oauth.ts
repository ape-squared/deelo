import { env as readEnv, resolveOAuthAppUrl } from '@/lib/runtime-env';

/** Discord OAuth token endpoint — not versioned under /v10 */
export const DISCORD_OAUTH_TOKEN_URL = 'https://discord.com/api/oauth2/token';

function env(key: string): string {
  return readEnv(key)?.trim() ?? '';
}

export function getOAuthRedirectUri(headers?: Headers): string {
  return `${resolveOAuthAppUrl(headers)}/api/auth/discord/callback`;
}

export function getDiscordOAuthClientId(): string {
  const id = env('DISCORD_CLIENT_ID') || env('NEXT_PUBLIC_DISCORD_CLIENT_ID');
  if (!id) throw new Error('DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID is required');
  return id;
}

export function getDiscordOAuthClientSecret(): string {
  const secret = env('DISCORD_CLIENT_SECRET');
  if (!secret) throw new Error('DISCORD_CLIENT_SECRET is required');
  return secret;
}

export function getDiscordOAuthConfig(headers?: Headers) {
  const secret = env('DISCORD_CLIENT_SECRET');
  const clientId = env('DISCORD_CLIENT_ID') || env('NEXT_PUBLIC_DISCORD_CLIENT_ID');
  return {
    clientId: clientId || null,
    redirectUri: getOAuthRedirectUri(headers),
    appUrl: resolveOAuthAppUrl(headers),
    clientSecretConfigured: secret.length > 0,
  };
}

export type DiscordOAuthTokenError = {
  error?: string;
  error_description?: string;
};

export function mapDiscordOAuthError(body: DiscordOAuthTokenError): string {
  const code = body.error ?? 'token';
  if (code === 'invalid_client') return 'invalid_client';
  if (code === 'invalid_grant') {
    const desc = (body.error_description ?? '').toLowerCase();
    if (desc.includes('redirect_uri')) return 'redirect_uri';
    return 'invalid_grant';
  }
  return code;
}

export async function exchangeDiscordOAuthCode(code: string, redirectUri: string) {
  const res = await fetch(DISCORD_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getDiscordOAuthClientId(),
      client_secret: getDiscordOAuthClientSecret(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const text = await res.text();
  let body: DiscordOAuthTokenError & Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as DiscordOAuthTokenError;
  } catch {
    body = { error: 'token', error_description: text.slice(0, 200) };
  }

  return { ok: res.ok, status: res.status, body, text };
}
