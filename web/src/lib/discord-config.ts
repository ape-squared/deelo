/** Public Discord application ID — same as Developer Portal OAuth2 client id */
export const DISCORD_APPLICATION_ID = '1188001834305060925';

/** Runtime env read — bracket access avoids Next.js inlining empty build-time values in standalone Docker */
function env(key: string): string | undefined {
  return process.env[key];
}

export function getDiscordClientId(): string {
  return (
    env('DISCORD_CLIENT_ID') ||
    env('NEXT_PUBLIC_DISCORD_CLIENT_ID') ||
    DISCORD_APPLICATION_ID
  );
}

export function getDiscordClientSecret(): string {
  return env('DISCORD_CLIENT_SECRET') || '';
}

export function getAppUrl(): string {
  return env('NEXT_PUBLIC_APP_URL') || env('APP_URL') || 'https://deelo.bot';
}

export function getSessionSecret(): string {
  return env('SESSION_SECRET') || 'dev-secret-change-me';
}
