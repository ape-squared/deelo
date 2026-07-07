/** Runtime env read — bracket access avoids Next.js inlining empty build-time values in standalone Docker */
function env(key: string): string | undefined {
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

  if (fromEnv) return fromEnv;
  if (fromHeaders) return fromHeaders;
  if (env('NODE_ENV') === 'development') return 'http://localhost:3000';

  throw new Error('Set NEXT_PUBLIC_APP_URL or APP_URL in the deployment environment');
}

export function getDiscordClientId(): string {
  const id = env('DISCORD_CLIENT_ID') || env('NEXT_PUBLIC_DISCORD_CLIENT_ID');
  if (!id) {
    throw new Error('DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_CLIENT_ID is required');
  }
  return id;
}

export function getDiscordClientSecret(): string {
  const secret = env('DISCORD_CLIENT_SECRET');
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
