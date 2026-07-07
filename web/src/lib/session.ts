import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'deelo_session';
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-me');

/** Session cookie — access tokens live in Supabase, not the JWT (avoids cookie size / stale token issues). */
export interface DashboardSession {
  discordId: string;
  username: string;
  avatar: string | null;
}

export async function setDashboardSession(session: DashboardSession) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getDashboardSession(): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as DashboardSession;
  } catch {
    return null;
  }
}

export async function clearDashboardSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export const DISCORD_API = 'https://discord.com/api/v10';

const PERM_ADMINISTRATOR = BigInt(1) << BigInt(3);
const PERM_MANAGE_GUILD = BigInt(1) << BigInt(5);

const guildCache = new Map<string, { guilds: DiscordGuild[]; expires: number }>();
const CACHE_MS = 60_000;

export function discordAvatarUrl(user: { id: string; avatar: string | null }) {
  if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> BigInt(22)) % 6}.png`;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string | number;
};

export type GuildFetchResult =
  | { ok: true; guilds: DiscordGuild[] }
  | { ok: false; reason: 'no_token' | 'rate_limited' | 'discord_error'; status?: number };

export function canManageServer(guild: Pick<DiscordGuild, 'owner' | 'permissions'>) {
  if (guild.owner) return true;
  try {
    const perms = BigInt(guild.permissions ?? 0);
    return (perms & PERM_ADMINISTRATOR) === PERM_ADMINISTRATOR || (perms & PERM_MANAGE_GUILD) === PERM_MANAGE_GUILD;
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function refreshDiscordToken(discordId: string, refreshToken: string): Promise<string | null> {
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!tokenRes.ok) {
    console.error('Discord token refresh failed:', tokenRes.status, await tokenRes.text());
    return null;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  await createAdminClient().from('dashboard_users').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? refreshToken,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    last_login: new Date().toISOString(),
  }).eq('discord_id', discordId);

  guildCache.delete(discordId);
  return tokens.access_token;
}

export async function getDiscordAccessToken(discordId: string): Promise<string | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const { data } = await createAdminClient()
    .from('dashboard_users')
    .select('access_token, refresh_token, token_expires_at')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!data?.access_token) return null;

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now() + 60_000 && data.refresh_token) {
    return refreshDiscordToken(discordId, data.refresh_token);
  }

  return data.access_token;
}

async function discordFetchGuilds(token: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (res.status !== 429 || attempt === retries) return res;

    let retryAfter = 600;
    try {
      const body = (await res.json()) as { retry_after?: number };
      retryAfter = Math.ceil((body.retry_after ?? 0.6) * 1000);
    } catch {
      retryAfter = 600;
    }
    await sleep(retryAfter);
  }

  throw new Error('unreachable');
}

export async function fetchUserGuilds(discordId: string): Promise<GuildFetchResult> {
  const cached = guildCache.get(discordId);
  if (cached && cached.expires > Date.now()) {
    return { ok: true, guilds: cached.guilds };
  }

  let token = await getDiscordAccessToken(discordId);
  if (!token) return { ok: false, reason: 'no_token' };

  let res = await discordFetchGuilds(token);

  if (res.status === 401) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data } = await createAdminClient()
      .from('dashboard_users')
      .select('refresh_token')
      .eq('discord_id', discordId)
      .maybeSingle();
    if (data?.refresh_token) {
      token = await refreshDiscordToken(discordId, data.refresh_token);
      if (token) res = await discordFetchGuilds(token);
    }
  }

  if (res.status === 429) {
    return { ok: false, reason: 'rate_limited', status: 429 };
  }

  if (!res.ok) {
    console.error('Discord guilds fetch failed:', res.status, await res.text());
    return { ok: false, reason: 'discord_error', status: res.status };
  }

  const guilds = (await res.json()) as DiscordGuild[];
  guildCache.set(discordId, { guilds, expires: Date.now() + CACHE_MS });
  return { ok: true, guilds };
}

export function invalidateGuildCache(discordId: string) {
  guildCache.delete(discordId);
}

export function guildIconUrl(id: string, icon: string | null) {
  if (!icon) return null;
  return `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=128`;
}
