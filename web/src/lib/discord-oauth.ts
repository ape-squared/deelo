import { env as readEnv, resolveOAuthAppUrl } from '@/lib/runtime-env';

/** Discord OAuth token endpoint — not versioned under /v10 */
export const DISCORD_OAUTH_TOKEN_URL = 'https://discord.com/api/oauth2/token';

function env(key: string): string {
  return readEnv(key)?.trim() ?? '';
}

/** Strip wrapping quotes Dokploy/users sometimes add around secrets. */
export function sanitizeOAuthSecret(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
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
  const secret = sanitizeOAuthSecret(env('DISCORD_CLIENT_SECRET'));
  if (!secret) throw new Error('DISCORD_CLIENT_SECRET is required');
  return secret;
}

export function getDiscordOAuthConfig(headers?: Headers) {
  const secret = sanitizeOAuthSecret(env('DISCORD_CLIENT_SECRET'));
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

/**
 * Probe whether Discord accepts our client_id + client_secret pair.
 * Uses a deliberately invalid code — invalid_grant means credentials are OK.
 */
export async function probeDiscordOAuthCredentials(redirectUri: string): Promise<{
  ok: boolean;
  reason: 'valid' | 'invalid_client' | 'unconfigured' | 'network';
}> {
  let clientId: string;
  let clientSecret: string;
  try {
    clientId = getDiscordOAuthClientId();
    clientSecret = getDiscordOAuthClientSecret();
  } catch {
    return { ok: false, reason: 'unconfigured' };
  }

  try {
    const res = await fetch(DISCORD_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: 'deelo_oauth_probe_invalid',
        redirect_uri: redirectUri,
      }),
    });
    const text = await res.text();
    let body: DiscordOAuthTokenError = {};
    try {
      body = JSON.parse(text) as DiscordOAuthTokenError;
    } catch {
      return { ok: false, reason: 'network' };
    }
    if (body.error === 'invalid_client') return { ok: false, reason: 'invalid_client' };
    // invalid_grant / invalid_request = client authenticated successfully
    return { ok: true, reason: 'valid' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
