/** Runtime env read — bracket access avoids Next.js inlining empty build-time values in standalone Docker */
export function env(key: string): string | undefined {
  return process.env[key];
}

function trimUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

export function originFromHeaders(headers: Headers): string | null {
  const host = headers.get('x-forwarded-host') || headers.get('host');
  if (!host) return null;

  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto =
    forwardedProto ||
    (headers.get('x-forwarded-ssl') === 'on' ? 'https' : null) ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return trimUrl(`${proto}://${host}`);
}

/** Public site URL for OAuth redirects, metadata, and absolute links */
export function resolveAppUrl(headers?: Headers): string {
  const fromHeaders = headers ? originFromHeaders(headers) : null;
  const fromEnv = trimUrl(env('NEXT_PUBLIC_APP_URL') || env('APP_URL') || '');

  if (fromHeaders && !isLocalhostUrl(fromHeaders)) {
    if (!fromEnv || isLocalhostUrl(fromEnv)) return fromHeaders;
  }

  if (fromEnv && !isLocalhostUrl(fromEnv)) return fromEnv;
  if (fromHeaders && !isLocalhostUrl(fromHeaders)) return fromHeaders;
  if (fromEnv) return fromEnv;

  throw new Error('Set NEXT_PUBLIC_APP_URL or APP_URL in the deployment environment');
}

/** Stable redirect base for Discord OAuth — always prefer configured APP_URL over proxy headers. */
export function resolveOAuthAppUrl(headers?: Headers): string {
  const fromEnv = trimUrl(env('NEXT_PUBLIC_APP_URL') || env('APP_URL') || '');
  if (fromEnv && !isLocalhostUrl(fromEnv)) return fromEnv;
  return resolveAppUrl(headers);
}

export function oauthCallbackPath(headers?: Headers): string {
  return `${resolveOAuthAppUrl(headers)}/api/auth/discord/callback`;
}

export function getDiscordClientId(): string {
  const id = (env('DISCORD_CLIENT_ID') || env('NEXT_PUBLIC_DISCORD_CLIENT_ID'))?.trim();
  if (!id) {
    throw new Error('DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID is required');
  }
  return id;
}

/** Non-throwing variant for build-time / optional UI paths */
export function tryGetDiscordClientId(): string | undefined {
  return (env('DISCORD_CLIENT_ID') || env('NEXT_PUBLIC_DISCORD_CLIENT_ID'))?.trim() || undefined;
}

export function getDiscordClientSecret(): string {
  const raw = env('DISCORD_CLIENT_SECRET')?.trim() ?? '';
  const secret = raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1).trim()
    : raw.startsWith("'") && raw.endsWith("'")
      ? raw.slice(1, -1).trim()
      : raw;
  if (!secret) {
    throw new Error('DISCORD_CLIENT_SECRET is required');
  }
  return secret;
}

export function getSessionSecret(): string {
  return env('SESSION_SECRET') || 'dev-secret-change-me';
}

export function getDiscordServerId(): string | undefined {
  return env('NEXT_PUBLIC_DISCORD_SERVER_ID') || env('DISCORD_SERVER_ID');
}

export function getDiscordInviteUrl(): string | undefined {
  return env('DISCORD_INVITE_URL') || env('NEXT_PUBLIC_DISCORD_INVITE_URL');
}
